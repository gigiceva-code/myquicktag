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

// Rinnovo gratuito dalla dashboard: spento finché il titolare del progetto non decide
// (PRE-LANCIO.md, "Strategia di lancio"). Si accende con la variabile RINNOVO_GRATUITO=si su Vercel.
export function rinnovoGratuitoAttivo() {
  return String(process.env.RINNOVO_GRATUITO || '').toLowerCase() === 'si';
}

// Le pagine mostrano il pulsante "Rinnova" solo se il server lo accetterebbe
export function rinnovoDisponibile(abbonamento) {
  return rinnovoGratuitoAttivo() && rinnovoConsentito(abbonamento);
}

// ============================================================
// PIANO EFFETTIVO — MODELLO C (deciso dal titolare il 17/11/2026)
// ============================================================
// Una regola sola, decisa dal server e letta da editor, tag pubblica e API:
// - tag in attesa o attiva nei 90 giorni + 14 di tolleranza → GOLD (prova con tutto sbloccato)
// - dopo la prova → il piano pagato (colonna "plan", la scrive solo il server; oggi solo a mano per gli omaggi)
//   oppure BASE gratuito: la tag resta online, le sezioni avanzate si nascondono ma NON si cancellano.
export const PIANI = ['BASE', 'PREMIUM', 'GOLD'];
export function pianoEffettivo(record, oraMs = Date.now()) {
  const f = record?.fields || {};
  const pagato = String(f.plan || '').toUpperCase().trim();
  if (pagato === 'GOLD') return 'GOLD';
  if (String(f.stato || '').toLowerCase().trim() !== 'attivo') return 'GOLD';
  if (calcolaAbbonamento(record, oraMs).fase !== 'scaduta') return 'GOLD';
  return pagato === 'PREMIUM' ? 'PREMIUM' : 'BASE';
}
export const consente = (piano, minimo) => PIANI.indexOf(piano) >= PIANI.indexOf(minimo);

// Cosa vede il pubblico per ogni piano. Le stesse regole dell'editor (lucchetti) in un posto solo.
// GOLD: Recensioni, Vasetto contatti, Live status, Flash, Shop, QuickGift, Video, Vetrina (PDF), VIP Vault
// PREMIUM: Galleria, Azione rapida, contatti estesi (secondo telefono ed email, indirizzo, P.IVA, rubrica), link illimitati
// BASE: tutto il resto, fino a 5 link social
export const CAMPI_GOLD = [
  'review_url', 'review_contact', 'lead_capture_attivo', 'lead_capture_titolo',
  'live_status_color', 'live_status_text', 'live_status_micro', 'live_status_action_type', 'live_status_action_label', 'live_status_action_url',
  'flash_text', 'flash_micro', 'flash_expiry', 'shop_attivo', 'shop_titolo', 'shop_prezzo', 'shop_link', 'shop_scadenza',
  'quickpass_premio_a', 'quickpass_premio_b', 'quickpass_limite', 'quickpass_scadenza', 'quickpass_amici_per_premio', 'quickpass_modo', 'quickpass_contatto',
  'video_url', 'video_cta_text', 'video_cta_url', 'pdf_label', 'pdf_url'
];
export const CAMPI_PREMIUM = ['gallery_data', 'quick_action_tipo', 'quick_action_label', 'quick_action_url', 'quick_action_copertina'];
const VCF_PREMIUM = ['telefono2', 'email2', 'indirizzo', 'piva'];
export const LINK_BASE = 5;

const vip = c => c && (c.vip === true || c.vip === 'true');
// Campi pubblici per i VISITATORI: tolte le sezioni oltre il piano e i dati segreti del VIP Vault
// (link e PIN dei canali riservati non arrivano mai al browser: si aprono con la verifica sul server).
// I canali tengono la loro posizione originale ("vault") per la verifica del PIN.
export function filtraPerPiano(fields, piano) {
  const out = { ...fields };
  if (!consente(piano, 'GOLD')) for (const c of CAMPI_GOLD) delete out[c];
  if (!consente(piano, 'PREMIUM')) {
    for (const c of CAMPI_PREMIUM) delete out[c];
    if (out.modulo_vcf) {
      try {
        const v = typeof out.modulo_vcf === 'string' ? JSON.parse(out.modulo_vcf) : out.modulo_vcf;
        if (v && typeof v === 'object') { for (const k of VCF_PREMIUM) delete v[k]; out.modulo_vcf = JSON.stringify(v); }
      } catch (e) { /* VCF non leggibile: lasciato com'è */ }
    }
  }
  if (out.config_canali) {
    let canali = [];
    try { canali = JSON.parse(out.config_canali); } catch (e) { canali = []; }
    if (Array.isArray(canali)) {
      let lista = canali.map((c, i) => vip(c) ? { ...c, url: '', pin: '', vip: true, vault: i } : { ...c, pin: undefined });
      if (!consente(piano, 'GOLD')) lista = lista.filter(c => !c.vip);
      if (!consente(piano, 'PREMIUM')) lista = lista.slice(0, LINK_BASE);
      out.config_canali = JSON.stringify(lista);
    }
  }
  return out;
}
