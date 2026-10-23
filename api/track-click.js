import { registraClick } from '../lib/db.js';
import { nomeTag } from '../lib/nome-canonico.js';
import { entroILimiti } from '../lib/limiti.js';

// ============================================================
// STATISTICHE: un visitatore apre una sezione della tag pubblica
// ============================================================
// Il browser invia solo il nome della sezione; data, ora e orario li decide il server e la
// voce viene aggiunta in cima al registro nel database (massimo 1000 voci).
// Oltre i limiti (click a raffica dallo stesso telefono) il click non si conta, senza errori.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Metodo non consentito' });

  const body = req.body || {};
  const username = nomeTag(body.u);
  const sezione = String(body.sezione || '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 40);
  if (!username || !sezione) return res.status(400).json({ success: false, error: 'Dati mancanti' });

  if (!(await entroILimiti(req, username, [
    { nome: 'click', per: 'ip+tag', max: 60, finestra: 3600 },
    { nome: 'click-ip', per: 'ip', max: 600, finestra: 86400 }
  ]))) {
    return res.status(200).json({ success: true, contato: false });
  }

  const ora = new Date();
  const click = {
    sezione,
    data: ora.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' }),
    ora: ora.toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }),
    timestamp: ora.getTime()
  };

  try {
    const trovata = await registraClick(username, click);
    if (!trovata) return res.status(404).json({ success: false, error: 'Tag non trovata' });
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('CRASH TRACK-CLICK:', e.dettagli || e);
    return res.status(500).json({ success: false, error: 'Errore server' });
  }
}
