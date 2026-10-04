import crypto from 'crypto';
import { trovaTag, aggiornaTag } from '../lib/db.js';
import { calcolaAbbonamento, dateAttivazione } from '../lib/abbonamento.js';
import { nomeTag } from '../lib/nome-canonico.js';

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

function generateToken(username) {
  const expiry = Date.now() + (1000 * 60 * 60 * 24 * 90); // 90 giorni
  const payload = `${username}.${expiry}`;
  const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

const CAMPI_PRIVATI = ['draft_json', 'lead_capture_leads', 'analytics_data', 'analytics_log', 'pocket_cloud'];

export default async function handler(req, res) {
  const { u, token } = req.query;

  if (!u) return res.status(400).json({ success: false, error: "Username mancante" });

  // --- FIX SICUREZZA: Protezione da iniezioni ---
  // Forma canonica del nome (lib/nome-canonico.js): solo lettere e numeri.
  const safeUsername = nomeTag(u);

  try {
    // Cerchiamo nella colonna "username_system" usando SOLO il nome pulito
    const record = await trovaTag(safeUsername);

    if (record) {
      const { password, ...fieldsPubblici } = record.fields;
      fieldsPubblici.has_password = !!(password && String(password).trim() !== "");

      // --- FIX SICUREZZA: campi privati del proprietario, mai mostrati sulla tag pubblica.
      // Tornano nella risposta SOLO se chi chiama dimostra di essere il proprietario (token valido):
      // bozza, contatti lasciati dai visitatori (dati personali di terzi), statistiche, Pocket.
      const tokenValido = verifyToken(safeUsername, token);
      if (!tokenValido) {
        CAMPI_PRIVATI.forEach(campo => { delete fieldsPubblici[campo]; });
      }
      const risposta = {
        success: true,
        id: record.id,
        fields: fieldsPubblici
      };

      // DURATA TAG (90 giorni + 14 di grazia): fase calcolata dal server
      if (String(fieldsPubblici.stato || '').toLowerCase().trim() === 'attivo') {
        // Tag attivate prima dell'introduzione delle date: 90 giorni pieni da oggi (scritti una volta sola)
        if (!record.fields.data_scadenza) {
          const date = dateAttivazione();
          const daScrivere = { data_scadenza: date.data_scadenza };
          if (!record.fields.data_inizio) daScrivere.data_inizio = date.data_inizio;
          try {
            await aggiornaTag(record.id, daScrivere);
            record.fields.data_scadenza = date.data_scadenza;
          } catch (e) {
            console.error("Scrittura date abbonamento fallita:", e);
          }
        }
        risposta.abbonamento = calcolaAbbonamento(record);
        // Tag scaduta: ai visitatori non si mostrano più i contenuti, solo il nome
        if (risposta.abbonamento.fase === 'scaduta' && !tokenValido) {
          risposta.fields = {
            username_system: fieldsPubblici.username_system,
            username_display: fieldsPubblici.username_display,
            stato: fieldsPubblici.stato,
            has_password: fieldsPubblici.has_password
          };
        }
      }

      // Sessione "scorrevole": il proprietario di un account attivo che apre la sua tag o
      // l'editor riceve un token rinnovato per altri 90 giorni. Le ricevute di prenotazione
      // (account senza password) non vengono rinnovate.
      if (tokenValido && fieldsPubblici.has_password) {
        risposta.sessionToken = generateToken(safeUsername);
        res.setHeader('Cache-Control', 'no-store');
      }

      // PRENOTAZIONE 24H: unica fonte di verità = createdTime del database (stesso criterio di check-and-create.js)
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
