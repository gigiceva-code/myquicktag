// ============================================================
// NOMI RISERVATI (black list) E NOMI PREMIUM (gold list) — controllo lato server
// ============================================================
// index.html ha le stesse liste per avvisare subito l'utente, ma il controllo che conta
// è questo: chi chiama direttamente api/check-and-create non può prenotarli.
// Se modifichi una lista, aggiorna anche index.html (funzione vaiAllaVerifica).

// Nomi di sistema o ingannevoli: non si possono prenotare
export const BLACKLIST = [
  'admin', 'administrator', 'root', 'support', 'info', 'help', 'api',
  'login', 'logout', 'register', 'index', 'home', 'mail', 'test',
  'error', 'null', 'undefined',
  // indirizzi e pagine del sito
  'u', 'www', 'icons', 'account', 'contatti', 'profile', 'edit', 'tag', 'pocket',
  'analytics', 'checkout', 'celebration', 'myquicktag'
];

// Nomi di pregio: si assegnano solo su richiesta (vip@myquicktag.it)
export const GOLDLIST = [
  'official', 'team', 'staff', 'security',
  'vip', 'pro', 'premium', 'business', 'agency', 'brand', 'creator', 'shop', 'store',
  'cocacola', 'ferrari', 'nike', 'apple'
];

export const LUNGHEZZA_MINIMA = 3;

// null se il nome si può prenotare, altrimenti { codice, messaggio }
export function controllaNome(tag) {
  if (BLACKLIST.includes(tag)) {
    return { codice: 'riservato', messaggio: 'Questo nome è riservato per funzioni di sistema o non è valido. Scegli un altro tag.' };
  }
  if (GOLDLIST.includes(tag) || tag.length < LUNGHEZZA_MINIMA) {
    return { codice: 'premium', messaggio: 'Questo è un nome Premium: si assegna su richiesta. Scrivi a vip@myquicktag.it.' };
  }
  return null;
}
