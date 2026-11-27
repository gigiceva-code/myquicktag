// ============================================================
// ACCOUNT: le tag dell'utente (dashboard)
// ============================================================
// Registrazione, verifica dell'email, accesso, recupero e cambio password li fa Supabase Auth
// direttamente dal browser (session.js, accesso.html, dashboard.html): la password dell'account
// non passa mai da qui. Questa funzione riceve solo la sessione (Authorization: Bearer <jwt>)
// e la verifica con Supabase (lib/sessione.js) prima di ogni operazione.
//
// azione 'mie-tag'         → elenco delle tag di cui l'account è proprietario
// azione 'elimina-tag'     → cancella una sua tag (conferma: il nome della tag)
// azione 'elimina-account' → cancella tutte le sue tag e l'account (conferma: ELIMINA)
import { tagDelProprietario, tagDaRicordare, aggiornaTag, emailDelProprietario, prenotazioniInScadenza, eliminaTagAccount, eliminaAccount, normalizzaUsername } from '../lib/db.js';
import { emailPromemoria, emailScadenza, emailAccountEliminato, inviaEmail, partiMancanti } from '../lib/email.js';
import { tokenAccount, utenteDaToken } from '../lib/sessione.js';
import { calcolaAbbonamento, pianoEffettivo, puoAggiungereTag } from '../lib/abbonamento.js';
import { contaEvento, numeriLancio, puoVedereNumeri } from '../lib/contatori.js';

function contaNuovi(testo) {
  try {
    const lista = JSON.parse(testo || '[]');
    return Array.isArray(lista) ? lista.filter(l => l && !l.visto).length : 0;
  } catch { return 0; }
}

// Chiavi "publishable" (pubbliche per natura) dei progetti Supabase noti: il browser usa sempre lo
// stesso progetto del server (produzione o prova), senza impostazioni diverse per ambiente.
const CHIAVI_PUBBLICHE = {
  'atlhrkkfovblkhgzfeuo': 'sb_publishable_HrX_oradnt5sRX6YHqGB-w_gYZe0u4U', // myquicktag (produzione)
  'lmxxoxrsrwmtunyqlpbh': 'sb_publishable_mCn8LbCxhDoNZMJS-E043Q_hKEte5F0'  // myquicktag-prova
};

export function configurazionePubblica() {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  let ref = '';
  try { ref = new URL(url).hostname.split('.')[0]; } catch { ref = ''; }
  const chiave = process.env.SUPABASE_PUBLISHABLE_KEY || CHIAVI_PUBBLICHE[ref] || null;
  return { url, chiave };
}

// PROMEMORIA DEL GIORNO DOPO (lib/email.js): lo chiama Vercel Cron ogni mattina (vercel.json),
// con l'intestazione Authorization: Bearer <CRON_SECRET>. Sta qui perché il piano Hobby di Vercel
// ammette al massimo 12 funzioni. Una sola email per tag; l'indirizzo si legge dall'account al momento.
async function inviaPromemoria(req, res) {
  const segreto = process.env.CRON_SECRET;
  if (!segreto || req.headers.authorization !== `Bearer ${segreto}`) return res.status(401).json({ success: false });
  let inviati = 0, completi = 0, errori = 0;
  const tags = await tagDaRicordare();
  for (const r of tags) {
    const f = r.fields;
    const mancanti = partiMancanti(f);
    try {
      if (mancanti.length) {
        const destinatario = await emailDelProprietario(f.proprietario_id);
        if (!destinatario) { await aggiornaTag(r.id, { promemoria_in_attesa: false }); continue; }
        const ok = await inviaEmail({ to: destinatario, ...emailPromemoria({ tag: f.username_system, nome: f.username_display, mancanti }) });
        if (!ok) { errori++; continue; } // riprova domani, finché la tag resta nella finestra dei 4 giorni
        inviati++;
      } else completi++;
      await aggiornaTag(r.id, { promemoria_il: new Date().toISOString(), promemoria_in_attesa: false });
    } catch (e) { errori++; console.error('PROMEMORIA:', e.dettagli || e.message); }
  }
  console.log(`PROMEMORIA: ${inviati} inviati, ${completi} tag già complete, ${errori} errori`);
  // Prenotazioni in scadenza (23/11/2026): stessa chiamata, due volte al giorno (vercel.json), così ogni
  // prenotazione di un account viene vista quando le restano meno di 12 ore. Una sola email per tag.
  let scadenze = 0;
  for (const r of await prenotazioniInScadenza()) {
    const f = r.fields;
    try {
      const destinatario = await emailDelProprietario(f.proprietario_id);
      const oreRimaste = 24 - (Date.now() - new Date(r.createdTime).getTime()) / 3600000;
      const ok = destinatario && oreRimaste > 0.5
        ? await inviaEmail({ to: destinatario, ...emailScadenza({ tag: f.username_system, nome: f.username_display, oreRimaste }) })
        : false;
      if (ok) scadenze++;
      if (ok || !destinatario) await aggiornaTag(r.id, { avviso_scadenza_il: new Date().toISOString() });
    } catch (e) { errori++; console.error('SCADENZA:', e.dettagli || e.message); }
  }
  console.log(`PRENOTAZIONI IN SCADENZA: ${scadenze} avvisi inviati`);
  return res.status(200).json({ success: true, inviati, completi, scadenze, errori });
}

