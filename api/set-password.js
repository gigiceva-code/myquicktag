export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Metodo non consentito' });

    const { username_system, password } = req.body;
    
    // Pulizia di sicurezza
    const tag = username_system.replace('@', '').trim().toLowerCase();

    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableId = process.env.AIRTABLE_TABLE_ID;
    const token = process.env.AIRTABLE_TOKEN;

    // Usiamo LOWER per essere sicuri che la ricerca non fallisca per le maiuscole
    const searchUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=LOWER({username_system})='${tag}'`;

    try {
        const searchRes = await fetch(searchUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const searchData = await searchRes.json();

        if (!searchData.records || searchData.records.length === 0) {
            console.error("Tag non trovato su Airtable:", tag);
            return res.status(404).json({ success: false, message: 'Tag non trovato nel database' });
        }

        const recordId = searchData.records[0].id;

        // Date per i 3 mesi trial
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
                    stato: 'attivo',
                    data_inizio: oggi,
                    data_scadenza: scadenza
                }
            })
        });

        if (updateRes.ok) {
            res.status(200).json({ success: true, message: 'Profilo attivato!' });
        } else {
            const errorDetails = await updateRes.json();
            console.error("Errore Airtable Update:", errorDetails);
            res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento' });
        }
    } catch (error) {
        console.error("Errore Sistema:", error);
        res.status(500).json({ success: false, message: 'Errore di connessione' });
    }
}
