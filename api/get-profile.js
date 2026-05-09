export default async function handler(req, res) {
  const { nomeTag } = req.query;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_ID = 'tblywlZwSsFKWsQn4';

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula={nome}='${nomeTag}'`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await response.json();

    if (data.records && data.records.length > 0) {
      return res.status(200).json({ success: true, fields: data.records[0].fields, id: data.records[0].id });
    }
    return res.status(404).json({ success: false, message: "Profilo non trovato" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
