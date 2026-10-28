// ============================================================
// TEST DELLE FUNZIONI DEL SERVER (api/) CON UN FINTO DATABASE E UN FINTO SUPABASE AUTH
// ============================================================
// Uso:   node test/api.test.mjs
// Nessuna dipendenza da installare e nessun accesso al database vero: fetch viene sostituito
// da un finto Supabase (tabella tags + funzioni SQL usate dal server + /auth/v1/user).
// Ogni riga stampa OK o FAIL; alla fine il processo esce con codice 1 se qualcosa non va.
import crypto from 'crypto';
import fs from 'fs';
process.env.SUPABASE_URL='https://fake.supabase.co'; process.env.SUPABASE_SECRET_KEY='sb_secret_x'; process.env.SESSION_SECRET='s';
delete process.env.RINNOVO_GRATUITO;
const R=new URL('../api/', import.meta.url).href;
const rows=[]; const limiti=new Map(); const segnalazioni=[]; const emailInviate=[]; let resendGiu=false;
// Lista protetta di prova (nel database vero: tabella nomi_riservati)
const nomiProtetti=[
  {nome:'admin',tipo:'system',regola:'esatto'}, {nome:'myquicktag',tipo:'black',regola:'contiene'},
  {nome:'fuck',tipo:'black',regola:'contiene'}, {nome:'poliziadistato',tipo:'black',regola:'esatto'},
  {nome:'ferrari',tipo:'gold',regola:'esatto'}, {nome:'cocacola',tipo:'gold',regola:'esatto'}, {nome:'netflix',tipo:'gold',regola:'esatto'},
  {nome:'gianluigibuffon',tipo:'gold',regola:'esatto'}, {nome:'cristianoronaldo',tipo:'gold',regola:'esatto'}
];

// ---- Finto Supabase Auth: sessioni (JWT) → utenti ----
const sessioni=new Map(); // jwt → { id, email, email_confirmed_at }
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
let nSess=0;
function apriSessione(utente){ const jwt=`${b64({alg:'ES256',typ:'JWT'})}.${b64({sub:utente.id,email:utente.email,n:++nSess})}.${crypto.randomBytes(16).toString('base64url')}`; sessioni.set(jwt,utente); return jwt; }
const anna={id:'11111111-1111-1111-1111-111111111111',email:'anna@esempio.it',email_confirmed_at:'2026-10-01T00:00:00Z'};
const bruno={id:'22222222-2222-2222-2222-222222222222',email:'bruno@esempio.it',email_confirmed_at:'2026-10-01T00:00:00Z'};
const nonConfermato={id:'33333333-3333-3333-3333-333333333333',email:'carla@esempio.it',email_confirmed_at:null};
let authGiu=false;

globalThis.fetch=async (url,opt={})=>{
  const u=new URL(url); const m=opt.method||'GET';
  if(u.pathname==='/auth/v1/user'){
    if(authGiu) return new Response('{}',{status:503});
    const jwt=String(opt.headers?.Authorization||'').replace(/^Bearer /,'');
    const ut=sessioni.get(jwt); if(!ut) return new Response('{"message":"invalid JWT"}',{status:401});
    return new Response(JSON.stringify({id:ut.id,email:ut.email,email_confirmed_at:ut.email_confirmed_at}),{status:200});
  }
  if(u.hostname==='api.resend.com'){ // email delle segnalazioni (api/segnala.js)
    if(resendGiu) return new Response('{}',{status:500});
    emailInviate.push({chiave:String(opt.headers?.Authorization||''),...JSON.parse(opt.body)}); return new Response('{"id":"e1"}',{status:200}); }
  if(opt.headers.apikey!=='sb_secret_x') return new Response('{}',{status:401});
  if(u.pathname==='/rest/v1/segnalazioni' && m==='POST'){ const b=JSON.parse(opt.body);
    if(!/^[a-z0-9]{1,30}$/.test(b.tag) || !['impersonazione','marchio','offensivo','truffa','altro'].includes(b.motivo)) return new Response('{"code":"23514"}',{status:400});
    segnalazioni.push({id:crypto.randomUUID(),stato:'nuova',...b}); return new Response(null,{status:201}); }
  if(u.pathname.endsWith('/rpc/controlla_nome')){ // stessa logica di public.controlla_nome (migrazione 20261005000000)
    const b=JSON.parse(opt.body); const base=b.p_nome.toLowerCase(); const ss=base.replace(/[-_.]/g,'');
    const forme=[base, ...['i','l'].map(uno=>ss.replace(/[013457]/g,c=>({0:'o',1:uno,3:'e',4:'a',5:'s',7:'t'})[c]))];
    const trovati=nomiProtetti.filter(n=>n.attivo!==false && (n.regola==='esatto' ? forme.includes(n.nome) : forme.some(f=>f.includes(n.nome))));
    trovati.sort((x,y)=>['system','black','gold'].indexOf(x.tipo)-['system','black','gold'].indexOf(y.tipo));
    return new Response(JSON.stringify(trovati[0]?.tipo ?? null),{status:200}); }
  if(u.pathname.endsWith('/rpc/nome_assegnato_a')){ // migrazione 20261011000000
    const b=JSON.parse(opt.body); const n=nomiProtetti.find(x=>x.attivo!==false && x.regola==='esatto' && x.nome===b.p_nome.toLowerCase() && x.assegnato_a);
    return new Response(JSON.stringify(n?n.assegnato_a:null),{status:200}); }
  if(u.pathname.endsWith('/rpc/consuma_tentativo')){ const b=JSON.parse(opt.body); const n=(limiti.get(b.p_chiave)||0)+1; limiti.set(b.p_chiave,n); return new Response(JSON.stringify(n<=b.p_max),{status:200}); }
  if(u.pathname.endsWith('/rpc/gestisci_lead')){ const b=JSON.parse(opt.body); const r=rows.find(x=>x.username_system===b.p_username); if(!r) return new Response('null',{status:200});
    let l=JSON.parse(r.lead_capture_leads||'[]');
    if(b.p_azione==='visti') l=l.map(e=>({...e,visto:true}));
    else if(b.p_azione==='richiamato') l=l.map(e=>e.id===b.p_id?{...e,richiamato:b.p_valore,visto:true}:e);
    else if(b.p_azione==='elimina') l=l.filter(e=>e.id!==b.p_id);
    r.lead_capture_leads=JSON.stringify(l); return new Response(JSON.stringify(r.lead_capture_leads),{status:200}); }
  if(u.pathname.includes('/rpc/')){ const b=JSON.parse(opt.body); const r=rows.find(x=>x.username_system===b.p_username); if(!r) return new Response('null',{status:200});
    const campo=u.pathname.endsWith('aggiungi_lead')?'lead_capture_leads':'analytics_log'; const voce=b.p_lead||b.p_click; const lista=JSON.parse(r[campo]||'[]'); lista.unshift(voce); r[campo]=JSON.stringify(lista); return new Response('true',{status:200}); }
  const f=(r)=>{for(const [k,v] of u.searchParams){ if(v.startsWith('eq.')&&String(r[k])!==decodeURIComponent(v.slice(3)))return false; if(v==='is.null'&&r[k]!=null)return false;}return true;};
  if(m==='GET'){ let out=rows.filter(f); const sel=u.searchParams.get('select'); if(sel!=='*') out=out.map(r=>Object.fromEntries(sel.split(',').map(c=>[c,r[c]??null]))); return new Response(JSON.stringify(out),{status:200}); }
  if(m==='POST'){ const b=JSON.parse(opt.body); if(!/^[a-z0-9]{1,30}$/.test(b.username_system)) return new Response('{"code":"23514"}',{status:400}); if(rows.some(r=>r.username_system===b.username_system)) return new Response('{"code":"23505"}',{status:409}); const r={id:crypto.randomUUID(),created_at:new Date().toISOString().replace('Z','123+00:00'),views:0,password:null,draft_json:null,proprietario_id:null,...b}; rows.push(r); return new Response(JSON.stringify([r]),{status:201}); }
  if(m==='PATCH'){ const b=JSON.parse(opt.body); const toccate=rows.filter(f); toccate.forEach(r=>Object.assign(r,b)); return String(opt.headers.Prefer||'').includes('representation') ? new Response(JSON.stringify(toccate),{status:200}) : new Response(null,{status:204}); }
  if(m==='DELETE'){ for(let i=rows.length-1;i>=0;i--) if(f(rows[i])) rows.splice(i,1); return new Response(null,{status:204}); }
};
function res(){ const o={code:0,body:null,h:{}}; o.status=c=>{o.code=c;return o}; o.json=b=>{o.body=b;return o}; o.send=b=>{o.body=b;return o}; o.setHeader=(k,v)=>o.h[k]=v; return o;}
let ipN=0;
const call=async(f,req)=>{const m=await import(R+f); const r=res(); await m.default({query:{},...req,headers:{'x-forwarded-for':req.ip||('10.0.0.'+(++ipN%250)),...(req.headers||{})}},r); return r;};
const conSessione=jwt=>({authorization:'Bearer '+jwt});
const ok=(c,msg)=>{console.log((c?'OK  ':'FAIL')+' '+msg); if(!c) process.exitCode=1;};
const riga=nome=>rows.find(x=>x.username_system===nome);

