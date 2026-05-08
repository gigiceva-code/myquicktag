export default async function handler(req, res) {
  const { nomeTag } = req.query;
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = 'Tabella 1'; // Assicurati che il nome sia esatto

  try {
    // 1. Cerca se il tag esiste
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${table}?filterByFormula={Nome}='${nomeTag}'`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();

    let recordEsistente = data.records.length > 0 ? data.records[0] : null;
    const oggi = new Date();

    // 2. Logica Scadenza
    if (recordEsistente) {
      const dataScadenzaStr = recordEsistente.fields['Data Scadenza'];
      const dataScadenza = dataScadenzaStr ? new Date(dataScadenzaStr) : null;

      // Se NON è scaduto, blocca tutto
      if (dataScadenza && dataScadenza > oggi) {
        return res.status(200).json({ disponibile: false, messaggio: "Ops, nome già occupato!" });
      }
      
      // Se è scaduto, procediamo a sovrascriverlo (lo trattiamo come disponibile)
    }

    // 3. Se arriviamo qui, il tag è LIBERO o SCADUTO
    // Prepariamo le date per il nuovo contratto (1 anno)
    const inizio = oggi.toISOString().split('T')[0];
    const scadenza = new Date();
    scadenza.setFullYear(scadenza.getFullYear() + 1);
    const fine = scadenza.toISOString().split('T')[0];

    const campi = {
      'Nome': nomeTag,
      'Data Inizio': inizio,
      'Data Scadenza': fine,
      'Bio': '',        // Reset campi vecchi
      'LinkedIn': '', 
      'Instagram': '',
      'TikTok': ''
      // Aggiungi qui altri campi che vuoi resettare
    };

    if (recordEsistente) {
      // Sovrascriviamo il record scaduto
      await fetch(`https://api.airtable.com/v0/${baseId}/${table}/${recordEsistente.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: campi })
      });
    } else {
      // Creiamo un record nuovo
      await fetch(`https://api.airtable.com/v0/${baseId}/${table}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: campi })
      });
    }

    return res.status(200).json({ disponibile: true, messaggio: "Il nome è disponibile! Creato ora." });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
