
export default async function handler(req, res) {
  const { nomeTag } = req.query;
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = 'Table 1';

  try {
    const campi = {
      'Nome': nomeTag,
      'stato': 'attivo',
      'data_inizio': new Date().toISOString().split('T')[0]
    };

    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${table}`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ fields: campi })
    });

    return res.status(200).json({ disponibile: true, user: nomeTag });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
