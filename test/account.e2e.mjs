// ============================================================
// PROVA NEL BROWSER: account, registrazione con codice, multi-tag, recupero password, revoca sessioni
// ============================================================
// Usa test/finto-supabase.mjs (finto database + finto Supabase Auth sulla porta 8788): nessuna email
// vera, nessun accesso al database. Telefono simulato (390 px).
// Uso (servono Playwright e la libreria di Supabase, non sono dipendenze del sito):
//   cd $(mktemp -d) && npm i playwright @supabase/supabase-js@2.117.3
//   node <progetto>/test/finto-supabase.mjs &   (riavviarlo prima di ogni giro: tiene i dati in memoria)
//   NODE_PATH=$PWD/node_modules CHROMIUM_PATH=/opt/pw-browsers/chromium node <progetto>/test/account.e2e.mjs
import { createRequire } from 'module';
const richiedi = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH + '/' : import.meta.url);
const { chromium } = richiedi('playwright');
const LIB_SUPABASE = richiedi.resolve('@supabase/supabase-js/dist/umd/supabase.js');
let LIB_SORTABLE=null; try { LIB_SORTABLE=richiedi.resolve('sortablejs/Sortable.min.js'); } catch {}
async function instradaCdn(ctx){
  if (LIB_SORTABLE) await ctx.route(/cdn\.jsdelivr\.net\/npm\/sortablejs/, r=>r.fulfill({path:LIB_SORTABLE, contentType:'text/javascript'}));
  await ctx.route(/fonts\.googleapis|cdnjs\.cloudflare|cdn\.jsdelivr\.net\/npm\/(?!@supabase|sortablejs)/, r=>r.abort());
}
async function instradaSupabase(ctx){
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/, r=>r.fulfill({path:LIB_SUPABASE, contentType:'text/javascript', headers:{'Access-Control-Allow-Origin':'*'}}));
  await ctx.route(/fake\.supabase\.co/, async r=>{
    const req=r.request(); const u=new URL(req.url());
    const resp=await fetch('http://localhost:8788'+u.pathname+u.search,{method:req.method(),headers:req.headers(),body:['GET','HEAD'].includes(req.method())?undefined:req.postData()});
    r.fulfill({status:resp.status,body:await resp.text(),headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,PATCH,OPTIONS'}});
  });
}
const B='http://localhost:8788';
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const telefono=async()=>{ const c=await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true, locale:'it-IT' }); await instradaCdn(c); await instradaSupabase(c); return c; };
const log=[]; const esiti=[];
const ok=(c,m)=>{ esiti.push((c?'OK  ':'FAIL')+' '+m); };
const att=(p,tag)=>{ p.on('pageerror',e=>log.push(tag+' ERR '+p.url()+' '+e.message)); p.on('dialog',async d=>{ log.push(tag+' DIALOG '+d.message().replace(/\n/g,' | ')); await d.accept(); }); };
const shot=async(p,n)=>{ await p.waitForTimeout(600); if (process.env.SCHERMATE) await p.screenshot({path:`${process.env.SCHERMATE}/${n}.png`}); };
const inbox=async(email,tipo)=>{ const l=await (await fetch(B+'/__inbox')).json(); const m=l.filter(x=>x.a===email&&x.tipo===tipo).pop(); return m&&m.codice; };
const db=async()=>(await fetch(B+'/__db')).json();
const ev=async(p,c)=>{ try{ return await p.evaluate(c); }catch(e){ log.push('EVAL '+c+' '+e.message); } };

