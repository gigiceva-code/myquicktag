export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { tag, pwd } = req.body;

    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableId = process.env.AIRTABLE_TABLE_ID;
    const token = process.env.AIRTABLE_TOKEN;

    // Formula per cercare l'utente con tag e password corrispondenti
    const filter = `AND({username_system} = '${tag}', {password} = '${pwd}')`;
    const url = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${encodeURIComponent(filter)}`;

    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.records && data.records.length > 0) {
            // Successo: l'utente esiste e la password è corretta
            res.status(200).json({ 
                success: true, 
                username: data.records[0].fields.username_system 
            });
        } else {
            // Fallimento: credenziali errate
            res.status(401).json({ success: false, message: 'Credenziali non valide' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore server' });
    }
}
