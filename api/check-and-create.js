export default async function handler(req, res) {
  const { nomeTag } = req.query;
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = 'Table 1'; // Ho corretto anche questo in 'Table 1' come da screenshot

  try {
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${table}?filterByFormula={Nome}='${nomeTag}'`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();

    let recordEsistente = data.records.length > 0 ? data.records[0] : null;
    const oggi = new Date();

    if (recordEsistente) {
      // USO I NOMI DELLE COLONNE CHE VEDO NEI TUOI SCREENSHOT
      const dataScadenzaStr = recordEsistente.fields['data_scadenza']; 
      
      if (dataScadenzaStr) {
        const dataScadenza = new Date(dataScadenzaStr);
        
        // Calcoliamo la fine della grazia (Scadenza + 14 giorni)
        const fineGrazia = new Date(dataScadenza);
        fineGrazia.setDate(fineGrazia.getDate() + 14);

        // Se oggi siamo ancora dentro il periodo di grazia, è occupato
        if (oggi < fineGrazia) {
          return res.status(200).json({ 
            disponibile: false, 
            messaggio: "Ops! Il nome @" + nomeTag + " è già occupato. Provane un altro!" 
          });
        }
      }
    }

    // Se arriviamo qui, il tag è LIBERO o SCADUTO DA OLTRE 14 GIORNI
    const inizio = oggi.toISOString().split('T')[0];
    const scadenzaNuova = new Date();
    scadenzaNuova.setFullYear(scadenzaNuova.getFullYear() + 1);
    const fine = scadenzaNuova.toISOString().split('T')[0];

    const campi = {
      'Nome': nomeTag,
      'data_inizio': inizio,
      'data_scadenza': fine,
      'bio': '', 
      'linkedin': '', 
      'instagram': '', 
      'tiktok': ''
    };

    if (recordEsistente) {
      // SOVRASCRIVIAMO IL VECCHIO RECORD SCADUTO
      await fetch(`https://api.airtable.com/v0/${baseId}/${table}/${recordEsistente.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: campi })
      });
    } else {
      // CREIAMO UN NUOVO RECORD
      await fetch(`https://api.airtable.com/v0/${baseId}/${table}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: campi })
      });
    }

    return res.status(200).json({ disponibile: true });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
