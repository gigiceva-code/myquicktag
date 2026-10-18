-- ============================================================
-- ACCOUNT (Supabase Auth) E PROPRIETARI DELLE TAG
-- ============================================================
-- Da questa migrazione l'accesso dei titolari passa a Supabase Auth (email privata verificata,
-- password, recupero, sessioni). L'email dell'account vive in auth.users: non è mai nella tabella
-- "tags" (la colonna tags.email resta l'email PUBBLICA scritta nella tag).
--
-- Regola: un account può possedere più tag, ogni tag ha al massimo un proprietario.
-- Solo il server (api/, chiave segreta) scrive proprietario_id, e solo dopo aver verificato la
-- sessione Supabase dell'utente: il browser non può mai indicare il proprietario.
--
-- Migrazione SOLO ADDITIVA: nessuna colonna o riga esistente viene cancellata.
-- La vecchia colonna tags.password resta (tag di prova create col vecchio sistema): serve solo
-- per collegare una tag vecchia a un account (api/account.js, azione "collega-vecchia"),
-- dopo di che viene svuotata.

-- 1. Proprietario della tag (utente di Supabase Auth)
alter table public.tags
  add column proprietario_id uuid references auth.users (id) on delete set null;

create index tags_proprietario_idx on public.tags (proprietario_id);

comment on column public.tags.proprietario_id is
  'Account (auth.users) proprietario della tag. Scritto solo dal server dopo verifica della sessione.';

-- 2. Nomi protetti assegnati: un nome gold (o un nome corto) può essere riservato a una persona
--    precisa scrivendo qui la sua email. Solo un account con QUELLA email verificata può prenotarlo
--    (procedura "tag regalate configurate di persona", vedi PASSAGGIO-CONSEGNE.md).
alter table public.nomi_riservati
  add column assegnato_a text
  constraint nomi_riservati_assegnato_a_minuscolo check (assegnato_a is null or assegnato_a = lower(btrim(assegnato_a)));

comment on column public.nomi_riservati.assegnato_a is
  'Email (minuscola) dell''unico account che può prenotare questo nome. Vuoto = nessuna assegnazione.';

-- Chi scrive l'email dal Table Editor non deve preoccuparsi di maiuscole o spazi
create function public.nomi_riservati_email_minuscola()
returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.assegnato_a is not null then
    new.assegnato_a := nullif(lower(btrim(new.assegnato_a)), '');
  end if;
  return new;
end;
$$;

create trigger nomi_riservati_email_minuscola
  before insert or update of assegnato_a on public.nomi_riservati
  for each row execute function public.nomi_riservati_email_minuscola();

revoke execute on function public.nomi_riservati_email_minuscola() from public, anon, authenticated;

-- 3. A chi è assegnato un nome (riga attiva, regola "esatto"): null se a nessuno
create function public.nome_assegnato_a(p_nome text)
returns text
language sql stable set search_path = '' as $$
  select n.assegnato_a
    from public.nomi_riservati n
   where n.attivo and n.regola = 'esatto' and n.nome = lower(p_nome) and n.assegnato_a is not null
   limit 1;
$$;

revoke execute on function public.nome_assegnato_a(text) from public, anon, authenticated;