const jwtAnna=apriSessione(anna), jwtBruno=apriSessione(bruno), jwtCarla=apriSessione(nonConfermato);

// ============================================================
// 1. PRENOTAZIONE (senza account) E ATTIVAZIONE CON ACCOUNT
// ============================================================
let r=await call('check-and-create.js',{method:'POST',body:{tag:'@Prova'}});
ok(r.code===200 && r.body.sessionToken && r.body.username==='prova' && r.body.proprietario===false,'prenotazione senza account: ricevuta, nessun proprietario');
const ric=r.body.sessionToken;
ok(riga('prova').proprietario_id===null,'tag in attesa senza proprietario');
r=await call('check-and-create.js',{method:'POST',body:{tag:'prova'}});
ok(r.code===400 && /riservato/.test(r.body.message),'seconda prenotazione bloccata 24h');
r=await call('get-profile.js',{query:{u:'prova'}});
ok(r.code===200 && r.body.fields.stato==='in attesa' && r.body.reservation_expires_at && r.body.fields.has_password===false && !('password' in r.body.fields) && !('proprietario_id' in r.body.fields),'get-profile in attesa (niente password né proprietario)');
r=await call('update-profile.js',{method:'POST',body:{username_system:'prova',draft_json:JSON.stringify({bio:'ciao',username_display:'@Prova'}),sessionToken:ric}});
ok(r.code===200 && !riga('prova').bio,'con la ricevuta si salva la bozza (resta privata)');
r=await call('get-profile.js',{query:{u:'prova',token:ric}});
ok(r.body.fields.draft_json && !r.body.fields.sei_proprietario,'con la ricevuta si rilegge la propria bozza');
r=await call('update-profile.js',{method:'POST',body:{username_system:'prova',stato:'attivo',sessionToken:ric}});
ok(r.code===401 && r.body.serve_account && riga('prova').stato==='in attesa','attivazione senza account rifiutata (serve un account)');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtCarla),body:{username_system:'prova',stato:'attivo',sessionToken:ric}});
ok(r.code===401 && riga('prova').stato==='in attesa','attivazione con account NON verificato rifiutata');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'prova',stato:'attivo',password:'a'.repeat(64),proprietario_id:bruno.id,sessionToken:ric}});
const p=riga('prova');
ok(r.code===200 && r.body.action==='activated' && r.body.data_scadenza===p.data_scadenza && p.stato==='attivo' && p.proprietario_id===anna.id,'attivazione: ricevuta + account verificato → attiva e di proprietà dell\'account');
ok(p.bio==='ciao' && p.username_display==='@Prova' && p.draft_json==='','attivazione: la bozza diventa la tag pubblica');
ok(p.data_inizio && p.data_scadenza && !p.password,'attivazione: date scritte dal server, nessuna password salvata nella tag');
r=await call('update-profile.js',{method:'POST',body:{username_system:'prova',bio:'hack',sessionToken:ric}});
ok(r.code===401 && riga('prova').bio==='ciao','dopo l\'attivazione la ricevuta non vale più');
r=await call('update-profile.js',{method:'POST',body:{username_system:'prova',bio:'hack'}});
ok(r.code===401,'scrittura senza sessione rifiutata');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtBruno),body:{username_system:'prova',bio:'hack'}});
ok(r.code===401 && riga('prova').bio==='ciao','un altro account non può modificare la tag');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'prova',bio:'nuova bio',proprietario_id:bruno.id}});
ok(r.code===200 && riga('prova').bio==='nuova bio' && riga('prova').proprietario_id===anna.id,'il proprietario salva; proprietario_id dal browser ignorato');
r=await call('update-profile.js',{method:'POST',body:{username_system:'prova',bio:'x',sessionToken:jwtAnna}});
ok(r.code===200,'sessione accettata anche nel campo sessionToken (pagine esistenti)');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'nessuno',bio:'x'}});
ok(r.code===404,'tag inesistente');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'prova',stato:'in attesa'}});
ok(riga('prova').stato==='attivo','una tag attiva non può tornare "in attesa" dal browser');

// get-profile: visitatore, proprietario, altro account
rows.find(x=>x.username_system==='prova').pocket_cloud='[{"username":"x"}]';
r=await call('get-profile.js',{query:{u:'prova'}});
ok(r.body.fields.bio==='x' && !('pocket_cloud' in r.body.fields) && !r.body.fields.sei_proprietario && r.body.fields.has_password===true,'visitatore: contenuti pubblici, niente campi privati');
r=await call('get-profile.js',{query:{u:'prova',token:jwtAnna}});
ok(r.body.fields.pocket_cloud && r.body.fields.sei_proprietario===true && !('proprietario_id' in r.body.fields),'proprietario: vede i campi privati (non l\'id dell\'account)');
r=await call('get-profile.js',{query:{u:'prova',token:jwtBruno}});
ok(!('pocket_cloud' in r.body.fields) && !r.body.fields.sei_proprietario,'altro account: come un visitatore');

