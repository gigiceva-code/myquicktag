// ============================================================
// NOMI RISERVATI: BLACKLIST E GOLDLIST
// ============================================================
// Unico elenco, controllato dal server (api/check-and-create.js) prima di ogni prenotazione.
// Il browser non ha copie di queste liste: mostra solo la risposta del server.
// - BLACKLIST: nomi di sistema o non validi → non si possono prenotare.
// - GOLDLIST:  nomi di valore → niente prenotazione automatica, l'assegnazione la tratta
//              il team (popup "Global Premium Tag" con email a vip@myquicktag.it).
// Anche i nomi più corti di LUNGHEZZA_MINIMA caratteri sono trattati come Gold.
// I nomi vanno scritti in minuscolo, senza @.

export const BLACKLIST = [
  // Sistema
  "admin", "administrator", "amministratore", "root", "system", "sistema",
  "support", "supporto", "assistenza", "info", "help", "aiuto", "api",
  "login", "logout", "register", "signup", "signin", "account", "dashboard", "settings",
  "index", "home", "mail", "email", "www", "test", "error", "null", "undefined",
  // Pagine e cartelle del sito
  "u", "tag", "edit", "profile", "checkout", "pocket", "analytics", "celebration",
  "icons", "lib", "manifest", "sw",
  // Marchio
  "myquicktag", "quicktag",
  // Pagine legali
  "privacy", "terms", "termini", "cookie", "legal"
];

export const GOLDLIST = [
  "official", "team", "staff", "security",
  "vip", "pro", "premium", "business", "agency", "brand", "creator", "shop", "store",
  "cocacola", "ferrari", "nike", "apple"
];

export const LUNGHEZZA_MINIMA = 3;

// Restituisce "riservato" (blacklist), "premium" (goldlist o nome corto) oppure null (libero)
export function classificaNome(nome) {
  if (BLACKLIST.includes(nome)) return "riservato";
  if (GOLDLIST.includes(nome) || nome.length < LUNGHEZZA_MINIMA) return "premium";
  return null;
}
