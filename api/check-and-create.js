
export default async function handler(req, res) {
  const { nomeTag } = req.body;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_ID = process.env.AIRTABLE_TABLE_ID; 

  try {
    // 1. Controllo se esiste
    const check = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula={nome}='${nomeTag}'`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    const checkData = await check.json();

    if (checkData.records && checkData.records.length > 0) {
      return res.status(200).json({ available: false });
    }

    // 2. Creazione (scriviamo solo 'nome' e 'stato')
    const create = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [{ fields: { "nome": nomeTag, "stato": "attivo" } }]
      })
    });

    const createData = await create.json();
    return res.status(200).json({ available: true });
  } catch (e) {
    return res.status(500).json({ errore: e.message });
  }
}
