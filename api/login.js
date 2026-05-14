export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { tag, pwd } = req.body;
    
    // Step di sicurezza: offuschiamo la password ricevuta per confrontarla con quella su Airtable
    const pwdProtetta = Buffer.from(pwd).toString('base64'); 

    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableId = process.env.AIRTABLE_TABLE_ID;
    const token = process.env.AIRTABLE_TOKEN;

    // Ricerca per tag (pulito) e password protetta
    const tagPulito = tag.replace('@', '').trim().toLowerCase();
    const filter = `AND({username_system} = '${tagPulito}', {password} = '${pwdProtetta}')`;
    const url = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${encodeURIComponent(filter)}`;

    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.records && data.records.length > 0) {
            res.status(200).json({ 
                success: true, 
                username: tagPulito 
            });
        } else {
            res.status(401).json({ success: false, message: 'Credenziali non valide' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore server' });
    }
}
