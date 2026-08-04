export default async function handler(req, res) {
  const { u } = req.query;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_ID = process.env.AIRTABLE_TABLE_ID; 

  if (!u) return res.status(400).json({ success: false, error: "Username mancante" });

  try {
    // Cerchiamo nella colonna corretta "username_system"
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula={username_system}='${u.toLowerCase()}'`;
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });

    const data = await response.json();

    if (data.records && data.records.length > 0) {
      // Creiamo l'oggetto finale da mandare al frontend partendo dai campi nativi
      return res.status(200).json({
        success: true,
        id: data.records[0].id,
        fields: data.records[0].fields
      });
    } else {
      return res.status(404).json({ success: false, error: "Profilo non trovato" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
