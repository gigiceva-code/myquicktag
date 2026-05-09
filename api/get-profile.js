export default async function handler(req, res) {
    const { u } = req.query;
    const token = process.env.AIRTABLE_TOKEN;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const table = 'Table%201';

    try {
        const response = await fetch(`https://api.airtable.com/v0/${baseId}/${table}?filterByFormula=LOWER({nome})='${u.toLowerCase()}'`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.records && data.records.length > 0) {
            // Restituiamo il record e l'ID (che serve per salvare)
            return res.status(200).json({ 
                success: true, 
                id: data.records[0].id, 
                fields: data.records[0].fields 
            });
        }
        return res.status(404).json({ success: false, messaggio: "Profilo non trovato" });
    } catch (e) {
        return res.status(500).json({ success: false, messaggio: e.message });
    }
}
