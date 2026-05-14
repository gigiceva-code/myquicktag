export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Metodo non consentito' });

    // Leggiamo username_system e password dal corpo della richiesta
    const { username_system, password } = req.body;
    const tag = username_system; // per compatibilità

    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableId = process.env.AIRTABLE_TABLE_ID;
    const token = process.env.AIRTABLE_TOKEN;

    const searchUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula={username_system}='${tag}'`;

    try {
        const searchRes = await fetch(searchUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const searchData = await searchRes.json();

        if (!searchData.records || searchData.records.length === 0) {
            return res.status(404).json({ success: false, message: 'Tag non trovato' });
        }

        const recordId = searchData.records[0].id;

        // Calcoliamo le date per i 3 mesi trial
        const oggi = new Date().toISOString().split('T')[0];
        const scadenza = new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0];

        const updateRes = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    password: password,
                    stato: 'attivo', // Deve corrispondere alla tua colonna su Airtable
                    data_inizio: oggi,
                    data_scadenza: scadenza
                }
            })
        });

        if (updateRes.ok) {
            res.status(200).json({ success: true, message: 'Profilo attivato con successo!' });
        } else {
            res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento Airtable' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore di sistema' });
    }
}
