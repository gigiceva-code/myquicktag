export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const { nomeTag } = req.body; // Riceve @NomeUtente dalla index
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_ID = process.env.AIRTABLE_TABLE_ID; 

  // Normalizziamo il nome per il sistema
  const systemName = nomeTag.replace('@', '').toLowerCase().trim();

  try {
    // 1. Controlliamo se username_system esiste già
    const checkUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula={username_system}='${systemName}'`;
    const check = await fetch(checkUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    const checkData = await check.json();

    if (checkData.records && checkData.records.length > 0) {
      // Se esiste già, diciamo che è disponibile (o rimandiamo alla edit)
      return res.status(200).json({ available: false, username_system: systemName });
    }

    // 2. CREAZIONE: Se non esiste, lo creiamo con le colonne NUOVE
    const create = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
     body: JSON.stringify({
  fields: {
    username_system: systemName,
    username_display: username,
    digital_style: "black", // IMPORTANTE: Imposta il tema base subito
    plan: "BASE",           // IMPORTANTE: Imposta il piano base subito
    views: 0
  }
})
      })
    });

    if (!create.ok) {
      const err = await create.json();
      return res.status(500).json({ error: "Errore Airtable", details: err });
    }

    return res.status(200).json({ available: true, username_system: systemName });
    
  } catch (e) {
    return res.status(500).json({ errore: e.message });
  }
}
