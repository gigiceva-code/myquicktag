// ============================================================
// PROVA NEL BROWSER: "prima l'account, poi la tag" e cancellazione di tag e account (26/11/2026)
// ============================================================
// Nato dalla prova di Luca (26/11): con la tag vuota "Attiva gratis" riapriva il pannello Modifica e non portava
// mai alla registrazione. Ora si va sempre all'attivazione; la tag vuota ai visitatori è "in preparazione".
// Uso come test/account.e2e.mjs (finto Supabase sulla porta 8788, riavviato prima di ogni giro):
//   node <progetto>/test/finto-supabase.mjs &
//   NODE_PATH=$PWD/node_modules CHROMIUM_PATH=/opt/pw-browsers/chromium node <progetto>/test/attivazione.e2e.mjs
import { createRequire } from 'module';
const richiedi = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH + '/' : import.meta.url);
const { chromium } = richiedi('playwright');
const LIB_SUPABASE = richiedi.resolve('@supabase/supabase-js/dist/umd/supabase.js');
let LIB_SORTABLE = null; try { LIB_SORTABLE = richiedi.resolve('sortablejs/Sortable.min.js'); } catch {}
const B = 'http://localhost:8788';
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
async function telefono() {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'it-IT' });
  if (LIB_SORTABLE) await c.route(/cdn\.jsdelivr\.net\/npm\/sortablejs/, r => r.fulfill({ path: LIB_SORTABLE, contentType: 'text/javascript' }));
  await c.route(/fonts\.googleapis|cdnjs\.cloudflare|cdn\.jsdelivr\.net\/npm\/(?!@supabase|sortablejs)/, r => r.abort());
  await c.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/, r => r.fulfill({ path: LIB_SUPABASE, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' } }));
  await c.route(/fake\.supabase\.co/, async r => {
    const req = r.request(); const u = new URL(req.url());
    const resp = await fetch(B + u.pathname + u.search, { method: req.method(), headers: req.headers(), body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postData() });
    r.fulfill({ status: resp.status, body: await resp.text(), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS' } });
  });
  return c;
}
const esiti = [], log = [];
const ok = (c, m) => esiti.push((c ? 'OK  ' : 'FAIL') + ' ' + m);
const att = (p, tag) => { p.on('pageerror', e => log.push(tag + ' ERR ' + e.message)); p.on('dialog', async d => { log.push(tag + ' DIALOG ' + d.message().replace(/\n/g, ' | ')); await d.accept(); }); };
const shot = async (p, n) => { await p.waitForTimeout(600); if (process.env.SCHERMATE) await p.screenshot({ path: `${process.env.SCHERMATE}/att-${n}.png` }); };
const db = async () => (await fetch(B + '/__db')).json();

// 1. Luca sceglie il nome e preme subito "Attiva gratis", senza scrivere niente
const cL = await telefono(); const L = await cL.newPage(); att(L, 'L');
await L.goto(B + '/'); await L.fill('#tag-input', 'Luca Turle'); await L.click('#btn-verifica-principale'); await L.waitForTimeout(900);
await L.click('#btn-entra-spazio'); await L.waitForURL(/edit/); await L.waitForTimeout(2000); await shot(L, '01-editor-vuoto');
await L.evaluate(() => pubblicaDallaBarra());
await L.waitForURL(/checkout/, { timeout: 6000 }).catch(() => {});
ok(/checkout/.test(L.url()), 'tag vuota: «Attiva gratis» porta subito all\'attivazione (prima riapriva il pannello Modifica)');
await L.waitForTimeout(1200); await L.evaluate(() => eseguiTransazione()); await L.waitForTimeout(1200);
await L.click('#link-registrati'); await L.waitForURL(/accesso/); await L.waitForTimeout(1000);
await L.fill('#r-email', 'luca@esempio.it'); await L.fill('#r-pwd', 'Password123'); await L.fill('#r-pwd2', 'Password123');
await L.click('#f-registrati button[type=submit]'); await L.waitForTimeout(1200);
await fetch(B + '/__conferma?email=luca@esempio.it'); await L.click('#c-confermato');
await L.waitForURL(/checkout/, { timeout: 8000 }).catch(() => {}); await L.waitForTimeout(2500); await shot(L, '02-attivata');
let d = await db(); let riga = d.rows.find(r => r.username_system === 'lucaturle');
ok(riga && riga.stato === 'attivo' && riga.proprietario_id, 'tag vuota: account creato e tag attivata');

// 2. Il titolare apre la sua tag: in basso "Completa la tua tag"
await L.click('#btn-vai-alla-tag'); await L.waitForURL(/\/u\/lucaturle/); await L.waitForTimeout(2500);
await L.evaluate(() => { const o = document.getElementById('tag-welcome-overlay'); if (o) o.style.display = 'none'; });
await shot(L, '03-tag-titolare');
ok(await L.isVisible('#cta-completa-tag'), 'titolare: sulla sua tag vuota compare «Completa la tua tag»');
ok((await L.getAttribute('#cta-completa-tag a', 'href')) === '/edit.html?u=lucaturle', '«Completa la tua tag» porta all\'editor');

// 3. Un visitatore vede "in preparazione", non una pagina nera
const cV = await telefono(); const V = await cV.newPage(); att(V, 'V');
await V.goto(B + '/u/lucaturle'); await V.waitForTimeout(2500); await shot(V, '04-visitatore');
ok(/in preparazione/i.test(await V.textContent('#copertina-sottotitolo')) && !(await V.isVisible('#entrance-prompt')) && !(await V.isVisible('#cta-completa-tag')), 'visitatore: tag vuota «in preparazione», senza ESPLORA TAG');

// 4. Identity Console: "Completa la tua tag" con cosa manca
await L.goto(B + '/dashboard.html'); await L.waitForTimeout(2500); await shot(L, '05-console');
const completa = await L.textContent('.completa-tag').catch(() => '');
ok(/Completa la tua tag/.test(completa) && /foto/.test(completa) && /contatto/.test(completa), 'Identity Console: «Completa la tua tag · manca la foto, la bio, un contatto»');

// 5. Dopo aver scritto la bio il visitatore vede la tag normale
await L.goto(B + '/edit.html?u=lucaturle'); await L.waitForTimeout(2500);
await L.evaluate(() => apriDrawer('drawer-bio')); await L.fill('#field-bio', 'Agente di commercio.'); await L.evaluate(() => chiudiSenzaSalvare());
await L.evaluate(() => salvaEDirigi('pubblica')); await L.waitForTimeout(2500);
await V.reload(); await V.waitForTimeout(2500);
ok(!/in preparazione/i.test(await V.textContent('#copertina-sottotitolo')) && await V.isVisible('#entrance-prompt'), 'visitatore: con un contenuto la tag torna normale');

// 6. Elimina la tag: serve scrivere il nome
await L.goto(B + '/dashboard.html'); await L.waitForTimeout(2500);
await L.click('[data-elimina="lucaturle"]'); await L.waitForTimeout(300); await shot(L, '06-conferma-tag');
ok(await L.isDisabled('#ce-conferma'), 'elimina tag: il pulsante resta spento finché non si scrive il nome');
await L.fill('#ce-campo', 'luca'); ok(await L.isDisabled('#ce-conferma'), 'elimina tag: un nome diverso non basta');
await L.fill('#ce-campo', 'LucaTurle'); await L.click('#ce-conferma'); await L.waitForTimeout(2000); await shot(L, '07-tag-eliminata');
d = await db();
ok(!d.rows.some(r => r.username_system === 'lucaturle') && await L.isHidden('#conferma-elimina') && /nessuna tag/i.test(await L.textContent('#elenco')), 'elimina tag: cancellata, la Console non la mostra più');
await V.reload(); await V.waitForTimeout(2000);
ok(!/Agente di commercio/.test(await V.textContent('body')), 'elimina tag: il visitatore non la trova più');

// 7. Elimina l'account: serve scrivere ELIMINA
await L.click('#btn-elimina-account'); await L.waitForTimeout(300); await shot(L, '08-conferma-account');
await L.fill('#ce-campo', 'elimina'); await L.click('#ce-conferma');
await L.waitForURL(u => u.pathname === '/', { timeout: 8000 }).catch(() => {}); await L.waitForTimeout(1200); await shot(L, '09-home-saluto');
ok(/account è stato eliminato/.test(await L.textContent('body')) && !/account=/.test(L.url()), 'elimina account: si torna alla home con il saluto');
d = await db();
ok(!d.utenti.some(u => u.email === 'luca@esempio.it'), 'elimina account: l\'account non esiste più');
await L.goto(B + '/accesso.html'); await L.waitForTimeout(1500);
await L.fill('#a-email', 'luca@esempio.it').catch(() => {}); await L.fill('#a-pwd', 'Password123').catch(() => {});
await L.click('#f-accedi button[type=submit]').catch(() => {}); await L.waitForTimeout(1500);
ok(/accesso/.test(L.url()), 'elimina account: con la vecchia password non si entra più');

console.log(esiti.join('\n')); console.log('--- log'); console.log(log.join('\n'));
await browser.close();
process.exitCode = esiti.some(e => e.startsWith('FAIL')) ? 1 : 0;
