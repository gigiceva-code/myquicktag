// ============================================================
// PROVA NEL BROWSER: QUICKGIFT (ex Quick Pass) dal link alla cassa, più la configurazione guidata nell'editor, con tre telefoni simulati
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
// Ogni telefono ha il suo schermo (il server riconosce lo stesso telefono anche in browser diversi)
const SCHERMI = { marco: [390, 844, 2], luca: [375, 812, 3], cassa: [412, 915, 2.6] };
async function telefono(chi = 'marco') {
  const [w, h, dpr] = SCHERMI[chi];
  const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true, locale: 'it-IT' });
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
ok(await marco.evaluate(() => { apriMacroArea('action_center'); return document.getElementById('corpoSezione').innerHTML.includes("apriSezione('quickpass')"); }), 'Action Center: c\'è QuickGift');
ok(await marco.evaluate(() => document.getElementById('corpoSezione').textContent.includes('REGALA A UN AMICO')), 'Action Center: il pulsante dice «Regala a un amico»');
await marco.evaluate(() => apriSezione('quickpass')); await marco.waitForTimeout(1200);
await foto(marco, '1-invito-vuoto');
const primaDelLink = await marco.textContent('#corpoSezione');
ok(primaDelLink.includes('Un regalo da condividere') && primaDelLink.includes('Il tuo amico riceve') && primaDelLink.includes('tu guadagni'), 'Marco: prima di creare il link capisce cosa riceve l\'amico e cosa guadagna lui');
await marco.fill('#qp-mio-nome', 'Marco Rossi');
await marco.click('#qp-crea'); await marco.waitForTimeout(1200);
const testoMarco = await marco.textContent('#corpoSezione');
const link = (testoMarco.match(/https?:\/\/\S+\?pass=[A-Z0-9]{8}/) || [])[0];
ok(!!link && testoMarco.includes('Il tuo link da condividere') && testoMarco.includes('Al prossimo amico che usa il regalo'), 'Marco: link da condividere creato, con quanto manca al premio');
await foto(marco, '2-invito-pronto');

// 2. LUCA apre il link e ritira il pass
const luca = await telefono('luca');
await luca.goto(link.replace(/^https?:\/\/[^/]+/, B)); await luca.waitForTimeout(2000);
const regalo = await luca.textContent('#mqt-qp-overlay');
ok(regalo.includes('Marco ti ha fatto un regalo') && regalo.includes('Il dolce in omaggio alla prima cena') && regalo.includes('prima di pagare') && regalo.includes('Ricevi il tuo regalo'), 'Luca: vede chi gli fa il regalo, cosa riceve e come si usa');
ok(regalo.indexOf('Ricevi il tuo regalo') < regalo.indexOf('FACOLTATIVO') && !(await luca.isChecked('#qp-consenso')), 'Luca: recapito e consenso dopo il pulsante, facoltativi e non spuntati');
await foto(luca, '3-regalo');
await luca.click('#qp-ritira'); await luca.waitForTimeout(500);
ok((await luca.textContent('#qp-errore')).includes('nome'), 'Luca: senza nome il regalo non si riceve');
await luca.fill('#qp-nome', 'Luca');
await luca.fill('#qp-contatto', '3331112222');
await luca.check('#qp-consenso');
await luca.click('#qp-ritira'); await luca.waitForTimeout(1500);
const passTesto = await luca.textContent('#mqt-qp-overlay');
const codice = (passTesto.match(/\b[A-Z0-9]{6}\b/g) || []).find(c => /\d/.test(c) || /[A-Z]{6}/.test(c));
ok(passTesto.includes('Il tuo regalo') && passTesto.includes('Valido fino al') && passTesto.includes('COME SI USA') && passTesto.includes('prima di pagare') && !!codice, 'Luca: regalo personale con codice, scadenza e istruzioni chiare');
await foto(luca, '4-pass');

// Marco non può usare il suo stesso invito
await marco.goto(link.replace(/^https?:\/\/[^/]+/, B)); await marco.waitForTimeout(1800);
await marco.fill('#qp-nome', 'Marco'); await marco.click('#qp-ritira'); await marco.waitForTimeout(1000);
ok((await marco.textContent('#qp-errore')).includes('Questo è il tuo link'), 'Marco: non può ricevere il regalo con il suo stesso link');
// Marco riapre il link dal browser interno di WhatsApp: stesso telefono, memoria del browser diversa
const marcoWhatsApp = await telefono('marco');
await marcoWhatsApp.goto(link.replace(/^https?:\/\/[^/]+/, B)); await marcoWhatsApp.waitForTimeout(1800);
await marcoWhatsApp.fill('#qp-nome', 'Mario'); await marcoWhatsApp.click('#qp-ritira'); await marcoWhatsApp.waitForTimeout(1000);
ok((await marcoWhatsApp.textContent('#qp-errore')).includes('Questo è il tuo link'), 'Marco dal browser di WhatsApp: riconosciuto come lo stesso telefono, niente regalo');

