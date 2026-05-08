export default async function handler(req, res) {
  const { nomeTag } = req.query;
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;

  try {
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/Table%201`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ fields: { 'Nome': nomeTag, 'stato': 'attivo' } })
    });

    const risultato = await response.json();

    if (!response.ok) {
      // Se Airtable risponde picche, mandiamo l'errore al sito
      return res.status(200).json({ disponibile: false, messaggio: "Airtable dice: " + JSON.stringify(risultato.error) });
    }

    return res.status(200).json({ disponibile: true, user: nomeTag });
  } catch (e) {
    return res.status(200).json({ disponibile: false, messaggio: "Errore Sistema: " + e.message });
  }
}
