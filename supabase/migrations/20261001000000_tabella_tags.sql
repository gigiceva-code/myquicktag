-- ============================================================
-- TABELLA "tags": una riga per ogni @tag (sostituisce la tabella Airtable)
-- ============================================================
-- I nomi delle colonne sono gli stessi dei campi Airtable, così il codice in api/
-- e il frontend non cambiano. Il database lo legge e scrive SOLO il server (api/)
-- con la chiave segreta: RLS attivo e nessuna policy = nessun accesso dal browser.

create table public.tags (
  id                       uuid primary key default gen_random_uuid(),
  username_system          text not null unique,
  stato                    text not null default 'in attesa',
  plan                     text,
  password                 text,
  email                    text,
  data_inizio              date,
  data_scadenza            date,
  views                    integer not null default 0,

  username_display         text,
  bio                      text,
  cv                       text,
  digital_style            text,
  digital_layout           text,
  avatar_url               text,
  modulo_vcf               text,
  config_canali            text,
  sito_web                 text,
  sedi_json                text,
  draft_json               text,
  gallery_data             text,
  pocket_cloud             text,
  partners_data            text,

  quick_action_tipo        text,
  quick_action_label       text,
  quick_action_url         text,
  quick_action_copertina   text,

  live_status_color        text,
  live_status_text         text,
  live_status_micro        text,
  live_status_action_type  text,
  live_status_action_label text,
  live_status_action_url   text,

  flash_text               text,
  flash_micro              text,
  flash_expiry             text,

  pdf_label                text,
  pdf_url                  text,

  quickpass_premio_a       text,
  quickpass_premio_b       text,
  quickpass_limite         integer,
  quickpass_scadenza       text,

  review_url               text,
  review_contact           text,

  video_url                text,
  video_cta_text           text,
  video_cta_url            text,

  lead_capture_attivo      text,
  lead_capture_titolo      text,
  lead_capture_leads       text,

  shop_attivo              text,
  shop_titolo              text,
  shop_prezzo              text,
  shop_link                text,
  shop_scadenza            text,

  analytics_data           text,
  analytics_log            text,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- updated_at aggiornato a ogni modifica (come "last_update" di Airtable)
create function public.tags_set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tags_updated_at before update on public.tags
  for each row execute function public.tags_set_updated_at();

-- Solo il server (chiave segreta, che ignora RLS) può leggere e scrivere
alter table public.tags enable row level security;
revoke all on public.tags from anon, authenticated;
