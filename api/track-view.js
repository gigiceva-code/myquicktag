import { trovaTag, aggiornaTag } from '../lib/db.js';
import { nomeTag } from '../lib/nome-canonico.js';
export default async function handler(req, res) {
  // Accetta solo richieste POST
  if (req.method !== 'POST') return res.status(405).send('Metodo non consentito');

  const { u } = req.query;
  if (!u) return res.status(400).json({ error: "Utente mancante" });

  // --- FIX SICUREZZA: Protezione da iniezioni ---
  // Forma canonica del nome (lib/nome-canonico.js): solo lettere e numeri.
  const safeUsername = nomeTag(u);

  try {
    // ====================================================
    // 1. CATTURA DATI INVISIBILI (Dispositivo e Località)
    // ====================================================
    const userAgent = req.headers['user-agent'] || '';
    // Vercel ci regala la città e lo stato in questi header speciali
    const city = req.headers['x-vercel-ip-city'] || 'Sconosciuta';
    const country = req.headers['x-vercel-ip-country'] || 'XX';

   // Riconoscimento Dispositivo Avanzato
    let os = 'Other';
    if (/windows|macintosh|linux/i.test(userAgent) && !/ipad|iphone|ipod/i.test(userAgent) && !/android/i.test(userAgent)) {
        os = 'Desktop'; // Computer fissi o portatili
    } else if (/ipad|iphone|ipod/.test(userAgent)) {
        os = 'iOS'; // Ecosistema mobile Apple
    } else if (/android/i.test(userAgent)) {
        os = 'Android'; // Ecosistema mobile Google
    }

    // Formattazione stringa località (Es. "Milano, IT")
    const locationKey = city !== 'Sconosciuta' ? `${city}, ${country}` : 'Sconosciuta';

    // ====================================================
    // 2. RECUPERA I DATI ATTUALI DAL DATABASE
    // ====================================================
    // Leggiamo solo 'views' e 'analytics_data'
    const record = await trovaTag(safeUsername, ['views', 'analytics_data']);

    if (!record) {
        return res.status(404).json({ error: "Utente non trovato" });
    }

    const recordId = record.id;
    const currentViews = record.fields.views || 0;
    
    // Inizializza o recupera il pallottoliere JSON
    let analyticsData = { os: { iOS: 0, Android: 0, Other: 0 }, geo: {} };
    if (record.fields.analytics_data) {
        try {
            analyticsData = JSON.parse(record.fields.analytics_data);
        } catch (e) {
            console.error("Dati analytics vecchi o corrotti, li resetto.");
        }
    }

    // ====================================================
    // 3. AGGIORNA IL PALLOTTOLIERE
    // ====================================================
    // Assicuriamoci che l'oggetto abbia la struttura corretta
    if (!analyticsData.os) analyticsData.os = { iOS: 0, Android: 0, Other: 0 };
    if (!analyticsData.geo) analyticsData.geo = {};

    // Aggiungi 1 al sistema operativo corretto
    if (analyticsData.os[os] !== undefined) {
        analyticsData.os[os]++;
    } else {
        analyticsData.os[os] = 1;
    }

     // Aggiungi 1 alla città corretta, con limite di dimensione (top 15 città)
    const MAX_CITIES = 15;
    const existingKeys = Object.keys(analyticsData.geo).filter(k => k !== 'Altre');

    if (analyticsData.geo[locationKey] !== undefined) {
        // Città già tracciata: incrementa normalmente
        analyticsData.geo[locationKey]++;
    } else if (existingKeys.length < MAX_CITIES) {
        // Non c'è ancora, ma c'è spazio: la aggiungiamo come nuova voce
        analyticsData.geo[locationKey] = 1;
    } else {
        // Non c'è spazio: confluisce nel bucket generico
        analyticsData.geo['Altre'] = (analyticsData.geo['Altre'] || 0) + 1;
    }
    // ====================================================
    // 4. SALVA IL PACCHETTO COMPRESSO NEL DATABASE
    // ====================================================
    await aggiornaTag(recordId, {
        views: currentViews + 1,
        analytics_data: JSON.stringify(analyticsData) // Impacchettiamo tutto in una sola cella
    });
    return res.status(200).json({ success: true });

  } catch (e) {
    console.error("CRASH TRACK-VIEW:", e);
    return res.status(500).json({ error: e.message });
  }
}