// Sessione chiusa (uscita / cambio o recupero password su Supabase): non vale più
const jwtAnna2=apriSessione(anna); sessioni.delete(jwtAnna2);
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna2),body:{username_system:'prova',bio:'revocata'}});
ok(r.code===401 && riga('prova').bio!=='revocata','sessione revocata rifiutata su update-profile');
r=await call('get-profile.js',{query:{u:'prova',token:jwtAnna2}});
ok(!r.body.fields.sei_proprietario,'sessione revocata rifiutata su get-profile');
r=await call('account.js',{method:'POST',headers:conSessione(jwtAnna2),body:{azione:'mie-tag'}});
ok(r.code===401,'sessione revocata rifiutata su account');
authGiu=true; const ceG=console.error; console.error=()=>{};
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'prova',bio:'senza verifica'}});
console.error=ceG; authGiu=false;
ok(r.code===500 && riga('prova').bio!=='senza verifica','Supabase Auth non raggiungibile: nessuna scrittura (niente via libera)');

// Riciclo prenotazione scaduta, tag attiva occupata
rows.push({id:'old',username_system:'vecchia',stato:'in attesa',created_at:new Date(Date.now()-25*3600e3).toISOString()});
r=await call('check-and-create.js',{method:'POST',body:{tag:'vecchia'}});
ok(r.code===200 && rows.filter(x=>x.username_system==='vecchia').length===1 && !rows.some(x=>x.id==='old'),'riciclo prenotazione >24h');
r=await call('check-and-create.js',{method:'POST',body:{tag:'prova'}});
ok(r.code===400 && /occupato/.test(r.body.message),'tag attiva occupata');
// Ricevuta scaduta
const exp=Date.now()-1000; const firmaVecchia=crypto.createHmac('sha256','s').update(`vecchia.${exp}`).digest('hex');
r=await call('update-profile.js',{method:'POST',body:{username_system:'vecchia',bio:'x',sessionToken:`vecchia.${exp}.${firmaVecchia}`}});
ok(r.code===401,'ricevuta scaduta rifiutata');

// ============================================================
// 2. MULTI-TAG: un account, più tag
// ============================================================
r=await call('check-and-create.js',{method:'POST',headers:conSessione(jwtAnna),body:{tag:'annabar'}});
ok(r.code===200 && r.body.proprietario===true && riga('annabar').proprietario_id===anna.id,'seconda tag prenotata dentro l\'account: è già dell\'account');
r=await call('update-profile.js',{method:'POST',body:{username_system:'annabar',bio:'x',sessionToken:r.body.sessionToken}});
ok(r.code===401,'tag in attesa con proprietario: la sola ricevuta non basta');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'annabar',draft_json:JSON.stringify({bio:'Bar di Anna'})}});
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'annabar',stato:'attivo'}});
ok(r.code===200 && riga('annabar').stato==='attivo' && riga('annabar').bio==='Bar di Anna','seconda tag attivata dal proprietario (bozza pubblicata)');
r=await call('check-and-create.js',{method:'POST',headers:conSessione(jwtCarla),body:{tag:'carlanome'}});
ok(r.code===401 && !riga('carlanome'),'prenotazione con sessione non valida/non verificata: si chiede di riaccedere');
r=await call('check-and-create.js',{method:'POST',headers:conSessione(jwtBruno),body:{tag:'brunoshop'}});
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtBruno),body:{username_system:'brunoshop',stato:'attivo'}});
ok(riga('brunoshop').proprietario_id===bruno.id && riga('brunoshop').stato==='attivo','un altro account ha la sua tag');
r=await call('account.js',{method:'POST',headers:conSessione(jwtAnna),body:{azione:'mie-tag'}});
const nomiAnna=(r.body.tags||[]).map(t=>t.username_system).sort().join();
ok(r.code===200 && nomiAnna==='annabar,prova','dashboard di Anna: le sue due tag e nessun\'altra');
ok(r.body.tags.every(t=>t.stato==='attivo' && t.abbonamento && t.abbonamento.fase==='attiva') && !JSON.stringify(r.body).includes('draft_json') && !JSON.stringify(r.body).includes('proprietario_id'),'dashboard: stato e scadenza, nessun dato interno');
r=await call('account.js',{method:'POST',headers:conSessione(jwtBruno),body:{azione:'mie-tag'}});
ok(r.body.tags.map(t=>t.username_system).join()==='brunoshop','dashboard di Bruno: solo la sua tag');
r=await call('account.js',{method:'POST',body:{azione:'mie-tag'}});
ok(r.code===401,'dashboard senza sessione rifiutata');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'annabar',bio:'solo annabar'}});
ok(riga('annabar').bio==='solo annabar' && riga('prova').bio!=='solo annabar','le modifiche a una tag non toccano l\'altra');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'brunoshop',bio:'hack'}});
ok(r.code===401 && riga('brunoshop').bio!=='hack','un account non modifica la tag di un altro');

// Attivazione concorrente della stessa tag da due account: ne vince uno
r=await call('check-and-create.js',{method:'POST',body:{tag:'contesa'}});
const ricC=r.body.sessionToken;
const [a1,a2]=await Promise.all([
  call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'contesa',stato:'attivo',sessionToken:ricC}}),
  call('update-profile.js',{method:'POST',headers:conSessione(jwtBruno),body:{username_system:'contesa',stato:'attivo',sessionToken:ricC}})]);
ok([a1.code,a2.code].filter(c=>c===200).length===1 && [anna.id,bruno.id].includes(riga('contesa').proprietario_id),'stessa ricevuta usata da due account insieme: un solo proprietario');

