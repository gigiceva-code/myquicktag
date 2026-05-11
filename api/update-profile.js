export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  
  const body = req.body;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_ID = process.env.AIRTABLE_TABLE_ID; 

  try {
    // 1. Trova il record dell'utente
    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula={nomeTag}='${body.nomeTag}'`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return res.status(404).json({ error: "Record non trovato" });
    }

    const recordId = data.records[0].id;

    // 2. Prepariamo i campi filtrando solo quelli che hanno un valore o il piano
    const fieldsToUpdate = {};
    const validFields = ["bio", "plan", "email", "phone", "whatsapp", "instagram", "facebook", "linkedin", "tiktok", "youtube", "x", "telegram", "reddit", "sito_web", "cv"];
    
    validFields.forEach(f => {
      if (body[f] !== undefined) {
        fieldsToUpdate[f] = body[f] || "";
      }
    });

    // Forza il piano se inviato
    if (body.plan) fieldsToUpdate["plan"] = body.plan;

    const update = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: fieldsToUpdate })
    });

    if (update.ok) {
      return res.status(200).json({ success: true });
    } else {
      const errData = await update.json();
      return res.status(500).json({ error: errData });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
