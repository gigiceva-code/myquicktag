// ============================================================
// SESSIONI E PROPRIETÀ DELLE TAG (lato server)
// ============================================================
// Due sole prove di identità sono accettate:
// 1. SESSIONE DELL'ACCOUNT (Supabase Auth): un JWT emesso da Supabase dopo l'accesso con email
//    verificata e password. Viene verificato chiedendo a Supabase chi è l'utente (/auth/v1/user):
//    una sessione chiusa (uscita, cambio o recupero password) non è più valida.
//    Il proprietario di una tag è SOLO l'utente indicato in tags.proprietario_id.
// 2. RICEVUTA DI PRENOTAZIONE: firma HMAC (SESSION_SECRET) data da check-and-create.js a chi ha
//    prenotato un nome, valida 24 ore e solo per una tag "in attesa" ancora senza proprietario.
//    Serve a provare l'editor e ad attivare la tag prima di avere un account.
// Il vecchio accesso "@nome + password" con token firmati è dismesso: le tag di prova create così
// si collegano a un account una volta sola (api/account.js, azione "collega-vecchia").
import crypto from 'crypto';

const GIORNO_MS = 24 * 60 * 60 * 1000;

function firma(payload) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('hex');
}

// Ricevuta della prenotazione: "tag.scadenzaMs.firma", scade 24 ore dopo la creazione della tag
export function generaRicevuta(tag, createdTime) {
  const scadenza = new Date(createdTime).getTime() + GIORNO_MS;
  return `${tag}.${scadenza}.${firma(`${tag}.${scadenza}`)}`;
}

export function ricevutaValida(tag, token) {
  if (!token || typeof token !== 'string') return false;
  const parti = token.split('.');
  if (parti.length !== 3) return false;
  const [tagToken, scadenza, firmaToken] = parti;
  if (tagToken !== tag || !/^\d+$/.test(scadenza) || Date.now() > Number(scadenza)) return false;
  const attesa = firma(`${tagToken}.${scadenza}`);
  try {
    return crypto.timingSafeEqual(Buffer.from(firmaToken), Buffer.from(attesa));
  } catch {
    return false;
  }
}

// Un JWT ha tre parti base64url e l'intestazione JSON inizia sempre con "eyJ"
export function sembraJwt(token) {
  return typeof token === 'string' && /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(token);
}

// La sessione dell'account arriva nell'intestazione Authorization: Bearer <jwt>.
// Per compatibilità con le pagine esistenti è accettata anche nel campo sessionToken / token.
export function tokenAccount(req, altro) {
  const intestazione = String(req?.headers?.authorization || req?.headers?.Authorization || '');
  const m = intestazione.match(/^Bearer\s+(\S+)$/i);
  if (m && sembraJwt(m[1])) return m[1];
  return sembraJwt(altro) ? altro : null;
}

// Chi è l'utente di questa sessione? { id, email } oppure null (sessione non valida o scaduta).
// Se Supabase non risponde lancia un errore: meglio un "riprova" che un accesso non verificato.
export async function utenteDaToken(jwt) {
  if (!sembraJwt(jwt)) return null;
  const chiave = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const risposta = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: chiave, Authorization: `Bearer ${jwt}` }
  });
  if (risposta.status === 401 || risposta.status === 403 || risposta.status === 404) return null;
  if (!risposta.ok) {
    const e = new Error(`Verifica sessione non riuscita (${risposta.status})`);
    e.status = risposta.status;
    throw e;
  }
  const utente = await risposta.json();
  if (!utente || !utente.id) return null;
  // Con la conferma email attiva Supabase non apre sessioni a indirizzi non verificati: lo
  // ricontrolliamo comunque, una sessione senza email verificata non vale.
  if (!utente.email_confirmed_at && !utente.confirmed_at) return null;
  return { id: utente.id, email: String(utente.email || '').toLowerCase() };
}

// Che diritti ha chi chiama su questa tag (record "alla Airtable" di lib/db.js)?
// { utente, proprietario, ricevuta }:
//   proprietario = sessione valida dell'utente indicato in proprietario_id
//   ricevuta     = ricevuta di prenotazione valida per una tag in attesa senza proprietario
export async function dirittiSullaTag({ req, token, record, tag }) {
  const jwt = tokenAccount(req, token);
  const utente = jwt ? await utenteDaToken(jwt) : null;
  const fields = record?.fields || {};
  const proprietario = !!(utente && fields.proprietario_id && fields.proprietario_id === utente.id);
  const stato = String(fields.stato || '').toLowerCase().trim();
  const ricevuta = !!(record && stato === 'in attesa' && !fields.proprietario_id &&
    ricevutaValida(tag, sembraJwt(token) ? null : token));
  return { utente, proprietario, ricevuta };
}
