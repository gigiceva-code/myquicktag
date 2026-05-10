
export default async function handler(req, res) {
  const { u } = req.query;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  // Proviamo a usare il nome testuale che vedi tu su Airtable
  const TABLE_NAME = 'Table 1'; 

  try {
    // Usiamo encodeURIComponent per gestire lo spazio tra Table e 1
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?filterByFormula={nome}='${u}'`;
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });

    const data = await response.json();

    if (data.records && data.records.length > 0) {
      return res.status(200).json(data.records[0].fields);
    } else {
      // Se non lo trova, restituiamo un errore chiaro
      return res.status(404).json({ errore: "Profilo non trovato nel database" });
    }
  } catch (error) {
    return res.status(500).json({ errore: error.message });
  }
}