// 3. IN CASSA: il dipendente inquadra il QR (apre ?cassa=CODICE), inserisce il PIN e convalida
const cassa = await telefono('cassa');
await cassa.goto(`${B}/u/${TAG}?cassa=${codice}`); await cassa.waitForTimeout(2000);
ok(await cassa.isVisible('#qp-cassa-pin'), 'Cassa: senza essere il titolare chiede il PIN di cassa');
await cassa.fill('#qp-cassa-pin', '1111'); await cassa.click('#qp-cassa-azione'); await cassa.waitForTimeout(800);
ok((await cassa.textContent('#qp-cassa-esito')).includes('PIN errato'), 'Cassa: PIN errato rifiutato');
await cassa.fill('#qp-cassa-pin', '2468'); await cassa.click('#qp-cassa-azione'); await cassa.waitForTimeout(1000);
const verifica = await cassa.textContent('#qp-cassa-esito');
ok(verifica.includes('VALIDO') && verifica.includes('DA CONSEGNARE') && verifica.includes('Luca') && verifica.includes('Il dolce in omaggio') && verifica.includes('Glielo ha mandato Marco Rossi') && !verifica.includes('⚠'), 'Cassa: codice valido, cosa consegnare, a chi e chi l\'ha mandato');
ok((await cassa.textContent('#qp-cassa-azione')).includes('Ho consegnato'), 'Cassa: si conferma solo dopo aver consegnato');
await foto(cassa, '5-cassa-verifica');
await cassa.click('#qp-cassa-azione'); await cassa.waitForTimeout(1000);
const esito = await cassa.textContent('#qp-cassa-esito');
ok(esito.includes('Confermato') && esito.includes('Marco Rossi ha guadagnato il suo premio'), 'Cassa: regalo confermato e premio di Marco guadagnato');
await foto(cassa, '6-cassa-convalidato');

// Il PIN resta ricordato sul telefono della cassa: il pass già usato viene riconosciuto
await cassa.goto(`${B}/u/${TAG}?cassa=${codice}`); await cassa.waitForTimeout(1800);
ok((await cassa.textContent('#qp-cassa-esito')).includes('già usato'), 'Cassa: lo stesso codice non si può riusare (PIN ricordato)');

// 4. LUCA riapre il link: vede il pass usato. MARCO riapre il Quick Pass: trova il suo premio
await luca.goto(link.replace(/^https?:\/\/[^/]+/, B)); await luca.waitForTimeout(2000);
ok((await luca.textContent('#mqt-qp-overlay')).includes('Usato il'), 'Luca: riaprendo il link vede il regalo come usato');
await marco.goto(`${B}/u/${TAG}`); await marco.waitForTimeout(2000);
await marco.evaluate(() => { sbloccaTag(); apriMacroArea('action_center'); apriSezione('quickpass'); }); await marco.waitForTimeout(1500);
const sezioneMarco = await marco.textContent('#corpoSezione');
ok(sezioneMarco.includes('Il tuo premio') && sezioneMarco.includes('Un caffè offerto') && /1\s*AMICI CHE HANNO USATO IL REGALO/.test(sezioneMarco) && /1\s*PREMI CHE HAI GUADAGNATO/.test(sezioneMarco), 'Marco: trova il premio da usare e i conteggi in parole semplici');
await foto(marco, '7-premio');

const db = await (await fetch(`${B}/__db`)).json();
const lead = JSON.parse((db.rows.find(r => r.username_system === TAG) || {}).lead_capture_leads || '[]')[0];
ok(lead && lead.nome === 'Luca' && lead.consenso_offerte === true && lead.fonte === 'QuickGift', 'Il recapito di Luca arriva in I miei contatti con il consenso');
await browser.close();

