export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Metodo non consentito');

  const body = req.body;
  const { username_system } = body; 

  if (!username_system) {
    return res.status(400).json({ error: "username_system mancante" });
  }

  try {
    // 1. Cerchiamo se l'utente esiste già
    const searchUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}?filterByFormula={username_system}='${username_system}'`;
    
    const response = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` }
    });
    const data = await response.json();

    // Prepariamo i campi comuni (bio, social, etc.)
    const fieldsToSave = {};
    const validFields = [
      "username_display", "bio", "plan", "digital_style", "email", "phone", 
      "whatsapp", "instagram", "tiktok", "facebook", "linkedin", "youtube", 
      "x", "telegram", "reddit", "sito_web", "cv", "stato", "password"
    ];
    
    validFields.forEach(f => {
      if (body[f] !== undefined) fieldsToSave[f] = body[f];
    });

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
      
    } else {
      // --- LOGICA CREATE (Il cuore dell'architettura finale) ---
      // Aggiungiamo i campi obbligatori per il nuovo profilo
      fieldsToSave.username_system = username_system;
      fieldsToSave.stato = "In attesa"; 
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
    }

    return res.status(500).json({ error: "Errore durante l'operazione su Airtable" });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
