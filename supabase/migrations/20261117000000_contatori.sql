-- ============================================================
-- CONTATORI ANONIMI DEL PERCORSO (17/11/2026, ok del titolare): solo numeri totali per giorno
-- ============================================================
-- Niente IP, nomi, email o identificativi: una riga per (giorno, evento) con il conteggio.
-- Gli eventi (visite della home, nomi verificati, prenotazioni, attivazioni, condivisioni…) li scrive solo il server
-- (api/), con un elenco chiuso di nomi. Account, prenotazioni e attivazioni si ricavano dai dati che ci sono già.
create table public.contatori (
  giorno    date    not null,
  evento    text    not null check (evento ~ '^[a-z_]{1,40}$'),
  conteggio integer not null default 0,
  primary key (giorno, evento)
);
alter table public.contatori enable row level security;
comment on table public.contatori is 'Contatori anonimi del percorso: totali per giorno ed evento, senza dati personali.';

-- +1 all'evento di oggi (ora italiana), atomico anche con richieste contemporanee
create function public.conta_evento(p_evento text)
returns void
language sql set search_path = '' as $$
  insert into public.contatori (giorno, evento, conteggio)
  values ((now() at time zone 'Europe/Rome')::date, p_evento, 1)
  on conflict (giorno, evento) do update set conteggio = public.contatori.conteggio + 1;
$$;

-- I numeri per la pagina del titolare: eventi degli ultimi giorni, account confermati, prenotazioni e attivazioni
-- per giorno, più alcuni totali. Legge auth.users solo per contare (nessuna email esce da qui).
create function public.numeri_lancio(p_giorni integer default 30)
returns jsonb
language sql stable security definer set search_path = '' as $$
  with dal as (select ((now() at time zone 'Europe/Rome')::date - greatest(1, least(p_giorni, 366))) as d)
  select jsonb_build_object(
    'eventi', coalesce((select jsonb_agg(jsonb_build_object('giorno', c.giorno, 'evento', c.evento, 'conteggio', c.conteggio) order by c.giorno)
                          from public.contatori c, dal where c.giorno > dal.d), '[]'::jsonb),
    'account', coalesce((select jsonb_agg(jsonb_build_object('giorno', g, 'conteggio', n) order by g) from (
                          select (u.created_at at time zone 'Europe/Rome')::date g, count(*) n from auth.users u, dal
                           where u.email_confirmed_at is not null and (u.created_at at time zone 'Europe/Rome')::date > dal.d group by 1) x), '[]'::jsonb),
    'prenotazioni', coalesce((select jsonb_agg(jsonb_build_object('giorno', g, 'conteggio', n) order by g) from (
                          select (t.created_at at time zone 'Europe/Rome')::date g, count(*) n from public.tags t, dal
                           where (t.created_at at time zone 'Europe/Rome')::date > dal.d group by 1) x), '[]'::jsonb),
    'attivazioni', coalesce((select jsonb_agg(jsonb_build_object('giorno', g, 'conteggio', n) order by g) from (
                          select t.data_inizio g, count(*) n from public.tags t, dal
                           where t.stato = 'attivo' and t.data_inizio > dal.d group by 1) x), '[]'::jsonb),
    'totali', jsonb_build_object(
      'account', (select count(*) from auth.users u where u.email_confirmed_at is not null),
      'account_attivi_7_giorni', (select count(*) from auth.users u where u.last_sign_in_at > now() - interval '7 days'),
      'tag_attive', (select count(*) from public.tags t where t.stato = 'attivo'),
      'tag_complete', (select count(*) from public.tags t where t.stato = 'attivo'
                         and coalesce(t.avatar_url, '') <> '' and coalesce(t.bio, '') <> ''
                         and (coalesce(t.email, '') <> '' or coalesce(t.modulo_vcf, '') like '%"telefono1":"_%' or coalesce(t.config_canali, '[]') <> '[]')),
      'tag_con_quickgift', (select count(*) from public.tags t where t.stato = 'attivo'
                         and coalesce(t.quickpass_premio_a, '') <> '' and coalesce(t.quickpass_premio_b, '') <> '')
    )
  );
$$;

-- Solo il server (chiave segreta) può usarle
revoke execute on function public.conta_evento(text) from public, anon, authenticated;
revoke execute on function public.numeri_lancio(integer) from public, anon, authenticated;
