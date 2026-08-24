
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Metodo non consentito');

  const body = req.body;
  const { username_system } = body; 

  if (!username_system) {
    return res.status(400).json({ error: "username_system mancante" });
  }

  try {
    const formula = `{username_system}='${username_system}'`;
    const searchUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}?filterByFormula=${encodeURIComponent(formula)}`;
    
    const response = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` }
    });
    const data = await response.json();

    const fieldsToSave = {};
    
    // 1. LA LISTA VIP (Aggiunti pocket_cloud, flash_micro e live_status_micro)
    const nativeFields = [
      "username_display", "bio", "cv", "digital_style", "digital_layout", "stato", 
      "password", "email", "modulo_vcf", "sito_web", 
      "quick_action_tipo", "quick_action_label", "quick_action_url", "avatar_url",
      "live_status_color", "live_status_text", "live_status_micro", "live_status_action_type", "live_status_action_label", "live_status_action_url",
      "flash_text", "flash_micro", "flash_expiry", 
      "pdf_label", "pdf_url", 
      "gallery_data", "draft_json", "sedi_json",
      "quickpass_premio_a", "quickpass_premio_b", "quickpass_limite", "quickpass_scadenza",
      "pocket_cloud", "review_url", "review_contact"
    ];

    nativeFields.forEach(f => {
      if (body[f] !== undefined && body[f] !== null) {
        if (typeof body[f] === 'string') {
          
          // 2. PROTEZIONE JSON (Aggiunto pocket_cloud per non far distruggere le virgolette)
          let valueClean = (f === 'draft_json' || f === 'modulo_vcf' || f === 'config_canali' || f === 'sedi_json' || f === 'gallery_data' || f === 'pocket_cloud')
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

    if (data.records && data.records.length > 0) {
      const recordId = data.records[0].id;
      
      // 3. PARACADUTE ANTI-CRASH: Se non ci sono campi validi, blocca la chiamata invece di far infuriare Airtable
      if (Object.keys(fieldsToSave).length === 0) {
          return res.status(200).json({ success: true, action: 'skipped_empty' });
      }

      const update = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}/${recordId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: fieldsToSave })
      });

      if (update.ok) return res.status(200).json({ success: true, action: 'updated' });
      
      const updateError = await update.json();
      console.error("AIRTABLE UPDATE REJECTED:", updateError);
      return res.status(500).json({ error: "Airtable ha rifiutato l'update", dettagli: updateError });
      
    } else {
      fieldsToSave.username_system = username_system;
      if (!fieldsToSave.stato) fieldsToSave.stato = "in attesa";
      fieldsToSave.views = 0;

      const create = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: fieldsToSave })
      });

      if (create.ok) return res.status(200).json({ success: true, action: 'created' });
      
      const createError = await create.json();
      console.error("AIRTABLE CREATE REJECTED:", createError);
      return res.status(500).json({ error: "Airtable ha rifiutato la creazione", dettagli: createError });
    }

  } catch (e) {
    console.error("CRASH INTERNO SERVERLESS FUNCTION:", e);
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}
