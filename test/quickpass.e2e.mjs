// ============================================================
// PROVA NEL BROWSER: QUICK PASS dall'invito alla cassa, con tre telefoni simulati
// ============================================================
// Marco (chi consiglia) crea il suo invito → Luca (l'amico) apre il link e ritira il pass →
// un dipendente apre il QR del pass, inserisce il PIN di cassa e convalida → Marco trova il premio.
// Usa test/finto-supabase.mjs (copia locale del sito con finto database sulla porta 8788).
// Uso (serve il pacchetto "playwright", non è tra le dipendenze del sito):
//   cd $(mktemp -d) && npm i playwright && node <progetto>/test/finto-supabase.mjs &
//   NODE_PATH=$PWD/node_modules CHROMIUM_PATH=/opt/pw-browsers/chromium node <progetto>/test/quickpass.e2e.mjs
// SCHERMATE=<cartella> salva le schermate dei passaggi.
import { createRequire } from 'module';
import { proteggiPin } from '../lib/password.js';
const richiedi = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH + '/' : import.meta.url);
const { chromium } = richiedi('playwright');
const B = 'http://localhost:8788';
const TAG = 'pizzeriaqp' + Date.now().toString(36).slice(-4);
const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) process.exitCode = 1; };
const foto = async (p, n) => { if (process.env.SCHERMATE) { await p.waitForTimeout(400); await p.screenshot({ path: `${process.env.SCHERMATE}/qp-${n}.png` }); } };

await fetch(`${B}/__seed`, { method: 'POST', body: JSON.stringify({
  username_system: TAG, username_display: '@PizzeriaDaMario', stato: 'attivo', data_scadenza: '2099-01-01',
  quickpass_premio_a: 'Un caffè offerto', quickpass_premio_b: 'Il dolce in omaggio alla prima cena', quickpass_amici_per_premio: 1,
  quickpass_pin_hash: await proteggiPin('2468'), lead_capture_attivo: 'false'
}) });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
async function telefono() {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'it-IT' });
  await c.route(/cdn\.jsdelivr\.net\/npm\/@supabase|fonts\.googleapis|cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome/, r => r.abort());
  const p = await c.newPage();
  p.on('pageerror', e => console.log('ERRORE PAGINA', e.message));
  p.on('dialog', d => d.dismiss());
  return p;
}

// 1. MARCO crea il suo invito dalla tag
const marco = await telefono();
await marco.goto(`${B}/u/${TAG}`); await marco.waitForTimeout(2000);
await marco.evaluate(() => { sbloccaTag(); }); await marco.waitForTimeout(500);
ok(await marco.evaluate(() => { apriMacroArea('action_center'); return document.getElementById('corpoSezione').innerHTML.includes("apriSezione('quickpass')"); }), 'Action Center: c\'è il Quick Pass');
await marco.evaluate(() => apriSezione('quickpass')); await marco.waitForTimeout(1200);
await foto(marco, '1-invito-vuoto');
await marco.fill('#qp-mio-nome', 'Marco Rossi');
await marco.click('#qp-crea'); await marco.waitForTimeout(1200);
const testoMarco = await marco.textContent('#corpoSezione');
const link = (testoMarco.match(/https?:\/\/\S+\?pass=[A-Z0-9]{8}/) || [])[0];
ok(!!link && testoMarco.includes('Il tuo invito personale'), 'Marco: invito personale creato, con il link da condividere');
await foto(marco, '2-invito-pronto');

// 2. LUCA apre il link e ritira il pass
const luca = await telefono();
await luca.goto(link.replace(/^https?:\/\/[^/]+/, B)); await luca.waitForTimeout(2000);
const regalo = await luca.textContent('#mqt-qp-overlay');
ok(regalo.includes('Marco ti ha regalato') && regalo.includes('Il dolce in omaggio alla prima cena'), 'Luca: vede chi gli fa il regalo e cosa riceve');
await foto(luca, '3-regalo');
await luca.click('#qp-ritira'); await luca.waitForTimeout(500);
ok((await luca.textContent('#qp-errore')).includes('nome'), 'Luca: senza nome il pass non si ritira');
await luca.fill('#qp-nome', 'Luca');
await luca.fill('#qp-contatto', '3331112222');
await luca.check('#qp-consenso');
await luca.click('#qp-ritira'); await luca.waitForTimeout(1500);
const passTesto = await luca.textContent('#mqt-qp-overlay');
const codice = (passTesto.match(/\b[A-Z0-9]{6}\b/g) || []).find(c => /\d/.test(c) || /[A-Z]{6}/.test(c));
ok(passTesto.includes('Il tuo pass') && passTesto.includes('Valido fino al') && !!codice, 'Luca: pass personale con codice e scadenza');
await foto(luca, '4-pass');

