// ============================================================
// NOMI RISERVATI (black list) E NOMI PREMIUM (gold list) — controllo lato server
// ============================================================
// Le liste vere sono nel database, tabella "nomi_riservati": si gestiscono dal Table Editor
// di Supabase senza toccare il codice (vedi supabase/migrations/20261004200000_nomi_riservati.sql).
// Qui restano solo i nomi legati alle pagine e agli indirizzi del sito, che cambiano col codice.
// Il browser (index.html) non ha liste: mostra il messaggio in base al "codice" restituito.
import { tipoNomeRiservato } from './db.js';

export const NOMI_DI_SISTEMA = [
  'u', 'api', 'icons', 'index', 'login', 'logout', 'register',
  'account', 'contatti', 'profile', 'edit', 'tag', 'pocket', 'analytics', 'checkout', 'celebration'
];

export const LUNGHEZZA_MINIMA = 3;

const RISERVATO = { codice: 'riservato', messaggio: 'Questo nome è riservato e non può essere scelto. Scegli un altro @nome.' };
const PREMIUM = { codice: 'premium', messaggio: 'Questo è un nome Premium: si assegna su richiesta. Scrivi a vip@myquicktag.it.' };

// null se il nome si può prenotare, altrimenti { codice, messaggio }
export async function controllaNome(tag) {
  if (NOMI_DI_SISTEMA.includes(tag)) return RISERVATO;
  if (tag.length < LUNGHEZZA_MINIMA) return PREMIUM;
  const tipo = await tipoNomeRiservato(tag);
  if (tipo === 'black') return RISERVATO;
  if (tipo === 'gold') return PREMIUM;
  return null;
}
