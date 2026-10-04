// ============================================================
// NOMI PROTETTI — controllo lato server (prenotazione e attivazione)
// ============================================================
// Le liste vere sono nel database, tabella "nomi_riservati": si gestiscono dal Table Editor
// di Supabase senza toccare il codice (vedi supabase/migrations/). Tipi:
//   system = serve al funzionamento del sito, sempre bloccato
//   black  = riservato, non si registra (istituzioni, offese, nomi ingannevoli...)
//   gold   = protetto, il legittimo titolare lo richiede via email (brand, personaggi...)
// Qui restano solo i nomi legati alle pagine del sito, che cambiano col codice.
// Il browser (index.html) non ha liste: mostra il messaggio in base al "codice" restituito.
import { tipoNomeRiservato } from './db.js';
import { LUNGHEZZA_MINIMA } from './nome-canonico.js';

// Unico indirizzo per le richieste dei nomi protetti: index.html lo riceve nella risposta
export const EMAIL_RICHIESTE = 'vip@myquicktag.it';

export const NOMI_DI_SISTEMA = [
  'u', 'api', 'icons', 'index', 'login', 'logout', 'register',
  'account', 'contatti', 'profile', 'edit', 'tag', 'pocket', 'analytics', 'checkout', 'celebration'
];

const RISERVATO = {
  codice: 'riservato',
  messaggio: 'Questo nome è riservato e non può essere registrato. Scegli un altro @nome.'
};
const SU_RICHIESTA = {
  codice: 'su_richiesta',
  messaggio: 'Questo nome è protetto: può essere richiesto dal legittimo titolare tramite il canale dedicato. Ogni richiesta viene verificata dal nostro team.',
  email: EMAIL_RICHIESTE
};
const CORTO = {
  ...SU_RICHIESTA,
  messaggio: `I nomi con meno di ${LUNGHEZZA_MINIMA} caratteri sono riservati: si assegnano solo su richiesta tramite il canale dedicato.`
};

// tag = forma canonica (lib/nome-canonico.js). null se il nome si può prenotare,
// altrimenti { codice, messaggio, email? }. Se il database non risponde lancia un errore:
// la prenotazione si ferma (meglio un "riprova" che un nome protetto assegnato per sbaglio).
export async function controllaNome(tag) {
  if (NOMI_DI_SISTEMA.includes(tag)) return RISERVATO;
  if (tag.length < LUNGHEZZA_MINIMA) return CORTO;
  const tipo = await tipoNomeRiservato(tag);
  if (tipo === 'system' || tipo === 'black') return RISERVATO;
  if (tipo === 'gold') return SU_RICHIESTA;
  return null;
}
