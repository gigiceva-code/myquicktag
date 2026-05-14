export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Metodo non consentito' });
    }

    // Pulizia tag: tutto minuscolo e senza spazi per evitare duplicati
    const rawTag = req.body.tag || "";
    const tag = rawTag.replace('@', '').trim().toLowerCase();

    if (!tag) {
        return res.status(400).json({ success: false, message: 'Tag non valido' });
    }

    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableId = process.env.AIRTABLE_TABLE_ID;
    const token = process.env.AIRTABLE_TOKEN;

    // 1. Verifica se il tag è già occupato
    const checkUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula={username_system}='${tag}'`;

    try {
        const checkRes = await fetch(checkUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const checkData = await checkRes.json();

        if (checkData.records && checkData.records.length > 0) {
            return res.status(400).json({ success: false, message: 'Spiacente, questo @tag è già occupato' });
        }

        // 2. Prenotazione: crea il record con stato "in attesa"
        const createUrl = `https://api.airtable.com/v0/${baseId}/${tableId}`;
        const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    "username_system": tag,
                    "stato": "in attesa" // Come da tua foto 1000029312.jpg
                }
            })
        });

        if (createRes.ok) {
            res.status(200).json({ success: true, message: 'Tag riservato!' });
        } else {
            const errorDetail = await createRes.json();
            console.error("Errore Airtable:", errorDetail);
            res.status(500).json({ success: false, message: 'Errore durante la prenotazione' });
        }
    } catch (error) {
        console.error("Errore Sistema:", error);
        res.status(500).json({ success: false, message: 'Errore di sistema' });
    }
}