export default async function handler(req, res) {
  if (req.method === 'GET' && String(req.query?.cron || '') === 'promemoria') {
    try { return await inviaPromemoria(req, res); }
    catch (e) { console.error('CRASH PROMEMORIA:', e.dettagli || e.message); return res.status(500).json({ success: false }); }
  }
  // azione=config (GET, pubblica): indirizzo e chiave pubblica di Supabase per la libreria di accesso
  if (req.method === 'GET' && String(req.query?.azione || '') === 'config') {
    res.setHeader('Cache-Control', 'public, max-age=300');
    const config = configurazionePubblica();
    if (!config.url || !config.chiave) return res.status(500).json({ success: false, error: 'Configurazione mancante' });
    return res.status(200).json({ success: true, ...config });
  }
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Metodo non consentito' });
  res.setHeader('Cache-Control', 'no-store');

  const body = req.body || {};
  const azione = String(body.azione || '');

  try {
    const jwt = tokenAccount(req);
    const utente = jwt ? await utenteDaToken(jwt) : null;
    if (!utente) return res.status(401).json({ success: false, error: 'Sessione scaduta: accedi di nuovo' });

    // Pagina "Numeri" (numeri.html): solo per le email ammesse (lib/contatori.js → NUMERI_EMAIL)
    if (azione === 'numeri') {
      if (!puoVedereNumeri(utente.email)) return res.status(403).json({ success: false, error: 'Pagina riservata' });
      return res.status(200).json({ success: true, numeri: await numeriLancio(Math.min(366, Math.max(7, parseInt(body.giorni, 10) || 30))) });
    }

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
          contatti_nuovi: contaNuovi(f.lead_capture_leads),
          // Quick Pass configurato: l'Identity Console mostra il pulsante della cassa
          quickpass_attivo: !!(String(f.quickpass_premio_a || '').trim() && String(f.quickpass_premio_b || '').trim())
        };
        if (stato === 'attivo') voce.abbonamento = { ...calcolaAbbonamento(r), piano_effettivo: pianoEffettivo(r) };
        // Tag attiva ma incompleta (26/11/2026, "prima l'account, poi la tag"): la Console indica cosa manca
        if (stato === 'attivo') voce.mancanti = partiMancanti(f);
        if (stato === 'in attesa') voce.prenotata_il = r.createdTime;
        return voce;
      });
      await contaEvento('console_aperta');
      return res.status(200).json({ success: true, tags, vede_numeri: puoVedereNumeri(utente.email), puo_aggiungere: puoAggiungereTag(utente.email, records) });
    }

    // CANCELLAZIONE (26/11/2026, richiesta del titolare: "l'utente deve potersi disiscrivere in qualsiasi momento").
    // Serve la sessione dell'account e una conferma scritta, così un clic sbagliato non cancella niente.
    if (azione === 'elimina-tag') {
      const tag = normalizzaUsername(body.u || '');
      if (!tag || normalizzaUsername(body.conferma || '') !== tag) return res.status(400).json({ success: false, error: 'Per confermare scrivi il nome della tag.' });
      const fatto = await eliminaTagAccount(utente.id, tag);
      if (!fatto) return res.status(404).json({ success: false, error: 'Questa tag non è nel tuo account.' });
      console.log('ELIMINA TAG: una tag cancellata dal suo titolare');
      return res.status(200).json({ success: true });
    }
    if (azione === 'elimina-account') {
      if (String(body.conferma || '').trim().toUpperCase() !== 'ELIMINA') return res.status(400).json({ success: false, error: 'Per confermare scrivi ELIMINA.' });
      const email = utente.email;
      const nomi = (await tagDelProprietario(utente.id)).map(r => r.fields.username_system).filter(Boolean);
      const cancellate = await eliminaAccount(utente.id);
      console.log(`ELIMINA ACCOUNT: account cancellato con ${cancellate} tag`);
      if (email) await inviaEmail({ to: email, ...emailAccountEliminato({ tags: nomi }) });
      return res.status(200).json({ success: true, tag_cancellate: cancellate });
    }

    return res.status(400).json({ success: false, error: 'Azione non valida' });
  } catch (e) {
    console.error('CRASH ACCOUNT:', e.dettagli || e.message);
    return res.status(500).json({ success: false, error: 'Errore server. Riprova tra poco.' });
  }
}
