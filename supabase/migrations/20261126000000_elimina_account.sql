-- ============================================================
-- CANCELLAZIONE DI TAG E ACCOUNT DA PARTE DELL'UTENTE (26/11/2026)
-- ============================================================
-- Il titolare può eliminare una sua tag o l'intero account in qualsiasi momento (Identity Console).
-- Tutto in un'unica operazione del database: o si cancella tutto, o niente.
-- Le usa solo il server (api/account.js) con la chiave segreta: browser e visitatori non possono chiamarle.
--
-- Cosa si cancella:
--   tag            → la riga in "tags" (contenuti, contatti del Vasetto, statistiche, bozza) e i regali/link
--                    QuickGift di quella tag. Il nome torna libero.
--   account        → tutte le sue tag (come sopra), il suo Pocket (cancellato a cascata) e l'account di
--                    Supabase Auth (email, password, sessioni).
-- Restano solo le segnalazioni ricevute su una tag (obbligo di conservazione, max 24 mesi, vedi privacy)
-- e i contatori anonimi per giorno (nessun dato personale).

create or replace function public.elimina_tag_account(p_utente uuid, p_tag text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  trovata boolean;
begin
  select exists(select 1 from public.tags where username_system = p_tag and proprietario_id = p_utente) into trovata;
  if not trovata then return false; end if;
  delete from public.quickpass_pass where tag = p_tag;
  delete from public.quickpass_inviti where tag = p_tag;
  delete from public.tags where username_system = p_tag and proprietario_id = p_utente;
  return true;
end;
$$;

create or replace function public.elimina_account(p_utente uuid)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  delete from public.quickpass_pass where tag in (select username_system from public.tags where proprietario_id = p_utente);
  delete from public.quickpass_inviti where tag in (select username_system from public.tags where proprietario_id = p_utente);
  delete from public.tags where proprietario_id = p_utente;
  get diagnostics n = row_count;
  delete from auth.users where id = p_utente; -- Pocket, sessioni e identità si cancellano a cascata
  return n;
end;
$$;

revoke execute on function public.elimina_tag_account(uuid, text) from public, anon, authenticated;
revoke execute on function public.elimina_account(uuid) from public, anon, authenticated;
grant execute on function public.elimina_tag_account(uuid, text) to service_role;
grant execute on function public.elimina_account(uuid) to service_role;
