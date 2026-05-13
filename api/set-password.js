export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Metodo non consentito' });
    }

    const { tag, password } = req.body;

    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableId = process.env.AIRTABLE_TABLE_ID;
    const token = process.env.AIRTABLE_TOKEN;

    // 1. Cerchiamo l'ID del record associato al tag
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

        // 2. Aggiorniamo il record con password e nuovo stato
        const updateUrl = `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`;
        const updateRes = await fetch(updateUrl, {
            method: 'PATCH', // Usiamo PATCH per aggiornare solo alcuni campi
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    password: password,
                    stato: 'attivo' // Passa ufficialmente ad attivo
                }
            })
        });

        if (updateRes.ok) {
            res.status(200).json({ success: true, message: 'Password impostata e profilo attivo!' });
        } else {
            res.status(500).json({ success: false, message: 'Errore durante l\'attivazione' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore di sistema' });
    }
}