// ============================================================
// 4. CONTATTI DEL VASETTO, CLICK, CAMPI PRIVATI
// ============================================================
riga('prova').lead_capture_attivo='true';
r=await call('add-lead.js',{method:'POST',body:{u:'prova',nome:'<img src=x onerror=alert(1)>Mario',contatto:'333 1234567'}});
ok(r.code===200 && JSON.parse(riga('prova').lead_capture_leads)[0].contatto==='333 1234567','add-lead aggiunge il contatto');
r=await call('add-lead.js',{method:'POST',body:{u:'prova',nome:'Lucia',contatto:'lucia@x.it'}});
ok(JSON.parse(riga('prova').lead_capture_leads).length===2 && JSON.parse(riga('prova').lead_capture_leads)[0].nome==='Lucia','secondo contatto in cima, il primo resta');
r=await call('add-lead.js',{method:'POST',body:{u:'prova',nome:'X',contatto:''}});
ok(r.code===400,'contatto vuoto rifiutato');
r=await call('add-lead.js',{method:'POST',body:{u:'nessuno',nome:'X',contatto:'1'}});
ok(r.code===404,'add-lead su tag inesistente');
riga('prova').lead_capture_attivo='false';
r=await call('add-lead.js',{method:'POST',body:{u:'prova',nome:'X',contatto:'1'}});
ok(r.code===404,'add-lead con raccolta spenta rifiutato'); riga('prova').lead_capture_attivo='true';
r=await call('track-click.js',{method:'POST',body:{u:'prova',sezione:'BIO<script>'}});
const log=JSON.parse(riga('prova').analytics_log); ok(r.code===200 && log[0].sezione==='BIOscript' && log[0].timestamp,'track-click registra (sezione ripulita)');
r=await call('track-view.js',{method:'POST',query:{u:'prova'},headers:{'user-agent':'iPhone','x-vercel-ip-city':'Milano','x-vercel-ip-country':'IT'}});
ok(r.code===200 && riga('prova').views===1 && JSON.parse(riga('prova').analytics_data).geo['Milano, IT']===1,'track-view');
for(let i=0;i<12;i++) r=await call('track-view.js',{method:'POST',ip:'6.6.6.6',query:{u:'prova'}});
ok(r.code===200 && r.body.contata===false && riga('prova').views===11,'track-view: oltre 10 visite in un\'ora dallo stesso IP non si contano (senza errori)');
r=await call('track-view.js',{method:'POST',ip:'6.6.6.7',query:{u:'prova'}});
ok(riga('prova').views===12,'track-view: un altro IP si conta ancora');
const logPrima=riga('prova').analytics_log, clickPrima=JSON.parse(logPrima).length;
for(let i=0;i<62;i++) r=await call('track-click.js',{method:'POST',ip:'6.6.6.8',body:{u:'prova',sezione:'BIO'}});
ok(r.code===200 && r.body.contato===false && JSON.parse(riga('prova').analytics_log).length===clickPrima+60,'track-click: oltre 60 click in un\'ora dallo stesso IP non si contano (senza errori)');
riga('prova').analytics_log=logPrima;
r=await call('get-profile.js',{query:{u:'prova'}});
ok(!('lead_capture_leads' in r.body.fields) && !('analytics_log' in r.body.fields) && !('analytics_data' in r.body.fields) && !('pocket_cloud' in r.body.fields),'visitatore: niente contatti, statistiche, Pocket');
r=await call('account.js',{method:'POST',headers:conSessione(jwtAnna),body:{azione:'mie-tag'}});
ok(r.body.tags.find(t=>t.username_system==='prova').contatti_nuovi===2,'dashboard: numero di contatti nuovi per tag');
r=await call('update-profile.js',{method:'POST',body:{username_system:'prova',lead_capture_leads:'[]'}});
ok(r.code===401 && JSON.parse(riga('prova').lead_capture_leads).length===2,'anonimo non può cancellare i contatti');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'prova',lead_capture_leads:'[]',analytics_log:'[]',bio:'nuova'}});
ok(r.code===200 && JSON.parse(riga('prova').lead_capture_leads).length===2 && JSON.parse(riga('prova').analytics_log).length===1 && riga('prova').bio==='nuova','proprietario salva: contatti e statistiche non vengono sovrascritti');
let l0=JSON.parse(riga('prova').lead_capture_leads);
ok(l0[0].id && l0[0].visto===false && l0[0].richiamato===false && l0[0].ts,'nuovo contatto: id, nuovo, non richiamato');
r=await call('leads.js',{method:'POST',body:{u:'prova',azione:'visti'}});
ok(r.code===401,'leads senza sessione rifiutato');
r=await call('leads.js',{method:'POST',headers:conSessione(jwtBruno),body:{u:'prova',azione:'visti'}});
ok(r.code===401,'leads: un altro account non vede né tocca i contatti');
r=await call('leads.js',{method:'POST',body:{u:'prova',sessionToken:jwtAnna,azione:'boh'}});
ok(r.code===400,'azione non valida rifiutata');
r=await call('leads.js',{method:'POST',body:{u:'prova',sessionToken:jwtAnna,azione:'visti'}});
ok(r.code===200 && r.body.leads.every(x=>x.visto===true),'segna tutti visti');
r=await call('leads.js',{method:'POST',headers:conSessione(jwtAnna),body:{u:'prova',azione:'richiamato',id:l0[0].id,valore:true}});
ok(r.body.leads.find(x=>x.id===l0[0].id).richiamato===true,'segna come richiamato');
r=await call('leads.js',{method:'POST',headers:conSessione(jwtAnna),body:{u:'prova',azione:'elimina',id:l0[0].id}});
ok(r.code===200 && r.body.leads.length===l0.length-1 && !r.body.leads.some(x=>x.id===l0[0].id),'elimina contatto');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'prova',bio:'<img src=x onerror=alert(1)> Un\'azienda',sito_web:'javascript:alert(1)',config_canali:JSON.stringify([{nome:'IG',url:'javascript:x'}]),username_display:'@ALTRONOME'}});
ok(riga('prova').bio==="‹img src=x onerror=alert(1)› Un'azienda" && !riga('prova').sito_web && JSON.parse(riga('prova').config_canali)[0].url==='','salvataggio: testi ripuliti, link javascript svuotati, apostrofi tenuti');
ok(riga('prova').username_display!=='@ALTRONOME','nome mostrato diverso dal nome della tag rifiutato');

// ============================================================
// 5. LIMITI AI TENTATIVI
// ============================================================
let ultimo;
for (let i=0;i<4;i++) ultimo=await call('add-lead.js',{method:'POST',ip:'8.8.8.8',body:{u:'prova',nome:'X',contatto:'1'+i}});
ok(ultimo.code===429,'vasetto: il 4° contatto in 10 minuti dallo stesso IP è bloccato');
for (let i=0;i<11;i++) ultimo=await call('check-and-create.js',{method:'POST',ip:'7.7.7.7',body:{tag:'nome'+i}});
ok(ultimo.code===429,'prenotazioni: l\'11° nome in un\'ora dallo stesso IP è bloccato');

