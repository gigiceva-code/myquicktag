import { airtableFetch } from '../lib/airtable-fetch.js';

export default async function handler(req, res) {
  const { u } = req.query;
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

      // SICUREZZA: l'hash della password non lascia mai il server (era la credenziale di login).
      // Al suo posto il frontend riceve solo un booleano.
      const { password, ...fieldsPubblici } = record.fields;
      fieldsPubblici.has_password = !!(password && String(password).trim() !== "");

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
