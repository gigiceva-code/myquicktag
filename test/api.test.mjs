// ============================================================
// TEST DELLE FUNZIONI DEL SERVER (api/) CON UN FINTO DATABASE IN MEMORIA
// ============================================================
// Uso:   node test/api.test.mjs
// Nessuna dipendenza da installare e nessun accesso al database vero: fetch viene sostituito
// da un finto Supabase (tabella tags + funzioni SQL usate dal server). Ogni riga stampa OK o FAIL;
// alla fine il processo esce con codice 1 se qualcosa non va.
import crypto from 'crypto';
process.env.SUPABASE_URL='https://fake.supabase.co'; process.env.SUPABASE_SECRET_KEY='sb_secret_x'; process.env.SESSION_SECRET='s';
const R=new URL('../api/', import.meta.url).href;
const rows=[]; const calls=[]; const limiti=new Map();
globalThis.fetch=async (url,opt={})=>{
  const u=new URL(url); const m=opt.method||'GET'; calls.push(m+' '+u.search);
  if(opt.headers.apikey!=='sb_secret_x') return new Response('{}',{status:401});
  if(u.pathname.endsWith('/rpc/controlla_nome')){ const b=JSON.parse(opt.body); const norm=b.p_nome.replace(/[-_.]/g,'').replace(/[013457]/g,c=>({0:'o',1:'i',3:'e',4:'a',5:'s',7:'t'})[c]);
    const black=['admin'], gold=['ferrari']; const t=black.includes(norm)||norm.includes('myquicktag')?'black':gold.includes(norm)?'gold':null; return new Response(JSON.stringify(t),{status:200}); }
  if(u.pathname.endsWith('/rpc/consuma_tentativo')){ const b=JSON.parse(opt.body); const n=(limiti.get(b.p_chiave)||0)+1; limiti.set(b.p_chiave,n); return new Response(JSON.stringify(n<=b.p_max),{status:200}); }
  if(u.pathname.endsWith('/rpc/gestisci_lead')){ const b=JSON.parse(opt.body); const r=rows.find(x=>x.username_system===b.p_username); if(!r) return new Response('null',{status:200});
    let l=JSON.parse(r.lead_capture_leads||'[]');
    if(b.p_azione==='visti') l=l.map(e=>({...e,visto:true}));
    else if(b.p_azione==='richiamato') l=l.map(e=>e.id===b.p_id?{...e,richiamato:b.p_valore,visto:true}:e);
    else if(b.p_azione==='elimina') l=l.filter(e=>e.id!==b.p_id);
    r.lead_capture_leads=JSON.stringify(l); return new Response(JSON.stringify(r.lead_capture_leads),{status:200}); }
  if(u.pathname.includes('/rpc/')){ const b=JSON.parse(opt.body); const r=rows.find(x=>x.username_system===b.p_username); if(!r) return new Response('null',{status:200});
    const campo=u.pathname.endsWith('aggiungi_lead')?'lead_capture_leads':'analytics_log'; const voce=b.p_lead||b.p_click; const lista=JSON.parse(r[campo]||'[]'); lista.unshift(voce); r[campo]=JSON.stringify(lista); return new Response('true',{status:200}); }
  const f=(r)=>{for(const [k,v] of u.searchParams){ if(v.startsWith('eq.')&&String(r[k])!==decodeURIComponent(v.slice(3)))return false;}return true;};
  if(m==='GET'){ let out=rows.filter(f); const sel=u.searchParams.get('select'); if(sel!=='*') out=out.map(r=>Object.fromEntries(sel.split(',').map(c=>[c,r[c]??null]))); return new Response(JSON.stringify(out),{status:200}); }
  if(m==='POST'){ const b=JSON.parse(opt.body); if(rows.some(r=>r.username_system===b.username_system)) return new Response('{"code":"23505"}',{status:409}); const r={id:crypto.randomUUID(),created_at:new Date().toISOString().replace('Z','123+00:00'),views:0,password:null,draft_json:null,...b}; rows.push(r); return new Response(JSON.stringify([r]),{status:201}); }
  if(m==='PATCH'){ const b=JSON.parse(opt.body); rows.filter(f).forEach(r=>Object.assign(r,b)); return new Response(null,{status:204}); }
  if(m==='DELETE'){ for(let i=rows.length-1;i>=0;i--) if(f(rows[i])) rows.splice(i,1); return new Response(null,{status:204}); }
};
function res(){ const o={code:0,body:null,h:{}}; o.status=c=>{o.code=c;return o}; o.json=b=>{o.body=b;return o}; o.send=b=>{o.body=b;return o}; o.setHeader=(k,v)=>o.h[k]=v; return o;}
let ipN=0;
const call=async(f,req)=>{const m=await import(R+f); const r=res(); await m.default({query:{},...req,headers:{'x-forwarded-for':req.ip||('10.0.0.'+(++ipN%250)),...(req.headers||{})}},r); return r;};
const ok=(c,msg)=>{console.log((c?'OK  ':'FAIL')+' '+msg); if(!c) process.exitCode=1;};

