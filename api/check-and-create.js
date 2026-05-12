
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const { username } = req.body; // Riceve correttamente dalla index
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_ID = process.env.AIRTABLE_TABLE_ID; 

  // CORREZIONE QUI: usiamo 'username' che abbiamo appena estratto
  const systemName = username.replace('@', '').toLowerCase().trim();

  try {
    // 1. Controlliamo se esiste
    const checkUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula={username_system}='${systemName}'`;
    const check = await fetch(checkUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    const checkData = await check.json();

    if (checkData.records && checkData.records.length > 0) {
      return res.status(200).json({ available: false });
    }

    // 2. Creazione
    const create = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          username_system: systemName,
          username_display: username, // Usiamo username
          digital_style: "black", 
          plan: "BASE",           
          views: 0
        }
      })
    });

    return res.status(200).json({ available: true, username_system: systemName });
    
  } catch (e) {
    return res.status(500).json({ errore: e.message });
  }
}
