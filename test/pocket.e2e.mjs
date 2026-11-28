// ============================================================
// POCKET NELL'ACCOUNT (23/11/2026): la tag salvata in un browser si ritrova in un altro (stesso account)
// ============================================================
// Il caso del titolare: QR inquadrato con la fotocamera (browser A) e Pocket installato da un altro browser (B).
// Uso: node test/finto-supabase.mjs &   poi
//   NODE_PATH=$PWD/node_modules CHROMIUM_PATH=/opt/pw-browsers/chromium node test/pocket.e2e.mjs
import { createRequire } from 'module';
const richiedi = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH + '/' : import.meta.url);
const { chromium } = richiedi('playwright');
const LIB_SUPABASE = richiedi.resolve('@supabase/supabase-js/dist/umd/supabase.js');
const B = 'http://localhost:8788';
const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) process.exitCode = 1; };
const db = async () => (await fetch(B + '/__db')).json();

// Una tag da salvare e un account confermato
await fetch(B + '/__seed', { method: 'POST', body: JSON.stringify({ username_system: 'lucam', stato: 'attivo', username_display: '@LUCA M', digital_style: 'emerald', data_scadenza: '2027-02-20' }) });
await fetch(B + '/__seed', { method: 'POST', body: JSON.stringify({ username_system: 'bardue', stato: 'attivo', username_display: '@BAR DUE', digital_style: 'emerald', data_scadenza: '2027-02-20' }) });
await fetch(B + '/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: 'gigi@esempio.it', password: 'Password123' }) });
await fetch(B + '/__conferma?email=gigi@esempio.it');

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
async function telefono() {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'it-IT' });
  await c.route(/fonts\.googleapis|cdnjs\.cloudflare|cdn\.jsdelivr\.net\/npm\/(?!@supabase)/, r => r.abort());
  await c.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/, r => r.fulfill({ path: LIB_SUPABASE, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' } }));
  await c.route(/fake\.supabase\.co/, async r => {
    const req = r.request(); const u = new URL(req.url());
    const resp = await fetch(B + u.pathname + u.search, { method: req.method(), headers: req.headers(), body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postData() });
    r.fulfill({ status: resp.status, body: await resp.text(), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS' } });
  });
  return c;
}
async function accedi(p) {
  await p.goto(B + '/accesso.html'); await p.waitForTimeout(900);
  await p.fill('#a-email', 'gigi@esempio.it'); await p.fill('#a-pwd', 'Password123'); await p.click('#f-accedi button[type=submit]');
  await p.waitForURL(/dashboard/, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(1500);
}
async function salva(p, tag) {
  await p.goto(B + '/u/' + tag); await p.waitForTimeout(2200);
  await p.evaluate(() => salvaNelPocketCorrente()); await p.waitForURL(/pocket/, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(1500);
}

// 1. Browser A senza accesso: la tag resta nel browser e si invita ad accedere
const A = await (await telefono()).newPage();
await salva(A, 'lucam');
let d = await db();
ok(await A.evaluate(() => JSON.parse(localStorage.getItem('mqt_pocket') || '[]').some(x => x.username === 'lucam')) && d.pocket.length === 0, 'senza account: la tag resta in questo browser, niente nel database');
ok(await A.isVisible('#salvata-accedi') && /senza bisogno di registrarti/.test(await A.textContent('#salvata-testo')), 'senza account: invito «Accedi per ritrovarla ovunque»');

// 2. Browser A accede: il Pocket del telefono passa nell'account
await accedi(A);
await A.goto(B + '/pocket.html'); await A.waitForTimeout(2000);
d = await db();
ok(d.pocket.length === 1 && d.pocket[0].username === 'lucam', 'al primo accesso il Pocket del browser passa nell\'account');

// 3. Browser B (la PWA del Pocket): stesso account, la tag c'è
const ctxB = await telefono(); const PB = await ctxB.newPage();
await accedi(PB);
ok(/1 tag salvata nel tuo account/.test(await PB.textContent('#pocket-sub')), 'Identity Console in un altro browser: «1 tag salvata nel tuo account»');
await PB.goto(B + '/pocket.html'); await PB.waitForTimeout(2200);
ok(/LUCA M|lucam/i.test(await PB.textContent('#lista-pocket')) && !(await PB.isVisible('#pocket-vuoto')), 'Pocket in un altro browser: la tag salvata altrove c\'è');

// 4. Con l'account salvare va subito nell'account
await salva(PB, 'bardue');
d = await db();
ok(d.pocket.length === 2 && /nel tuo account/.test(await PB.textContent('#salvata-testo')), 'con l\'account: salvata subito nell\'account («È salvata nel tuo account»)');

// 5. Togliere una tag da B la toglie anche dall'account, e A si allinea
await PB.goto(B + '/pocket.html'); await PB.waitForTimeout(2000);
await PB.evaluate(() => mqtSessione.pocket.togli('lucam')); await PB.waitForTimeout(800);
d = await db();
await A.goto(B + '/pocket.html'); await A.waitForTimeout(2200);
ok(d.pocket.length === 1 && !/LUCA M/i.test(await A.textContent('#lista-pocket')) && /BAR DUE/i.test(await A.textContent('#lista-pocket')), 'tolta in un browser: sparisce dall\'account e dall\'altro browser');

// 6. Uscita: sul browser non resta una copia del Pocket dell'account
await A.evaluate(() => mqtSessione.esci(false)); await A.waitForTimeout(500);
ok(await A.evaluate(() => !localStorage.getItem('mqt_pocket')), 'uscendo dall\'account il Pocket non resta nel browser (sta nell\'account)');

// 7. (28/11/2026, segnalato dal titolare) Pocket aperto dove non si è entrati: niente "è vuoto" e basta, ma l'invito ad accedere
await A.goto(B + '/pocket.html'); await A.waitForTimeout(1500);
ok(await A.isVisible('#pocket-accedi') && /non risulti entrato/.test(await A.textContent('#pocket-accedi')), 'senza accesso: il Pocket spiega che mostra solo questo telefono e invita ad accedere');
ok(!(await PB.goto(B + '/pocket.html').then(() => PB.waitForTimeout(2000)).then(() => PB.isVisible('#pocket-accedi'))), 'con l\'accesso: nessun invito, si vedono le tag dell\'account');
ok((await PB.textContent('#pocket-account')) === 'Tag salvate nell\'account g•••@esempio.it' && !(await A.isVisible('#pocket-account')), 'con l\'accesso: il Pocket dice di quale account è (email in parte nascosta)');

await browser.close();
