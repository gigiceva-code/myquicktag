// ============================================================
// PROVA NEL BROWSER: la tag pubblica non esegue codice nascosto nei testi del proprietario
// ============================================================
// Apre tag.html con un profilo pieno di attacchi in tutti i campi, apre tutte le sezioni e
// conta le esecuzioni. Risultato atteso: xss 0, imgOnerror 0, linkJavascript [], iframe [""].
// Uso: serve il pacchetto "playwright" (non è tra le dipendenze del sito). Ad esempio:
//   cd $(mktemp -d) && npm i playwright && cp <progetto>/test/xss-tag.e2e.mjs . \
//   && sed -i "s|new URL('..', import.meta.url).pathname.replace(/\\/$/, '')|'<progetto>'|" xss-tag.e2e.mjs \
//   && CHROMIUM_PATH=/opt/pw-browsers/chromium node xss-tag.e2e.mjs
import { chromium } from 'playwright';
import fs from 'fs';
const root=new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const P = '<img src=x onerror="window.__xss=(window.__xss||0)+1">';
const J = 'javascript:window.__xss=(window.__xss||0)+1';
const fields = {
  username_system:'evil', username_display:'@EVIL', stato:'attivo', plan:'GOLD', has_password:true,
  bio:P, sito_web:J, email:'a@b.it', quick_action_tipo:'appuntamento', quick_action_label:P, quick_action_url:J,
  live_status_color:'green', live_status_text:P, live_status_action_type:'link', live_status_action_label:P, live_status_action_url:J,
  flash_text:P, flash_micro:P, pdf_label:P, pdf_url:J, cv:J, review_url:J, review_contact:P,
  video_url:J, video_cta_text:P, video_cta_url:J, quickpass_premio_a:P, quickpass_premio_b:P, quickpass_limite:5,
  lead_capture_attivo:'true', lead_capture_titolo:P, shop_attivo:'true', shop_titolo:P, shop_prezzo:P, shop_link:J, shop_scadenza:'2099-01-01',
  gallery_data: JSON.stringify(["x')\"><img src=x onerror=\"window.__xss=1\">"]),
  config_canali: JSON.stringify([{nome:P,url:J,vip:false,official:true,iconClass:'fab fa-x" onerror="x'}]),
  partners_data: JSON.stringify([{nome:P,url:J,ruolo:P}]),
  modulo_vcf: JSON.stringify({telefono1:P,indirizzo:P,email1:P}),
};
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport:{width:390,height:844} });
const errori=[]; page.on('pageerror', e=>errori.push(e.message));
let dialoghi=0; page.on('dialog', d=>{dialoghi++; d.dismiss();});
await page.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.pathname.startsWith('/api/get-profile')) return route.fulfill({ json:{ success:true, fields, abbonamento:{fase:'attiva',data_scadenza:'2099-01-01',giorni_alla_scadenza:999} } });
  if (url.pathname.startsWith('/api/')) return route.fulfill({ json:{ success:true } });
  if (url.hostname==='localhost') { const f=root+url.pathname; if (fs.existsSync(f)) return route.fulfill({ path:f }); return route.fulfill({status:404,body:''}); }
  return route.abort();
});
await page.goto('http://localhost/tag.html?u=evil'); await page.waitForTimeout(2500);
const chiamate = ["apriMacroArea('identity')","apriMacroArea('network')","apriMacroArea('business')","apriMacroArea('media')","apriMacroArea('action_center')",
  "apriDettaglio('status')","apriDettaglio('flash')","apriSezione('bio')","apriSezione('contatti')","apriSezione('cv')","apriSezione('flash')","apriSezione('gallery')","apriSezione('pdf')","apriSezione('quickpass')","apriSezione('sito')","apriSezione('social')",
  "apriScudoReputazione()","apriSmartVideo()","eseguiQuickAction && eseguiQuickAction()","controllaAcquistoIstantaneo && controllaAcquistoIstantaneo()"];
for (const c of chiamate) { await page.evaluate(c).catch(e=>errori.push(c+': '+e.message)); await page.waitForTimeout(150); }
// clicca tutti i link presenti
const links = await page.$$eval('a[href]', as => as.map(a=>a.getAttribute('href')));
const pericolosi = links.filter(h => /^\s*javascript:/i.test(h||''));
const iframe = await page.$$eval('iframe', fs=>fs.map(f=>f.getAttribute('src')));
const xss = await page.evaluate(()=>window.__xss||0);
const imgOnerror = await page.$$eval('[onerror]', els=>els.length);
console.log(JSON.stringify({xss, imgOnerror, dialoghi, linkJavascript:pericolosi, iframe, errori:errori.slice(0,6)}, null, 1));
await browser.close();
