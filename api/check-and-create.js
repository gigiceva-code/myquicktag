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

    // 1. Verifica se il tag è già occupato o prenotato
    const checkUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula={username_system}='${tag}'`;

    try {
        const checkRes = await fetch(checkUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const checkData = await checkRes.json();

        if (checkData.records && checkData.records.length > 0) {
            const record = checkData.records[0];
            const stato = record.fields.stato ? record.fields.stato.toLowerCase() : "";
            
            // Airtable fornisce sempre il 'createdTime' nativo in ogni record
            const createdTime = new Date(record.createdTime).getTime();
            const now = new Date().getTime();
            const ageInMinutes = (now - createdTime) / (1000 * 60);

            if (stato === "attivo") {
                // Muro di cemento: Tag acquistato e ufficiale
                return res.status(400).json({ success: false, message: 'Spiacente, questo @tag è già occupato' });
            }

            if (stato === "in attesa") {
                // 1440 minuti = 24 ore esatte
                if (ageInMinutes < 1440) {
                    // Muro temporaneo: Blindato per 24 ore
                    return res.status(400).json({ success: false, message: 'Tag riservato temporaneamente. Riprova tra 24 ore.' });
                } else {
                    // ==========================================
                    // IL NETTURBINO: Riciclo dopo 24 Ore
                    // ==========================================
                    console.log(`♻️ Riciclo tag scaduto (>24h): ${tag} (Età: ${Math.round(ageInMinutes / 60)} ore)`);
                    
                    const deleteUrl = `https://api.airtable.com/v0/${baseId}/${tableId}/${record.id}`;
                    await fetch(deleteUrl, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    // Il vecchio record è distrutto. Il codice prosegue per assegnarlo al nuovo utente.
                }
            }
        }
        // 2. Prenotazione: crea il record pulito con stato "in attesa" (Nuovo Timer)
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
                    "stato": "in attesa"
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
