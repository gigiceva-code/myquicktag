export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Metodo non consentito');

  const body = req.body;
  const { username_system } = body; 

  if (!username_system) {
    return res.status(400).json({ error: "username_system mancante" });
  }

  try {
    // 1. Ricerca utente con URL encoding sicuro
    const formula = `{username_system}='${username_system}'`;
    const searchUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}?filterByFormula=${encodeURIComponent(formula)}`;
    
    const response = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` }
    });
    const data = await response.json();

    // 2. Definizione Campi Nativi
    const fieldsToSave = {};
    const nativeFields = ["username_display", "bio", "plan", "digital_style", "stato", "password", "email", "modulo_vcf"];
    
    nativeFields.forEach(f => {
      if (body[f] !== undefined) {
        if (typeof body[f] === 'string') {
          let valueClean = body[f].replace(/['"]+/g, '').trim();
          
          if (valueClean !== "") {
            // Mappatura rigida per i valori a scelta multipla dello stile (maiuscoli su Airtable)
            if (f === "digital_style") {
              const upper = valueClean.toUpperCase();
              if (upper === "BLACK" || upper === "BLACK DNA") valueClean = "BLACK DNA";
              else if (upper === "TITANIUM") valueClean = "TITANIUM";
              else if (upper === "OBSIDIAN" || upper === "OBSIDIAN GOLD") valueClean = "OBSIDIAN GOLD";
            }
            
            if (f === "plan") {
              valueClean = valueClean.toUpperCase(); // BASE, PREMIUM, GOLD
            }

            if (f === "stato") {
              // Passa il valore esattamente in minuscolo come richiesto dal tuo database
              valueClean = valueClean.toLowerCase();
            }

            fieldsToSave[f] = valueClean;
          }
        } else {
          fieldsToSave[f] = body[f];
        }
      }
    });

    // 3. Logica Dinamica Contenitore Canali
    const canaliObj = {};
    Object.keys(body).forEach(key => {
      if (key !== "username_system" && !nativeFields.includes(key) && body[key] !== undefined) {
        if (typeof body[key] === 'string') {
          const valClean = body[key].trim();
          if (valClean !== "") canaliObj[key] = valClean;
        } else {
          canaliObj[key] = body[key];
        }
      }
    });
    
    fieldsToSave.config_canali = JSON.stringify(canaliObj);

    if (data.records && data.records.length > 0) {
      // --- LOGICA UPDATE ---
      const recordId = data.records[0].id;
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
      // --- LOGICA CREATE ---
      fieldsToSave.username_system = username_system;
      if (!fieldsToSave.stato) fieldsToSave.stato = "in attesa"; // Default tutto minuscolo coerente con Airtable
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
