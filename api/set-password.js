export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Metodo non consentito' });

    const { username_system, password } = req.body;
    
    // Pulizia totale: minuscolo e senza spazi
    const tag = username_system.replace('@', '').trim().toLowerCase();

    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableId = process.env.AIRTABLE_TABLE_ID;
    const token = process.env.AIRTABLE_TOKEN;

    // Log per debug (lo vedi nei log di Vercel)
    console.log("Ricerca per tag:", tag);

    // Formula più sicura: usiamo le virgolette doppie per i campi
    const searchUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=({username_system}='${tag}')`;

    try {
        const searchRes = await fetch(searchUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const searchData = await searchRes.json();

        if (!searchData.records || searchData.records.length === 0) {
            console.log("Nessun record trovato per:", tag);
            return res.status(404).json({ success: false, message: 'Tag non trovato' });
        }

        const recordId = searchData.records[0].id;
        console.log("Record ID trovato:", recordId);

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
                    "password": String(password), // Forziamo a stringa
                    "stato": "attivo",
                    "data_inizio": oggi,
                    "data_scadenza": scadenza
                }
            })
        });

        const updateData = await updateRes.json();

        if (updateRes.ok) {
            res.status(200).json({ success: true });
        } else {
            console.error("Errore Airtable:", updateData.error);
            res.status(500).json({ success: false, message: updateData.error.message });
        }
    } catch (error) {
        console.error("Errore Sistema:", error);
        res.status(500).json({ success: false });
    }
}
