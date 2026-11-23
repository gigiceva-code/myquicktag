-- POCKET NELL'ACCOUNT (23/11/2026, ok del titolare): le tag salvate da chi ha un account, ritrovabili su ogni dispositivo.
-- Il browser legge e scrive direttamente con la sessione dell'account: ognuno vede e tocca solo le proprie righe.
create table if not exists public.pocket (
  utente     uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  username   text        not null check (username ~ '^[a-z0-9_-]{1,40}$'),
  nome       text        check (nome is null or char_length(nome) <= 80),
  salvata_il timestamptz not null default now(),
  primary key (utente, username)
);
comment on table public.pocket is 'Pocket dei titolari di account: le tag salvate (solo il nome della tag, niente altro).';
alter table public.pocket enable row level security;
create policy pocket_leggi    on public.pocket for select to authenticated using (utente = (select auth.uid()));
create policy pocket_aggiungi on public.pocket for insert to authenticated with check (utente = (select auth.uid()));
create policy pocket_aggiorna on public.pocket for update to authenticated using (utente = (select auth.uid())) with check (utente = (select auth.uid()));
create policy pocket_togli    on public.pocket for delete to authenticated using (utente = (select auth.uid()));
revoke all on public.pocket from anon;
grant select, insert, update, delete on public.pocket to authenticated;

-- Al massimo 500 tag salvate per account (contro gli abusi)
create or replace function public.pocket_limite() returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.pocket where utente = new.utente) >= 500 then
    raise exception 'Pocket pieno' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger pocket_limite before insert on public.pocket for each row execute function public.pocket_limite();
