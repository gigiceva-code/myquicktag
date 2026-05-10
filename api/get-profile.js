export default async function handler(req, res) {
  const { u } = req.query; // Legge il parametro 'u' dall'indirizzo
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_ID = 'tblywlZwSsFKWsQn4'; 

  try {
    // COSTRUZIONE URL CORRETTA: BASE_ID + / + TABLE_ID
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula={nome}='${u}'`;
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });

    const data = await response.json();

    if (data.records && data.records.length > 0) {
      return res.status(200).json(data.records[0].fields);
    } else {
      return res.status(404).json({ errore: "Profilo non trovato" });
    }
  } catch (error) {
    return res.status(500).json({ errore: error.message });
  }
}
