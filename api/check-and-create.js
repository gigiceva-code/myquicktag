export default async function handler(req, res) {
    const { nomeTag } = req.query;
    const token = process.env.AIRTABLE_TOKEN;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const table = 'Table%201';

    try {
        // 1. Cerca se il nome esiste già (case-insensitive)
        const checkRes = await fetch(`https://api.airtable.com/v0/${baseId}/${table}?filterByFormula=LOWER({nome})='${nomeTag.toLowerCase()}'`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await checkRes.json();

        if (data.records && data.records.length > 0) {
            return res.status(200).json({ disponibile: false, messaggio: "Questo @tag è già impegnato." });
        }

        // 2. Calcola data scadenza (oggi + 90 giorni)
        const scadenza = new Date();
        scadenza.setDate(scadenza.getDate() + 90);

        // 3. Creazione nuovo record con campi standardizzati
        const createRes = await fetch(`https://api.airtable.com/v0/${baseId}/${table}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
                fields: { 
                    'nome': nomeTag.toLowerCase().trim(), 
                    'stato': 'Attivo',
                    'visits': 0,
                    'data_scadenza': scadenza.toISOString().split('T')[0]
                } 
            })
        });

        if (!createRes.ok) {
            return res.status(500).json({ disponibile: false, messaggio: "Errore durante la creazione su Airtable." });
        }

        return res.status(200).json({ disponibile: true, user: nomeTag.toLowerCase() });

    } catch (e) {
        return res.status(500).json({ disponibile: false, messaggio: "Errore server: " + e.message });
    }
}
