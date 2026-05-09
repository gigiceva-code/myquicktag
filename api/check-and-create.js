export default async function handler(req, res) {
  const { nomeTag } = req.query;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_ID = 'tblywlZwSsFKWsQn4'; 

  try {
    // 1. Controlla se il nome esiste già
    const checkRes = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula={Nome}='${nomeTag}'`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const checkData = await checkRes.json();

    if (checkData.records && checkData.records.length > 0) {
      // Se esiste, diciamo al sito che è "già preso" ma procediamo comunque
      return res.status(200).json({ disponibile: false, messaggio: "Esiste già" });
    }

    // 2. Se non esiste, lo CREIAMO ora
    const createRes = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{ fields: { Nome: nomeTag } }]
        })
      }
    );

    const createData = await createRes.json();
    
    if (createData.records) {
      return res.status(200).json({ disponibile: true, messaggio: "Creato con successo" });
    } else {
      return res.status(500).json({ errore: "Airtable non ha creato il record" });
    }

  } catch (error) {
    return res.status(500).json({ errore: error.message });
  }
}
