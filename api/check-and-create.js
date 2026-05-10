export default async function handler(req, res) {
  const { nomeTag } = req.query;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_ID = 'tblywlZwSsFKWsQn4'; 

  try {
    // Ricerca dell'utente con URL corretto
    const urlCheck = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula={nome}='${nomeTag}'`;
    const checkRes = await fetch(urlCheck, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    const checkData = await checkRes.json();

    if (checkData.records && checkData.records.length > 0) {
      return res.status(200).json({ disponibile: false });
    }

    // Creazione nuovo record con URL corretto
    const urlCreate = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
    const createRes = await fetch(urlCreate, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [{ fields: { "nome": nomeTag } }]
      })
    });

    const createData = await createRes.json();
    return res.status(200).json({ disponibile: !!createData.records });

  } catch (error) {
    return res.status(500).json({ errore: error.message });
  }
}