// ============================================================
// 6. NOMI PROTETTI: black list, gold list, forma canonica, nomi assegnati
// ============================================================
r=await call('check-and-create.js',{method:'POST',body:{tag:'admin'}});
ok(r.code===400 && r.body.codice==='riservato' && !riga('admin'),'black list: "admin" non prenotabile via API');
r=await call('check-and-create.js',{method:'POST',body:{tag:'ferrari'}});
ok(r.code===400 && r.body.codice==='su_richiesta' && r.body.email==='vip@myquicktag.it' && !riga('ferrari'),'gold list: "ferrari" non prenotabile via API, con l\'indirizzo per la richiesta');
r=await call('check-and-create.js',{method:'POST',body:{tag:'ab'}});
ok(r.code===400 && r.body.codice==='su_richiesta','nomi sotto i 3 caratteri solo su richiesta');
r=await call('check-and-create.js',{method:'POST',body:{tag:'adm1n'}});
ok(r.code===400 && r.body.codice==='riservato','variante "adm1n" riconosciuta come riservata (dal database)');
r=await call('check-and-create.js',{method:'POST',body:{tag:'myquicktag-assistenza'}});
ok(r.code===400 && r.body.codice==='riservato','"myquicktag-assistenza" bloccato (regola contiene)');
for (const v of ['account','accesso','dashboard','recupero']) {
  r=await call('check-and-create.js',{method:'POST',body:{tag:v}});
  ok(r.code===400 && r.body.codice==='riservato','nome di una pagina del sito bloccato dal codice: '+v);
}
const { formaCanonica, nomeTag } = await import(new URL('../lib/nome-canonico.js', import.meta.url).href);
ok(['Cristiano Ronaldo','cristiano-ronaldo','cristiáno_ronaldo','CRISTIANORONALDO','@Cristiano.Ronaldo'].every(v=>formaCanonica(v).nome==='cristianoronaldo'),'forma canonica: maiuscole, spazi, trattini, underscore, punti e accenti → "cristianoronaldo"');
ok(formaCanonica('Cristiáno').nome==='cristiano','accento: "Cristiáno" → "cristiano"');
ok(formaCanonica('mario1').nome==='mario1' && formaCanonica('marioi').nome==='marioi','"mario1" e "marioi" restano nomi diversi (niente leetspeak per l\'unicità)');
ok(formaCanonica('mario!').errore && formaCanonica('mario🔥').errore && formaCanonica('a'.repeat(31)).errore && formaCanonica('ß').errore,'simboli, emoji, oltre 30 caratteri: rifiutati (non cancellati in silenzio)');
ok(nomeTag('@Mario-') === 'mario','ricerca di una tag esistente con la stessa forma canonica');
r=await call('check-and-create.js',{method:'POST',body:{tag:'mario!'}});
ok(r.code===400 && r.body.codice==='non_valido' && !rows.some(x=>x.username_system.startsWith('mario')),'API: nome con simboli rifiutato, nessuna tag creata');
r=await call('check-and-create.js',{method:'POST',body:{tag:'Mario'}});
ok(r.code===200 && r.body.username==='mario','API: "Mario" prenotato come "mario"');
for (const v of ['mario','@MARIO','mario-','mario_','ma.rio']) {
  r=await call('check-and-create.js',{method:'POST',body:{tag:v}});
  ok(r.code===400 && rows.filter(x=>x.username_system==='mario').length===1,`unicità: "${v}" non diventa una seconda tag`);
}
r=await call('check-and-create.js',{method:'POST',body:{tag:'mario1'}});
ok(r.code===200 && r.body.username==='mario1','"mario1" è una tag diversa da "mario" e si prenota');
r=await call('check-and-create.js',{method:'POST',body:{tag:'marioi'}});
ok(r.code===200 && r.body.username==='marioi','"marioi" si prenota anche se esiste "mario1"');
for (const v of ['cocacola','coca-cola','coca_cola','CocaCola','Coca Cola','netflix','netf1ix','NETFL1X','gianluigibuffon','gianluigi-buffon','Gianluigi Buffon','cristianoronaldo','cristiano-ronaldo','cristiáno_ronaldo']) {
  r=await call('check-and-create.js',{method:'POST',body:{tag:v}});
  ok(r.code===400 && r.body.codice==='su_richiesta' && r.body.email==='vip@myquicktag.it','gold via API: "'+v+'" bloccato, si richiede via email');
}
ok(!rows.some(x=>/cocacola|netflix|netfiix|buffon|ronaldo/.test(x.username_system)),'nessuna tag gold creata');
for (const v of ['poliziadistato','Polizia-di-Stato','p0l1z1ad1stat0','fuck','FuckYou','f-u-c-k','super_fuck_99','myquicktag-assistenza','admin','Admin','ADM1N']) {
  r=await call('check-and-create.js',{method:'POST',body:{tag:v}});
  ok(r.code===400 && r.body.codice==='riservato' && !r.body.email,'black/system via API: "'+v+'" riservato');
}
r=await call('check-and-create.js',{method:'POST',body:{tag:'fuchsia'}});
ok(r.code===200,'regola "contiene" non blocca nomi normali ("fuchsia" con "fuck" in lista)');
r=await call('check-and-create.js',{method:'POST',body:{tag:'ferrarista'}});
ok(r.code===200,'regola "esatto" non blocca i nomi più lunghi ("ferrarista" con "ferrari" gold)');
r=await call('check-and-create.js',{method:'POST',body:{tag:'armando'}});
ok(r.code===200,'nome comune non in lista ("armando") libero');
const [p1,p2]=await Promise.all([call('check-and-create.js',{method:'POST',body:{tag:'gara-nome'}}),call('check-and-create.js',{method:'POST',body:{tag:'Gara_Nome'}})]);
ok([p1.code,p2.code].sort().join()==='200,400' && rows.filter(x=>x.username_system==='garanome').length===1,'prenotazioni simultanee di "gara-nome" e "Gara_Nome": una sola riesce');

// Tag Gold regalate: nome assegnato all'email della persona (nomi_riservati.assegnato_a)
nomiProtetti.push({nome:'barsport',tipo:'gold',regola:'esatto',assegnato_a:'bruno@esempio.it'});
r=await call('check-and-create.js',{method:'POST',body:{tag:'Bar Sport'}});
ok(r.code===400 && r.body.codice==='su_richiesta' && !riga('barsport'),'nome assegnato: senza account resta protetto');
r=await call('check-and-create.js',{method:'POST',headers:conSessione(jwtAnna),body:{tag:'barsport'}});
ok(r.code===400 && r.body.codice==='su_richiesta' && !riga('barsport'),'nome assegnato: un altro account non lo prende');
r=await call('check-and-create.js',{method:'POST',headers:conSessione(jwtBruno),body:{tag:'barsport'}});
ok(r.code===200 && riga('barsport').proprietario_id===bruno.id,'nome assegnato: l\'account con quell\'email lo prenota e ne è proprietario');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtBruno),body:{username_system:'barsport',stato:'attivo'}});
ok(r.code===200 && riga('barsport').stato==='attivo','nome assegnato: attivazione riuscita (controllo ripetuto all\'attivazione)');
nomiProtetti.push({nome:'zz',tipo:'gold',regola:'esatto',assegnato_a:'anna@esempio.it'});
r=await call('check-and-create.js',{method:'POST',headers:conSessione(jwtAnna),body:{tag:'zz'}});
ok(r.code===200 && riga('zz').proprietario_id===anna.id,'nome corto assegnato a una persona: prenotabile solo da lei');

// Nome libero prenotato, poi messo in lista: l'attivazione viene bloccata (la tag non si cancella)
r=await call('check-and-create.js',{method:'POST',body:{tag:'futurobrand'}});
const tokFuturo=r.body.sessionToken;
nomiProtetti.push({nome:'futurobrand',tipo:'gold',regola:'esatto'});
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'futurobrand',stato:'attivo',sessionToken:tokFuturo}});
ok(r.code===403 && r.body.codice==='su_richiesta' && riga('futurobrand').stato==='in attesa' && !riga('futurobrand').proprietario_id,'nome messo in lista dopo la prenotazione: attivazione bloccata, tag non cancellata');
nomiProtetti.find(n=>n.nome==='futurobrand').assegnato_a='anna@esempio.it';
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'futurobrand',stato:'attivo',sessionToken:tokFuturo}});
ok(r.code===200 && riga('futurobrand').stato==='attivo' && riga('futurobrand').proprietario_id===anna.id,'assegnato all\'email del titolare verificato: attivazione consentita');

// username_system e nome mostrato
const tokMario=(await call('check-and-create.js',{method:'POST',body:{tag:'mariobis'}})).body.sessionToken;
r=await call('update-profile.js',{method:'POST',body:{username_system:'mariobis',sessionToken:tokMario,draft_json:'{}',username_system_nuovo:'cocacola'}});
ok(riga('mariobis') && !riga('cocacola'),'username_system non modificabile');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'cocacola',sessionToken:tokMario,stato:'attivo'}});
ok(r.code===404 && !riga('cocacola'),'la ricevuta di un\'altra tag non apre un nome protetto');
r=await call('update-profile.js',{method:'POST',body:{username_system:'mariobis',sessionToken:tokMario,username_display:'@COCA COLA'}});
ok(riga('mariobis').username_display===undefined,'il nome mostrato non può essere un altro nome');
r=await call('update-profile.js',{method:'POST',body:{username_system:'mariobis',sessionToken:tokMario,username_display:'@Mario Bis'}});
ok(riga('mariobis').username_display==='@Mario Bis','il nome mostrato può avere spazi e maiuscole');

