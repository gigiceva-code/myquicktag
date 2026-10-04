-- ============================================================
-- NOMI RISERVATI (black list) E NOMI PREMIUM (gold list) NEL DATABASE
-- ============================================================
-- Si gestiscono dal Table Editor di Supabase, senza toccare il codice né fare deploy.
--   nome   : in minuscolo, solo lettere e numeri (es. "poste")
--   tipo   : 'black' = non si può prenotare | 'gold' = si assegna su richiesta (vip@myquicktag.it)
--   regola : 'esatto'   = solo quel nome
--            'contiene' = qualunque nome che lo contiene (es. "poste" blocca "posteitaliane")
--   nota   : promemoria libero (categoria, motivo...)
-- Il controllo considera anche le varianti: trattini/punti tolti e 0→o, 1→i, 3→e, 4→a, 5→s, 7→t
-- (così "p0ste" o "poste-italiane" vengono riconosciuti). Se un nome è sia black che gold vince black.
-- I nomi delle pagine del sito (account, edit, api...) sono nel codice: lib/nomi-riservati.js.

create table public.nomi_riservati (
  nome    text primary key check (nome ~ '^[a-z0-9]+$'),
  tipo    text not null check (tipo in ('black', 'gold')),
  regola  text not null default 'esatto' check (regola in ('esatto', 'contiene')),
  nota    text
);

alter table public.nomi_riservati enable row level security;
revoke all on public.nomi_riservati from anon, authenticated;

create function public.controlla_nome(p_nome text)
returns text
language sql stable set search_path = '' as $$
  with varianti as (
    select lower(p_nome) as base,
           translate(regexp_replace(lower(p_nome), '[-_.]', '', 'g'), '013457', 'oieast') as normale
  )
  select n.tipo
    from public.nomi_riservati n, varianti v
   where (n.regola = 'esatto'   and n.nome in (v.base, v.normale))
      or (n.regola = 'contiene' and (strpos(v.base, n.nome) > 0 or strpos(v.normale, n.nome) > 0))
   order by (n.tipo = 'black') desc
   limit 1;
$$;

revoke execute on function public.controlla_nome(text) from public, anon, authenticated;

-- Liste iniziali: quelle già in uso (le liste ampliate si aggiungono dopo la revisione)
insert into public.nomi_riservati (nome, tipo, regola, nota) values
  ('admin','black','esatto','sistema'), ('administrator','black','esatto','sistema'), ('root','black','esatto','sistema'),
  ('support','black','esatto','sistema'), ('info','black','esatto','sistema'), ('help','black','esatto','sistema'),
  ('home','black','esatto','sistema'), ('mail','black','esatto','sistema'), ('test','black','esatto','sistema'),
  ('error','black','esatto','sistema'), ('null','black','esatto','sistema'), ('undefined','black','esatto','sistema'),
  ('www','black','esatto','sistema'),
  ('myquicktag','black','contiene','marchio myquicktag: nessuno può spacciarsi per noi'),
  ('official','gold','esatto','pregio'), ('team','gold','esatto','pregio'), ('staff','gold','esatto','pregio'),
  ('security','gold','esatto','pregio'), ('vip','gold','esatto','pregio'), ('pro','gold','esatto','pregio'),
  ('premium','gold','esatto','pregio'), ('business','gold','esatto','pregio'), ('agency','gold','esatto','pregio'),
  ('brand','gold','esatto','pregio'), ('creator','gold','esatto','pregio'), ('shop','gold','esatto','pregio'),
  ('store','gold','esatto','pregio'),
  ('cocacola','gold','esatto','marchio'), ('ferrari','gold','esatto','marchio'), ('nike','gold','esatto','marchio'),
  ('apple','gold','esatto','marchio');
