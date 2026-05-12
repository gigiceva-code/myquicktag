
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  // Prendiamo il valore a prescindere dal nome che gli dà la index
  const username_inviato = req.body.username || req.body.username_system;

  if (!username_inviato) {
      return res.status(400).json({ errore: "Nessun nome ricevuto dal form" });
  }

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_ID = process.env.AIRTABLE_TABLE_ID; 

  const systemName = username_inviato.replace('@', '').toLowerCase().trim();

  try {
    // 1. Controllo esistenza
    const checkUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula={username_system}='${systemName}'`;
    const check = await fetch(checkUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    const checkData = await check.json();

    if (checkData.records && checkData.records.length > 0) {
      return res.status(200).json({ available: false });
    }

    // 2. Creazione record - CONTROLLA CHE I NOMI CAMPI SIANO IDENTICI SU AIRTABLE
    const create = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          "username_system": systemName,
          "username_display": username_inviato.startsWith('@') ? username_inviato : '@' + username_inviato,
          "digital_style": "black", 
          "plan": "BASE"
        }
      })
    });

    const createData = await create.json();
    
    if (!create.ok) {
        // Questo ci dirà esattamente PERCHÉ Airtable rifiuta (es. nome colonna errato)
        return res.status(500).json({ errore: "Errore Airtable", dettagli: createData });
    }

    return res.status(200).json({ available: true, username_system: systemName });
    
  } catch (e) {
    return res.status(500).json({ errore: e.message });
  }
}
