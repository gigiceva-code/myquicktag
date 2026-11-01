-- ============================================================
-- QUICK PASS ONLINE (02/11/2026): il pass si usa anche senza una cassa fisica
-- ============================================================
-- quickpass_modo: dove si usa il pass. 'negozio' (QR in cassa, come prima), 'online' (l'amico scrive al titolare
-- su WhatsApp o per email con il codice e un link che apre la cassa), 'entrambi'. Vuoto = 'negozio'.
-- quickpass_contatto: dove scrivere per usare il pass online (numero WhatsApp o email). È pubblico come gli altri
-- recapiti della tag: lo vede chi ha un pass.

alter table public.tags
  add column quickpass_modo text check (quickpass_modo is null or quickpass_modo in ('negozio', 'online', 'entrambi')),
  add column quickpass_contatto text check (quickpass_contatto is null or char_length(quickpass_contatto) <= 120);

comment on column public.tags.quickpass_modo is
  'Quick Pass: dove si usa il pass (negozio / online / entrambi). Vuoto = negozio.';
comment on column public.tags.quickpass_contatto is
  'Quick Pass online: numero WhatsApp o email a cui l''amico scrive per usare il pass.';
