// PROVA NEL BROWSER: il sito scritto senza https:// si apre davvero; indirizzi non web scartati (18/11/2026)
// Uso come test/piano.e2e.mjs (finto-supabase sulla porta 8788).
import { createRequire } from 'module';
const richiedi = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH + '/' : import.meta.url);
const { chromium } = richiedi('playwright');
const B='http://localhost:8788';
const ok=(c,m)=>{ console.log((c?'OK  ':'FAIL')+' '+m); if(!c) process.exitCode=1; };
const atteso={sitoprova:'https://www.myquicktag.it',sitomale:'Nessun sito web configurato.'};
await fetch(B+'/__seed',{method:'POST',body:JSON.stringify({username_system:'sitoprova',stato:'attivo',username_display:'@Sito',sito_web:'www.myquicktag.it',data_scadenza:'2027-02-01'})});
await fetch(B+'/__seed',{method:'POST',body:JSON.stringify({username_system:'sitomale',stato:'attivo',username_display:'@Male',sito_web:'javascript:alert(1)',data_scadenza:'2027-02-01'})});
const b=await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}); const c=await b.newContext({viewport:{width:390,height:844}});
await c.route(/cdn\.jsdelivr\.net|fonts\.googleapis|cdnjs\.cloudflare/, r=>r.abort());
for (const t of ['sitoprova','sitomale']) { const p=await c.newPage(); await p.goto(B+'/u/'+t); await p.waitForTimeout(2000);
 await p.evaluate(()=>{ sbloccaTag(); apriMacroArea('network'); apriSezione('sito'); }); await p.waitForTimeout(500);
 const v=await p.evaluate(()=>[...document.querySelectorAll('#corpoSezione a')].map(a=>a.getAttribute('href')).join(',') || document.getElementById('corpoSezione').textContent.trim()); ok(v===atteso[t], t+': '+v); }
await b.close();