let r=await call('check-and-create.js',{method:'POST',body:{tag:'@Prova'}});
ok(r.code===200 && r.body.sessionToken && r.body.username==='prova','prenotazione '+JSON.stringify(r.body).slice(0,80));
const ric=r.body.sessionToken;
r=await call('check-and-create.js',{method:'POST',body:{tag:'prova'}});
ok(r.code===400 && /riservato/.test(r.body.message),'seconda prenotazione bloccata 24h');
r=await call('get-profile.js',{query:{u:'prova'}});
ok(r.code===200 && r.body.fields.stato==='in attesa' && r.body.reservation_expires_at && r.body.fields.has_password===false && !('password' in r.body.fields),'get-profile in attesa');
const hash=crypto.createHash('sha256').update('123456').digest('hex');
r=await call('update-profile.js',{method:'POST',body:{username_system:'prova',password:hash,stato:'attivo',bio:'ciao',sessionToken:ric}});
ok(r.code===200 && r.body.sessionToken,'attivazione '+JSON.stringify(r.body).slice(0,60));
ok(String(rows[0].password).startsWith('scrypt$') && !rows[0].password.includes(hash),'password salvata protetta con scrypt (non l\'hash nudo)');
ok(rows[0].data_scadenza && rows[0].data_inizio,'date abbonamento scritte '+rows[0].data_inizio+'→'+rows[0].data_scadenza);
r=await call('update-profile.js',{method:'POST',body:{username_system:'prova',bio:'hack'}});
ok(r.code===401,'scrittura senza token rifiutata');
r=await call('update-profile.js',{method:'POST',body:{username_system:'nessuno',bio:'x',sessionToken:'a.b.c'}});
ok(r.code===401||r.code===404,'tag inesistente');
r=await call('login.js',{method:'POST',body:{tag:'@PROVA',pwd:hash}});
ok(r.code===200 && r.body.sessionToken,'login corretto');
const tok=r.body.sessionToken;
r=await call('login.js',{method:'POST',body:{tag:'prova',pwd:'0'.repeat(64)}});
ok(r.code===401,'login password errata');
r=await call('update-profile.js',{method:'POST',body:{username_system:'prova',draft_json:'{"a":1}',sessionToken:tok}});
ok(r.code===200,'salva bozza');
r=await call('get-profile.js',{query:{u:'prova'}});
ok(r.code===200 && r.body.fields.draft_json===undefined && r.body.abbonamento.fase==='attiva','bozza nascosta ai visitatori, fase attiva');
r=await call('get-profile.js',{query:{u:'prova',token:tok}});
ok(r.body.fields.draft_json==='{"a":1}' && r.body.sessionToken,'bozza visibile al proprietario + token rinnovato');
r=await call('track-view.js',{method:'POST',query:{u:'prova'},headers:{'user-agent':'iPhone','x-vercel-ip-city':'Milano','x-vercel-ip-country':'IT'}});
ok(r.code===200 && rows[0].views===1 && JSON.parse(rows[0].analytics_data).geo['Milano, IT']===1,'track-view');
// riciclo prenotazione scaduta
rows.push({id:'old',username_system:'vecchia',stato:'in attesa',created_at:new Date(Date.now()-25*3600e3).toISOString()});
r=await call('check-and-create.js',{method:'POST',body:{tag:'vecchia'}});
ok(r.code===200 && rows.filter(x=>x.username_system==='vecchia').length===1 && !rows.some(x=>x.id==='old'),'riciclo prenotazione >24h');
r=await call('check-and-create.js',{method:'POST',body:{tag:'prova'}});
ok(r.code===400 && /occupato/.test(r.body.message),'tag attiva occupata');