// Database non raggiungibile durante il controllo: nessuna tag creata
const fetchVero=globalThis.fetch;
globalThis.fetch=async (url,opt)=>String(url).includes('controlla_nome') ? new Response('boom',{status:500}) : fetchVero(url,opt);
const ceN=console.error; console.error=()=>{};
r=await call('check-and-create.js',{method:'POST',body:{tag:'guastodb'}});
console.error=ceN; globalThis.fetch=fetchVero;
ok(r.code===500 && !riga('guastodb'),'controllo nomi non disponibile: la prenotazione si ferma');

// ============================================================
// 7. BOZZE: pubblicazione all'attivazione e dopo
// ============================================================
r=await call('check-and-create.js',{method:'POST',body:{tag:'bottegaverdi'}});
const ricBV=r.body.sessionToken;
const bozzaBV={username_system:'bottegaverdi',username_display:'@Bottega Verdi',bio:'Frutta <img src=x onerror=alert(1)>a km zero',
  modulo_vcf:'{"telefono1":"+39 333 1234567"}',config_canali:JSON.stringify([{nome:'Insta<b>',url:'javascript:alert(1)'}]),stato:'attivo',password:'x',lead_capture_leads:'[]',proprietario_id:bruno.id};
r=await call('update-profile.js',{method:'POST',body:{username_system:'bottegaverdi',draft_json:JSON.stringify(bozzaBV),sessionToken:ricBV}});
const rigaBV=()=>riga('bottegaverdi');
ok(r.code===200 && rigaBV().stato==='in attesa' && !rigaBV().bio,'prima dell\'attivazione la bozza resta privata');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'bottegaverdi',stato:'attivo',sessionToken:ricBV}});
ok(r.code===200 && rigaBV().stato==='attivo' && rigaBV().draft_json==='','attivazione riuscita e bozza svuotata');
ok(rigaBV().username_display==='@Bottega Verdi' && /^Frutta ‹img.*›a km zero$/.test(rigaBV().bio) && !rigaBV().bio.includes('<') && JSON.parse(rigaBV().modulo_vcf).telefono1==='+39 333 1234567','contenuti della bozza pubblicati (e ripuliti)');
const canaliBV=JSON.parse(rigaBV().config_canali); ok(canaliBV[0].nome==='Insta‹b›' && canaliBV[0].url==='','elenchi dentro la bozza (social) restano leggibili e ripuliti');
ok(!rigaBV().password && rigaBV().lead_capture_leads===undefined && rigaBV().proprietario_id===anna.id,'dalla bozza non passano password, campi del server né il proprietario');
r=await call('get-profile.js',{query:{u:'bottegaverdi'}});
ok(r.body.fields.bio && r.body.fields.username_display==='@Bottega Verdi','il visitatore vede i contenuti subito dopo l\'attivazione');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'bottegaverdi',draft_json:JSON.stringify({bio:'nuova bozza'})}});
ok(r.code===200 && /^Frutta/.test(rigaBV().bio) && JSON.parse(rigaBV().draft_json).bio==='nuova bozza','bozza di una tag attiva: non pubblicata finché non si preme Pubblica');

// ============================================================
// 8. RINNOVO GRATUITO: spento salvo decisione del titolare (RINNOVO_GRATUITO=si)
// ============================================================
riga('annabar').data_scadenza=new Date(Date.now()+5*864e5).toISOString().slice(0,10);
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'annabar',rinnova:true}});
ok(r.code===403 && r.body.rinnovo_non_disponibile,'rinnovo gratuito spento: rifiutato anche negli ultimi giorni');
process.env.RINNOVO_GRATUITO='si';
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtBruno),body:{username_system:'annabar',rinnova:true}});
ok(r.code===401,'rinnovo: un altro account non può rinnovare');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'annabar',rinnova:true}});
ok(r.code===200 && r.body.action==='renewed' && riga('annabar').data_scadenza>new Date(Date.now()+90*864e5).toISOString().slice(0,10),'rinnovo acceso: il proprietario rinnova negli ultimi 14 giorni');
r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'prova',rinnova:true}});
ok(r.code===400,'rinnovo acceso: non prima degli ultimi 14 giorni');
delete process.env.RINNOVO_GRATUITO;

// ============================================================
// 9. CAMPI PER ELENCO ESPLICITO, ERRORI SENZA DETTAGLI, LIMITI "CHIUSI"
// ============================================================
{
  const gp=await import(R+'get-profile.js');
  const dir=new URL('../supabase/migrations/', import.meta.url);
  const sql=fs.readdirSync(dir).sort().map(f=>fs.readFileSync(new URL(f,dir),'utf8')).join('\n');
  const colonne=[...sql.split('create table public.tags (')[1].split(');')[0].matchAll(/^\s+([a-z_0-9]+)\s+/gm)].map(m=>m[1]);
  const aggiunte=[...sql.matchAll(/alter table public\.tags\s+add column\s+([a-z_0-9]+)/g)].map(m=>m[1]);
  const tutte=[...colonne,...aggiunte];
  const classificate=new Set([...gp.CAMPI_PUBBLICI,...gp.CAMPI_PROPRIETARIO,...gp.CAMPI_MAI]);
  const nonClassificate=tutte.filter(c=>!classificate.has(c));
  ok(tutte.length>50 && aggiunte.includes('proprietario_id') && nonClassificate.length===0,'ogni colonna di tags (anche quelle aggiunte dopo) è classificata: '+nonClassificate.join(','));
  ok(gp.CAMPI_MAI.includes('proprietario_id') && gp.CAMPI_MAI.includes('password'),'proprietario e password non escono mai');
  rows.push({id:'colnuova',username_system:'colnuova',stato:'attivo',created_at:new Date().toISOString(),data_scadenza:'2099-01-01',bio:'ok',password:'scrypt$a$b',colonna_segreta:'NON DEVE USCIRE',draft_json:'{"x":1}',proprietario_id:anna.id});
  r=await call('get-profile.js',{query:{u:'colnuova'}});
  ok(r.code===200 && r.body.fields.bio==='ok' && !('colonna_segreta' in r.body.fields) && !('password' in r.body.fields) && !('draft_json' in r.body.fields) && !('proprietario_id' in r.body.fields),'visitatore: solo campi elencati (colonna nuova, password, proprietario non escono)');
  globalThis.fetch=async (url,opt)=>{ if((opt.method||'GET')==='PATCH') return new Response(JSON.stringify({code:'23514',message:'violates check',details:'Failing row contains (scrypt$segreto)'}),{status:400}); return fetchVero(url,opt); };
  const logs=[]; const ce=console.error; console.error=(...a)=>logs.push(JSON.stringify(a));
  r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'colnuova',bio:'x'}});
  console.error=ce; globalThis.fetch=fetchVero;
  ok(r.code===500 && !JSON.stringify(r.body).includes('segreto') && !('dettagli' in r.body) && !('stack' in r.body),'errore del database: nessun dettaglio al browser');
  ok(!logs.join(' ').includes('segreto'),'errore del database: i valori della riga non finiscono nei log');
  globalThis.fetch=async (url,opt)=>String(url).includes('consuma_tentativo') ? new Response('boom',{status:500}) : fetchVero(url,opt);
  const ce2=console.error; console.error=()=>{};
  const rPren=await call('check-and-create.js',{method:'POST',body:{tag:'limitiaperti'}});
  console.error=ce2; globalThis.fetch=fetchVero;
  ok(rPren.code===200,'limiti non verificabili: la prenotazione resta consentita (limite "aperto")');
  ok(!fs.existsSync(new URL('login.js',R)) && !fs.existsSync(new URL('change-password.js',R)),'vecchio accesso "@nome + password" dismesso (login.js e change-password.js rimossi)');
  ok(fs.readdirSync(new URL(R)).filter(f=>f.endsWith('.js')).length<=11,'funzioni Vercel entro il limite (≤ 11 su 12)');
}

