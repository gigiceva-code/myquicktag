-- ============================================================
-- GESTIONE CONTATTI DEL PROPRIETARIO (pagina "I miei contatti")
-- ============================================================
-- Ogni contatto ha: id, nome, contatto, data, ts, visto, richiamato.
-- Il proprietario può segnare i contatti come visti / richiamati o eliminarli.
-- "for update" blocca la riga: un contatto che arriva nello stesso istante
-- (aggiungi_lead) aspetta e non va perso. La chiama solo il server (api/leads.js).

create function public.gestisci_lead(p_username text, p_azione text, p_id text default null, p_valore boolean default true)
returns text
language plpgsql set search_path = '' as $$
declare
  v_leads jsonb;
  v_nuovo jsonb;
begin
  select case when jsonb_typeof(nullif(lead_capture_leads, '')::jsonb) = 'array'
              then nullif(lead_capture_leads, '')::jsonb else '[]'::jsonb end
    into v_leads
    from public.tags where username_system = p_username
    for update;
  if not found then return null; end if;

  if p_azione = 'visti' then
    select coalesce(jsonb_agg(e || '{"visto": true}'::jsonb order by i), '[]'::jsonb)
      into v_nuovo from jsonb_array_elements(v_leads) with ordinality as t(e, i);
  elsif p_azione = 'richiamato' then
    select coalesce(jsonb_agg(case when e->>'id' = p_id
                                   then e || jsonb_build_object('richiamato', p_valore, 'visto', true)
                                   else e end order by i), '[]'::jsonb)
      into v_nuovo from jsonb_array_elements(v_leads) with ordinality as t(e, i);
  elsif p_azione = 'elimina' then
    select coalesce(jsonb_agg(e order by i) filter (where e->>'id' is distinct from p_id), '[]'::jsonb)
      into v_nuovo from jsonb_array_elements(v_leads) with ordinality as t(e, i);
  else
    raise exception 'Azione non valida: %', p_azione;
  end if;

  update public.tags set lead_capture_leads = v_nuovo::text where username_system = p_username;
  return v_nuovo::text;
end;
$$;

revoke execute on function public.gestisci_lead(text, text, text, boolean) from public, anon, authenticated;

-- Contatti raccolti prima di questa modifica: ricevono un id e risultano già visti
update public.tags t
   set lead_capture_leads = (
         select coalesce(jsonb_agg(
                  case when e ? 'id' then e
                       else e || jsonb_build_object('id', gen_random_uuid()::text, 'visto', true, 'richiamato', false) end
                  order by i), '[]'::jsonb)::text
           from jsonb_array_elements(t.lead_capture_leads::jsonb) with ordinality as x(e, i))
 where jsonb_typeof(nullif(t.lead_capture_leads, '')::jsonb) = 'array';