// ---- Sicurezza: contatti, click, campi privati ----
rows[0].lead_capture_attivo='true'; rows[0].pocket_cloud='[{"username":"x"}]';
r=await call('add-lead.js',{method:'POST',body:{u:'prova',nome:'<img src=x onerror=alert(1)>Mario',contatto:'333 1234567'}});
ok(r.code===200 && JSON.parse(rows[0].lead_capture_leads)[0].contatto==='333 1234567','add-lead aggiunge il contatto');
r=await call('add-lead.js',{method:'POST',body:{u:'prova',nome:'Lucia',contatto:'lucia@x.it'}});
ok(JSON.parse(rows[0].lead_capture_leads).length===2 && JSON.parse(rows[0].lead_capture_leads)[0].nome==='Lucia','secondo contatto in cima, il primo resta');
r=await call('add-lead.js',{method:'POST',body:{u:'prova',nome:'X',contatto:''}});
ok(r.code===400,'contatto vuoto rifiutato');
r=await call('add-lead.js',{method:'POST',body:{u:'nessuno',nome:'X',contatto:'1'}});
ok(r.code===404,'add-lead su tag inesistente');
rows[0].lead_capture_attivo='false';
r=await call('add-lead.js',{method:'POST',body:{u:'prova',nome:'X',contatto:'1'}});
ok(r.code===404,'add-lead con raccolta spenta rifiutato'); rows[0].lead_capture_attivo='true';
r=await call('track-click.js',{method:'POST',body:{u:'prova',sezione:'BIO<script>'}});
const log=JSON.parse(rows[0].analytics_log); ok(r.code===200 && log[0].sezione==='BIOscript' && log[0].timestamp,'track-click registra (sezione ripulita)');
r=await call('get-profile.js',{query:{u:'prova'}});
ok(!('lead_capture_leads' in r.body.fields) && !('analytics_log' in r.body.fields) && !('analytics_data' in r.body.fields) && !('pocket_cloud' in r.body.fields) && r.body.fields.bio==='ciao','visitatore: niente campi privati, contenuti pubblici sì');
r=await call('get-profile.js',{query:{u:'prova',token:tok}});
ok(r.body.fields.lead_capture_leads && r.body.fields.analytics_log && r.body.fields.pocket_cloud,'proprietario: vede i campi privati');
r=await call('update-profile.js',{method:'POST',body:{username_system:'prova',lead_capture_leads:'[]'}});
ok(r.code===401 && JSON.parse(rows[0].lead_capture_leads).length===2,'anonimo non può cancellare i contatti');
r=await call('update-profile.js',{method:'POST',body:{username_system:'prova',analytics_log:'[]'}});
ok(r.code===401,'anonimo non può azzerare le statistiche');
r=await call('update-profile.js',{method:'POST',body:{username_system:'prova',lead_capture_leads:'[]',analytics_log:'[]',bio:'nuova',sessionToken:tok}});
ok(r.code===200 && JSON.parse(rows[0].lead_capture_leads).length===2 && JSON.parse(rows[0].analytics_log).length===1 && rows[0].bio==='nuova','proprietario salva: contatti e statistiche non vengono sovrascritti');