// ============================================================
// 10. CONFIGURAZIONE PUBBLICA PER LA LIBRERIA DI ACCESSO (solo chiave pubblica, mai la segreta)
// ============================================================
{
  const urlPrima=process.env.SUPABASE_URL;
  process.env.SUPABASE_URL='https://lmxxoxrsrwmtunyqlpbh.supabase.co';
  r=await call('account.js',{method:'GET',query:{azione:'config'}});
  ok(r.code===200 && r.body.url===process.env.SUPABASE_URL && /^sb_publishable_/.test(r.body.chiave) && !JSON.stringify(r.body).includes('sb_secret'),'config: progetto del server con la sua chiave pubblica (prova)');
  process.env.SUPABASE_URL='https://atlhrkkfovblkhgzfeuo.supabase.co';
  r=await call('account.js',{method:'GET',query:{azione:'config'}});
  ok(r.code===200 && r.body.chiave==='sb_publishable_HrX_oradnt5sRX6YHqGB-w_gYZe0u4U','config: produzione con la chiave pubblica di produzione');
  process.env.SUPABASE_URL='https://sconosciuto.supabase.co';
  r=await call('account.js',{method:'GET',query:{azione:'config'}});
  ok(r.code===500 && !JSON.stringify(r.body).includes('sb_secret'),'config: progetto sconosciuto senza chiave pubblica → errore, nessun segreto');
  process.env.SUPABASE_URL=urlPrima;
  r=await call('account.js',{method:'GET',query:{azione:'mie-tag'}});
  ok(r.code===405,'account: le altre azioni solo in POST con sessione');
}

// ============================================================
// SEGNALA QUESTA TAG (api/segnala.js)
// ============================================================
{
  rows.push({id:'seg1',username_system:'segnalata',stato:'attivo',created_at:new Date().toISOString(),data_scadenza:'2099-01-01'});
  process.env.RESEND_API_KEY='re_test';
  let r=await call('segnala.js',{method:'GET'});
  ok(r.code===405,'segnala: solo POST');
  r=await call('segnala.js',{method:'POST',body:{u:'segnalata',motivo:'boh'}});
  ok(r.code===400 && segnalazioni.length===0,'segnala: motivo non valido rifiutato');
  r=await call('segnala.js',{method:'POST',body:{u:'segnalata',motivo:'truffa',email:'non-una-email'}});
  ok(r.code===400 && segnalazioni.length===0,'segnala: email non valida rifiutata');
  r=await call('segnala.js',{method:'POST',body:{u:'nonesiste',motivo:'truffa'}});
  ok(r.code===404 && segnalazioni.length===0,'segnala: tag inesistente');
  r=await call('segnala.js',{method:'POST',ip:'9.9.9.1',body:{u:'@Segnalata',motivo:'impersonazione',descrizione:'Si spaccia per la mia pizzeria <script>x</script>\nseconda riga',email:'Mario@Esempio.it'}});
  const s=segnalazioni[segnalazioni.length-1];
  ok(r.code===200 && segnalazioni.length===1 && s.tag==='segnalata' && s.motivo==='impersonazione' && s.email==='mario@esempio.it','segnala: salvata con tag in forma canonica ed email in minuscolo');
  ok(!s.descrizione.includes('<') && s.descrizione.includes('\n') && !('ip' in s),'segnala: descrizione ripulita (a capo tenuti), nessun IP salvato');
  const e=emailInviate[emailInviate.length-1];
  ok(e && e.to[0]==='info@myquicktag.it' && e.subject==='Segnalazione tag @segnalata' && e.reply_to==='mario@esempio.it' && e.text.includes('Si spaccia per me') && e.chiave==='Bearer re_test','segnala: email a info@myquicktag.it con oggetto, motivo e risposta al segnalante');
  resendGiu=true;
  r=await call('segnala.js',{method:'POST',ip:'9.9.9.2',body:{u:'segnalata',motivo:'offensivo'}});
  resendGiu=false;
  ok(r.code===200 && segnalazioni.length===2 && !segnalazioni[1].email,'segnala: se l\'email non parte la segnalazione resta salvata');
  let ultimo;
  for(let i=0;i<4;i++) ultimo=await call('segnala.js',{method:'POST',ip:'9.9.9.3',body:{u:'segnalata',motivo:'altro'}});
  ok(ultimo.code===429 && segnalazioni.length===5,'segnala: la 4ª segnalazione in un\'ora dallo stesso telefono sulla stessa tag è bloccata');
  delete process.env.RESEND_API_KEY;
}

// ============================================================
// ANTEPRIMA DEI LINK SU WHATSAPP (api/manifest.js?anteprima=1, vercel.json)
// ============================================================
{
  const vj=JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url)));
  const regola=vj.rewrites[0], re=new RegExp(regola.has[0].value);
  ok(regola.source==='/u/:username' && regola.destination.includes('anteprima=1') && vj.rewrites[1].destination.startsWith('/tag.html'),'anteprima: vercel.json manda prima i programmi di anteprima, poi tutti gli altri a tag.html');
  ok(re.test('WhatsApp/2.24.1.6 A') && re.test('facebookexternalhit/1.1') && re.test('TelegramBot (like TwitterBot)'),'anteprima: riconosce WhatsApp, Facebook/iMessage e Telegram');
  ok(!re.test('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1') && !re.test('Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36') && !re.test('Googlebot/2.1'),'anteprima: telefoni veri e motori di ricerca ricevono la tag normale');
  rows.push({id:'ant1',username_system:'barcentrale',username_display:'@BarCentrale',stato:'attivo',bio:'Il bar <b>dello</b> sport "dal 1980"\nAperti tutti i giorni',avatar_url:'https://res.cloudinary.com/etgsaztr/image/upload/v1/foto.jpg',data_scadenza:'2099-01-01',created_at:new Date().toISOString()});
  let r=await call('manifest.js',{query:{u:'BarCentrale',anteprima:'1'}});
  const h=r.body;
  ok(r.code===200 && h.includes('<meta property="og:title" content="@BarCentrale">') && h.includes('og:url" content="https://myquicktag.it/u/barcentrale"'),'anteprima: titolo con il nome scelto e indirizzo della tag');
  ok(h.includes('content="Il bar dello sport &quot;dal 1980&quot; Aperti tutti i giorni"') && !h.includes('<b>'),'anteprima: bio su una riga, senza codice, con le virgolette protette');
  ok(h.includes('https://res.cloudinary.com/etgsaztr/image/upload/c_fill,g_face,w_600,h_600,f_jpg,q_auto/v1/foto.jpg') && h.includes('twitter:card" content="summary"'),'anteprima: foto della tag ritagliata quadrata');
  rows.push({id:'ant2',username_system:'scaduto',username_display:'Scaduto',stato:'attivo',bio:'segreto',avatar_url:'https://res.cloudinary.com/x/image/upload/a.jpg',data_scadenza:'2020-01-01',created_at:new Date().toISOString()});
  r=await call('manifest.js',{query:{u:'scaduto',anteprima:'1'}});
  ok(r.body.includes('content="@Scaduto"') && !r.body.includes('segreto') && r.body.includes('/icons/og-image.png'),'anteprima: tag scaduta → solo il nome, immagine del marchio');
  rows.push({id:'ant3',username_system:'attesa',stato:'in attesa',bio:'bozza privata',avatar_url:'javascript:alert(1)',created_at:new Date().toISOString()});
  r=await call('manifest.js',{query:{u:'attesa',anteprima:'1'}});
  ok(r.body.includes('og:title" content="myquicktag"') && !r.body.includes('bozza privata') && !r.body.includes('javascript:'),'anteprima: tag non attiva → anteprima generica, nessun contenuto della bozza');
  r=await call('manifest.js',{query:{u:'"><script>x</script>',anteprima:'1'}});
  ok(r.code===200 && !r.body.includes('<script>'),'anteprima: nome strano nell\'indirizzo non entra nella pagina');
  r=await call('manifest.js',{query:{u:'barcentrale'}});
  ok(r.body && r.body.start_url==='/u/barcentrale','manifest dell\'app invariato senza ?anteprima');
}

