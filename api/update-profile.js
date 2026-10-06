import crypto from 'crypto';
import { trovaTag, aggiornaTag } from '../lib/db.js';
import { pulisciTesto, pulisciJson, pulisciValore } from '../lib/pulizia.js';
import { proteggiPassword, hashClienteValido } from '../lib/password.js';
import { calcolaAbbonamento, dateAttivazione, nuovaScadenzaRinnovo, rinnovoConsentito } from '../lib/abbonamento.js';
import { nomeTag, formaCanonica } from '../lib/nome-canonico.js';
import { controllaNome } from '../lib/nomi-riservati.js';

// Campi salvati come testo JSON: si puliscono i valori, non la sintassi
const CAMPI_JSON = ['draft_json', 'modulo_vcf', 'config_canali', 'sedi_json', 'gallery_data', 'pocket_cloud', 'partners_data'];

function generateToken(username) {
  const expiry = Date.now() + (1000 * 60 * 60 * 24 * 90); // 90 giorni
  const payload = `${username}.${expiry}`;
  const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

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

// Campi che si possono scrivere da qui, letti da un oggetto (la richiesta o la bozza), ripuliti
function estraiCampi(sorgente) {
  const fieldsToSave = {};

  // --- FIX DATI 2: Aggiunto "quick_action_copertina" alla lista ---
  const nativeFields = [
    "username_display", "bio", "cv", "digital_style", "digital_layout", "stato", 
    "password", "email", "modulo_vcf", "sito_web", 
    "quick_action_tipo", "quick_action_label", "quick_action_url", "quick_action_copertina", "avatar_url",
    "live_status_color", "live_status_text", "live_status_micro", "live_status_action_type", "live_status_action_label", "live_status_action_url",
    "flash_text", "flash_micro", "flash_expiry", 
    "pdf_label", "pdf_url", 
    "gallery_data", "draft_json", "sedi_json",
    "quickpass_premio_a", "quickpass_premio_b", "quickpass_limite", "quickpass_scadenza",
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
        
        if (f === 'draft_json' || valueClean !== "") {
          if (f === "digital_style") {
            const upper = valueClean.toUpperCase();
            if (upper === "BLACK" || upper === "BLACK DNA") valueClean = "BLACK DNA";
            else if (upper === "TITANIUM") valueClean = "TITANIUM";
            else if (upper === "OBSIDIAN" || upper === "OBSIDIAN GOLD") valueClean = "OBSIDIAN GOLD";
          }
          
          if (f === "stato") valueClean = valueClean.toLowerCase();
          if (f === "quick_action_tipo") valueClean = valueClean.toLowerCase();
          
          if (f === "quickpass_limite") {
              const parsed = parseInt(valueClean, 10);
              if (!isNaN(parsed)) fieldsToSave[f] = parsed;
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
    // Usiamo il nome utente pulito e sicuro per cercare nel database
    const recordAttuale = await trovaTag(safeUsername);

    // --- FIX SICUREZZA: ogni scrittura richiede un token valido.
    // - Account attivo: il token arriva dal login.
    // - Tag "in attesa": il token è la ricevuta data da check-and-create.js a chi l'ha prenotata
    //   (vale 24h). Così nessun altro può modificarla o impostarne la prima password.
    // I visitatori anonimi non scrivono più qui: contatti e click passano da api/add-lead.js
    // e api/track-click.js, che aggiungono una voce senza poter leggere o cancellare le altre.
    const tokenValido = verifyToken(safeUsername, sessionToken);
    if (!tokenValido) {
      return res.status(401).json({ error: "Non autorizzato: sessione mancante o non valida" });
    }

    // --- DURATA TAG (90 giorni + 14 di grazia, vedi lib/abbonamento.js) ---
    const statoAttuale = String(recordAttuale?.fields?.stato || '').toLowerCase().trim();
    const abbonamento = recordAttuale && statoAttuale === 'attivo' ? calcolaAbbonamento(recordAttuale) : null;

    // Rinnovo: solo il proprietario (token valido), solo negli ultimi 14 giorni, in grazia o dopo
    if (body.rinnova === true) {
      if (!abbonamento) {
        return res.status(403).json({ error: "Rinnovo non consentito" });
      }
      if (!rinnovoConsentito(abbonamento)) {
        return res.status(400).json({ error: "Il rinnovo sarà disponibile negli ultimi 14 giorni del piano", abbonamento });
      }
      const nuovaScadenza = nuovaScadenzaRinnovo(abbonamento);
      try {
        await aggiornaTag(recordAttuale.id, { data_scadenza: nuovaScadenza });
      } catch (erroreRinnovo) {
        console.error("DB RINNOVO REJECTED:", erroreRinnovo.dettagli || erroreRinnovo);
        return res.status(500).json({ error: "Rinnovo non riuscito" });
      }
      const recordRinnovato = { ...recordAttuale, fields: { ...recordAttuale.fields, data_scadenza: nuovaScadenza } };
      return res.status(200).json({ success: true, action: 'renewed', abbonamento: calcolaAbbonamento(recordRinnovato), sessionToken: generateToken(safeUsername) });
    }

    // Tag scaduta (finita anche la grazia): niente modifiche finché non viene rinnovata
    if (abbonamento && abbonamento.fase === 'scaduta') {
      return res.status(403).json({ error: "Tag scaduta: rinnova per modificarla", scaduta: true, abbonamento });
    }
    const fieldsToSave = estraiCampi(body);

    // Attivazione (da "in attesa" ad attiva, con la prima password): la bozza scritta nell'editor
    // prima dell'attivazione diventa la tag pubblica, così i visitatori vedono subito i contenuti.
    // I campi della richiesta hanno la precedenza su quelli della bozza.
    const attivaOra = fieldsToSave.stato === 'attivo' && statoAttuale === 'in attesa' &&
      !!(fieldsToSave.password || recordAttuale?.fields?.password);
    if (attivaOra && recordAttuale.fields.draft_json) {
      let bozza = null;
      try { bozza = JSON.parse(recordAttuale.fields.draft_json); } catch { bozza = null; }
      if (bozza && typeof bozza === 'object' && !Array.isArray(bozza)) {
        const daBozza = estraiCampi(bozza);
        delete daBozza.stato; delete daBozza.password; delete daBozza.draft_json;
        Object.assign(fieldsToSave, { ...daBozza, ...fieldsToSave, draft_json: '' });
      }
    }

    // Lo stato si cambia solo all'attivazione: da "in attesa" ad "attivo", insieme alla password.
    // (Con i pagamenti veri l'attivazione la confermerà il server dopo il pagamento.)
    if (fieldsToSave.stato !== undefined) {
      const attivazione = fieldsToSave.stato === 'attivo' && statoAttuale === 'in attesa' &&
        !!(fieldsToSave.password || recordAttuale?.fields?.password);
      if (!attivazione) delete fieldsToSave.stato;
    }

    // Il nome mostrato può solo aggiungere spazi/maiuscole al nome della tag: la sua forma canonica deve coincidere
    if (fieldsToSave.username_display !== undefined) {
      if (formaCanonica(fieldsToSave.username_display).nome !== safeUsername) delete fieldsToSave.username_display;
    }

    if (recordAttuale) {
      // Attivazione (da "in attesa" ad attiva, cioè prima password): si ricontrollano i nomi protetti.
      // Se il nome è entrato nella lista dopo la prenotazione, la tag non si attiva (né si cancella):
      // il titolare può richiederlo tramite il canale dedicato.
      const staAttivando = statoAttuale === 'in attesa' &&
        (fieldsToSave.stato === 'attivo' || (fieldsToSave.password && !recordAttuale.fields.password));
      if (staAttivando) {
        const protetto = await controllaNome(safeUsername);
        if (protetto) {
          return res.status(403).json({ error: protetto.messaggio, codice: protetto.codice, email: protetto.email });
        }
      }

      // La password qui si imposta SOLO la prima volta (attivazione dal checkout).
      // Per cambiarla serve anche quella attuale: api/change-password.js (pagina Account).
      if (fieldsToSave.password && recordAttuale.fields.password) {
        delete fieldsToSave.password;
      }
      // Prima password: deve essere un hash SHA-256 dal browser e si salva protetta con scrypt
      if (fieldsToSave.password !== undefined) {
        if (!hashClienteValido(String(fieldsToSave.password))) {
          return res.status(400).json({ error: "Password non valida" });
        }
        fieldsToSave.password = await proteggiPassword(String(fieldsToSave.password));
      }

      // Attivazione (prima password): il server scrive le date del piano, mai il browser
      if (fieldsToSave.password && !recordAttuale.fields.password) {
        Object.assign(fieldsToSave, dateAttivazione());
      }

      if (Object.keys(fieldsToSave).length === 0) {
          return res.status(200).json({ success: true, action: 'skipped_empty' });
      }

      try {
        await aggiornaTag(recordAttuale.id, fieldsToSave);
      } catch (updateError) {
        console.error("DB UPDATE REJECTED:", updateError.dettagli || updateError);
        return res.status(500).json({ error: "Il database ha rifiutato l'update", dettagli: updateError.dettagli });
      }

      const responseBody = { success: true, action: 'updated' };
      // Sessione "scorrevole" (come Google/Instagram): ogni salvataggio di un account attivo
      // rinnova il token per altri 90 giorni. Le ricevute di prenotazione (tag senza password)
      // NON vengono rinnovate: restano legate alle 24h della prenotazione.
      const accountConPassword = !!(fieldsToSave.password || recordAttuale.fields.password);
      if (fieldsToSave.password || (tokenValido && accountConPassword)) {
        responseBody.sessionToken = generateToken(safeUsername);
      }
      return res.status(200).json(responseBody);
      
    } else {
      // La tag non esiste: le tag nascono solo dalla prenotazione (check-and-create.js),
      // qui si modificano soltanto quelle già esistenti.
      return res.status(404).json({ error: "Tag non trovata" });
    }

  } catch (e) {
    console.error("CRASH INTERNO SERVERLESS FUNCTION:", e);
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}
