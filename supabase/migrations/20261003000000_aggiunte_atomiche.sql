-- ============================================================
-- AGGIUNTE "ATOMICHE" DAI VISITATORI: contatti (lead) e click
-- ============================================================
-- Prima il browser del visitatore riceveva l'intero elenco, ci aggiungeva una voce e lo
-- riscriveva tutto: chiunque poteva leggere o cancellare i contatti raccolti, e due invii
-- contemporanei si sovrascrivevano. Ora il server aggiunge UNA voce in cima, nel database,
-- in un'unica operazione. Le chiama solo il server (api/) con la chiave segreta.

create function public.aggiungi_lead(p_username text, p_lead jsonb, p_max integer default 500)
returns boolean
language sql set search_path = '' as $$
  update public.tags
     set lead_capture_leads = (
           select coalesce(jsonb_agg(v order by i), '[]'::jsonb)::text
             from jsonb_array_elements(
                    jsonb_build_array(p_lead) ||
                    case when jsonb_typeof(nullif(lead_capture_leads, '')::jsonb) = 'array'
                         then nullif(lead_capture_leads, '')::jsonb else '[]'::jsonb end
                  ) with ordinality as e(v, i)
            where i <= p_max)
   where username_system = p_username
  returning true;
$$;

create function public.registra_click(p_username text, p_click jsonb, p_max integer default 1000)
returns boolean
language sql set search_path = '' as $$
  update public.tags
     set analytics_log = (
           select coalesce(jsonb_agg(v order by i), '[]'::jsonb)::text
             from jsonb_array_elements(
                    jsonb_build_array(p_click) ||
                    case when jsonb_typeof(nullif(analytics_log, '')::jsonb) = 'array'
                         then nullif(analytics_log, '')::jsonb else '[]'::jsonb end
                  ) with ordinality as e(v, i)
            where i <= p_max)
   where username_system = p_username
  returning true;
$$;

-- Le funzioni nello schema public sono esposte dall'API: solo il server può chiamarle
revoke execute on function public.aggiungi_lead(text, jsonb, integer) from public, anon, authenticated;
revoke execute on function public.registra_click(text, jsonb, integer) from public, anon, authenticated;