// ============================================================
// PULIZIA NEL BROWSER (session.js → mqtPulisci) E "PUBBLICA" DALLA TAG
// ============================================================
// Bug del 25/10/2026: la bozza ripulita per la visualizzazione rovinava i JSON annidati
// (modulo_vcf, gallery_data diventavano {”telefono1”:…}) e "Pubblica" li salvava così.
{
  const sorgente=fs.readFileSync(new URL('../session.js', import.meta.url),'utf8');
  const inizio=sorgente.lastIndexOf('(function () {', sorgente.indexOf('window.mqtPulisci'));
  const fine=sorgente.indexOf('})();', sorgente.indexOf('window.mqtPulisci'))+5;
  const finestra={}; new Function('window', sorgente.slice(inizio, fine))(finestra);
  const P=finestra.mqtPulisci;
  const bozza={bio:'Ciao <script>x</script>', modulo_vcf:JSON.stringify({telefono1:'3498286274',indirizzo:'Via "Roma" 1'}), gallery_data:JSON.stringify(['https://res.cloudinary.com/a/b.jpg'])};
  const pulito=P.campi({username_system:'martina', draft_json:JSON.stringify(bozza), bio:'<b>vecchia</b>'});
  const b=JSON.parse(pulito.draft_json);
  const vcf=JSON.parse(b.modulo_vcf), gal=JSON.parse(b.gallery_data);
  ok(vcf.telefono1==='3498286274' && gal[0]==='https://res.cloudinary.com/a/b.jpg','mqtPulisci: recapiti e galleria dentro la bozza restano JSON leggibile (Pubblica non li rovina)');
  ok(!b.bio.includes('<') && vcf.indirizzo==='Via ”Roma” 1' && !pulito.bio.includes('<'),'mqtPulisci: i testi restano ripuliti, anche dentro i JSON annidati');
  // Il server riceve la bozza pubblicata dalla tag e la salva leggibile
  rows.push({id:'pub1',username_system:'pubblicami',stato:'attivo',proprietario_id:anna.id,data_scadenza:'2099-01-01',created_at:new Date().toISOString()});
  const r=await call('update-profile.js',{method:'POST',headers:conSessione(jwtAnna),body:{username_system:'pubblicami',...b,draft_json:''}});
  ok(r.code===200 && JSON.parse(riga('pubblicami').modulo_vcf).telefono1==='3498286274' && JSON.parse(riga('pubblicami').gallery_data).length===1,'Pubblica dalla tag: recapiti e galleria salvati leggibili');
}
{
  // Link condiviso di una sezione: l'anteprima dice quale (api/manifest.js, NOMI_SEZIONI)
  let r=await call('manifest.js',{query:{u:'barcentrale',anteprima:'1',sezione:'network.contatti'}});
  ok(r.body.includes('og:title" content="@BarCentrale · Contatti"') && r.body.includes('og:url" content="https://myquicktag.it/u/barcentrale?sezione=network.contatti"'),'anteprima: link di una sezione → "@Nome · Contatti"');
  r=await call('manifest.js',{query:{u:'barcentrale',anteprima:'1',sezione:'<script>'}});
  ok(r.body.includes('og:title" content="@BarCentrale"') && !r.body.includes('<script>'),'anteprima: sezione sconosciuta → solo il nome');
}
{
  // Strategie delle killer features (edit-logic.js): tutte presenti, senza promesse vietate o non vere (audit 28/10/2026)
  const src=fs.readFileSync(new URL('../edit-logic.js', import.meta.url),'utf8');
  const a=src.indexOf('const _boxStrategia'), b=src.indexOf('\n        };\n', src.indexOf('const databaseStrategie'))+12;
  const db=new Function(src.slice(a,b)+'; return databaseStrategie;')();
  const html=fs.readFileSync(new URL('../edit.html', import.meta.url),'utf8');
  const chiavi=[...html.matchAll(/apriStrategia\('([a-z]+)'/g)].map(m=>m[1]);
  ok(chiavi.length===9 && chiavi.every(k=>db[k] && db[k].titolo && db[k].testo.includes('Cosa ottieni')),'strategie: ogni pulsante STRATEGIA dell\'editor ha il suo testo (perché, come, cosa ottieni)');
  const tutto=Object.values(db).map(v=>v.testo).join(' ')+html;
  ok(!/matematicamente|Dark Mode|filtrando le recensioni negative|Costringendo|L'80%|crollano del 20%/i.test(tutto),'strategie: niente statistiche senza fonte, funzioni inesistenti o recensioni filtrate');
}
{
  // Consenso alle offerte nel Vasetto (28/10/2026): facoltativo, esplicito, salvato con testo e data
  rows.push({id:'cons1',username_system:'consensi',stato:'attivo',lead_capture_attivo:'true',data_scadenza:'2099-01-01',created_at:new Date().toISOString()});
  let r=await call('add-lead.js',{method:'POST',ip:'5.5.5.1',body:{u:'consensi',nome:'Anna',contatto:'3331112222',consenso:true,consenso_testo:'Accetto di ricevere offerte e novità da @Consensi <b>'}});
  let l=JSON.parse(riga('consensi').lead_capture_leads)[0];
  ok(r.code===200 && l.consenso_offerte===true && l.consenso_testo==='Accetto di ricevere offerte e novità da @Consensi ‹b›' && !isNaN(Date.parse(l.consenso_data)),'vasetto: consenso alle offerte salvato con il testo accettato e la data');
  r=await call('add-lead.js',{method:'POST',ip:'5.5.5.2',body:{u:'consensi',nome:'Bruno',contatto:'3334445555',consenso:'true',consenso_testo:'x'}});
  l=JSON.parse(riga('consensi').lead_capture_leads)[0];
  ok(r.code===200 && l.consenso_offerte===false && !('consenso_testo' in l) && !('consenso_data' in l),'vasetto: senza casella spuntata (o con valori ambigui) nessun consenso');
}
