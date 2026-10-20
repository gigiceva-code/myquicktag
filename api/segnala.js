import { trovaTag, aggiungiSegnalazione } from '../lib/db.js';
import { pulisciTesto } from '../lib/pulizia.js';
import { entroILimiti, rispondiTroppiTentativi } from '../lib/limiti.js';
import { nomeTag } from '../lib/nome-canonico.js';

// ============================================================
// SEGNALA QUESTA TAG: un visitatore segnala una tag pubblica
// ============================================================
// La segnalazione si salva nel database (tabella segnalazioni) e si manda per email al titolare
// di myquicktag (SEGNALAZIONI_A, di base info@myquicktag.it) tramite Resend. Se l'email non parte
// la segnalazione resta comunque salvata. Nessun indirizzo IP viene salvato.
const MOTIVI = {
  impersonazione: 'Si spaccia per me o per un\'altra persona o attività',
  marchio: 'Usa un marchio o un nome che non è suo',
  offensivo: 'Contenuti offensivi o illegali',
  truffa: 'Truffa o spam',
  altro: 'Altro'
};
const MAX_DESCRIZIONE = 1000;
const MAX_EMAIL = 200;

// Testo semplice: niente caratteri di controllo (gli a capo restano), spazi compattati
function pulisci(valore, max) {
  return String(valore || '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, max);
}

async function inviaEmail(segnalazione) {
  const chiave = process.env.RESEND_API_KEY;
  if (!chiave) { console.error('SEGNALA: RESEND_API_KEY mancante, email non inviata'); return false; }
  const righe = [
    `Nuova segnalazione sulla tag @${segnalazione.tag}`,
    '',
    `Motivo: ${MOTIVI[segnalazione.motivo]}`,
    `Descrizione: ${segnalazione.descrizione || '(nessuna)'}`,
    `Email del segnalante: ${segnalazione.email || '(non indicata)'}`,
    '',
    `Tag: https://myquicktag.it/u/${segnalazione.tag}`,
    'La segnalazione è salvata su Supabase, tabella "segnalazioni".'
  ];
  try {
    const risposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chiave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'myquicktag <no-reply@notifiche.myquicktag.it>',
        to: [process.env.SEGNALAZIONI_A || 'info@myquicktag.it'],
        ...(segnalazione.email ? { reply_to: segnalazione.email } : {}),
        subject: `Segnalazione tag @${segnalazione.tag}`,
        text: righe.join('\n')
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!risposta.ok) console.error('SEGNALA: email non inviata', risposta.status);
    return risposta.ok;
  } catch (e) {
    console.error('SEGNALA: email non inviata', e.message);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Metodo non consentito' });

  const body = req.body || {};
  const tag = nomeTag(body.u);
  const motivo = String(body.motivo || '');
  const descrizione = pulisciTesto(pulisci(body.descrizione, MAX_DESCRIZIONE));
  const email = pulisci(body.email, MAX_EMAIL).toLowerCase();

  if (!tag) return res.status(400).json({ success: false, error: 'Tag mancante' });
  if (!MOTIVI[motivo]) return res.status(400).json({ success: false, error: 'Scegli un motivo' });
  if (email && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Controlla l\'indirizzo email' });
  }

  // Limiti: niente raffiche di segnalazioni contro una tag o da uno stesso telefono
  if (!(await entroILimiti(req, tag, [
    { nome: 'segnala', per: 'ip+tag', max: 3, finestra: 3600 },
    { nome: 'segnala-ip', per: 'ip', max: 10, finestra: 86400 },
    { nome: 'segnala-tag', per: 'tag', max: 30, finestra: 86400 }
  ]))) {
    return rispondiTroppiTentativi(res);
  }

  try {
    const record = await trovaTag(tag, ['stato']);
    if (!record) return res.status(404).json({ success: false, error: 'Tag non trovata' });

    const segnalazione = { tag, motivo, descrizione: descrizione || null, email: email || null };
    await aggiungiSegnalazione(segnalazione);
    await inviaEmail(segnalazione);
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('CRASH SEGNALA:', e.dettagli || e.message);
    return res.status(500).json({ success: false, error: 'Errore server. Riprova tra poco.' });
  }
}
