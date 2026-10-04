-- ============================================================
-- LIMITI AI TENTATIVI (login, prenotazioni, contatti, cambio password)
-- ============================================================
-- Un contatore per "chiave" (azione + impronta anonima dell'IP e/o della tag) in una
-- finestra di tempo. La chiave è un HMAC calcolato dal server: l'IP non viene salvato.
-- consuma_tentativo restituisce true se il tentativo è consentito, false se il limite
-- è superato. La chiama solo il server (api/) con la chiave segreta.

create table public.limiti (
  chiave     text primary key,
  conteggio  integer not null,
  inizio     timestamptz not null
);

alter table public.limiti enable row level security;
revoke all on public.limiti from anon, authenticated;

create function public.consuma_tentativo(p_chiave text, p_max integer, p_finestra_secondi integer)
returns boolean
language plpgsql set search_path = '' as $$
declare
  v_conteggio integer;
begin
  insert into public.limiti as l (chiave, conteggio, inizio)
  values (p_chiave, 1, now())
  on conflict (chiave) do update
    set conteggio = case when l.inizio < now() - make_interval(secs => p_finestra_secondi) then 1 else l.conteggio + 1 end,
        inizio    = case when l.inizio < now() - make_interval(secs => p_finestra_secondi) then now() else l.inizio end
  returning conteggio into v_conteggio;

  -- Pulizia occasionale dei contatori vecchi (circa una chiamata su cento)
  if random() < 0.01 then
    delete from public.limiti where inizio < now() - interval '1 day';
  end if;

  return v_conteggio <= p_max;
end;
$$;

revoke execute on function public.consuma_tentativo(text, integer, integer) from public, anon, authenticated;