// 1. Mario, telefono A: prenota, scrive la tag, crea l'account con codice, attiva
const cA=await telefono(); const A=await cA.newPage(); att(A,'A');
await A.goto(B+'/'); await A.fill('#tag-input','Bar Mario'); await A.click('#btn-verifica-principale'); await A.waitForTimeout(800);
await A.click('#btn-entra-spazio'); await A.waitForURL(/edit/); await A.waitForTimeout(2000);
await ev(A,"apriDrawer('drawer-identita')"); await A.fill('#field-username_display','Bar Mario'); await ev(A,"salvaIdentitaEApriStile()"); await A.waitForTimeout(300);
await ev(A,"apriDrawer('drawer-bio')"); await A.fill('#field-bio','Colazioni e aperitivi in piazza.'); await ev(A,"chiudiSenzaSalvare()");
await ev(A,"apriDrawer('drawer-master')"); await ev(A,"gestisciAzioneMaster()"); await A.waitForURL(/checkout/); await A.waitForTimeout(1500);
await ev(A,"eseguiTransazione()"); await A.waitForTimeout(1500); await shot(A,'01-checkout-account');
ok(await A.isVisible('#link-registrati'),'checkout: dopo il pagamento simulato chiede di creare o usare un account');
await A.click('#link-registrati'); await A.waitForURL(/accesso/); await A.waitForTimeout(1200); await shot(A,'02-crea-account');
await A.fill('#r-email','Mario@Bar.it'); await A.fill('#r-pwd','corto'); await A.fill('#r-pwd2','corto'); await A.click('#f-registrati button[type=submit]'); await A.waitForTimeout(300);
ok(await A.evaluate(()=>document.getElementById('r-pwd').validity.tooShort) && await A.isVisible('#v-registrati') && !(await (await fetch(B+'/__inbox')).json()).length,'registrazione: password troppo corta bloccata dal telefono (nessun invio)');
await A.fill('#r-pwd','Password123'); await A.fill('#r-pwd2','Password124'); await A.click('#f-registrati button[type=submit]'); await A.waitForTimeout(300);
ok((await A.textContent('#f-registrati .messaggio')).includes('non coincidono'),'registrazione: password diverse rifiutate');
await A.fill('#r-pwd2','Password123'); await A.click('#f-registrati button[type=submit]'); await A.waitForTimeout(1200); await shot(A,'03-codice');
ok(await A.isVisible('#v-codice'),'registrazione: chiede di confermare l\'email (link o codice)');
const cfg=await A.evaluate(async()=>(await (await fetch('/api/account?azione=config')).json()));
ok(cfg.success && cfg.url==='https://fake.supabase.co' && cfg.chiave && !JSON.stringify(cfg).includes('secret'),'il browser usa lo stesso progetto Supabase del server (solo chiave pubblica)');
await A.fill('#c-codice','000000'); await A.click('#f-codice button[type=submit]'); await A.waitForTimeout(800);
ok((await A.textContent('#f-codice .messaggio')).includes('non valido'),'codice sbagliato rifiutato con messaggio chiaro');
await A.click('#c-confermato'); await A.waitForTimeout(800);
ok((await A.textContent('#msg-confermato')).includes('non risulta ancora confermata') && /accesso/.test(A.url()),'"Ho confermato" prima di toccare il link: non entra, spiega cosa fare');
// Mario tocca il link nell'email (modello standard di Supabase, senza codice), poi torna e preme "Ho confermato"
await fetch(B+'/__conferma?email=mario@bar.it');
await A.click('#c-confermato');
await A.waitForURL(/checkout/,{timeout:8000}).catch(()=>{}); await A.waitForTimeout(2500); await shot(A,'04-attivata');
let d=await db(); let barmario=d.rows.find(r=>r.username_system==='barmario');
ok(barmario && barmario.stato==='attivo' && barmario.proprietario_id && barmario.bio==='Colazioni e aperitivi in piazza.','attivazione: tag attiva, dell\'account di Mario, bozza pubblicata');
ok(!JSON.stringify(barmario).includes('mario@bar.it') && !barmario.password,'nella tag non c\'è l\'email privata né una password');
ok(d.utenti.find(u=>u.email==='mario@bar.it').data.consenso_promo===false,'consenso promozionale non spuntato = falso');

