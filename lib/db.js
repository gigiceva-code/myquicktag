// ============================================================
// ACCESSO AL DATABASE (Supabase, tabella "tags")
// ============================================================
// Usato SOLO dalle funzioni in api/, con la chiave segreta del server: il browser
// non parla mai direttamente col database.
//
// I record vengono restituiti nella stessa forma usata ai tempi di Airtable
// ({ id, createdTime, fields }), con i campi vuoti omessi, così la logica delle api/
// e le risposte al frontend restano identiche.
import { fetchConRetry } from './fetch-retry.js';

const TABELLA = 'tags';

function restUrl(query = '', percorso = TABELLA) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error('Variabili d\'ambiente mancanti su Vercel: SUPABASE_URL e/o SUPABASE_SECRET_KEY');
  }
  return `${process.env.SUPABASE_URL}/rest/v1/${percorso}${query}`;
}

function intestazioni(extra = {}) {
  const chiave = process.env.SUPABASE_SECRET_KEY;
  const h = { apikey: chiave, 'Content-Type': 'application/json', ...extra };
  // Le vecchie chiavi "service_role" (JWT) vanno anche nell'header Authorization
  if (chiave && chiave.startsWith('eyJ')) h.Authorization = `Bearer ${chiave}`;
  return h;
}

async function errore(response, azione) {
  let dettagli;
  try { dettagli = await response.json(); } catch { dettagli = null; }
  const e = new Error(`Database: ${azione} non riuscito (${response.status})`);
  e.status = response.status;
  e.code = dettagli && dettagli.code;
  e.dettagli = dettagli;
  return e;
}

// Riga del database → record "alla Airtable" (campi null o "" omessi)
function comeRecord(riga) {
  const { id, created_at, updated_at, ...colonne } = riga;
  const fields = {};
  for (const [k, v] of Object.entries(colonne)) {
    if (v !== null && v !== '') fields[k] = v;
  }
  return { id, createdTime: created_at, fields };
}

export function normalizzaUsername(username) {
  return String(username || '').toLowerCase();
}

// Cerca una tag per username. colonne: elenco opzionale per leggere solo alcuni campi.
export async function trovaTag(username, colonne) {
  const select = colonne ? ['id', 'created_at', ...colonne].join(',') : '*';
  const query = `?username_system=eq.${encodeURIComponent(normalizzaUsername(username))}&select=${select}&limit=1`;
  const response = await fetchConRetry(restUrl(query), { headers: intestazioni() });
  if (!response.ok) throw await errore(response, 'lettura');
  const righe = await response.json();
  return righe.length > 0 ? comeRecord(righe[0]) : null;
}

// Crea una tag. Se lo username esiste già restituisce null (vincolo "unique" del database).
export async function creaTag(fields) {
  const response = await fetchConRetry(restUrl(), {
    method: 'POST',
    headers: intestazioni({ Prefer: 'return=representation' }),
    body: JSON.stringify(fields)
  }, 0); // niente retry: una creazione ripetuta risulterebbe "già occupata"
  if (response.status === 409) return null;
  if (!response.ok) throw await errore(response, 'creazione');
  const righe = await response.json();
  return comeRecord(righe[0]);
}

export async function aggiornaTag(id, fields) {
  const response = await fetchConRetry(restUrl(`?id=eq.${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: intestazioni({ Prefer: 'return=minimal' }),
    body: JSON.stringify(fields)
  });
  if (!response.ok) throw await errore(response, 'aggiornamento');
}

export async function eliminaTag(id) {
  const response = await fetchConRetry(restUrl(`?id=eq.${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: intestazioni({ Prefer: 'return=minimal' })
  });
  if (!response.ok) throw await errore(response, 'eliminazione');
}

// Aggiunge UNA voce in cima a un elenco (contatti o click) direttamente nel database,
// senza leggere e riscrivere l'elenco: nessun visitatore lo vede, nessun invio si perde.
// Restituisce false se la tag non esiste. Funzioni SQL in supabase/migrations/.
async function aggiungiInCima(funzione, campo, username, voce) {
  const response = await fetchConRetry(restUrl('', `rpc/${funzione}`), {
    method: 'POST',
    headers: intestazioni(),
    body: JSON.stringify({ p_username: normalizzaUsername(username), [campo]: voce })
  }, 0); // niente retry: una voce aggiunta due volte risulterebbe doppia
  if (!response.ok) throw await errore(response, funzione);
  return (await response.json()) === true;
}

export function aggiungiLead(username, lead) {
  return aggiungiInCima('aggiungi_lead', 'p_lead', username, lead);
}

export function registraClick(username, click) {
  return aggiungiInCima('registra_click', 'p_click', username, click);
}
