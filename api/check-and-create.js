export default async function handler(req, res) {
    const token = process.env.AIRTABLE_TOKEN;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = "Table 1";
    const { nome } = req.query;

    if (!nome) return res.status(400).json({ error: "Nome mancante" });

    try {
        const checkUrl = `https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula=LOWER({nome})='${nome.toLowerCase()}'`;
        const response = await fetch(checkUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.records.length > 0) {
            return res.status(200).json({ disponibile: false });
        }

        if (req.method === 'POST') {
            const createRes = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        nome: nome.toLowerCase(),
                        stato: "Attivo",
                        bio: "Nuovo Profilo MyQuickTag"
                    }
                })
            });
            return res.status(200).json({ creato: true });
        }
        return res.status(200).json({ disponibile: true });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