// ---------- QUICK PASS ONLINE: niente cassa fisica, l'amico scrive su WhatsApp con il codice e il link della cassa ----------
{
  const TAG2 = 'negoziowebqp' + Date.now().toString(36).slice(-4);
  await fetch(`${B}/__seed`, { method: 'POST', body: JSON.stringify({
    username_system: TAG2, username_display: '@NegozioWeb', stato: 'attivo', data_scadenza: '2099-01-01',
    quickpass_premio_a: 'Un buono da 10 €', quickpass_premio_b: 'Spedizione gratuita sul primo ordine', quickpass_modo: 'online', quickpass_contatto: '+39 333 1234567'
  }) });
  const b2 = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = async (w, h, dpr) => { const c = await b2.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true });
    await c.route(/cdn\.jsdelivr\.net\/npm\/@supabase|fonts\.googleapis|cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome/, r => r.abort()); return c.newPage(); };
  const anna = await ctx(390, 844, 2);
  await anna.goto(`${B}/u/${TAG2}`); await anna.waitForTimeout(1800);
  await anna.evaluate(() => { sbloccaTag(); apriMacroArea('action_center'); apriSezione('quickpass'); }); await anna.waitForTimeout(1200);
  await anna.fill('#qp-mio-nome', 'Anna'); await anna.click('#qp-crea'); await anna.waitForTimeout(1200);
  const link2 = ((await anna.textContent('#corpoSezione')).match(/https?:\/\/\S+\?pass=[A-Z0-9]{8}/) || [])[0];
  const bea = await ctx(375, 812, 3);
  await bea.goto(link2.replace(/^https?:\/\/[^/]+/, B)); await bea.waitForTimeout(1800);
  await bea.fill('#qp-nome', 'Bea'); await bea.click('#qp-ritira'); await bea.waitForTimeout(1500);
  await foto(bea, '8-pass-online');
  const usa = await bea.$('#mqt-qp-overlay a[href*="wa.me"]');
  const href = usa ? await usa.getAttribute('href') : '';
  const testoWa = decodeURIComponent((href.split('text=')[1] || ''));
  const codice2 = (testoWa.match(/Codice ([A-Z0-9]{6})/) || [])[1];
  ok(!!usa && href.startsWith('https://wa.me/393331234567') && (await bea.textContent('#mqt-qp-overlay')).includes('Usa il regalo su WhatsApp'), 'Online: il regalo ha "Usa il regalo su WhatsApp" verso il recapito del titolare');
  const testoOnline = await bea.textContent('#mqt-qp-overlay');
  ok(testoOnline.includes('Online:') && !testoOnline.includes('In negozio:'), 'Online: istruzioni solo per l\'uso online, niente cassa');
  ok(!!codice2 && testoWa.includes(`/u/${TAG2}?cassa=${codice2}`) && testoWa.includes('Spedizione gratuita') && testoWa.includes('regalo QuickGift'), 'Online: il messaggio contiene regalo, codice e link della cassa');
  ok(!(await bea.$('#mqt-qp-overlay .mqt-qp-qr')), 'Online: niente QR da mostrare in cassa');
  await b2.close();
}

// ---------- CONFIGURAZIONE GUIDATA NELL'EDITOR: schema delle tre figure, 3 passi, indietro sempre possibile ----------
{
  const b3 = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const c3 = await b3.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await c3.route(/cdn\.jsdelivr\.net\/npm\/@supabase|fonts\.googleapis|cdnjs\.cloudflare\.com/, r => r.abort());
  const ed = await c3.newPage();
  ed.on('dialog', d => d.dismiss());
  await ed.goto(`${B}/edit.html`); await ed.waitForTimeout(1500);
  await ed.evaluate(() => { userPlan = 'GOLD'; document.querySelectorAll('#drawer-quickpass .premium-lock-overlay').forEach(o => o.style.display = 'none'); apriDrawer('drawer-quickpass'); });
  await ed.waitForTimeout(500);
  const passo = () => ed.evaluate(() => [...document.querySelectorAll('#drawer-quickpass .qp-passo')].find(e => e.style.display !== 'none')?.dataset.passo);
  const schema = await ed.textContent('#qp-schema');
  ok(schema.includes('TU') && schema.includes('IL TUO CLIENTE') && schema.includes('IL SUO AMICO') && schema.includes('il tuo cliente guadagna il premio'), 'Editor: lo schema mostra le tre figure e quando arriva il premio');
  ok(await passo() === '1' && (await ed.textContent('#drawer-quickpass')).includes('PASSO 1 DI 3') && !(await ed.isVisible('#qp-indietro')), 'Editor: si parte dal regalo per l\'amico, passo 1 di 3');
  await ed.click('#qp-avanti'); ok(await passo() === '1', 'Editor: senza regalo non si va avanti');
  await ed.click('.qp-passo[data-passo="1"] .qp-proposta >> nth=1'); await ed.click('#qp-avanti');
  ok(await passo() === '2', 'Editor: scelto il regalo, passo 2 (premio per il cliente)');
  await ed.click('.qp-passo[data-passo="2"] .qp-proposta >> nth=0');
  await ed.click('#qp-soglie .qp-soglia[data-amici="3"]');
  ok(await ed.inputValue('#field-qp-amici') === '3', 'Editor: "dopo quanti amici" si sceglie con un tocco');
  await ed.click('#qp-avanti');
  const riep = await ed.textContent('#qp-riepilogo');
  ok(await passo() === '3' && riep.includes('Un caffè offerto') && riep.includes('Ogni 3 amici') && riep.includes('prima di pagare'), 'Editor: passo 3 con il riepilogo che rispecchia le scelte');
  await foto(ed, '9-editor-riepilogo');
  await ed.$eval('#drawer-quickpass .header-back', el => el.click()); ok(await passo() === '2', 'Editor: la freccia in alto dal passo 3 torna al 2');
  await ed.click('#qp-indietro'); ok(await passo() === '1', 'Editor: INDIETRO dal passo 2 torna all\'1');
  await b3.close();
}
