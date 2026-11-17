// ============================================================
// PROVA NEL BROWSER: PIANO EFFETTIVO (modello C) E VIP VAULT VERIFICATO SUL SERVER (17/11/2026)
// ============================================================
// Uso come test/quickpass.e2e.mjs (serve test/finto-supabase.mjs sulla porta 8788 e Playwright):
//   NODE_PATH=$PWD/node_modules CHROMIUM_PATH=/opt/pw-browsers/chromium node <progetto>/test/piano.e2e.mjs
import { createRequire } from 'module';
const richiedi = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH + '/' : import.meta.url);
const { chromium } = richiedi('playwright');
const B = 'http://localhost:8788';
const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) process.exitCode = 1; };
const giorni = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const sfx = Date.now().toString(36).slice(-4);
const canali = JSON.stringify([{ nome: 'instagram', url: 'https://instagram.com/prova' }, { nome: 'listino', url: 'https://riservato.example/listino', vip: true, pin: '2468' }]);
const comune = { stato: 'attivo', username_display: '@Prova', config_canali: canali, review_url: 'https://g.page/r', gallery_data: '["https://res.cloudinary.com/x/a.jpg"]' };
await fetch(`${B}/__seed`, { method: 'POST', body: JSON.stringify({ username_system: 'vipprova' + sfx, data_scadenza: giorni(40), ...comune }) });
await fetch(`${B}/__seed`, { method: 'POST', body: JSON.stringify({ username_system: 'baseprova' + sfx, data_scadenza: giorni(-40), ...comune }) });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
await ctx.route(/riservato\.example/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Listino riservato</h1>' }));
await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase|fonts\.googleapis|cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome/, r => r.abort());
const p = await ctx.newPage();
const risposte = [];
p.on('response', async r => { if (r.url().includes('/api/get-profile')) { try { risposte.push(await r.text()); } catch (e) {} } });

// 1. In prova: il canale riservato c'è, ma link e PIN non arrivano al browser
await p.goto(`${B}/u/vipprova${sfx}`); await p.waitForTimeout(2000);
ok(risposte.length && !risposte.join('').includes('riservato.example') && !risposte.join('').includes('2468'), 'VIP Vault: link e PIN non arrivano mai al browser');
ok(await p.evaluate(() => typeof pinRiservato === 'undefined' && pianoTag() === 'GOLD'), 'In prova: piano Gold deciso dal server, nessun PIN in memoria nella pagina');
await p.evaluate(() => { sbloccaTag(); apriMacroArea('network'); apriSezione('social'); }); await p.waitForTimeout(600);
ok((await p.textContent('#corpoSezione')).toLowerCase().includes('listino'), 'In prova: il canale riservato compare con il lucchetto');
await p.evaluate(() => { const a = [...document.querySelectorAll('#corpoSezione a')].find(x => x.textContent.toLowerCase().includes('listino')); a.click(); });
await p.waitForTimeout(300);
await p.fill('#vip-pin-input', '1111');
await p.evaluate(() => verificaPinVip()); await p.waitForTimeout(800);
ok((await p.getAttribute('#vip-pin-input', 'placeholder')) === 'ERRATO', 'VIP Vault: PIN sbagliato → «ERRATO», nessun link');
const nuova = ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null);
await p.fill('#vip-pin-input', '2468');
await p.evaluate(() => verificaPinVip());
const finestra = await nuova; if (finestra) await finestra.waitForTimeout(800);
ok(!!finestra && finestra.url().includes('riservato.example/listino'), 'VIP Vault: PIN giusto → il server consegna il link e si apre');

// 2. Prova finita (modello C): la tag resta online con il Base, niente sezioni Gold né VIP Vault
const q = await ctx.newPage();
await q.goto(`${B}/u/baseprova${sfx}`); await q.waitForTimeout(2000);
const stato = await q.evaluate(() => ({ piano: pianoTag(), review: !!cacheDatiUtente.review_url, galleria: !!cacheDatiUtente.gallery_data, canali: JSON.parse(cacheDatiUtente.config_canali || '[]').length, nome: cacheDatiUtente.username_display }));
ok(stato.piano === 'BASE' && stato.nome === '@Prova' && !stato.review && !stato.galleria && stato.canali === 1, 'Modello C: finita la prova la tag è online con il Base (niente Gold, Premium né VIP Vault)');
ok(!(await q.textContent('body')).includes('non è al momento attiva'), 'Modello C: la tag non si spegne');
await browser.close();
