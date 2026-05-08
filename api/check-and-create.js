export default async function handler(req, res) {
  // Prendiamo il nome dalla richiesta. Usiamo 'nomeTag' come riferimento.
  const { nomeTag } = req.query;
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = 'Table 1'; 

  // Se per caso la index manda ancora "nome", lo intercettiamo qui per sicurezza
  const tagDaVerificare = nomeTag || req.query.nome;

  if (!tagDaVerificare) {
    return res.status(400).json({ error: "Parametro nomeTag mancante nella richiesta" });
  }

  try {
    // 1. Cerchiamo se il tag esiste già nella colonna "Nome"
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${table}?filterByFormula={Nome}='${tagDaVerificare}'`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();

    let recordEsistente = data.records.length > 0 ? data.records[0] : null;
    const oggi = new Date();

    if (recordEsistente) {
      const dataScadenzaStr = recordEsistente.fields['data_scadenza']; 
      if (dataScadenzaStr) {
        const dataScadenza = new Date(dataScadenzaStr);
        
        // Calcoliamo la fine del periodo di grazia (14 giorni)
        const fineGrazia = new Date(dataScadenza);
        fineGrazia.setDate(fineGrazia.getDate() + 14);

        // Se siamo ancora entro i 14 giorni dalla scadenza, il tag è OCCUPATO
        if (oggi < fineGrazia) {
          return res.status(200).json({ 
            disponibile: false, 
            messaggio: "Ops! Il nome @" + tagDaVerificare + " è occupato o in fase di rinnovo." 
          });
        }
      }
    }

    // 2. Se arriviamo qui, il tag è LIBERO (perché scaduto o inesistente)
    // Prepariamo le date per il nuovo ciclo di 1 anno
    const inizio = oggi.toISOString().split('T')[0];
    const scadenzaNuova = new Date();
    scadenzaNuova.setFullYear(scadenzaNuova.getFullYear() + 1);
    const fine = scadenzaNuova.toISOString().split('T')[0];

    const campi = {
      'Nome': tagDaVerificare,
      'data_inizio': inizio,
      'data_scadenza': fine,
      'stato': 'attivo',
      'bio': '', 'linkedin': '', 'instagram': '', 'tiktok': ''
    };

    if (recordEsistente) {
      // Sovrascriviamo il vecchio record (pulizia dati precedenti)
      await fetch(`https://api.airtable.com/v0/${baseId}/${table}/${recordEsistente.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: campi })
      });
    } else {
      // Creiamo un record totalmente nuovo
      await fetch(`https://api.airtable.com/v0/${baseId}/${table}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: campi })
      });
    }

    // 3. RISPOSTA FONDAMENTALE per la index.html
    return res.status(200).json({ 
      disponibile: true, 
      user: tagDaVerificare 
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
