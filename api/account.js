// ============================================================
// ACCOUNT: le tag dell'utente (dashboard)
// ============================================================
// Registrazione, verifica dell'email, accesso, recupero e cambio password li fa Supabase Auth
// direttamente dal browser (session.js, accesso.html, dashboard.html): la password dell'account
// non passa mai da qui. Questa funzione riceve solo la sessione (Authorization: Bearer <jwt>)
// e la verifica con Supabase (lib/sessione.js) prima di ogni operazione.
//
// azione 'mie-tag' → elenco delle tag di cui l'account è proprietario
import { tagDelProprietario } from '../lib/db.js';
import { tokenAccount, utenteDaToken } from '../lib/sessione.js';
import { calcolaAbbonamento } from '../lib/abbonamento.js';

function contaNuovi(testo) {
  try {
    const lista = JSON.parse(testo || '[]');
    return Array.isArray(lista) ? lista.filter(l => l && !l.visto).length : 0;
  } catch { return 0; }
}

// Chiavi "publishable" (pubbliche per natura) dei progetti Supabase noti: il browser usa sempre lo
// stesso progetto del server (produzione o prova), senza impostazioni diverse per ambiente.
const CHIAVI_PUBBLICHE = {
  'atlhrkkfovblkhgzfeuo': 'sb_publishable_HrX_oradnt5sRX6YHqGB-w_gYZe0u4U', // myquicktag (produzione)
  'lmxxoxrsrwmtunyqlpbh': 'sb_publishable_mCn8LbCxhDoNZMJS-E043Q_hKEte5F0'  // myquicktag-prova
};

export function configurazionePubblica() {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  let ref = '';
  try { ref = new URL(url).hostname.split('.')[0]; } catch { ref = ''; }
  const chiave = process.env.SUPABASE_PUBLISHABLE_KEY || CHIAVI_PUBBLICHE[ref] || null;
  return { url, chiave };
}

export default async function handler(req, res) {
  // azione=config (GET, pubblica): indirizzo e chiave pubblica di Supabase per la libreria di accesso
  if (req.method === 'GET' && String(req.query?.azione || '') === 'config') {
    res.setHeader('Cache-Control', 'public, max-age=300');
    const config = configurazionePubblica();
    if (!config.url || !config.chiave) return res.status(500).json({ success: false, error: 'Configurazione mancante' });
    return res.status(200).json({ success: true, ...config });
  }
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Metodo non consentito' });
  res.setHeader('Cache-Control', 'no-store');

  const body = req.body || {};
  const azione = String(body.azione || '');

  try {
    const jwt = tokenAccount(req);
    const utente = jwt ? await utenteDaToken(jwt) : null;
    if (!utente) return res.status(401).json({ success: false, error: 'Sessione scaduta: accedi di nuovo' });

    if (azione === 'mie-tag') {
      const records = await tagDelProprietario(utente.id);
      const tags = records.map(r => {
        const f = r.fields;
        const stato = String(f.stato || '').toLowerCase().trim();
        const voce = {
          username_system: f.username_system,
          username_display: f.username_display || null,
          stato,
          plan: f.plan || null,
          views: f.views || 0,
          ha_bozza: !!(f.draft_json && String(f.draft_json).trim() !== ''),
          contatti_nuovi: contaNuovi(f.lead_capture_leads)
        };
        if (stato === 'attivo') voce.abbonamento = calcolaAbbonamento(r);
        if (stato === 'in attesa') voce.prenotata_il = r.createdTime;
        return voce;
      });
      return res.status(200).json({ success: true, tags });
    }

    return res.status(400).json({ success: false, error: 'Azione non valida' });
  } catch (e) {
    console.error('CRASH ACCOUNT:', e.dettagli || e.message);
    return res.status(500).json({ success: false, error: 'Errore server. Riprova tra poco.' });
  }
}