// 2. Visitatore
const cV=await telefono(); const V=await cV.newPage(); att(V,'V');
await V.goto(B+'/u/barmario'); await V.waitForTimeout(2000); await V.click('#entrance-prompt'); await V.waitForTimeout(600);
const testoV=await V.textContent('body');
ok(/BAR MARIO/i.test(testoV) && !testoV.includes('mario@bar.it'),'visitatore: vede la tag, non l\'email dell\'account');
const rispV=await V.evaluate(async()=>JSON.stringify(await (await fetch('/api/get-profile?u=barmario')).json()));
ok(!rispV.includes('mario@bar.it') && !rispV.includes('proprietario_id') && !rispV.includes('draft_json'),'API pubblica: nessun dato dell\'account');

// 3. Dashboard e seconda tag dallo stesso account
await A.goto(B+'/dashboard.html'); await A.waitForTimeout(2000); await shot(A,'05-dashboard-1');
ok(/bar mario/i.test(await A.textContent('#elenco')),'dashboard: mostra la tag');
await A.click('#btn-aggiungi'); await A.waitForTimeout(1200);
await A.fill('#tag-input','Mario Pizza'); await A.click('#btn-verifica-principale'); await A.waitForTimeout(1000);
await A.click('#btn-entra-spazio'); await A.waitForURL(/edit/); await A.waitForTimeout(2000);
await ev(A,"apriDrawer('drawer-bio')"); await A.fill('#field-bio','La pizza di Mario.'); await ev(A,"chiudiSenzaSalvare()");
await ev(A,"apriDrawer('drawer-master')"); await ev(A,"gestisciAzioneMaster()"); await A.waitForURL(/checkout/); await A.waitForTimeout(1500);
await ev(A,"eseguiTransazione()"); await A.waitForTimeout(1500);
ok(await A.isVisible('#account-presente') && (await A.textContent('#account-email'))==='mario@bar.it','seconda tag: il checkout riconosce l\'account già aperto');
await A.click('#btn-attiva'); await A.waitForTimeout(1500);
d=await db(); const pizza=d.rows.find(r=>r.username_system==='mariopizza');
ok(pizza && pizza.stato==='attivo' && pizza.proprietario_id===barmario.proprietario_id && pizza.bio==='La pizza di Mario.','seconda tag attivata nello stesso account');
await A.goto(B+'/dashboard.html'); await A.waitForTimeout(2000); await shot(A,'06-dashboard-2');
const el=await A.textContent('#elenco');
ok(/bar mario/i.test(el) && /mariopizza|mario pizza/i.test(el),'dashboard: entrambe le tag');
await A.click('a[href="/edit.html?u=mariopizza"]'); await A.waitForURL(/edit/); await A.waitForTimeout(2000);
ok(await A.inputValue('#field-bio')==='La pizza di Mario.','dalla dashboard si apre l\'editor della tag giusta');
await ev(A,"apriDrawer('drawer-bio')"); await A.fill('#field-bio','Pizza al taglio.'); await ev(A,"chiudiSenzaSalvare()");
await ev(A,"apriDrawer('drawer-master')"); await ev(A,"gestisciAzioneMaster()"); await A.waitForTimeout(800); await ev(A,"salvaEDirigi('pubblica')"); await A.waitForTimeout(1500);
d=await db(); ok(d.rows.find(r=>r.username_system==='mariopizza').bio==='Pizza al taglio.' && d.rows.find(r=>r.username_system==='barmario').bio==='Colazioni e aperitivi in piazza.','pubblicazione: cambia solo la tag modificata');
for (const pg of ['analytics.html','contatti.html','profile.html','account.html']) { await A.goto(B+'/'+pg+'?u=barmario'); await A.waitForTimeout(1800); ok(!/accesso|dashboard/.test(A.url()),`${pg}: il proprietario entra`); }
await shot(A,'07-profile-tag');

