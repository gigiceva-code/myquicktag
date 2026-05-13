export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Metodo non consentito' });
    }

    const { tag, password } = req.body; // Riceve sia il tag che la password scelta

    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableId = process.env.AIRTABLE_TABLE_ID;
    const token = process.env.AIRTABLE_TOKEN;

    // 1. Controlliamo prima se il tag esiste già
    const checkUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula={username_system}='${tag}'`;

    try {
        const checkRes = await fetch(checkUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const checkData = await checkRes.json();

        if (checkData.records && checkData.records.length > 0) {
            return res.status(400).json({ success: false, message: 'Tag già occupato' });
        }

        // 2. Se è libero, creiamo il nuovo utente con la sua password
        const createUrl = `https://api.airtable.com/v0/${baseId}/${tableId}`;
        const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    username_system: tag,
                    password: password, // Salviamo la password dell'utente
                    stato: 'Attivo'     // O lo stato che preferisci
                }
            })
        });

        if (createRes.ok) {
            res.status(200).json({ success: true, message: 'Tag registrato con successo!' });
        } else {
            res.status(500).json({ success: false, message: 'Errore durante la registrazione' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore server' });
    }
}
