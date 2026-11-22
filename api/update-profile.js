import { trovaTag, aggiornaTag, assegnaProprietario, tagDelProprietario } from '../lib/db.js';
import { emailBenvenuto, inviaEmail, partiMancanti } from '../lib/email.js';
import { contaEvento } from '../lib/contatori.js';
import { pulisciTesto, pulisciJson, pulisciValore } from '../lib/pulizia.js';
import { calcolaAbbonamento, dateAttivazione, nuovaScadenzaRinnovo, rinnovoConsentito, rinnovoGratuitoAttivo, puoAggiungereTag, MESSAGGIO_LIMITE_TAG } from '../lib/abbonamento.js';
import { nomeTag, formaCanonica } from '../lib/nome-canonico.js';
import { controllaNome } from '../lib/nomi-riservati.js';
import { dirittiSullaTag } from '../lib/sessione.js';

// Campi salvati come testo JSON: si puliscono i valori, non la sintassi
const CAMPI_JSON = ['draft_json', 'modulo_vcf', 'config_canali', 'sedi_json', 'gallery_data', 'pocket_cloud', 'partners_data'];

// Stili della tag (stessi valori dell'editor e di style.css). Un valore sconosciuto si ignora.
const STILI = ['black_dna', 'titanium', 'obsidian_gold', 'satin_rose', 'emerald'];
export function normalizzaStile(valore) {
  const v = String(valore || '').trim().toLowerCase().replace(/\s+/g, '_');
  const vecchi = { black: 'black_dna', obsidian: 'obsidian_gold' };
  const stile = vecchi[v] || v;
  return STILI.includes(stile) ? stile : null;
}

// Campi che il titolare può svuotare (18/11/2026): un testo vuoto inviato apposta li cancella (null),
// così "Elimina" nell'editor funziona davvero. Gli altri campi vuoti si ignorano come prima.
const CAMPI_SVUOTABILI = ['sottotitolo', 'bio', 'cv', 'email', 'sito_web', 'quick_action_label', 'quick_action_url', 'avatar_url',
  'live_status_color', 'live_status_text', 'live_status_micro', 'live_status_action_label', 'live_status_action_url',
  'flash_text', 'flash_micro', 'flash_expiry', 'pdf_label', 'pdf_url',
  'quickpass_premio_a', 'quickpass_premio_b', 'quickpass_limite', 'quickpass_scadenza', 'quickpass_contatto',
  'review_url', 'review_contact', 'video_url', 'video_cta_text', 'video_cta_url',
  'lead_capture_titolo', 'shop_titolo', 'shop_prezzo', 'shop_link', 'shop_scadenza'];