// 4. Nome gold assegnato a Mario (barsport → mario@bar.it)
await A.goto(B+'/'); await A.fill('#tag-input','barsport'); await A.click('#btn-verifica-principale'); await A.waitForTimeout(1000);
ok(await A.isVisible('#welcome-overlay'),'nome gold assegnato: l\'account con quell\'email lo prenota');
d=await db(); ok(d.rows.find(r=>r.username_system==='barsport').proprietario_id===barmario.proprietario_id,'nome gold assegnato: subito dell\'account giusto');

// 5. Un altro account non entra nelle tag di Mario
const cL=await telefono(); const L=await cL.newPage(); att(L,'L');
await L.goto(B+'/accesso.html?modo=registrati'); await L.waitForTimeout(1200);
await L.fill('#r-email','luca@esempio.it'); await L.fill('#r-pwd','Password999'); await L.fill('#r-pwd2','Password999'); await L.check('#r-promo'); await L.click('#f-registrati button[type=submit]'); await L.waitForTimeout(1000);
// Luca passa all'app della posta e il telefono ricarica la pagina: si riprende dal codice
await L.reload(); await L.waitForTimeout(1500);
ok(await L.isVisible('#v-codice'),'pagina ricaricata mentre si aspetta il codice: resta sulla schermata del codice');
await L.fill('#c-codice',await inbox('luca@esempio.it','signup')); await L.click('#f-codice button[type=submit]'); await L.waitForURL(/dashboard/); await L.waitForTimeout(1500);
ok((await L.textContent('#elenco')).includes('Non hai ancora'),'nuovo account: dashboard vuota');
ok((await db()).utenti.find(u=>u.email==='luca@esempio.it').data.consenso_promo===true,'consenso promozionale spuntato: registrato');
await L.goto(B+'/edit.html?u=barmario'); await L.waitForTimeout(2500);
ok(/dashboard/.test(L.url()),'un altro account che apre l\'editor di Mario finisce nella sua dashboard');
await L.goto(B+'/contatti.html?u=barmario'); await L.waitForTimeout(2500);
ok(/dashboard\.html\?avviso=non-tua/.test(L.url()),'contatti di un\'altra tag: niente accesso (avviso "non è tua")'); await shot(L,'08-non-tua');
for (const pg of ['analytics.html','account.html','profile.html']) { await L.goto(B+'/'+pg+'?u=barmario'); await L.waitForTimeout(2500); ok(/dashboard/.test(L.url()),`${pg} di un'altra tag: rimanda alla propria dashboard`); }
const rispL=await L.evaluate(async()=>JSON.stringify(await (await fetch('/api/get-profile?u=barmario')).json()));
ok(!rispL.includes('lead_capture_leads') && !rispL.includes('analytics_log') && !rispL.includes('sei_proprietario'),'API con la sessione di un altro account: niente dati privati di Mario');

