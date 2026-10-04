// ============================================================
// PULIZIA DEI TESTI SCRITTI DAGLI UTENTI (protezione da codice inserito nella tag)
// ============================================================
// La tag pubblica mostra bio, etichette, link ecc. scritti dal proprietario. Perché nessuno
// possa nascondervi codice che parta sul telefono dei visitatori:
// - i caratteri che servono a scrivere HTML diventano le loro versioni tipografiche innocue
//   (< > " ` → ‹ › ” '), così il testo resta leggibile;
// - i link "javascript:", "vbscript:" e "data:text/..." (anche mascherati con entità HTML
//   o spazi) vengono svuotati.
// Stessa logica nel browser: session.js → mqtPulisci (vale anche per i dati già salvati).
const SOSTITUZIONI = { '<': '‹', '>': '›', '"': '”', '`': "'" };

const ENTITA = { colon: ':', tab: '\t', newline: '\n', sol: '/', lpar: '(', rpar: ')', period: '.', comma: ',', excl: '!', num: '#', amp: '&', semi: ';' };

function decodificaEntita(s) {
  return s
    .replace(/&#x([0-9a-f]+);?/gi, (m, h) => String.fromCodePoint(parseInt(h, 16) || 32))
    .replace(/&#(\d+);?/g, (m, d) => String.fromCodePoint(Number(d) || 32))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITA[n.toLowerCase()] ?? m);
}

function linkPericoloso(s) {
  const normale = decodificaEntita(s).replace(/[\s\u0000-\u001f\u007f-\u009f]+/g, '').toLowerCase();
  return /^(javascript|vbscript|livescript):/.test(normale) || /^data:(text|application|image\/svg)/.test(normale);
}

export function pulisciTesto(valore) {
  if (typeof valore !== 'string') return valore;
  if (linkPericoloso(valore)) return '';
  return valore.replace(/[<>"`]/g, c => SOSTITUZIONI[c]);
}

// Pulisce stringhe dentro oggetti e array (es. config_canali, partners_data)
export function pulisciValore(valore) {
  if (typeof valore === 'string') return pulisciTesto(valore);
  if (Array.isArray(valore)) return valore.map(pulisciValore);
  if (valore && typeof valore === 'object') {
    const pulito = {};
    for (const [k, v] of Object.entries(valore)) pulito[k] = pulisciValore(v);
    return pulito;
  }
  return valore;
}

// Per i campi salvati come testo JSON: si pulisce il contenuto, non la sintassi JSON
export function pulisciJson(testo) {
  if (typeof testo !== 'string' || testo.trim() === '') return testo;
  try {
    return JSON.stringify(pulisciValore(JSON.parse(testo)));
  } catch {
    return pulisciTesto(testo);
  }
}
