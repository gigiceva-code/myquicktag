import crypto from 'crypto';
import { trovaTag, aggiungiLead } from '../lib/db.js';
import { calcolaAbbonamento } from '../lib/abbonamento.js';
import { pulisciTesto } from '../lib/pulizia.js';
import { entroILimiti, rispondiTroppiTentativi } from '../lib/limiti.js';
import { nomeTag } from '../lib/nome-canonico.js';

// ============================================================
// RACCOLTA CONTATTI: un visitatore lascia nome e contatto sulla tag pubblica
// ============================================================
// Il visitatore invia SOLO il suo contatto: il server lo aggiunge in cima all'elenco nel
// database. L'elenco dei contatti già raccolti non passa mai dal browser del visitatore.
const MAX_NOME = 80;
const MAX_CONTATTO = 120;

// Testo semplice su una riga: niente caratteri di controllo, spazi compattati
function pulisci(valore, max) {
  return String(valore || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function dataOraItaliana(ms) {
  const d = new Date(ms);
  const data = d.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' });
  const ora = d.toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' });
  return `${data} ${ora}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Metodo non consentito' });

  const body = req.body || {};
  const username = nomeTag(body.u);
  const nome = pulisciTesto(pulisci(body.nome, MAX_NOME));
  const contatto = pulisciTesto(pulisci(body.contatto, MAX_CONTATTO));

  if (!username) return res.status(400).json({ success: false, error: 'Tag mancante' });
  if (!contatto) return res.status(400).json({ success: false, error: 'Contatto mancante' });

  // Limiti: niente vasetti riempiti di contatti finti
  if (!(await entroILimiti(req, username, [
    { nome: 'lead', per: 'ip+tag', max: 3, finestra: 600 },
    { nome: 'lead-tag', per: 'tag', max: 60, finestra: 3600 }
  ]))) {
    return rispondiTroppiTentativi(res);
  }

  try {
    // Si accettano contatti solo per tag attive, online e con la raccolta contatti accesa
    const record = await trovaTag(username, ['stato', 'data_scadenza', 'lead_capture_attivo']);
    const stato = String(record?.fields?.stato || '').toLowerCase().trim();
    const raccoltaAttiva = String(record?.fields?.lead_capture_attivo || '') === 'true';
    if (!record || stato !== 'attivo' || !raccoltaAttiva || calcolaAbbonamento(record).fase === 'scaduta') {
      return res.status(404).json({ success: false, error: 'Raccolta contatti non disponibile' });
    }

    const ora = Date.now();
    await aggiungiLead(username, {
      id: crypto.randomUUID(), nome, contatto, data: dataOraItaliana(ora), ts: ora,
      visto: false, richiamato: false // il proprietario lo vede come "nuovo" in dashboard
    });
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('CRASH ADD-LEAD:', e.dettagli || e);
    return res.status(500).json({ success: false, error: 'Errore server' });
  }
}
