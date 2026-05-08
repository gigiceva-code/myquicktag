
export default async function handler(req, res) {
  const { nomeTag } = req.query;
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  
  // Usiamo direttamente il nome che vedo nei tuoi screenshot
  const table = 'Table 1'; 

  try {
    // 1. Cerchiamo se esiste già il nome
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${table}?filterByFormula={Nome}='${nomeTag}'`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: "Errore Airtable: " + errorText });
    }

    const data = await response.json();
    let recordEsistente = data.records.length > 0 ? data.records[0] : null;
    const oggi = new Date();

    if (recordEsistente) {
      const dataScadenzaStr = recordEsistente.fields['data_scadenza']; 
      if (dataScadenzaStr) {
        const dataScadenza = new Date(dataScadenzaStr);
        const fineGrazia = new Date(dataScadenza);
        fineGrazia.setDate(fineGrazia.getDate() + 14);

        // Se siamo ancora nei 14 giorni di grazia, è occupato
        if (oggi < fineGrazia) {
          return res.status(200).json({ disponibile: false });
        }
      }
    }

    // 2. Prepariamo i dati per la creazione/sovrascrittura
    const inizio = oggi.toISOString().split('T')[0];
    const scadenzaNuova = new Date();
    scadenzaNuova.setFullYear(scadenzaNuova.getFullYear() + 1);
    const fine = scadenzaNuova.toISOString().split('T')[0];

    const campi = {
      'Nome': nomeTag, // Deve corrispondere alla prima colonna rinominata
      'data_inizio': inizio,
      'data_scadenza': fine,
      'stato': 'attivo'
    };

    if (recordEsistente) {
      // Aggiorniamo quello scaduto
      await fetch(`https://api.airtable.com/v0/${baseId}/${table}/${recordEsistente.id}`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ fields: campi })
      });
    } else {
      // Creiamo uno nuovo
      await fetch(`https://api.airtable.com/v0/${baseId}/${table}`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ fields: campi })
      });
    }

    // 3. MANDIAMO INDIETRO I DATI ALLA INDEX
    return res.status(200).json({ disponibile: true, user: nomeTag });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
