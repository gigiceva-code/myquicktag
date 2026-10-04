import crypto from 'crypto';
import { trovaTag, creaTag, eliminaTag } from '../lib/db.js';

// "Ricevuta" della prenotazione: un token di sessione firmato dal server (stesso formato
// di login.js), valido solo fino alla scadenza delle 24h. Solo chi ha prenotato lo riceve,
// quindi solo lui può modificare la tag in attesa e impostarne la prima password.
function generateReservationToken(username, createdTime) {
  const expiry = new Date(createdTime).getTime() + (1000 * 60 * 60 * 24);
  const payload = `${username}.${expiry}`;
  const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Metodo non consentito' });
    }

    // --- FIX SICUREZZA: Pulizia e protezione del tag ---
    // Manteniamo solo lettere, numeri, trattini e underscore, scartando tutto il resto
    const rawTag = req.body.tag || "";
    const tag = rawTag.replace('@', '').trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '');

    if (!tag) {
        return res.status(400).json({ success: false, message: 'Tag non valido o con caratteri non consentiti' });
    }

    // 1. Verifica se il tag è già occupato o prenotato
    try {
        const record = await trovaTag(tag, ['stato']);

        if (record) {
            const stato = record.fields.stato ? record.fields.stato.toLowerCase() : "";
            
            // createdTime = momento della prenotazione (colonna created_at del database)
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
                    await eliminaTag(record.id);
                    // Il vecchio record è distrutto. Il codice prosegue per assegnarlo al nuovo utente.
                }
            }
        }

        // 2. Prenotazione: crea il record pulito con stato "in attesa" (Nuovo Timer).
        // ANTI-COLLISIONE: username_system è "unique" nel database, quindi se due richieste
        // arrivano insieme solo la prima riesce a creare la riga; l'altra riceve null.
        const newRecord = await creaTag({ username_system: tag, stato: "in attesa" });
        if (!newRecord) {
            return res.status(400).json({ success: false, message: 'Spiacente, questo @tag è già occupato' });
        }

             // Il client usa questo createdTime (fonte server) per calcolare la scadenza a 24h,
             // invece di affidarsi al proprio orologio locale.
             res.status(200).json({ success: true, message: 'Tag riservato!', createdTime: newRecord.createdTime, username: tag, sessionToken: generateReservationToken(tag, newRecord.createdTime) });

    } catch (error) {
        console.error("Errore Sistema:", error);
        res.status(500).json({ success: false, message: 'Errore di sistema' });
    }
}   
