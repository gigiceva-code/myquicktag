// ============================================================
// PROVA NEL BROWSER: CONDIVIDI (copertina e sezioni) e link che riaprono una sezione
// ============================================================
// Telefono simulato, profilo finto (le chiamate /api/ sono simulate qui). Serve una copia locale del sito
// sulla porta 8788, ad esempio test/finto-supabase.mjs, e il pacchetto "playwright":
//   cd $(mktemp -d) && npm i playwright && node <progetto>/test/finto-supabase.mjs &
//   NODE_PATH=$PWD/node_modules CHROMIUM_PATH=/opt/pw-browsers/chromium node <progetto>/test/condividi.e2e.mjs
import { createRequire } from 'module';
const richiedi = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH + '/' : import.meta.url);
const { chromium } = richiedi('playwright');
const B = 'http://localhost:8788';
const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) process.exitCode = 1; };
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function telefono(stato = 'attivo') {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await c.route(/cdn\.jsdelivr\.net\/npm\/@supabase|fonts\.googleapis|cdnjs\.cloudflare/, r => r.abort());
  const fields = { username_system: 'pizzeriadamario', username_display: '@PizzeriaDaMario', stato, bio: 'Pizza dal 1980',
    sito_web: 'https://pizzeriadamario.it', modulo_vcf: JSON.stringify({ telefono1: '3331234567' }),
    config_canali: JSON.stringify([{ nome: 'Instagram', url: 'https://instagram.com/pizzeria' }]), has_password: true, ha_proprietario: true };
  await c.route(/\/api\/get-profile/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, fields, abbonamento: { fase: 'attiva' } }) }));
  await c.route(/\/api\/track-/, r => r.fulfill({ body: '{}' }));
  // navigator.share finto: si registra cosa verrebbe condiviso
  await c.addInitScript(() => { window.__condivisi = []; Object.defineProperty(navigator, 'share', { value: d => { window.__condivisi.push(d); return Promise.resolve(); } }); });
  return c.newPage();
}
const ultimo = p => p.evaluate(() => window.__condivisi.pop());

let p = await telefono();
await p.goto(`${B}/tag.html?u=pizzeriadamario`); await p.waitForTimeout(2500);
ok(await p.isVisible('#btn-condividi-top'), 'copertina: CONDIVIDI visibile');
await p.click('#btn-condividi-top');
let d = await ultimo(p);
ok(d && d.url.endsWith('/u/pizzeriadamario') && d.title === '@PizzeriaDaMario · myquicktag' && d.text === '@PizzeriaDaMario: contatti, social e servizi in un unico tocco.', 'copertina: condivide /u/<nome> (indirizzo con anteprima) con un messaggio');
await p.evaluate(() => apriMacroArea('network')); await p.waitForTimeout(1200);
ok(await p.isVisible('#btn-condividi-sezione'), 'stanza: CONDIVIDI in basso accanto a CHIUDI');
await p.click('#btn-condividi-sezione');
ok((await ultimo(p)).url.endsWith('/u/pizzeriadamario?sezione=network'), 'stanza: link alla stanza');
await p.evaluate(() => apriSezione('contatti')); await p.waitForTimeout(1200);
await p.click('#btn-condividi-sezione');
d = await ultimo(p);
ok(d.url.endsWith('?sezione=network.contatti') && d.text === '@PizzeriaDaMario · Contatti', 'sezione: link alla sezione con il suo nome');

p = await telefono();
await p.goto(`${B}/tag.html?u=pizzeriadamario&sezione=network.contatti`); await p.waitForTimeout(3500);
ok(await p.evaluate(() => document.getElementById('overlaySezione').classList.contains('attiva') && location.hash === '#dettaglio'), 'link condiviso: la tag si apre direttamente sulla sezione');
await p.evaluate(() => history.back()); await p.waitForTimeout(1000);
ok(await p.evaluate(() => document.getElementById('titoloSezione').textContent === 'NETWORK'), 'link condiviso: INDIETRO torna alla stanza');

p = await telefono();
await p.goto(`${B}/tag.html?u=pizzeriadamario&sezione=business.inventata`); await p.waitForTimeout(2500);
ok(await p.evaluate(() => document.getElementById('profile-content').classList.contains('locked')), 'link a una sezione che la tag non ha: resta la copertina');

p = await telefono('in attesa');
await p.goto(`${B}/tag.html?u=pizzeriadamario`); await p.waitForTimeout(2500);
ok(!(await p.isVisible('#btn-condividi-top')), 'tag in attesa: niente CONDIVIDI');
await browser.close();
