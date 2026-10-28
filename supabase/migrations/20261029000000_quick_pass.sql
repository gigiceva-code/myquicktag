-- ============================================================
-- QUICK PASS: il programma "porta un amico" (Fase 1, 29/10/2026)
-- ============================================================
-- 1. Chi consiglia (A) crea dalla tag un INVITO personale: un codice che finisce nel suo link.
-- 2. L'amico (B) apre il link e ritira un PASS personale (tipo 'amico') con codice e QR.
-- 3. In cassa il proprietario (o un dipendente con il PIN di cassa) convalida il pass: diventa 'usato'.
-- 4. Ogni N pass 'amico' usati dello stesso invito, A riceve un PASS 'premio' da usare a sua volta in cassa.
-- Scrive e legge solo il server (api/quickpass.js): RLS attivo e nessuna policy, come le altre tabelle.
-- I dispositivi sono salvati solo come impronta HMAC (mai l'identificativo in chiaro): servono a
-- dare un solo pass per telefono e a impedire di regalare il pass a se stessi.

-- Impostazioni sulla tag: ogni quanti amici A riceve il premio, e il PIN di cassa (solo impronta scrypt)
alter table public.tags
  add column quickpass_amici_per_premio integer check (quickpass_amici_per_premio is null or quickpass_amici_per_premio between 1 and 20),
  add column quickpass_pin_hash text;

comment on column public.tags.quickpass_amici_per_premio is
  'Quick Pass: ogni quanti amici portati (pass usati in cassa) chi consiglia riceve il suo premio. Vuoto = 1.';
comment on column public.tags.quickpass_pin_hash is
  'Quick Pass: impronta scrypt del PIN di cassa per i dipendenti. Mai inviata al browser.';

create table public.quickpass_inviti (
  codice text primary key check (codice ~ '^[A-Z0-9]{8}$'),
  created_at timestamptz not null default now(),
  tag text not null check (tag ~ '^[a-z0-9]{1,30}$'),
  nome text not null check (char_length(nome) between 1 and 40),
  dispositivo text check (dispositivo is null or char_length(dispositivo) = 40)
);

create index quickpass_inviti_tag_idx on public.quickpass_inviti (tag, created_at desc);

create table public.quickpass_pass (
  codice text primary key check (codice ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now(),
  tag text not null check (tag ~ '^[a-z0-9]{1,30}$'),
  tipo text not null check (tipo in ('amico', 'premio')),
  -- amico: invito di chi l'ha consigliato (null per i vecchi link generici); premio: invito di chi l'ha guadagnato
  invito text references public.quickpass_inviti (codice) on delete set null,
  nome text not null check (char_length(nome) between 1 and 40),
  contatto text check (contatto is null or char_length(contatto) <= 120),
  premio text not null check (char_length(premio) between 1 and 200),
  scadenza timestamptz not null,
  stato text not null default 'attivo' check (stato in ('attivo', 'usato')),
  usato_il timestamptz,
  dispositivo text check (dispositivo is null or char_length(dispositivo) = 40),
  -- premio: è il k-esimo premio di quell'invito (unico, così una doppia convalida non ne crea due)
  ordine integer check (ordine is null or ordine >= 1),
  unique (invito, ordine)
);

create index quickpass_pass_tag_idx on public.quickpass_pass (tag, created_at desc);
create index quickpass_pass_invito_idx on public.quickpass_pass (invito);
create index quickpass_pass_dispositivo_idx on public.quickpass_pass (tag, dispositivo);

alter table public.quickpass_inviti enable row level security;
alter table public.quickpass_pass enable row level security;

comment on table public.quickpass_inviti is
  'Quick Pass: inviti personali di chi consiglia la tag. Scritti solo dal server (api/quickpass.js).';
comment on table public.quickpass_pass is
  'Quick Pass: pass degli amici (tipo amico) e premi di chi consiglia (tipo premio), convalidati in cassa.';
