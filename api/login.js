import { trovaTag, aggiornaTag } from '../lib/db.js';
import { verificaPassword, proteggiPassword } from '../lib/password.js';
import { entroILimiti, rispondiTroppiTentativi } from '../lib/limiti.js';
import { nomeTag } from '../lib/nome-canonico.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { tag, pwd } = req.body;
    
    if (!tag || !pwd) {
        return res.status(400).json({ success: false, message: 'Tag o password mancanti' });
    }
    
    // --- FIX SICUREZZA: forma canonica del nome (lib/nome-canonico.js) ---
    const tagPulito = nomeTag(tag);

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
    // Limiti ai tentativi: niente password provate a raffica
    if (!(await entroILimiti(req, tagPulito, [
        { nome: 'login', per: 'ip+tag', max: 10, finestra: 900 },
        { nome: 'login-ip', per: 'ip', max: 50, finestra: 900 }
    ]))) {
        return rispondiTroppiTentativi(res);
    }

    try {
        // Verifica con scrypt (lib/password.js); le password nel vecchio formato si aggiornano qui
        const record = await trovaTag(tagPulito, ['password']);
        const verifica = await verificaPassword(pwdProtetta, record?.fields?.password);
        const passwordOk = verifica.ok;

        if (passwordOk && verifica.daAggiornare) {
            try {
                await aggiornaTag(record.id, { password: await proteggiPassword(pwdProtetta) });
            } catch (e) {
                console.error("Aggiornamento formato password non riuscito:", e.dettagli || e);
            }
        }

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
        console.error("CRASH LOGIN:", error);
        res.status(500).json({ success: false, message: 'Errore server' });
    }
}
