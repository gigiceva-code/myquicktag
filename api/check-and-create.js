export default async function handler(req, res) {
  const { nomeTag } = req.query;
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = 'Tabella 1'; 

  try {
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${table}?filterByFormula={Nome}='${nomeTag}'`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();

    let recordEsistente = data.records.length > 0 ? data.records[0] : null;
    const oggi = new Date();

    if (recordEsistente) {
      const dataScadenzaStr = recordEsistente.fields['Data Scadenza'];
      if (dataScadenzaStr) {
        const dataScadenza = new Date(dataScadenzaStr);
        
        // Calcoliamo la fine della grazia (Scadenza + 14 giorni)
        const fineGrazia = new Date(dataScadenza);
        fineGrazia.setDate(fineGrazia.getDate() + 14);

        // Se oggi siamo ancora dentro il periodo di grazia, è occupato
        if (oggi < fineGrazia) {
          return res.status(200).json({ 
            disponibile: false, 
            messaggio: "Nome occupato (in fase di rinnovo)" 
          });
        }
      }
    }

    // Se arriviamo qui, il tag è LIBERO (perché oltre i 14gg o inesistente)
    const inizio = oggi.toISOString().split('T')[0];
    const scadenzaNuova = new Date();
    scadenzaNuova.setFullYear(scadenzaNuova.getFullYear() + 1);
    const fine = scadenzaNuova.toISOString().split('T')[0];

    const campi = {
      'Nome': nomeTag,
      'Data Inizio': inizio,
      'Data Scadenza': fine,
      'Bio': '', 'LinkedIn': '', 'Instagram': '', 'TikTok': '', 'Foto': [] 
    };

    if (recordEsistente) {
      // SOVRASCRIVE E PULISCE TUTTO
      await fetch(`https://api.airtable.com/v0/${baseId}/${table}/${recordEsistente.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: campi })
      });
    } else {
      // CREA NUOVO
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
