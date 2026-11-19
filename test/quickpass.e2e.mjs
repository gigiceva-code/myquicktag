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
const TAG = 'studioqp' + Date.now().toString(36).slice(-4);
const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) process.exitCode = 1; };
const foto = async (p, n) => { if (process.env.SCHERMATE) { await p.waitForTimeout(400); await p.screenshot({ path: `${process.env.SCHERMATE}/qp-${n}.png` }); } };

await fetch(`${B}/__seed`, { method: 'POST', body: JSON.stringify({
  username_system: TAG, username_display: '@StudioGiulia', stato: 'attivo', data_scadenza: '2099-01-01',
  quickpass_premio_a: 'Una sessione extra gratuita', quickpass_premio_b: 'Una consulenza introduttiva gratuita', quickpass_amici_per_premio: 1,
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
ok(await marco.evaluate(() => document.getElementById('corpoSezione').textContent.includes('CONDIVIDI UN REGALO')), 'Action Center: il pulsante dice «Condividi un regalo»');
await marco.evaluate(() => apriSezione('quickpass')); await marco.waitForTimeout(1200);
await foto(marco, '1-invito-vuoto');
const primaDelLink = await marco.textContent('#corpoSezione');
ok(primaDelLink.includes('Un regalo da condividere') && primaDelLink.includes('Chi lo riceve ottiene') && primaDelLink.includes('tu guadagni'), 'Marco: prima di creare il link capisce cosa riceve chi lo apre e cosa guadagna lui');
await marco.fill('#qp-mio-nome', 'Marco Rossi');
await marco.click('#qp-crea'); await marco.waitForTimeout(1200);
const testoMarco = await marco.textContent('#corpoSezione');
const link = (testoMarco.match(/https?:\/\/\S+\?pass=[A-Z0-9]{8}/) || [])[0];
ok(!!link && testoMarco.includes('Il tuo link da condividere') && testoMarco.includes('Al prossimo utilizzo del regalo'), 'Marco: link da condividere creato, con quanto manca al premio');
await foto(marco, '2-invito-pronto');

// 2. LUCA apre il link e ritira il pass
const luca = await telefono('luca');
await luca.goto(link.replace(/^https?:\/\/[^/]+/, B)); await luca.waitForTimeout(2000);
const regalo = await luca.textContent('#mqt-qp-overlay');
ok(regalo.includes('Marco ti ha fatto un regalo') && regalo.includes('Una consulenza introduttiva gratuita') && regalo.includes('Lo usi di persona') && regalo.includes('Ricevi il tuo regalo'), 'Luca: vede chi gli fa il regalo, cosa riceve e come si usa');
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
ok(passTesto.includes('Il tuo regalo') && passTesto.includes('Valido fino al') && passTesto.includes('COME SI USA') && passTesto.includes('Di persona') && passTesto.includes('prima di pagare se c\'è un acquisto') && !!codice, 'Luca: regalo personale con codice, scadenza e istruzioni chiare');
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
ok(verifica.includes('VALIDO') && verifica.includes('DA CONSEGNARE') && verifica.includes('Luca') && verifica.includes('Una consulenza introduttiva') && verifica.includes('Glielo ha mandato Marco Rossi') && !verifica.includes('⚠'), 'Cassa: codice valido, cosa consegnare, a chi e chi l\'ha mandato');
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
ok(sezioneMarco.includes('Il tuo premio') && sezioneMarco.includes('Una sessione extra gratuita') && /1\s*PERSONE CHE L'HANNO USATO/.test(sezioneMarco) && /1\s*PREMI CHE HAI GUADAGNATO/.test(sezioneMarco), 'Marco: trova il premio da usare e i conteggi in parole semplici');
await foto(marco, '7-premio');

// Link regalo del titolare (es. nella sua storia): chi lo apre riceve il regalo con un codice personale
const follower = await telefono('cassa');
await follower.goto(`${B}/u/${TAG}?regalo=1`); await follower.waitForTimeout(1800);
const paginaFollower = await follower.textContent('#mqt-qp-overlay');
ok(paginaFollower.includes('Hai ricevuto un regalo') && paginaFollower.includes('Una consulenza introduttiva gratuita'), 'Link del titolare: chi lo apre vede il regalo');
await follower.fill('#qp-nome', 'Sara'); await follower.click('#qp-ritira'); await follower.waitForTimeout(1500);
ok((await follower.textContent('#mqt-qp-overlay')).includes('Il tuo regalo'), 'Link del titolare: il follower riceve il suo regalo personale');
// Pannello del titolare sulla tag: "Pubblica la tua offerta" spiega a cosa serve il link e che non dà premi a nessuno
await follower.evaluate(() => { mqtQuickPass.chiudi(); cacheDatiUtente.sei_proprietario = true; sbloccaTag(); apriMacroArea('action_center'); apriSezione('quickpass'); }); await follower.waitForTimeout(1200);
const pannello = await follower.textContent('#corpoSezione');
ok(pannello.includes('PUBBLICA LA TUA OFFERTA') && pannello.includes('nessuno ottiene un premio') && pannello.includes("Pubblica l'offerta") && pannello.includes('OFFERTE RICHIESTE') && !pannello.includes('REGALI RICHIESTI'), 'Titolare: «Pubblica la tua offerta» spiegato chiaramente e numeri con le parole nuove');
await foto(follower, '11-titolare');
const db = await (await fetch(`${B}/__db`)).json();
const lead = JSON.parse((db.rows.find(r => r.username_system === TAG) || {}).lead_capture_leads || '[]')[0];
ok(lead && lead.nome === 'Luca' && lead.consenso_offerte === true && lead.fonte === 'QuickGift', 'Il recapito di Luca arriva in Contatti ricevuti con il consenso');
await browser.close();

// ---------- QUICKGIFT ONLINE: niente WhatsApp, il codice personale si indica quando si ordina o si prenota e si conferma in cassa ----------
{
  const TAG2 = 'negoziowebqp' + Date.now().toString(36).slice(-4);
  await fetch(`${B}/__seed`, { method: 'POST', body: JSON.stringify({
    username_system: TAG2, username_display: '@AcademyWeb', stato: 'attivo', data_scadenza: '2099-01-01',
    quickpass_premio_a: 'Un mese di contenuti riservati', quickpass_premio_b: 'Accesso alla masterclass online', quickpass_modo: 'online', quickpass_contatto: 'www.negozioweb.it/shop'
  }) });
  const b2 = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = async (w, h, dpr) => { const c = await b2.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true });
    await c.route(/cdn\.jsdelivr\.net\/npm\/@supabase|fonts\.googleapis|cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome/, r => r.abort()); return c.newPage(); };
  const anna = await ctx(390, 844, 2);
  await anna.goto(`${B}/u/${TAG2}`); await anna.waitForTimeout(1800);
  await anna.evaluate(() => { sbloccaTag(); apriMacroArea('action_center'); apriSezione('quickpass'); }); await anna.waitForTimeout(1200);
  await anna.fill('#qp-mio-nome', 'Anna'); await anna.click('#qp-crea'); await anna.waitForTimeout(1200);
  const sezioneAnna = await anna.textContent('#corpoSezione');
  const link2 = (sezioneAnna.match(/https?:\/\/\S+\?pass=[A-Z0-9]{8}/) || [])[0];
  ok(['WhatsApp', 'Telegram', 'Facebook', 'SMS', 'Email', 'Copia link', 'Mostra QR'].every(c => sezioneAnna.includes(c)), 'Condivisione: l\'amico A ha WhatsApp, Telegram, Facebook, SMS, email, copia link e QR');
  await foto(anna, '7b-canali');
  await anna.evaluate(() => mqtQuickPass.condividiSu('qr')); await anna.waitForTimeout(500);
  ok((await anna.textContent('#mqt-qp-overlay')).includes('Il tuo link regalo') && !!(await anna.$('#mqt-qp-overlay .mqt-qp-qr-link')), 'Condivisione: «Mostra QR» fa comparire il QR del link da far inquadrare');
  const bea = await ctx(375, 812, 3);
  await bea.goto(link2.replace(/^https?:\/\/[^/]+/, B)); await bea.waitForTimeout(1800);
  ok((await bea.textContent('#mqt-qp-overlay')).includes('con il tuo codice personale'), 'Online: la pagina del regalo dice che si usa con il codice personale');
  await bea.fill('#qp-nome', 'Bea'); await bea.click('#qp-ritira'); await bea.waitForTimeout(1500);
  await foto(bea, '8-pass-online');
  const testoOnline = await bea.textContent('#mqt-qp-overlay');
  const vai = await bea.$('#mqt-qp-overlay a:has-text("Vai dove usarlo")');
  ok(testoOnline.includes('Copia il codice') && testoOnline.includes('quando ordini, prenoti o richiedi il regalo') && !testoOnline.includes('sconto') && !(await bea.$('#mqt-qp-overlay a[href*="wa.me"]')), 'Online: «Copia il codice» e istruzioni neutre (nessuno «sconto»), niente WhatsApp');
  ok(!!vai && (await vai.getAttribute('href')) === 'https://www.negozioweb.it/shop', 'Online: «Vai dove usarlo» porta al link indicato dal titolare');
  ok(testoOnline.includes('Online:') && !testoOnline.includes('Di persona:') && !(await bea.$('#mqt-qp-overlay .mqt-qp-qr')), 'Online: istruzioni solo per l\'uso online, niente QR da cassa');
  await b2.close();
}

// ---------- QUICKGIFT IN QUATTRO DOMANDE NELL'EDITOR: nessun esempio, riepilogo che si compila, impostazioni facoltative ----------
{
  const b3 = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const c3 = await b3.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await c3.route(/cdn\.jsdelivr\.net\/npm\/@supabase|fonts\.googleapis|cdnjs\.cloudflare\.com/, r => r.abort());
  const ed = await c3.newPage();
  const avvisi = []; ed.on('dialog', d => { avvisi.push(d.message()); d.dismiss(); });
  await ed.goto(`${B}/edit.html`); await ed.waitForTimeout(1500);
  await ed.evaluate(() => { userPlan = 'GOLD'; statoUtente = 'attivo'; document.querySelectorAll('#drawer-quickpass .premium-lock-overlay').forEach(o => o.style.display = 'none'); apriDrawer('drawer-quickpass'); });
  await ed.waitForTimeout(500);
  const pagina = await ed.textContent('#drawer-quickpass');
  const domande = ['Cosa ottiene chi ti porta un amico?', 'Cosa offri all\'amico che arriva?', 'Ogni quanti amici lo ottiene?', 'Dove si usa l\'offerta?'].map(d => pagina.indexOf(d));
  ok(domande.every((x, i) => x > 0 && (i === 0 || x > domande[i - 1])), 'Editor: quattro domande, nell\'ordine del wireframe');
  ok(!pagina.includes('Per esempio') && !(await ed.$('.qp-proposta')) && await ed.inputValue('#field-qp-premio-a') === '' && await ed.inputValue('#field-qp-premio-b') === '', 'Editor: nessun esempio e nessun campo precompilato');
  ok(!/amico A|amico B|link personale/i.test(pagina.split('ALTRE IMPOSTAZIONI')[0]), 'Editor: niente termini tecnici nelle domande');
  ok(!(await ed.isVisible('#qp-attivo')) && (await ed.textContent('#qp-avanti')).includes('ATTIVA QUICKGIFT'), 'Editor: prima dell\'attivazione il pulsante dice «Attiva QuickGift» e il riquadro cassa non c\'è');
  await ed.click('#qp-avanti');
  ok(avvisi.some(t => t.includes('domanda 1')), 'Editor: senza risposta alla domanda 1 non si attiva e si viene portati al campo');
  await ed.fill('#field-qp-premio-a', 'Una sessione extra gratuita');
  await ed.fill('#field-qp-premio-b', 'Una consulenza introduttiva');
  ok((await ed.textContent('#qp-soglia-nota')).includes('senza un tetto'), 'Editor: con «ogni amico» e nessun numero massimo c\'è l\'avviso, dentro le impostazioni facoltative');
  await ed.click('#qp-soglie .qp-soglia[data-amici="3"]');
  ok(await ed.inputValue('#field-qp-amici') === '3' && (await ed.textContent('#qp-soglie')).includes('OGNI') && !(await ed.$('#qp-soglia-nota .qp-avviso-tetto')), 'Editor: «ogni 3 amici» si sceglie con un clic e l\'avviso sparisce');
  const frase = await ed.textContent('#qp-frase');
  ok(frase.includes('Chi ti porta 3 amici') && frase.includes('e così ogni 3 amici') && frase.includes('Una sessione extra gratuita') && frase.includes('Una consulenza introduttiva') && frase.includes('di persona'), 'Editor: il riepilogo si compila mentre si scrive');
  await foto(ed, '9-editor-pagina');
  await ed.evaluate(() => document.getElementById('qp-frase').scrollIntoView({ block: 'center' }));
  await foto(ed, '10-editor-pagina-sotto');
  await ed.click('#drawer-quickpass button:has-text("STRATEGIA")'); await ed.waitForTimeout(400);
  const strategia = await ed.textContent('#strategia-content');
  ok(await ed.evaluate(() => getComputedStyle(document.getElementById('drawer-strategia').lastElementChild).display === 'none'), 'Strategia: chi è già Gold non vede «Scopri i piani e sblocca»');
  ok(['Come funziona', 'Come si diffonde', 'L\'amico che arriva', 'Quando si conferma', 'Chi porta un amico', 'Idee da adattare'].every(t => strategia.includes(t)), 'Strategia: spiegazione completa e idee, fuori dalla configurazione');
  await ed.evaluate(() => chiudiStrategia()); await ed.waitForTimeout(400);
  await ed.click('#qp-modi .qp-modo[data-modo="online"]');
  ok(await ed.isVisible('#field-qp-contatto') && (await ed.textContent('#qp-contatto-box')).includes('codice personale') && !(await ed.textContent('#qp-contatto-box')).includes('sconto') && (await ed.textContent('#qp-frase')).includes('lo usa online'), 'Editor: scegliendo Online si spiega il codice personale e il link è facoltativo');
  avvisi.length = 0; await ed.fill('#field-qp-contatto', '+39 333 1234567'); await ed.click('#qp-avanti');
  ok(avvisi.some(t => t.includes('non sembra un indirizzo web')), 'Editor: un numero di telefono al posto del link viene segnalato');
  await ed.fill('#field-qp-contatto', '');
  avvisi.length = 0; await ed.click('#qp-avanti');
  ok(!(await ed.isChecked('#qp-dichiarazione')) && avvisi.some(t => t.includes('decisi e garantiti da te')), 'Editor: senza la dichiarazione del titolare (mai già spuntata) QuickGift non si salva');
  // Dopo l'attivazione (risposte salvate, tag attiva): riquadro "QuickGift è attivo" e pulsante "Salva le modifiche"
  await ed.evaluate(() => qpAvvia()); await ed.waitForTimeout(300);
  ok(await ed.isVisible('#qp-attivo') && (await ed.textContent('#qp-attivo')).includes('QUICKGIFT È ATTIVO') && (await ed.textContent('#qp-avanti')).includes('SALVA LE MODIFICHE'), 'Editor: dopo l\'attivazione compare «QuickGift è attivo» e il pulsante diventa «Salva le modifiche»');
  await b3.close();
}
