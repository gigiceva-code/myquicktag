import { trovaTag } from '../lib/db.js';

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
    // --- FIX SICUREZZA: la password arriva come hash SHA-256 (64 caratteri esadecimali) ---
// Qualsiasi altro carattere viene scartato.
const pwdProtetta = String(pwd).replace(/[^a-fA-F0-9]/g, '');
    // Un hash valido è sempre lungo esattamente 64 caratteri. Senza questo controllo una password
    // "vuota" dopo la pulizia troverebbe i record "in attesa", che non hanno ancora una password.
    if (pwdProtetta.length !== 64 || !tagPulito) {
        return res.status(401).json({ success: false, message: 'Credenziali non valide' });
    }
    try {
        // Confronto dell'hash a tempo costante (non rivela quanti caratteri coincidono)
        const record = await trovaTag(tagPulito, ['password']);
        const salvata = String(record?.fields?.password || '').toLowerCase();
        const passwordOk = salvata.length === 64 &&
            crypto.timingSafeEqual(Buffer.from(salvata), Buffer.from(pwdProtetta.toLowerCase()));

        if (passwordOk) {
            const expiry = Date.now() + (1000 * 60 * 60 * 24 * 90); // 90 giorni, rinnovati a ogni utilizzo (get-profile / update-profile)
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
