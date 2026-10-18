import { gestisciLead, trovaTag } from '../lib/db.js';
import { nomeTag } from '../lib/nome-canonico.js';
import { dirittiSullaTag } from '../lib/sessione.js';

// ============================================================
// CONTATTI RACCOLTI: azioni del proprietario (pagina "I miei contatti")
// ============================================================
// azione 'visti'      → tutti i contatti non sono più "nuovi"
// azione 'richiamato' → segna (o toglie) un contatto come richiamato (id, valore)
// azione 'elimina'    → elimina un contatto (id)
// Solo il proprietario della tag (sessione del suo account, lib/sessione.js).
const AZIONI = ['visti', 'richiamato', 'elimina'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Metodo non consentito' });

  const body = req.body || {};
  const username = nomeTag(body.u);
  const azione = String(body.azione || '');
  const id = body.id ? String(body.id).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) : null;

  if (!AZIONI.includes(azione) || (azione !== 'visti' && !id)) {
    return res.status(400).json({ success: false, error: 'Richiesta non valida' });
  }

  try {
    const record = await trovaTag(username, ['stato', 'proprietario_id']);
    const diritti = await dirittiSullaTag({ req, token: body.sessionToken, record, tag: username });
    if (!diritti.proprietario) {
      return res.status(401).json({ success: false, error: 'Sessione scaduta: accedi di nuovo' });
    }
    const leads = await gestisciLead(username, azione, id, body.valore !== false);
    if (leads === null) return res.status(404).json({ success: false, error: 'Tag non trovata' });
    return res.status(200).json({ success: true, leads });
  } catch (e) {
    console.error('CRASH LEADS:', e.dettagli || e.message);
    return res.status(500).json({ success: false, error: 'Errore server' });
  }
}
