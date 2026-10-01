// ============================================================
// DURATA DELLA TAG: 90 GIORNI + 14 GIORNI DI GRAZIA
// ============================================================
// Fasi di una tag attiva:
// - "attiva":  fino a data_scadenza compresa → tutto normale
// - "grazia":  i 14 giorni dopo data_scadenza → la tag resta online e modificabile,
//              il proprietario viene avvisato di rinnovare
// - "scaduta": dopo la grazia → la tag non è più visibile al pubblico e non è più
//              modificabile, finché il proprietario non rinnova
// Le date le scrive SOLO il server (attivazione e rinnovo), mai il browser.

export const GIORNI_PIANO = 90;
export const GIORNI_GRAZIA = 14;
const GIORNO_MS = 24 * 60 * 60 * 1000;

// Data in formato Airtable (campo "date"): AAAA-MM-GG
export function dataAirtable(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// Fine della giornata di scadenza (23:59:59 UTC), così il giorno di scadenza conta per intero
function fineGiornata(dataStr) {
  return new Date(dataStr + 'T23:59:59.999Z').getTime();
}

// Giorni di calendario tra oggi e una data AAAA-MM-GG (0 = oggi)
function giorniDiCalendario(dataStr, oraMs) {
  return Math.round((Date.parse(dataStr) - Date.parse(dataAirtable(oraMs))) / GIORNO_MS);
}

// Calcola la fase di un record Airtable con stato "attivo".
// Record attivati prima che esistessero le date (senza data_scadenza): vengono trattati
// come appena attivati; get-profile.js scrive le date al primo accesso.
export function calcolaAbbonamento(record, oraMs = Date.now()) {
  const fields = record.fields || {};
  const scadenzaStr = fields.data_scadenza || dateAttivazione(oraMs).data_scadenza;
  const scadenzaMs = fineGiornata(scadenzaStr);
  const fineGraziaMs = scadenzaMs + GIORNI_GRAZIA * GIORNO_MS;

  let fase = 'attiva';
  if (oraMs > fineGraziaMs) fase = 'scaduta';
  else if (oraMs > scadenzaMs) fase = 'grazia';

  return {
    fase,
    data_scadenza: scadenzaStr,
    fine_grazia: dataAirtable(fineGraziaMs),
    giorni_alla_scadenza: giorniDiCalendario(scadenzaStr, oraMs),
    giorni_alla_disattivazione: giorniDiCalendario(dataAirtable(fineGraziaMs), oraMs)
  };
}

// Date per una nuova attivazione (checkout)
export function dateAttivazione(oraMs = Date.now()) {
  return {
    data_inizio: dataAirtable(oraMs),
    data_scadenza: dataAirtable(oraMs + GIORNI_PIANO * GIORNO_MS)
  };
}

// Nuova scadenza per un rinnovo: +90 giorni dalla scadenza attuale se non ancora passata
// (chi rinnova in anticipo non perde giorni), altrimenti da oggi
export function nuovaScadenzaRinnovo(abbonamento, oraMs = Date.now()) {
  const base = Math.max(fineGiornata(abbonamento.data_scadenza), oraMs);
  return dataAirtable(base + GIORNI_PIANO * GIORNO_MS);
}

// Il rinnovo si può fare negli ultimi 14 giorni del piano, durante la grazia o dopo
export function rinnovoConsentito(abbonamento) {
  return abbonamento.fase !== 'attiva' || abbonamento.giorni_alla_scadenza <= GIORNI_GRAZIA;
}
