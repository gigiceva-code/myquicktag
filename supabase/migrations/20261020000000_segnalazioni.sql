-- ============================================================
-- SEGNALAZIONI DELLE TAG ("Segnala questa tag" sulla tag pubblica)
-- ============================================================
-- Un visitatore segnala una tag che imita una persona o un'attività, usa un marchio non suo,
-- contiene materiale offensivo o è una truffa. Il server (api/segnala.js) salva la segnalazione
-- qui e la manda per email al titolare di myquicktag. Nessun indirizzo IP viene salvato.
-- Come le altre tabelle: RLS attivo e nessuna policy, ci accede solo il server con la chiave segreta.
-- Si consultano dal Table Editor di Supabase; "stato" serve al titolare per tenere il conto.

create table public.segnalazioni (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tag text not null check (tag ~ '^[a-z0-9]{1,30}$'),
  motivo text not null check (motivo in ('impersonazione', 'marchio', 'offensivo', 'truffa', 'altro')),
  descrizione text check (descrizione is null or char_length(descrizione) <= 1000),
  email text check (email is null or char_length(email) <= 200),
  stato text not null default 'nuova' check (stato in ('nuova', 'in esame', 'chiusa'))
);

create index segnalazioni_creata_idx on public.segnalazioni (created_at desc);

alter table public.segnalazioni enable row level security;

comment on table public.segnalazioni is
  'Segnalazioni dei visitatori sulle tag pubbliche. Scritte solo dal server (api/segnala.js).';
comment on column public.segnalazioni.email is
  'Email facoltativa del segnalante, solo per ricontattarlo.';
comment on column public.segnalazioni.stato is
  'nuova / in esame / chiusa: la aggiorna il titolare dal Table Editor.';
