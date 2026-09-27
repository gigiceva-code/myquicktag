import crypto from 'crypto';
import { airtableFetch } from '../lib/airtable-fetch.js';

// Stessa logica di verifyToken usata in update-profile.js (HMAC + confronto a tempo costante).
function verifyToken(username, token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [tokenUser, expiry, signature] = parts;
  if (tokenUser !== username) return false;
  if (Date.now() > Number(expiry)) return false;
  const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(`${tokenUser}.${expiry}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const { u, token } = req.query;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_ID = process.env.AIRTABLE_TABLE_ID; 

  if (!u) return res.status(400).json({ success: false, error: "Username mancante" });

  // --- FIX SICUREZZA: Protezione da iniezioni ---
  // Puliamo il nome utente mantenendo solo lettere, numeri, trattini e underscore.
  const safeUsername = u.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

  try {
    // Cerchiamo nella colonna corretta "username_system" usando SOLO il nome pulito
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula={username_system}='${safeUsername}'`;
    
       const response = await airtableFetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    const data = await response.json();

    if (data.records && data.records.length > 0) {
      const record = data.records[0];

          const { password, draft_json, ...fieldsPubblici } = record.fields;
      fieldsPubblici.has_password = !!(password && String(password).trim() !== "");

      // --- FIX SICUREZZA: draft_json è la bozza privata dell'utente, non deve essere
      // leggibile da chiunque conosca lo username. Torna nella risposta SOLO se chi chiama
      // dimostra di essere il proprietario tramite sessionToken valido.
      if (draft_json !== undefined && verifyToken(safeUsername, token)) {
        fieldsPubblici.draft_json = draft_json;
      } 
      const risposta = {
        success: true,
        id: record.id,
        fields: fieldsPubblici
      };

      // PRENOTAZIONE 24H: unica fonte di verità = createdTime di Airtable (stesso criterio di check-and-create.js)
      const stato = (fieldsPubblici.stato || "").toLowerCase().trim();
      if (stato === "in attesa" && record.createdTime) {
        const createdMs = new Date(record.createdTime).getTime();
        risposta.reservation_expires_at = new Date(createdMs + 24 * 60 * 60 * 1000).toISOString();
        risposta.server_now = new Date().toISOString();
      }

      return res.status(200).json(risposta);
    } else {
      return res.status(404).json({ success: false, error: "Profilo non trovato" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