// ---- Cambio password ----
const nuovaHash=crypto.createHash('sha256').update('nuova123').digest('hex');
const pwdPrima=rows[0].password;
r=await call('update-profile.js',{method:'POST',body:{username_system:'prova',password:nuovaHash,sessionToken:tok}});
ok(rows[0].password===pwdPrima,'update-profile non cambia una password già impostata');
r=await call('change-password.js',{method:'POST',body:{u:'prova',sessionToken:tok,attuale:'0'.repeat(64),nuova:nuovaHash}});
ok(r.code===403 && rows[0].password===pwdPrima,'cambio password con password attuale sbagliata rifiutato');
r=await call('change-password.js',{method:'POST',body:{u:'prova',sessionToken:'x.y.z',attuale:hash,nuova:nuovaHash}});
ok(r.code===401,'cambio password senza sessione rifiutato');
r=await call('change-password.js',{method:'POST',body:{u:'prova',sessionToken:tok,attuale:hash,nuova:nuovaHash}});
ok(r.code===200 && rows[0].password!==pwdPrima && rows[0].password.startsWith('scrypt$') && r.body.sessionToken,'cambio password riuscito (salvata con scrypt)');
r=await call('login.js',{method:'POST',body:{tag:'prova',pwd:nuovaHash}});
ok(r.code===200,'login con la nuova password');
r=await call('login.js',{method:'POST',body:{tag:'prova',pwd:hash}});
ok(r.code===401,'la vecchia password non funziona più');

// ---- Gestione contatti del proprietario ----
let l0=JSON.parse(rows[0].lead_capture_leads);
ok(l0[0].id && l0[0].visto===false && l0[0].richiamato===false && l0[0].ts,'nuovo contatto: id, nuovo, non richiamato');
const tok2=(await call('login.js',{method:'POST',body:{tag:'prova',pwd:nuovaHash}})).body.sessionToken;
r=await call('leads.js',{method:'POST',body:{u:'prova',azione:'visti'}});
ok(r.code===401,'leads senza sessione rifiutato');
r=await call('leads.js',{method:'POST',body:{u:'prova',sessionToken:tok2,azione:'boh'}});
ok(r.code===400,'azione non valida rifiutata');
r=await call('leads.js',{method:'POST',body:{u:'prova',sessionToken:tok2,azione:'visti'}});
ok(r.code===200 && r.body.leads.every(x=>x.visto===true),'segna tutti visti');
r=await call('leads.js',{method:'POST',body:{u:'prova',sessionToken:tok2,azione:'richiamato',id:l0[0].id,valore:true}});
ok(r.body.leads.find(x=>x.id===l0[0].id).richiamato===true,'segna come richiamato');
r=await call('leads.js',{method:'POST',body:{u:'prova',sessionToken:tok2,azione:'elimina',id:l0[0].id}});
ok(r.code===200 && r.body.leads.length===l0.length-1 && !r.body.leads.some(x=>x.id===l0[0].id),'elimina contatto');

// ---- Password nel vecchio formato: login e aggiornamento automatico ----
const legacyHash=crypto.createHash('sha256').update('vecchia1').digest('hex');
rows.push({id:'leg',username_system:'legacy',stato:'attivo',password:legacyHash,created_at:new Date().toISOString()});
r=await call('login.js',{method:'POST',body:{tag:'legacy',pwd:legacyHash}});
const rl=rows.find(x=>x.id==='leg');
ok(r.code===200 && rl.password.startsWith('scrypt$'),'login con password vecchio formato: riuscito e aggiornato a scrypt');
r=await call('login.js',{method:'POST',body:{tag:'legacy',pwd:legacyHash}});
ok(r.code===200,'login dopo l\'aggiornamento continua a funzionare');
r=await call('login.js',{method:'POST',body:{tag:'legacy',pwd:'1'.repeat(64)}});
ok(r.code===401,'password sbagliata rifiutata anche col nuovo formato');
r=await call('update-profile.js',{method:'POST',body:{username_system:'prova',bio:'<img src=x onerror=alert(1)> Un\'azienda',sito_web:'javascript:alert(1)',config_canali:JSON.stringify([{nome:'IG',url:'javascript:x'}]),username_display:'@ALTRONOME',sessionToken:tok2}});
ok(rows[0].bio==="‹img src=x onerror=alert(1)› Un'azienda" && (rows[0].sito_web===''||rows[0].sito_web===undefined||rows[0].sito_web===null) && JSON.parse(rows[0].config_canali)[0].url==='' ,'salvataggio: testi ripuliti, link javascript svuotati, apostrofi tenuti');
ok(rows[0].username_display!=='@ALTRONOME','nome mostrato diverso dal nome della tag rifiutato');

