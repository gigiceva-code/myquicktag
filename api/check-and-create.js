export default async function handler(req, res) {
  const { nomeTag } = req.query;
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = 'Table 1'; 

  try {
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${table}?filterByFormula={Nome}='${nomeTag}'`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();

    let recordEsistente = data.records.length > 0 ? data.records[0] : null;
    const oggi = new Date();

    if (recordEsistente) {
      const dataScadenzaStr = recordEsistente.fields['data_scadenza']; 
      if (dataScadenzaStr) {
        const dataScadenza = new Date(dataScadenzaStr);
        const fineGrazia = new Date(dataScadenza);
        fineGrazia.setDate(fineGrazia.getDate() + 14);

        if (oggi < fineGrazia) {
          return res.status(200).json({ disponibile: false, messaggio: "Occupato" });
        }
      }
    }

    const inizio = oggi.toISOString().split('T')[0];
    const scadenzaNuova = new Date();
    scadenzaNuova.setFullYear(scadenzaNuova.getFullYear() + 1);
    const fine = scadenzaNuova.toISOString().split('T')[0];

    const campi = {
      'Nome': nomeTag, 
      'data_inizio': inizio,
      'data_scadenza': fine,
      'stato': 'attivo',
      'bio': '', 'linkedin': '', 'instagram': '', 'tiktok': ''
    };

    if (recordEsistente) {
      await fetch(`https://api.airtable.com/v0/${baseId}/${table}/${recordEsistente.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: campi })
      });
    } else {
      await fetch(`https://api.airtable.com/v0/${baseId}/${table}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: campi })
      });
    }

    // IL SEGRETO È QUI: Mandiamo 'user' indietro al sito
    return res.status(200).json({ disponibile: true, user: nomeTag });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
