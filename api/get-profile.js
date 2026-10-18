import { trovaTag, aggiornaTag } from '../lib/db.js';
import { calcolaAbbonamento, dateAttivazione, rinnovoDisponibile } from '../lib/abbonamento.js';
import { nomeTag } from '../lib/nome-canonico.js';
import { dirittiSullaTag } from '../lib/sessione.js';

// ELENCHI ESPLICITI dei campi che escono da qui (test/api.test.mjs controlla che ogni colonna della
// tabella "tags" sia in uno di questi elenchi o tra quelli mai inviati): una colonna nuova non esce
// ai visitatori finché non viene aggiunta qui di proposito.
export const CAMPI_PUBBLICI = [
  'username_system', 'stato', 'plan', 'data_inizio', 'data_scadenza', 'views',
  'username_display', 'bio', 'cv', 'digital_style', 'digital_layout', 'avatar_url', 'email',
  'modulo_vcf', 'config_canali', 'sito_web', 'sedi_json', 'gallery_data', 'partners_data',
  'quick_action_tipo', 'quick_action_label', 'quick_action_url', 'quick_action_copertina',
  'live_status_color', 'live_status_text', 'live_status_micro', 'live_status_action_type', 'live_status_action_label', 'live_status_action_url',
  'flash_text', 'flash_micro', 'flash_expiry',
  'pdf_label', 'pdf_url',
  'quickpass_premio_a', 'quickpass_premio_b', 'quickpass_limite', 'quickpass_scadenza',
  'review_url', 'review_contact',
  'video_url', 'video_cta_text', 'video_cta_url',
  'lead_capture_attivo', 'lead_capture_titolo',
  'shop_attivo', 'shop_titolo', 'shop_prezzo', 'shop_link', 'shop_scadenza'
];
// Solo al proprietario (sessione valida): bozza, contatti lasciati dai visitatori, statistiche, Pocket
export const CAMPI_PROPRIETARIO = ['draft_json', 'lead_capture_leads', 'analytics_data', 'analytics_log', 'pocket_cloud'];
// Mai inviati al browser
export const CAMPI_MAI = ['id', 'password', 'created_at', 'updated_at', 'proprietario_id'];

function scegli(fields, elenco) {
  const out = {};
  for (const c of elenco) if (fields[c] !== undefined) out[c] = fields[c];
  return out;
}

export default async function handler(req, res) {
  const { u, token } = req.query;

  if (!u) return res.status(400).json({ success: false, error: "Username mancante" });

  // --- FIX SICUREZZA: Protezione da iniezioni ---
  // Forma canonica del nome (lib/nome-canonico.js): solo lettere e numeri.
  const safeUsername = nomeTag(u);

  try {
    // Cerchiamo nella colonna "username_system" usando SOLO il nome pulito
    const record = await trovaTag(safeUsername);

    if (record) {
      // --- FIX SICUREZZA: solo i campi elencati sopra. I campi privati del proprietario (bozza,
      // contatti lasciati dai visitatori, statistiche, Pocket) tornano SOLO con sessione valida.
      // Proprietario = sessione dell'account indicato in proprietario_id (lib/sessione.js).
      // Chi ha solo la ricevuta di prenotazione vede la propria bozza (tag in attesa, senza proprietario).
      const diritti = await dirittiSullaTag({ req, token, record, tag: safeUsername });
      const tokenValido = diritti.proprietario || diritti.ricevuta;
      const fieldsPubblici = scegli(record.fields, tokenValido ? [...CAMPI_PUBBLICI, ...CAMPI_PROPRIETARIO] : CAMPI_PUBBLICI);
      // has_password (nome storico, usato dalle pagine): la tag ha un titolare con un accesso
      // (account proprietario o, per le tag di prova vecchie, la vecchia password)
      const password = record.fields.password;
      fieldsPubblici.has_password = !!(record.fields.proprietario_id || (password && String(password).trim() !== ""));
      fieldsPubblici.ha_proprietario = !!record.fields.proprietario_id;
      if (diritti.proprietario) fieldsPubblici.sei_proprietario = true;
      const risposta = {
        success: true,
        id: record.id,
        fields: fieldsPubblici
      };

      // DURATA TAG (90 giorni + 14 di grazia): fase calcolata dal server
      if (String(fieldsPubblici.stato || '').toLowerCase().trim() === 'attivo') {
        // Tag attivate prima dell'introduzione delle date: 90 giorni pieni da oggi (scritti una volta sola)
        if (!record.fields.data_scadenza) {
          const date = dateAttivazione();
          const daScrivere = { data_scadenza: date.data_scadenza };
          if (!record.fields.data_inizio) daScrivere.data_inizio = date.data_inizio;
          try {
            await aggiornaTag(record.id, daScrivere);
            record.fields.data_scadenza = date.data_scadenza;
          } catch (e) {
            console.error("Scrittura date abbonamento fallita:", e);
          }
        }
        risposta.abbonamento = calcolaAbbonamento(record);
        risposta.abbonamento.rinnovo_disponibile = rinnovoDisponibile(risposta.abbonamento);
        // Tag scaduta: ai visitatori non si mostrano più i contenuti, solo il nome
        if (risposta.abbonamento.fase === 'scaduta' && !tokenValido) {
          risposta.fields = {
            username_system: fieldsPubblici.username_system,
            username_display: fieldsPubblici.username_display,
            stato: fieldsPubblici.stato,
            has_password: fieldsPubblici.has_password
          };
        }
      }

      // Le risposte con dati privati non vanno mai in cache
      if (tokenValido) res.setHeader('Cache-Control', 'no-store');

      // PRENOTAZIONE 24H: unica fonte di verità = createdTime del database (stesso criterio di check-and-create.js)
      const stato = (fieldsPubblici.stato || "").toLowerCase().trim();
      if (stato === "in attesa" && record.createdTime) {
        const createdMs = new Date(record.createdTime).getTime();
        risposta.reservation_expires_at = new Date(createdMs + 24 * 60 * 60 * 1000).toISOString();
        risposta.server_now = new Date().toISOString();
      }

      return res.status(200).json(risposta);
    } else {
      return res.status(404).json({ success: false, error: "Profilo non trovato" });
    }
  } catch (error) {
    console.error('CRASH GET-PROFILE:', error.dettagli || error.message);
    return res.status(500).json({ success: false, error: 'Errore server' });
  }
}
