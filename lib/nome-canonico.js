// ============================================================
// FORMA CANONICA DEL NOME DELLA TAG (unica definizione lato server)
// ============================================================
// Ogni @nome viene ridotto a una sola forma, quella salvata in tags.username_system:
//   1. Unicode NFKD e lettere accentate → lettera base   (cristiáno → cristiano)
//   2. minuscolo                                          (CocaCola → cocacola)
//   3. via la @ iniziale, gli spazi, "-", "_" e "."       (coca-cola, coca_cola → cocacola)
//   4. devono restare solo lettere a-z e numeri 0-9, al massimo 30 caratteri:
//      qualsiasi altro carattere fa RIFIUTARE il nome (non viene cancellato in silenzio).
// Così "@Mario", "mario-", "mario_" sono la stessa tag; "mario1" e "marioi" restano diverse
// (la trasformazione 0→o, 1→i... vale solo per il confronto con i nomi riservati, in SQL).
// Il browser fa la stessa trasformazione solo per anteprima (session.js → mqtNome).

export const LUNGHEZZA_MINIMA = 3;
export const LUNGHEZZA_MASSIMA = 30;

function trasforma(valore) {
  return String(valore ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/^@+/, '')
    .replace(/[\s._-]+/g, '');
}

// Per la PRENOTAZIONE: { nome } oppure { errore } con un messaggio per l'utente.
// La lunghezza minima non è un errore: i nomi di 1-2 caratteri sono riservati (lib/nomi-riservati.js).
export function formaCanonica(valore) {
  const nome = trasforma(valore);
  if (!nome) return { errore: 'Scrivi un @nome.' };
  if (/[^a-z0-9]/.test(nome)) {
    return { errore: 'Il @nome può contenere solo lettere e numeri (spazi, punti, trattini e accenti vengono adattati automaticamente).' };
  }
  if (nome.length > LUNGHEZZA_MASSIMA) {
    return { errore: `Il @nome può avere al massimo ${LUNGHEZZA_MASSIMA} caratteri.` };
  }
  return { nome };
}

// Per CERCARE una tag già esistente (login, profilo, salvataggi...): stessa trasformazione,
// ma i caratteri non ammessi vengono scartati invece di dare errore (un nome con simboli
// non può esistere nel database, quindi la ricerca semplicemente non trova nulla).
export function nomeTag(valore) {
  return trasforma(valore).replace(/[^a-z0-9]/g, '').slice(0, LUNGHEZZA_MASSIMA);
}
