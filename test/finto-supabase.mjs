// FINTO SUPABASE (database + Auth) E SITO LOCALE per test/account.e2e.mjs — porta 8788
// Avvio: node test/finto-supabase.mjs   (nessuna email vera: i codici finiscono in /__inbox)
import http from 'http'; import fs from 'fs'; import path from 'path'; import crypto from 'crypto';
const ROOT=new URL('..', import.meta.url).pathname.replace(/\/$/, '');
process.env.SUPABASE_URL='https://fake.supabase.co'; process.env.SUPABASE_SECRET_KEY='sb_secret_x'; process.env.SESSION_SECRET='s';
const rows=[]; const nomiProtetti=[{nome:'admin',tipo:'system',regola:'esatto'},{nome:'ferrari',tipo:'gold',regola:'esatto'},{nome:'barsport',tipo:'gold',regola:'esatto',assegnato_a:'mario@bar.it'}];
// ---- finto GoTrue ----
const utenti=new Map(); // email → {id,email,pwd,confermato,data,codice,codiceRec}
const sessioni=new Map(); // access_token → {email, sid}
const refresh=new Map(); // refresh_token → {email, sid}
const inbox=[]; // email inviate (finte)
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
function utentePubblico(u){ return {id:u.id,aud:'authenticated',role:'authenticated',email:u.email,email_confirmed_at:u.confermato||null,confirmed_at:u.confermato||null,user_metadata:u.data||{},app_metadata:{provider:'email'},identities:[{id:u.id,provider:'email'}],created_at:u.creato}; }
function apri(u,sid=crypto.randomUUID()){ const exp=Math.floor(Date.now()/1000)+3600; const at=`${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:u.id,email:u.email,exp,session_id:sid,role:'authenticated',aud:'authenticated'})}.${crypto.randomBytes(12).toString('base64url')}`; const rt=crypto.randomBytes(16).toString('hex'); sessioni.set(at,{email:u.email,sid}); refresh.set(rt,{email:u.email,sid}); return {access_token:at,token_type:'bearer',expires_in:3600,expires_at:exp,refresh_token:rt,user:utentePubblico(u)}; }
function chiudi(fn){ for(const m of [sessioni,refresh]) for(const [k,v] of m) if(fn(v)) m.delete(k); }
function utenteDaBearer(h){ const t=String(h||'').replace(/^Bearer /,''); const s=sessioni.get(t); return s?{u:utenti.get(s.email),s}:null; }
const codice=()=>String(100000+crypto.randomInt(900000));
function gotrue(metodo,url,headers,body){
  const p=url.pathname.replace('/auth/v1',''); const err=(st,code,message)=>[st,{code,error_code:code,message,msg:message}];
  if(p==='/signup'&&metodo==='POST'){ const email=String(body.email).toLowerCase(); let u=utenti.get(email);
    if(u&&u.confermato) return [200,{...utentePubblico(u),identities:[]}];
    if(String(body.password||'').length<6) return err(422,'weak_password','Password should be at least 6 characters');
    u={id:crypto.randomUUID(),email,pwd:body.password,confermato:null,data:body.data||{},creato:new Date().toISOString(),codice:codice()}; utenti.set(email,u);
    inbox.push({a:email,tipo:'signup',codice:u.codice}); return [200,utentePubblico(u)]; }
  if(p==='/resend'){ const u=utenti.get(String(body.email).toLowerCase()); if(u&&!u.confermato){u.codice=codice(); inbox.push({a:u.email,tipo:'signup',codice:u.codice});} return [200,{}]; }
  if(p==='/verify'&&metodo==='POST'){ const u=utenti.get(String(body.email||'').toLowerCase());
    if(body.type==='recovery'){ if(!u||!u.codiceRec||u.codiceRec!==body.token) return err(403,'otp_expired','Token has expired or is invalid'); u.codiceRec=null; return [200,apri(u)]; }
    if(!u||!u.codice||u.codice!==body.token) return err(403,'otp_expired','Token has expired or is invalid'); u.codice=null; u.confermato=new Date().toISOString(); return [200,apri(u)]; }
  if(p==='/token'){ const g=url.searchParams.get('grant_type');
    if(g==='password'){ const u=utenti.get(String(body.email).toLowerCase()); if(!u||u.pwd!==body.password) return err(400,'invalid_credentials','Invalid login credentials'); if(!u.confermato) return err(400,'email_not_confirmed','Email not confirmed'); return [200,apri(u)]; }
    if(g==='refresh_token'){ const r=refresh.get(body.refresh_token); if(!r) return err(400,'refresh_token_not_found','Invalid Refresh Token'); refresh.delete(body.refresh_token); for(const [k,v] of sessioni) if(v.sid===r.sid) sessioni.delete(k); return [200,apri(utenti.get(r.email),r.sid)]; } }
  if(p==='/recover'){ const u=utenti.get(String(body.email).toLowerCase()); if(u){u.codiceRec=codice(); inbox.push({a:u.email,tipo:'recovery',codice:u.codiceRec});} return [200,{}]; }
  if(p==='/user'){ const x=utenteDaBearer(headers.authorization); if(!x) return err(401,'bad_jwt','invalid JWT');
    if(metodo==='PUT'){ if(body.password){ if(body.password===x.u.pwd) return err(422,'same_password','New password should be different from the old password.'); x.u.pwd=body.password; }
      if(body.data) x.u.data={...x.u.data,...body.data}; if(body.email){ inbox.push({a:body.email,tipo:'email_change'}); } }
    return [200,utentePubblico(x.u)]; }
  if(p==='/logout'){ const x=utenteDaBearer(headers.authorization); if(x){ const scope=url.searchParams.get('scope')||'global'; if(scope==='global') chiudi(v=>v.email===x.u.email); else if(scope==='others') chiudi(v=>v.email===x.u.email&&v.sid!==x.s.sid); else chiudi(v=>v.sid===x.s.sid); } return [204,null]; }
  return err(404,'not_found','not found '+p);
}
// ---- finto PostgREST (stesse regole di test/api.test.mjs) ----
globalThis.fetch=async (url,opt={})=>{
  const u=new URL(url); const m=opt.method||'GET';
  if(u.pathname.startsWith('/auth/v1/')){ const [st,b]=gotrue(m,u,{authorization:opt.headers?.Authorization},opt.body?JSON.parse(opt.body):{}); return new Response(b==null?null:JSON.stringify(b),{status:st}); }
  if(u.pathname.endsWith('/rpc/controlla_nome')){ const b=JSON.parse(opt.body); const t=nomiProtetti.find(n=>n.nome===b.p_nome); return new Response(JSON.stringify(t?t.tipo:null)); }
  if(u.pathname.endsWith('/rpc/nome_assegnato_a')){ const b=JSON.parse(opt.body); const t=nomiProtetti.find(n=>n.nome===b.p_nome&&n.assegnato_a); return new Response(JSON.stringify(t?t.assegnato_a:null)); }
  if(u.pathname.endsWith('/rpc/consuma_tentativo')) return new Response('true');
  if(u.pathname.endsWith('/rpc/gestisci_lead')){ const b=JSON.parse(opt.body); const r=rows.find(x=>x.username_system===b.p_username); if(!r) return new Response('null');
    let l=JSON.parse(r.lead_capture_leads||'[]'); if(b.p_azione==='visti') l=l.map(e=>({...e,visto:true})); else if(b.p_azione==='richiamato') l=l.map(e=>e.id===b.p_id?{...e,richiamato:b.p_valore,visto:true}:e); else if(b.p_azione==='elimina') l=l.filter(e=>e.id!==b.p_id);
    r.lead_capture_leads=JSON.stringify(l); return new Response(JSON.stringify(r.lead_capture_leads)); }
  if(u.pathname.includes('/rpc/')){ const b=JSON.parse(opt.body); const r=rows.find(x=>x.username_system===b.p_username); if(!r) return new Response('null');
    const campo=u.pathname.endsWith('aggiungi_lead')?'lead_capture_leads':'analytics_log'; const voce=b.p_lead||b.p_click; const lista=JSON.parse(r[campo]||'[]'); lista.unshift(voce); r[campo]=JSON.stringify(lista); return new Response('true'); }
  const f=(r)=>{for(const [k,v] of u.searchParams){ if(v.startsWith('eq.')&&String(r[k])!==decodeURIComponent(v.slice(3)))return false; if(v==='is.null'&&r[k]!=null)return false;}return true;};
  if(m==='GET'){ let out=rows.filter(f); const sel=u.searchParams.get('select'); if(sel&&sel!=='*') out=out.map(r=>Object.fromEntries(sel.split(',').map(c=>[c,r[c]??null]))); return new Response(JSON.stringify(out)); }
  if(m==='POST'){ const b=JSON.parse(opt.body); if(rows.some(r=>r.username_system===b.username_system)) return new Response('{"code":"23505"}',{status:409}); const r={id:crypto.randomUUID(),created_at:new Date().toISOString(),views:0,password:null,draft_json:null,proprietario_id:null,...b}; rows.push(r); return new Response(JSON.stringify([r]),{status:201}); }
  if(m==='PATCH'){ const b=JSON.parse(opt.body); const t=rows.filter(f); t.forEach(r=>Object.assign(r,b)); return String(opt.headers?.Prefer||'').includes('representation')?new Response(JSON.stringify(t)):new Response(null,{status:204}); }
  if(m==='DELETE'){ for(let i=rows.length-1;i>=0;i--) if(f(rows[i])) rows.splice(i,1); return new Response(null,{status:204}); }
};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,PATCH,OPTIONS'};
http.createServer(async (req,res)=>{
  const url=new URL(req.url,'http://x'); let p=url.pathname;
  let body=''; for await (const c of req) body+=c;
  if(p.startsWith('/__inbox')){ res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify(inbox)); return; }
  if(p.startsWith('/__db')){ res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify({rows,utenti:[...utenti.values()].map(u=>({email:u.email,confermato:u.confermato,data:u.data})),sessioni:sessioni.size})); return; }
  if(p.startsWith('/__seed')){ const b=JSON.parse(body); rows.push({id:crypto.randomUUID(),created_at:new Date().toISOString(),views:0,proprietario_id:null,...b}); res.end('ok'); return; }
  if(p.startsWith('/auth/v1/')){ if(req.method==='OPTIONS'){res.writeHead(204,cors);res.end();return;}
    const [st,b]=gotrue(req.method,url,{authorization:req.headers.authorization},body?JSON.parse(body):{}); res.writeHead(st,{'Content-Type':'application/json',...cors}); res.end(b==null?'':JSON.stringify(b)); return; }
  let mu=p.match(/^\/u\/([^/]+)\/?$/); if(mu){ p='/tag.html'; url.searchParams.set('u',mu[1]); }
  if(p.startsWith('/api/')){
    try{ body=body?JSON.parse(body):{}; }catch{}
    const o={code:200,h:{}}; const r={status(c){o.code=c;return r},json(b){o.json=true;o.body=b;return r},send(b){o.body=b;return r},setHeader(k,v){o.h[k]=v},end(b){o.body=b;return r}};
    try{ const mod=await import(path.join(ROOT,p.replace(/\.js$/,'')+'.js')); await mod.default({method:req.method,body,query:Object.fromEntries(url.searchParams),headers:{...req.headers,'x-forwarded-for':'1.2.3.4'}},r); }catch(e){ console.error(p,e); o.code=500;o.body={error:String(e)};o.json=true; }
    res.writeHead(o.code,{'Content-Type':o.json?'application/json':(o.h['Content-Type']||'text/plain'),...o.h}); res.end(o.json?JSON.stringify(o.body):(o.body??'')); return;
  }
  if(p==='/') p='/index.html';
  let fp=path.join(ROOT,p); if(!fs.existsSync(fp)&&fs.existsSync(fp+'.html')) fp+='.html';
  if(!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){res.writeHead(404);res.end('404');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(fp)]||'application/octet-stream'}); fs.createReadStream(fp).pipe(res);
}).listen(8788,()=>console.log('ok 8788'));
