import crypto from 'crypto';
import { gestisciLead } from '../lib/db.js';
import { nomeTag } from '../lib/nome-canonico.js';

// ============================================================
// CONTATTI RACCOLTI: azioni del proprietario (pagina "I miei contatti")
// ============================================================
// azione 'visti'      → tutti i contatti non sono più "nuovi"
// azione 'richiamato' → segna (o toglie) un contatto come richiamato (id, valore)
// azione 'elimina'    → elimina un contatto (id)
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

const AZIONI = ['visti', 'richiamato', 'elimina'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Metodo non consentito' });

  const body = req.body || {};
  const username = nomeTag(body.u);
  const azione = String(body.azione || '');
  const id = body.id ? String(body.id).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) : null;

  if (!verifyToken(username, body.sessionToken)) {
    return res.status(401).json({ success: false, error: 'Sessione scaduta: accedi di nuovo' });
  }
  if (!AZIONI.includes(azione) || (azione !== 'visti' && !id)) {
    return res.status(400).json({ success: false, error: 'Richiesta non valida' });
  }

  try {
    const leads = await gestisciLead(username, azione, id, body.valore !== false);
    if (leads === null) return res.status(404).json({ success: false, error: 'Tag non trovata' });
    return res.status(200).json({ success: true, leads });
  } catch (e) {
    console.error('CRASH LEADS:', e.dettagli || e);
    return res.status(500).json({ success: false, error: 'Errore server' });
  }
}
