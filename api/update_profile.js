export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  
  const { 
    nomeTag, bio, email, phone, whatsapp, 
    instagram, facebook, linkedin, tiktok, 
    youtube, x, telegram, reddit, sito_web, cv 
  } = req.body;

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_ID = process.env.AIRTABLE_TABLE_ID; 

  try {
    // 1. Trova il record
    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula={nome}='${nomeTag}'`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return res.status(404).json({ error: "Record non trovato" });
    }

    const recordId = data.records[0].id;

    // 2. Aggiorna SOLO i campi di testo (Social e Contatti)
    // Ho rimosso last_update e stato per evitare conflitti di permessi
    const update = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          "bio": bio || "",
          "email": email || "",
          "phone": phone || "",
          "whatsapp": whatsapp || "",
          "instagram": instagram || "",
          "facebook": facebook || "",
          "linkedin": linkedin || "",
          "tiktok": tiktok || "",
          "youtube": youtube || "",
          "x": x || "",
          "telegram": telegram || "",
          "reddit": reddit || "",
          "sito_web": sito_web || "",
          "cv": cv || ""
        }
      })
    });

    if (update.ok) {
      return res.status(200).json({ success: true });
    } else {
      const errData = await update.json();
      // Questo ci dirà esattamente quale colonna rompe le scatole nei log di Vercel
      return res.status(500).json({ error: errData });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
