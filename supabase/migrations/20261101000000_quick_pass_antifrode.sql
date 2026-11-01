-- ============================================================
-- QUICK PASS: controlli contro chi ritira il pass con il proprio invito (01/11/2026)
-- ============================================================
-- Nella prova del titolare l'invito era stato creato da Chrome e il pass "amico" ritirato dallo stesso
-- telefono ma dal browser interno di WhatsApp, che ha una memoria separata: l'identificativo del browser
-- era diverso e il controllo non scattava. Ora si salvano anche (solo come impronte HMAC, mai in chiaro):
--   telefono: caratteristiche del telefono uguali in ogni browser (schermo, processore, fuso, lingue…)
--   rete:     la connessione (indirizzo IP) da cui è stato creato l'invito o ritirato il pass
-- Stesso telefono e stessa rete di chi ha creato l'invito → ritiro bloccato.
-- Stesso telefono da un'altra rete, o stesso nome → pass "sospetto": la cassa vede un avviso.

alter table public.quickpass_inviti
  add column telefono text check (telefono is null or char_length(telefono) = 40),
  add column rete text check (rete is null or char_length(rete) = 40);

alter table public.quickpass_pass
  add column telefono text check (telefono is null or char_length(telefono) = 40),
  add column rete text check (rete is null or char_length(rete) = 40),
  add column sospetto boolean not null default false;

comment on column public.quickpass_pass.sospetto is
  'Quick Pass: il pass sembra ritirato da chi ha creato l''invito (stesso telefono o stesso nome): la cassa vede un avviso.';
