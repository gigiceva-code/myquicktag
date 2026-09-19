export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { tag, pwd } = req.body;
    
    if (!tag || !pwd) {
        return res.status(400).json({ success: false, message: 'Tag o password mancanti' });
    }
    
       // --- FIX SICUREZZA: Pulizia del tag da caratteri pericolosi ---
    const tagPulito = tag.replace('@', '').trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '');

    // La password arriva già hashata SHA-256 dal client (index.html): qui la usiamo così com'è,
    // non viene mai calcolato né visto l'hash a partire dalla password in chiaro sul server.
    const crypto = await import('crypto');
    const pwdProtetta = pwd;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableId = process.env.AIRTABLE_TABLE_ID;
    const token = process.env.AIRTABLE_TOKEN;

    // Ricerca per tag pulito e sicuro e password protetta
    const filter = `AND({username_system} = '${tagPulito}', {password} = '${pwdProtetta}')`;
    const url = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${encodeURIComponent(filter)}`;

    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();

              if (data.records && data.records.length > 0) {
            const expiry = Date.now() + (1000 * 60 * 60 * 24 * 30); // 30 giorni
            const payload = `${tagPulito}.${expiry}`;
            const signature = crypto
                .createHmac('sha256', process.env.SESSION_SECRET)
                .update(payload)
                .digest('hex');
            const sessionToken = `${payload}.${signature}`;

            res.status(200).json({ 
                success: true, 
                username: tagPulito,
                sessionToken
            });
        } else {

            res.status(401).json({ success: false, message: 'Credenziali non valide' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore server' });
    }
}
