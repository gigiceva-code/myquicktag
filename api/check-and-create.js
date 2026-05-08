
export default async function handler(req, res) {
  const { nomeTag } = req.query;
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = 'Table%201';

  try {
    // 1. CONTROLLO ESCLUSIVITÀ: Cerchiamo se il nome esiste già
    const checkRes = await fetch(`https://api.airtable.com/v0/${baseId}/${table}?filterByFormula={Nome}='${nomeTag}'`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await checkRes.json();

    if (data.records && data.records.length > 0) {
      // Il nome esiste già! Blocchiamo tutto.
      return res.status(200).json({ disponibile: false, messaggio: "Questo nome è già stato preso. Scegline un altro!" });
    }

    // 2. CREAZIONE: Se non esiste, lo creiamo
    const createRes = await fetch(`https://api.airtable.com/v0/${baseId}/${table}`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ fields: { 'Nome': nomeTag, 'stato': 'attivo' } })
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      return res.status(200).json({ disponibile: false, messaggio: "Errore Airtable: " + err.error.message });
    }

    // 3. SUCCESSO: Mandiamo il via libera
    return res.status(200).json({ disponibile: true, user: nomeTag });

  } catch (e) {
    return res.status(200).json({ disponibile: false, messaggio: "Errore sistema: " + e.message });
  }
}