// Campi che si possono scrivere da qui, letti da un oggetto (la richiesta o la bozza), ripuliti
function estraiCampi(sorgente) {
  const fieldsToSave = {};

  // --- FIX DATI 2: Aggiunto "quick_action_copertina" alla lista ---
  const nativeFields = [
    "username_display", "sottotitolo", "bio", "cv", "digital_style", "digital_layout", "stato",
    "email", "modulo_vcf", "sito_web", 
    "quick_action_tipo", "quick_action_label", "quick_action_url", "quick_action_copertina", "avatar_url",
    "live_status_color", "live_status_text", "live_status_micro", "live_status_action_type", "live_status_action_label", "live_status_action_url",
    "flash_text", "flash_micro", "flash_expiry", 
    "pdf_label", "pdf_url", 
    "gallery_data", "draft_json", "sedi_json",
    "quickpass_premio_a", "quickpass_premio_b", "quickpass_limite", "quickpass_scadenza", "quickpass_amici_per_premio", "quickpass_modo", "quickpass_contatto",
    "pocket_cloud", "review_url", "review_contact",
    "video_url", "video_cta_text", "video_cta_url",
   "partners_data",
   "lead_capture_attivo", "lead_capture_titolo",
    "shop_attivo", "shop_titolo", "shop_prezzo", "shop_link", "shop_scadenza"
  ];
  // Non sono qui di proposito: lead_capture_leads (api/add-lead.js), analytics_log
  // (api/track-click.js), analytics_data e views (api/track-view.js) li scrive solo il server.

  nativeFields.forEach(f => {
    if (sorgente[f] !== undefined && sorgente[f] !== null) {
      if (typeof sorgente[f] === 'string') {
        
        // Gli apostrofi restano ("Un'azienda"): la protezione è la pulizia più sotto (lib/pulizia.js)
        let valueClean = sorgente[f].trim();
        
        if (valueClean === "" && CAMPI_SVUOTABILI.includes(f)) { fieldsToSave[f] = null; return; }
        if (f === 'draft_json' || valueClean !== "") {
          if (f === "digital_style") {
            // Stile: sempre il nome usato da editor e tag (style.css → data-theme), minuscolo. Prima "titanium"
            // diventava "TITANIUM" e la tag non lo riconosceva (19/11/2026). I vecchi nomi si convertono.
            const stile = normalizzaStile(valueClean);
            if (!stile) return;
            valueClean = stile;
          }
          
          if (f === "stato") valueClean = valueClean.toLowerCase();
          if (f === "quick_action_tipo") valueClean = valueClean.toLowerCase();
          // Quick Pass: dove si usa il pass (vincolo del database); un valore diverso si ignora
          if (f === "quickpass_modo" && !["negozio", "online", "entrambi"].includes(valueClean)) return;
          if (f === "quickpass_contatto") valueClean = valueClean.slice(0, 120);
          if (f === "sottotitolo") valueClean = valueClean.replace(/\s+/g, " ").slice(0, 60);
          
          if (f === "quickpass_limite" || f === "quickpass_amici_per_premio") {
              const parsed = parseInt(valueClean, 10);
              // amici per premio: da 1 a 20 (vincolo del database)
              if (!isNaN(parsed) && (f !== "quickpass_amici_per_premio" || (parsed >= 1 && parsed <= 20))) fieldsToSave[f] = parsed;
          } else {
              fieldsToSave[f] = valueClean;
          }
        }
      } else {
        if (f === 'modulo_vcf' && typeof sorgente[f] === 'object') {
          fieldsToSave[f] = JSON.stringify(sorgente[f]);
        } else {
          fieldsToSave[f] = sorgente[f];
        }
      }
    }
  });

  if (sorgente.config_canali !== undefined && sorgente.config_canali !== null) {
    fieldsToSave.config_canali = typeof sorgente.config_canali === 'object' ? JSON.stringify(sorgente.config_canali) : sorgente.config_canali;
  }

  // --- FIX SICUREZZA: nessun codice nascosto nei testi mostrati sulla tag pubblica ---
  for (const [campo, valore] of Object.entries(fieldsToSave)) {
    if (campo === 'password') continue;
    if (CAMPI_JSON.includes(campo)) fieldsToSave[campo] = pulisciJson(typeof valore === 'string' ? valore : JSON.stringify(valore));
    else if (typeof valore === 'string') fieldsToSave[campo] = pulisciTesto(valore);
    else if (valore && typeof valore === 'object') fieldsToSave[campo] = JSON.stringify(pulisciValore(valore));
  }
  return fieldsToSave;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Metodo non consentito');

  const body = req.body;
  const { username_system, sessionToken } = body;

  if (!username_system) {
    return res.status(400).json({ error: "username_system mancante" });
  }

  // --- FIX SICUREZZA 1: forma canonica del nome (lib/nome-canonico.js), solo lettere e numeri.
  // Il nome serve solo a trovare la tag: username_system non si può modificare da qui.
  const safeUsername = nomeTag(username_system);

  try {
    const recordAttuale = await trovaTag(safeUsername);
    if (!recordAttuale) {
      // Le tag nascono solo dalla prenotazione (check-and-create.js): qui si modificano quelle esistenti
      return res.status(404).json({ error: "Tag non trovata" });
    }

    // --- SICUREZZA: ogni scrittura richiede una prova di identità (lib/sessione.js):
    // - proprietario = sessione dell'account indicato in proprietario_id;
    // - ricevuta di prenotazione = solo per una tag "in attesa" ancora senza proprietario.
    // Il proprietario NON si può indicare dal browser: proprietario_id non è tra i campi scrivibili.
    const diritti = await dirittiSullaTag({ req, token: sessionToken, record: recordAttuale, tag: safeUsername });
    if (!diritti.proprietario && !diritti.ricevuta) {
      return res.status(401).json({ error: "Non autorizzato: accedi al tuo account" });
    }

    // --- DURATA TAG (90 giorni + 14 di grazia, vedi lib/abbonamento.js) ---
    const statoAttuale = String(recordAttuale.fields.stato || '').toLowerCase().trim();
    const abbonamento = statoAttuale === 'attivo' ? calcolaAbbonamento(recordAttuale) : null;

    // Rinnovo gratuito: solo il proprietario, solo se acceso (RINNOVO_GRATUITO), solo negli ultimi 14 giorni
    if (body.rinnova === true) {
      if (!abbonamento || !diritti.proprietario) {
        return res.status(403).json({ error: "Rinnovo non consentito" });
      }
      if (!rinnovoGratuitoAttivo()) {
        return res.status(403).json({ error: "Il rinnovo non è ancora disponibile: ti avviseremo prima della scadenza.", rinnovo_non_disponibile: true });
      }
      if (!rinnovoConsentito(abbonamento)) {
        return res.status(400).json({ error: "Il rinnovo sarà disponibile negli ultimi 14 giorni del piano", abbonamento });
      }
      const nuovaScadenza = nuovaScadenzaRinnovo(abbonamento);
      try {
        await aggiornaTag(recordAttuale.id, { data_scadenza: nuovaScadenza });
      } catch (erroreRinnovo) {
        console.error("DB RINNOVO REJECTED:", erroreRinnovo.dettagli || erroreRinnovo.message);
        return res.status(500).json({ error: "Rinnovo non riuscito" });
      }
      const recordRinnovato = { ...recordAttuale, fields: { ...recordAttuale.fields, data_scadenza: nuovaScadenza } };
      return res.status(200).json({ success: true, action: 'renewed', abbonamento: calcolaAbbonamento(recordRinnovato) });
    }

    // Modello C (17/11/2026): finita la prova la tag resta online con il piano Base e si può sempre modificare.
    // I contenuti delle sezioni avanzate si conservano: sono le pagine pubbliche (get-profile) a non mostrarli.

    const fieldsToSave = estraiCampi(body);
    // Diagnostica (18/11/2026): quali campi arrivano e quanto sono lunghi, mai il contenuto
    const diag = body && typeof body._diag === 'object' && body._diag ? Object.entries(body._diag)
      .filter(([, v]) => typeof v === 'number' || typeof v === 'boolean').map(([k, v]) => `${String(k).slice(0, 20)}=${v}`).join(' ') : '';
    console.log('SALVA', safeUsername, 'ricevuti:', Object.keys(body || {}).length, 'diag:', diag,
      'campi:', Object.entries(fieldsToSave).map(([k, v]) => `${k}=${v === null ? 'vuoto' : String(v).length}`).join(' '));

    // --- ATTIVAZIONE: da "in attesa" ad "attivo". Serve la sessione di un account (email verificata):
    // la tag diventa di quell'account. Chi ha prenotato senza account usa la ricevuta + l'account
    // appena creato; chi ha prenotato già dentro l'account è già il proprietario.
    const staAttivando = fieldsToSave.stato === 'attivo' && statoAttuale === 'in attesa';
    delete fieldsToSave.stato; // lo stato lo scrive solo il ramo dell'attivazione qui sotto

    // Il nome mostrato può solo aggiungere spazi/maiuscole al nome della tag: la sua forma canonica deve coincidere
    if (fieldsToSave.username_display !== undefined) {
      if (formaCanonica(fieldsToSave.username_display).nome !== safeUsername) delete fieldsToSave.username_display;
    }

    if (staAttivando) {
      if (!diritti.utente) {
        return res.status(401).json({ error: "Accedi o crea il tuo account per attivare la tag", serve_account: true });
      }
      // Una tag gratuita per account: si ricontrolla qui (chi ha prenotato senza account entra solo ora)
      if (!puoAggiungereTag(diritti.utente.email, await tagDelProprietario(diritti.utente.id), recordAttuale.id)) {
        return res.status(403).json({ error: MESSAGGIO_LIMITE_TAG, codice: 'limite_tag' });
      }
      // Nomi protetti ricontrollati all'attivazione (un nome assegnato vale solo per quell'email)
      const protetto = await controllaNome(safeUsername, diritti.utente.email);
      if (protetto) {
        return res.status(403).json({ error: protetto.messaggio, codice: protetto.codice, email: protetto.email });
      }
      // La bozza scritta nell'editor prima dell'attivazione diventa la tag pubblica
      // (i campi della richiesta hanno la precedenza su quelli della bozza)
      if (recordAttuale.fields.draft_json) {
        let bozza = null;
        try { bozza = JSON.parse(recordAttuale.fields.draft_json); } catch { bozza = null; }
        if (bozza && typeof bozza === 'object' && !Array.isArray(bozza)) {
          const daBozza = estraiCampi(bozza);
          delete daBozza.stato; delete daBozza.draft_json;
          if (daBozza.username_display !== undefined && formaCanonica(daBozza.username_display).nome !== safeUsername) delete daBozza.username_display;
          Object.assign(fieldsToSave, { ...daBozza, ...fieldsToSave, draft_json: '' });
        }
      }
      // Il server scrive stato e date del piano, mai il browser
      const date = dateAttivazione();
      Object.assign(fieldsToSave, { stato: 'attivo' }, date);
      try {
        if (diritti.proprietario) {
          await aggiornaTag(recordAttuale.id, fieldsToSave);
        } else {
          // Assegnazione "solo se ancora senza proprietario": nessun doppio proprietario possibile
          const assegnata = await assegnaProprietario(recordAttuale.id, diritti.utente.id, fieldsToSave);
          if (!assegnata) return res.status(409).json({ error: "Questa tag è già stata attivata da un altro account" });
        }
      } catch (erroreAttivazione) {
        console.error("DB ATTIVAZIONE REJECTED:", erroreAttivazione.dettagli || erroreAttivazione.message);
        return res.status(500).json({ error: "Attivazione non riuscita. Riprova." });
      }
      await contaEvento('tag_attivata');
      // Email di benvenuto (lib/email.js) e, se alla tag manca qualcosa, promemoria il giorno dopo.
      // L'email del titolare resta salvata solo finché il promemoria non parte (api/account.js).
      try {
        const finali = { ...recordAttuale.fields, ...fieldsToSave };
        const mancanti = partiMancanti(finali);
        const inviata = await inviaEmail({ to: diritti.utente.email, ...emailBenvenuto({ tag: safeUsername, nome: finali.username_display, mancanti, scadenza: date.data_scadenza }) });
        await aggiornaTag(recordAttuale.id, { email_benvenuto_il: new Date().toISOString(), promemoria_a: mancanti.length ? diritti.utente.email : null });
        if (!inviata) console.error("EMAIL BENVENUTO: non partita per @" + safeUsername);
      } catch (erroreEmail) {
        console.error('EMAIL BENVENUTO:', erroreEmail.dettagli || erroreEmail.message);
      }
      return res.status(200).json({ success: true, action: 'activated', data_scadenza: date.data_scadenza });
    }

    if (Object.keys(fieldsToSave).length === 0) {
      return res.status(200).json({ success: true, action: 'skipped_empty' });
    }

    try {
      await aggiornaTag(recordAttuale.id, fieldsToSave);
    } catch (updateError) {
      console.error("DB UPDATE REJECTED:", updateError.dettagli || updateError.message);
      return res.status(500).json({ error: "Salvataggio non riuscito. Riprova." });
    }
    return res.status(200).json({ success: true, action: 'updated' });

  } catch (e) {
    console.error("CRASH UPDATE-PROFILE:", e.dettagli || e.message);
    return res.status(500).json({ error: "Errore server" });
  }
}
