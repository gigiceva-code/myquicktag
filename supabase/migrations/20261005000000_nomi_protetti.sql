-- ============================================================
-- NOMI PROTETTI: forma canonica nel database, tipo "system", categorie e interruttore "attivo"
-- ============================================================
-- 1. tags.username_system contiene solo la forma canonica (lib/nome-canonico.js): lettere a-z
--    e numeri, massimo 30 caratteri. Con il vincolo UNIQUE già presente, "mario", "Mario",
--    "mario-" e "mario_" non possono diventare tag diverse. (1-2 caratteri ammessi: sono i
--    nomi corti assegnati a mano su richiesta.)
alter table public.tags
  add constraint tags_username_canonico check (username_system ~ '^[a-z0-9]{1,30}$');

-- 2. nomi_riservati: nuovi campi per gestire liste di migliaia di nomi dal Table Editor
--    tipo      : 'system' (serve al sito) | 'black' (riservato) | 'gold' (su richiesta del titolare)
--    categoria : istituzione, banca, brand, persona, sport, piattaforma, offensivo, citta, generico...
--    attivo    : false = il nome torna libero senza cancellare la riga
--                (es. per far registrare un nome gold al titolare verificato, poi si rimette true)
alter table public.nomi_riservati drop constraint nomi_riservati_tipo_check;
alter table public.nomi_riservati
  add constraint nomi_riservati_tipo_check check (tipo in ('system', 'black', 'gold')),
  add column categoria text,
  add column attivo boolean not null default true;

-- 3. Chi inserisce un nome dal Table Editor può scriverlo come gli viene ("Coca-Cola",
--    "Cristiano Ronaldo", "Città"): viene salvato nella forma canonica ("cocacola"...).
create function public.nomi_riservati_forma_canonica()
returns trigger
language plpgsql set search_path = '' as $$
begin
  new.nome := regexp_replace(
    regexp_replace(lower(normalize(new.nome, NFKD)), '[̀-ͯ]', '', 'g'),
    '[\s._@-]', '', 'g');
  return new;
end;
$$;

create trigger nomi_riservati_forma_canonica
  before insert or update of nome on public.nomi_riservati
  for each row execute function public.nomi_riservati_forma_canonica();

revoke execute on function public.nomi_riservati_forma_canonica() from public, anon, authenticated;

-- 4. Controllo: riceve la forma canonica e la confronta anche nelle forme "somiglianza"
--    (0→o 3→e 4→a 5→s 7→t, e 1 sia come "i" sia come "l"): "adm1n" → "admin", "netf1ix" → "netflix".
--    La somiglianza vale SOLO qui: non decide se due tag sono uguali ("mario1" ≠ "marioi").
--    Precedenza: system, poi black, poi gold. Le righe con attivo = false sono ignorate.
create or replace function public.controlla_nome(p_nome text)
returns text
language sql stable set search_path = '' as $$
  with pulito as (
    select lower(p_nome) as base, regexp_replace(lower(p_nome), '[-_.]', '', 'g') as senza_separatori
  ), varianti as (
    select base as forma from pulito
    union select translate(senza_separatori, '013457', 'oieast') from pulito
    union select translate(senza_separatori, '013457', 'oleast') from pulito
  )
  select n.tipo
    from public.nomi_riservati n, varianti v
   where n.attivo
     and (   (n.regola = 'esatto'   and n.nome = v.forma)
          or (n.regola = 'contiene' and strpos(v.forma, n.nome) > 0))
   order by case n.tipo when 'system' then 0 when 'black' then 1 else 2 end
   limit 1;
$$;

revoke execute on function public.controlla_nome(text) from public, anon, authenticated;

-- Categorie per i nomi già presenti
update public.nomi_riservati set tipo = 'system', categoria = 'sistema' where nota = 'sistema';
update public.nomi_riservati set categoria = 'myquicktag' where nome = 'myquicktag';
update public.nomi_riservati set categoria = 'offensivo' where nota = 'volgarità e odio';
update public.nomi_riservati set categoria = 'generico' where nota = 'pregio';
update public.nomi_riservati set categoria = 'brand' where nota = 'marchio';