// Marco non può usare il suo stesso invito
await marco.goto(link.replace(/^https?:\/\/[^/]+/, B)); await marco.waitForTimeout(1800);
await marco.fill('#qp-nome', 'Marco'); await marco.click('#qp-ritira'); await marco.waitForTimeout(1000);
ok((await marco.textContent('#qp-errore')).includes('Questo è il tuo invito'), 'Marco: non può ritirare il pass con il suo invito');

// 3. IN CASSA: il dipendente inquadra il QR (apre ?cassa=CODICE), inserisce il PIN e convalida
const cassa = await telefono();
await cassa.goto(`${B}/u/${TAG}?cassa=${codice}`); await cassa.waitForTimeout(2000);
ok(await cassa.isVisible('#qp-cassa-pin'), 'Cassa: senza essere il titolare chiede il PIN di cassa');
await cassa.fill('#qp-cassa-pin', '1111'); await cassa.click('#qp-cassa-azione'); await cassa.waitForTimeout(800);
ok((await cassa.textContent('#qp-cassa-esito')).includes('PIN errato'), 'Cassa: PIN errato rifiutato');
await cassa.fill('#qp-cassa-pin', '2468'); await cassa.click('#qp-cassa-azione'); await cassa.waitForTimeout(1000);
const verifica = await cassa.textContent('#qp-cassa-esito');
ok(verifica.includes('Luca') && verifica.includes('Il dolce in omaggio'), 'Cassa: mostra il pass di Luca prima di convalidare');
await foto(cassa, '5-cassa-verifica');
await cassa.click('#qp-cassa-azione'); await cassa.waitForTimeout(1000);
const esito = await cassa.textContent('#qp-cassa-esito');
ok(esito.includes('Pass convalidato') && esito.includes('Marco Rossi ha sbloccato il suo premio'), 'Cassa: pass convalidato e premio di Marco sbloccato');
await foto(cassa, '6-cassa-convalidato');

// Il PIN resta ricordato sul telefono della cassa: il pass già usato viene riconosciuto
await cassa.goto(`${B}/u/${TAG}?cassa=${codice}`); await cassa.waitForTimeout(1800);
ok((await cassa.textContent('#qp-cassa-esito')).includes('già usato'), 'Cassa: lo stesso pass non si può riusare (PIN ricordato)');

// 4. LUCA riapre il link: vede il pass usato. MARCO riapre il Quick Pass: trova il suo premio
await luca.goto(link.replace(/^https?:\/\/[^/]+/, B)); await luca.waitForTimeout(2000);
ok((await luca.textContent('#mqt-qp-overlay')).includes('Usato il'), 'Luca: riaprendo il link vede il pass come usato');
await marco.goto(`${B}/u/${TAG}`); await marco.waitForTimeout(2000);
await marco.evaluate(() => { sbloccaTag(); apriMacroArea('action_center'); apriSezione('quickpass'); }); await marco.waitForTimeout(1500);
const sezioneMarco = await marco.textContent('#corpoSezione');
ok(sezioneMarco.includes('Il tuo premio') && sezioneMarco.includes('Un caffè offerto') && /1\s*AMICI ARRIVATI/.test(sezioneMarco), 'Marco: trova il premio da usare in cassa e il conteggio degli amici arrivati');
await foto(marco, '7-premio');

const db = await (await fetch(`${B}/__db`)).json();
const lead = JSON.parse((db.rows.find(r => r.username_system === TAG) || {}).lead_capture_leads || '[]')[0];
ok(lead && lead.nome === 'Luca' && lead.consenso_offerte === true && lead.fonte === 'Quick Pass', 'Il recapito di Luca arriva in I miei contatti con il consenso');
await browser.close();