// ---- Limiti ai tentativi ----
let ultimo;
for (let i=0;i<11;i++) ultimo=await call('login.js',{method:'POST',ip:'9.9.9.9',body:{tag:'prova',pwd:'2'.repeat(64)}});
ok(ultimo.code===429,'login: l\'11° tentativo in 15 minuti dallo stesso IP è bloccato');
r=await call('login.js',{method:'POST',ip:'9.9.9.8',body:{tag:'prova',pwd:nuovaHash}});
ok(r.code===200,'login da un altro IP non è bloccato');
for (let i=0;i<4;i++) ultimo=await call('add-lead.js',{method:'POST',ip:'8.8.8.8',body:{u:'prova',nome:'X',contatto:'1'+i}});
ok(ultimo.code===429,'vasetto: il 4° contatto in 10 minuti dallo stesso IP è bloccato');
for (let i=0;i<11;i++) ultimo=await call('check-and-create.js',{method:'POST',ip:'7.7.7.7',body:{tag:'nome'+i}});
ok(ultimo.code===429,'prenotazioni: l\'11° nome in un\'ora dallo stesso IP è bloccato');

// ---- Black list, gold list e stato ----
r=await call('check-and-create.js',{method:'POST',body:{tag:'admin'}});
ok(r.code===400 && r.body.codice==='riservato' && !rows.some(x=>x.username_system==='admin'),'black list: "admin" non prenotabile via API');
r=await call('check-and-create.js',{method:'POST',body:{tag:'ferrari'}});
ok(r.code===400 && r.body.codice==='premium' && !rows.some(x=>x.username_system==='ferrari'),'gold list: "ferrari" non prenotabile via API');
r=await call('check-and-create.js',{method:'POST',body:{tag:'ab'}});
ok(r.code===400 && r.body.codice==='premium','nomi sotto i 3 caratteri trattati come premium');
const tokProva=(await call('login.js',{method:'POST',body:{tag:'prova',pwd:nuovaHash}})).body.sessionToken;
r=await call('update-profile.js',{method:'POST',body:{username_system:'prova',stato:'in attesa',sessionToken:tokProva}});
ok(rows[0].stato==='attivo','una tag attiva non può tornare "in attesa" dal browser');
r=await call('check-and-create.js',{method:'POST',body:{tag:'nuovissima'}});
const tokRes=r.body.sessionToken;
r=await call('update-profile.js',{method:'POST',body:{username_system:'nuovissima',stato:'attivo',sessionToken:tokRes}});
ok(rows.find(x=>x.username_system==='nuovissima').stato==='in attesa','attivazione senza password rifiutata');

r=await call('check-and-create.js',{method:'POST',body:{tag:'adm1n'}});
ok(r.code===400 && r.body.codice==='riservato','variante "adm1n" riconosciuta come riservata (dal database)');
r=await call('check-and-create.js',{method:'POST',body:{tag:'myquicktag-assistenza'}});
ok(r.code===400 && r.body.codice==='riservato','"myquicktag-assistenza" bloccato (regola contiene)');
r=await call('check-and-create.js',{method:'POST',body:{tag:'account'}});
ok(r.code===400 && r.body.codice==='riservato','nome di una pagina del sito bloccato dal codice');
