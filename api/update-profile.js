import crypto from 'crypto';
import { trovaTag, aggiornaTag } from '../lib/db.js';
import { calcolaAbbonamento, dateAttivazione, nuovaScadenzaRinnovo, rinnovoConsentito } from '../lib/abbonamento.js';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Metodo non consentito');

  const body = req.body;
  const { username_system, sessionToken } = body;

  if (!username_system) {
    return res.status(400).json({ error: "username_system mancante" });
  }

  // --- FIX SICUREZZA 1: Protezione da iniezioni ---
  // Puliamo il nome utente tenendo solo lettere, numeri, trattini e underscore.
  // Questo distrugge qualsiasi tentativo di inserire codici dannosi come ' OR '1'='1
  const safeUsername = username_system.replace(/[^a-zA-Z0-9_-]/g, '');

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
      if (body[f] !== undefined && body[f] !== null) {
        if (typeof body[f] === 'string') {
          
          let valueClean = (f === 'draft_json' || f === 'modulo_vcf' || f === 'config_canali' || f === 'sedi_json' || f === 'gallery_data' || f === 'pocket_cloud' || f === 'partners_data')
          ? body[f].trim() 
          : body[f].replace(/['"]+/g, '').trim(); 
          
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
          if (f === 'modulo_vcf' && typeof body[f] === 'object') {
            fieldsToSave[f] = JSON.stringify(body[f]);
          } else {
            fieldsToSave[f] = body[f];
          }
        }
      }
    });

    if (body.config_canali !== undefined && body.config_canali !== null) {
      fieldsToSave.config_canali = typeof body.config_canali === 'object' ? JSON.stringify(body.config_canali) : body.config_canali;
    }

    if (recordAttuale) {
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
