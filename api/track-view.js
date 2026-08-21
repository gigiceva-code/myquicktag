export default async function handler(req, res) {
  // Accetta solo richieste POST
  if (req.method !== 'POST') return res.status(405).send('Metodo non consentito');

  const { u } = req.query;
  if (!u) return res.status(400).json({ error: "Utente mancante" });

  try {
    // ====================================================
    // 1. CATTURA DATI INVISIBILI (Dispositivo e Località)
    // ====================================================
    const userAgent = req.headers['user-agent'] || '';
    // Vercel ci regala la città e lo stato in questi header speciali
    const city = req.headers['x-vercel-ip-city'] || 'Sconosciuta';
    const country = req.headers['x-vercel-ip-country'] || 'XX';

    // Riconoscimento Dispositivo
    let os = 'Other';
    if (/iPad|iPhone|iPod|Mac/.test(userAgent)) {
        os = 'iOS'; // Raggruppiamo l'ecosistema Apple
    } else if (/android/i.test(userAgent)) {
        os = 'Android';
    }

    // Formattazione stringa località (Es. "Milano, IT")
    const locationKey = city !== 'Sconosciuta' ? `${city}, ${country}` : 'Sconosciuta';

    // ====================================================
    // 2. RECUPERA I DATI ATTUALI DA AIRTABLE
    // ====================================================
    const formula = `{username_system}='${u}'`;
    // Ora chiediamo ad Airtable sia le 'views' che gli 'analytics_data'
    const searchUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}?filterByFormula=${encodeURIComponent(formula)}&fields%5B%5D=views&fields%5B%5D=analytics_data`;
    
    const response = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` }
    });
    const data = await response.json();

    if (!data.records || data.records.length === 0) {
        return res.status(404).json({ error: "Utente non trovato" });
    }

    const record = data.records[0];
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

    // Aggiungi 1 alla città corretta
    if (analyticsData.geo[locationKey]) {
        analyticsData.geo[locationKey]++;
    } else {
        analyticsData.geo[locationKey] = 1;
    }

    // ====================================================
    // 4. SALVA IL PACCHETTO COMPRESSO SU AIRTABLE
    // ====================================================
    const update = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}/${recordId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: { 
            views: currentViews + 1,
            analytics_data: JSON.stringify(analyticsData) // Impacchettiamo tutto in una sola cella
        }
      })
    });

    if (update.ok) {
        return res.status(200).json({ success: true });
    } else {
        const err = await update.json();
        return res.status(500).json({ error: "Errore aggiornamento Airtable", details: err });
    }

  } catch (e) {
    console.error("CRASH TRACK-VIEW:", e);
    return res.status(500).json({ error: e.message });
  }
}
