export default async function handler(req, res) {
  // Accetta solo richieste POST per sicurezza
  if (req.method !== 'POST') return res.status(405).send('Metodo non consentito');

  const { u } = req.query;
  if (!u) return res.status(400).json({ error: "Utente mancante" });

  try {
    // 1. Cerca l'utente su Airtable e recupera SOLO la colonna views per massima velocità
    const formula = `{username_system}='${u}'`;
    const searchUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}?filterByFormula=${encodeURIComponent(formula)}&fields%5B%5D=views`;
    
    const response = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` }
    });
    const data = await response.json();

    if (!data.records || data.records.length === 0) {
        return res.status(404).json({ error: "Utente non trovato" });
    }

    const record = data.records[0];
    const recordId = record.id;
    // Se la colonna views è vuota, parte da 0
    const currentViews = record.fields.views || 0;

    // 2. Aggiorna il record sommando 1
    const update = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}/${recordId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: { views: currentViews + 1 }
      })
    });

    if (update.ok) {
        return res.status(200).json({ success: true, views: currentViews + 1 });
    } else {
        const err = await update.json();
        return res.status(500).json({ error: "Errore aggiornamento Airtable", details: err });
    }

  } catch (e) {
    console.error("CRASH TRACK-VIEW:", e);
    return res.status(500).json({ error: e.message });
  }
}