// 6. Password dimenticata da un altro telefono; il telefono A viene disconnesso
const cD=await telefono(); const D=await cD.newPage(); att(D,'D');
await D.goto(B+'/accesso.html'); await D.waitForTimeout(1000);
await D.click('text=Password dimenticata?'); await D.fill('#d-email','nessuno@esempio.it'); await D.click('#f-dimenticata button[type=submit]'); await D.waitForTimeout(800);
const vistaInesistente=await D.isVisible('#v-codice-recupero');
await D.click('#v-codice-recupero [data-vai=dimenticata]'); await D.fill('#d-email','mario@bar.it'); await D.click('#f-dimenticata button[type=submit]'); await D.waitForTimeout(800);
ok(vistaInesistente && await D.isVisible('#v-codice-recupero'),'recupero: stessa risposta per email registrata e non registrata');
await shot(D,'09-codice-recupero');
const codRec=await inbox('mario@bar.it','recovery');
await D.reload(); await D.waitForTimeout(1500);
ok(await D.isVisible('#v-codice-recupero'),'recupero: pagina ricaricata, resta sulla schermata del codice');
await D.fill('#cr-codice','111111'); await D.click('#f-codice-recupero button[type=submit]'); await D.waitForTimeout(600);
ok((await D.textContent('#f-codice-recupero .messaggio')).includes('scaduto o già usato'),'recupero: codice sbagliato rifiutato');
await D.fill('#cr-codice',codRec); await D.click('#f-codice-recupero button[type=submit]'); await D.waitForTimeout(800);
ok(await D.isVisible('#v-nuova-password'),'recupero: codice giusto → scegli la nuova password'); await shot(D,'10-nuova-password');
await D.reload(); await D.waitForTimeout(1500);
ok(await D.isVisible('#v-nuova-password'),'recupero: pagina ricaricata dopo il codice, si sceglie ancora la nuova password');
await D.fill('#np-pwd','NuovaPass456'); await D.fill('#np-pwd2','NuovaPass456'); await D.click('#f-nuova-password button[type=submit]'); await D.waitForURL(/dashboard/,{timeout:8000}).catch(()=>{}); await D.waitForTimeout(1500);
ok(/dashboard/.test(D.url()) && /bar mario/i.test(await D.textContent('#elenco')),'recupero: nuova password salvata, dashboard con le tag');
// riuso del codice
const riuso=await D.evaluate(async c=>{ const sb=await mqtSessione.client(); const r=await sb.auth.verifyOtp({email:'mario@bar.it',token:c,type:'recovery'}); return r.error?r.error.code||r.error.message:'accettato'; }, codRec);
ok(riuso!=='accettato','recupero: lo stesso codice non si può riusare');
await A.goto(B+'/dashboard.html'); await A.waitForTimeout(3000);
ok(/accesso/.test(A.url()),'telefono A: dopo il recupero la vecchia sessione non vale più (si torna all\'accesso)'); await shot(A,'11-telefono-A-disconnesso');
await A.goto(B+'/accesso.html'); await A.waitForTimeout(1000);
await A.fill('#a-email','mario@bar.it'); await A.fill('#a-pwd','Password123'); await A.click('#f-accedi button[type=submit]'); await A.waitForTimeout(800);
ok((await A.textContent('#f-accedi .messaggio')).includes('non corretti'),'la vecchia password non funziona più');
await A.fill('#a-pwd','NuovaPass456'); await A.click('#f-accedi button[type=submit]'); await A.waitForURL(/dashboard/,{timeout:8000}).catch(()=>{}); await A.waitForTimeout(1500);
ok(/dashboard/.test(A.url()),'accesso con la nuova password');

// 6b. Link di recupero che arriva sulla home (indirizzo del sito impostato in Supabase): si apre la pagina giusta
await fetch(B+'/auth/v1/recover',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'mario@bar.it'})});
const sess=await (await fetch(B+'/auth/v1/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'recovery',email:'mario@bar.it',token:await inbox('mario@bar.it','recovery')})})).json();
const cE=await telefono(); const E=await cE.newPage(); att(E,'E');
await E.goto(B+`/#access_token=${sess.access_token}&refresh_token=${sess.refresh_token}&expires_in=3600&expires_at=${sess.expires_at}&token_type=bearer&type=recovery`);
await E.waitForTimeout(2500);
ok(/accesso\.html/.test(E.url()) && await E.isVisible('#v-nuova-password'),'link di recupero aperto sulla home: si arriva a "Scegli la nuova password"');
await E.goto(B+'/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'); await E.waitForTimeout(2000);
ok(/accesso\.html/.test(E.url()) && /scaduto o già usato/.test(await E.textContent('body')),'link scaduto o già usato: messaggio chiaro');

// 7. Esci
await A.click('#btn-esci'); await A.waitForTimeout(1500);
await A.goto(B+'/dashboard.html'); await A.waitForTimeout(1500);
ok(/accesso/.test(A.url()),'dopo "Esci" la dashboard chiede di accedere');

console.log(esiti.join('\n')); console.log('--- log'); console.log(log.join('\n'));
if (esiti.some(e=>e.startsWith('FAIL'))) process.exitCode=1;
await browser.close();
