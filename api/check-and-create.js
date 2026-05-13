export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Metodo non consentito' });
    }

    const { tag } = req.body; 

    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableId = process.env.AIRTABLE_TABLE_ID;
    const token = process.env.AIRTABLE_TOKEN;

    // 1. Verifica se il tag è già nel Global Registry usando username_system
    const checkUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula={username_system}='${tag}'`;

    try {
        const checkRes = await fetch(checkUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const checkData = await checkRes.json();

        if (checkData.records && checkData.records.length > 0) {
            return res.status(400).json({ success: false, message: 'Tag già occupato' });
        }

        // 2. Prenotazione "leggera": crea il record con username_system e stato
        const createUrl = `https://api.airtable.com/v0/${baseId}/${tableId}`;
        const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    username_system: tag, // Nome colonna esatto
                    stato: 'in attesa'    // Segnala che manca la password
                }
            })
        });

        if (createRes.ok) {
            res.status(200).json({ success: true, message: 'Tag bloccato con successo!' });
        } else {
            res.status(500).json({ success: false, message: 'Errore durante il blocco del tag' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore di sistema' });
    }
}
