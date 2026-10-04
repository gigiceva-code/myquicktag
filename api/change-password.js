import crypto from 'crypto';
import { trovaTag, aggiornaTag } from '../lib/db.js';
import { verificaPassword, proteggiPassword } from '../lib/password.js';
import { entroILimiti, rispondiTroppiTentativi } from '../lib/limiti.js';

// ============================================================
// CAMBIO PASSWORD (pagina Account & Piano)
// ============================================================
// Servono tutte e tre: sessione valida, password attuale corretta, nuova password.
// Le password arrivano già come hash SHA-256 dal browser (come in login.js).
function verifyToken(username, token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [tokenUser, expiry, signature] = parts;
  if (tokenUser !== username) return false;
  if (Date.now() > Number(expiry)) return false;
  const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(`${tokenUser}.${expiry}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function generateToken(username) {
  const expiry = Date.now() + (1000 * 60 * 60 * 24 * 90); // 90 giorni
  const payload = `${username}.${expiry}`;
  const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

const pulisciHash = h => String(h || '').replace(/[^a-fA-F0-9]/g, '').toLowerCase();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Metodo non consentito' });

  const body = req.body || {};
  const username = String(body.u || '').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  const attuale = pulisciHash(body.attuale);
  const nuova = pulisciHash(body.nuova);

  if (!verifyToken(username, body.sessionToken)) {
    return res.status(401).json({ success: false, error: 'Sessione scaduta: accedi di nuovo' });
  }
  if (!(await entroILimiti(req, username, [{ nome: 'cambio-pwd', per: 'tag', max: 5, finestra: 900 }]))) {
    return rispondiTroppiTentativi(res);
  }
  if (attuale.length !== 64 || nuova.length !== 64) {
    return res.status(400).json({ success: false, error: 'Dati non validi' });
  }

  try {
    const record = await trovaTag(username, ['password']);
    const verifica = await verificaPassword(attuale, record?.fields?.password);
    if (!verifica.ok) {
      return res.status(403).json({ success: false, error: 'La password attuale non è corretta' });
    }

    await aggiornaTag(record.id, { password: await proteggiPassword(nuova) });
    return res.status(200).json({ success: true, sessionToken: generateToken(username) });
  } catch (e) {
    console.error('CRASH CHANGE-PASSWORD:', e.dettagli || e);
    return res.status(500).json({ success: false, error: 'Errore server' });
  }
}
