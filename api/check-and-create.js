
export default async function handler(req, res) {
  const { nomeTag } = req.query;
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = 'Table 1'; 

  try {
    // 1. Cerchiamo se esiste già
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${table}?filterByFormula={Nome}='${nomeTag}'`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    let recordEsistente = data.records.length > 0 ? data.records[0] : null;

    const oggi = new Date();
    const inizio = oggi.toISOString().split('T')[0];
    const scadenza = new Date();
    scadenza.setFullYear(scadenza.getFullYear() + 1);
    const fine = scadenza.toISOString().split('T')[0];

    // Prepariamo i campi (Assicurati che "Nome" sia il nome della colonna su Airtable)
    const campi = {
      'Nome': nomeTag, 
      'data_inizio': inizio,
      'data_scadenza': fine,
      'stato': 'attivo',
      'bio': '', 'linkedin': '', 'instagram': '', 'tiktok': ''
    };

    if (recordEsistente) {
      // Se esiste ma è scaduto (oltre 14gg), lo sovrascriviamo
      await fetch(`https://api.airtable.com/v0/${baseId}/${table}/${recordEsistente.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: campi })
      });
    } else {
      // Se non esiste, lo creiamo da zero
      await fetch(`https://api.airtable.com/v0/${baseId}/${table}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: campi })
      });
    }

    // Risposta per la index.html
    return res.status(200).json({ disponibile: true, user: nomeTag });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
