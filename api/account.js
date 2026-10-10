// ============================================================
// ACCOUNT: le tag dell'utente (dashboard) e collegamento delle tag create col vecchio accesso
// ============================================================
// Registrazione, verifica dell'email, accesso, recupero e cambio password li fa Supabase Auth
// direttamente dal browser (session.js, accesso.html, dashboard.html): la password dell'account
// non passa mai da qui. Questa funzione riceve solo la sessione (Authorization: Bearer <jwt>)
// e la verifica con Supabase (lib/sessione.js) prima di ogni operazione.
//
// azione 'mie-tag'         → elenco delle tag di cui l'account è proprietario
// azione 'collega-vecchia' → { tag, pwd } collega all'account una tag di prova creata col vecchio
//                            accesso "@nome + password" (una volta sola; poi la vecchia password
//                            viene cancellata e vale solo l'account)
import { tagDelProprietario, trovaTag, assegnaProprietario } from '../lib/db.js';
import { tokenAccount, utenteDaToken } from '../lib/sessione.js';
import { verificaPassword } from '../lib/password.js';
import { entroILimiti, rispondiTroppiTentativi } from '../lib/limiti.js';
import { calcolaAbbonamento } from '../lib/abbonamento.js';
import { nomeTag } from '../lib/nome-canonico.js';

function contaNuovi(testo) {
  try {
    const lista = JSON.parse(testo || '[]');
    return Array.isArray(lista) ? lista.filter(l => l && !l.visto).length : 0;
  } catch { return 0; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Metodo non consentito' });
  res.setHeader('Cache-Control', 'no-store');

  const body = req.body || {};
  const azione = String(body.azione || '');

  try {
    const jwt = tokenAccount(req);
    const utente = jwt ? await utenteDaToken(jwt) : null;
    if (!utente) return res.status(401).json({ success: false, error: 'Sessione scaduta: accedi di nuovo' });

    if (azione === 'mie-tag') {
      const records = await tagDelProprietario(utente.id);
      const tags = records.map(r => {
        const f = r.fields;
        const stato = String(f.stato || '').toLowerCase().trim();
        const voce = {
          username_system: f.username_system,
          username_display: f.username_display || null,
          stato,
          plan: f.plan || null,
          views: f.views || 0,
          ha_bozza: !!(f.draft_json && String(f.draft_json).trim() !== ''),
          contatti_nuovi: contaNuovi(f.lead_capture_leads)
        };
        if (stato === 'attivo') voce.abbonamento = calcolaAbbonamento(r);
        if (stato === 'in attesa') voce.prenotata_il = r.createdTime;
        return voce;
      });
      return res.status(200).json({ success: true, tags });
    }

    if (azione === 'collega-vecchia') {
      const tag = nomeTag(body.tag);
      const pwd = String(body.pwd || '').replace(/[^a-fA-F0-9]/g, '').toLowerCase();
      if (!tag || pwd.length !== 64) return res.status(400).json({ success: false, error: 'Dati non validi' });
      if (!(await entroILimiti(req, tag, [
        { nome: 'collega', per: 'ip+tag', max: 5, finestra: 900, chiuso: true },
        { nome: 'collega-ip', per: 'ip', max: 20, finestra: 3600, chiuso: true }
      ]))) {
        return rispondiTroppiTentativi(res);
      }
      const record = await trovaTag(tag, ['password', 'proprietario_id', 'stato']);
      const verifica = await verificaPassword(pwd, record?.fields?.password);
      // Stessa risposta per tag inesistente, password sbagliata o tag già collegata
      if (!record || !verifica.ok || record.fields.proprietario_id) {
        return res.status(403).json({ success: false, error: 'Nome o vecchia password non corretti, oppure tag già collegata a un account' });
      }
      const collegata = await assegnaProprietario(record.id, utente.id, { password: null });
      if (!collegata) return res.status(409).json({ success: false, error: 'Tag già collegata a un account' });
      return res.status(200).json({ success: true, tag });
    }

    return res.status(400).json({ success: false, error: 'Azione non valida' });
  } catch (e) {
    console.error('CRASH ACCOUNT:', e.dettagli || e.message);
    return res.status(500).json({ success: false, error: 'Errore server. Riprova tra poco.' });
  }
}
