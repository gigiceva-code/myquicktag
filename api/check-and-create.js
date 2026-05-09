export default async function handler(req, res) {
  const { nomeTag } = req.query;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_ID = 'tblywlZwSsFKWsQn4'; 

  if (!nomeTag) return res.status(400).json({ errore: "Tag mancante" });

  try {
    // Cerchiamo se esiste già (usando il nome della colonna esatto che vedo nelle tue foto: "nome")
    const urlCheck = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula={nome}='${nomeTag}'`;
    const checkRes = await fetch(urlCheck, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    const checkData = await checkRes.json();

    if (checkData.records && checkData.records.length > 0) {
      return res.status(200).json({ disponibile: false });
    }

    // Se non esiste, lo creiamo. 
    // NOTA: Ho messo "nome" tutto minuscolo come nella tua colonna Airtable
    const createRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [{ fields: { "nome": nomeTag, "stato": "Attivo" } }]
      })
    });

    const createData = await createRes.json();
    return res.status(200).json({ disponibile: true, id: createData.records[0].id });

  } catch (error) {
    return res.status(500).json({ errore: error.message });
  }
}
