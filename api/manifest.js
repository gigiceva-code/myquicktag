export default function handler(req, res) {
  try {
    // 1. Recupero robusto del parametro 'u' (controlla sia la query classica che l'URL grezzo)
    let u = req.query.u;
    if (!u && req.url.includes('?')) {
      const urlParams = new URLSearchParams(req.url.split('?')[1]);
      u = urlParams.get('u');
    }

    // Se non trova nulla, usa 'user' come paracadute, ma ora l'estrazione è a prova di bomba
    const utente = u ? u.toUpperCase() : 'USER';
    const utenteMinuscolo = utente.replace('@', '').trim().toLowerCase();
    const displayUtente = `@${utenteMinuscolo.toUpperCase()}`;

    // LA CHIAVE DI VOLTA: Chiamiamo il nostro generatore interno che disegna il logo Q-@ d'autore
    // Passiamo comunque il parametro ?u= per retrocompatibilità, anche se l'icona ora mostra il brand di lusso
    const icon192 = `/api/generate-icons?u=${utenteMinuscolo}`;
    const icon512 = `/api/generate-icons?u=${utenteMinuscolo}`;

  // Costruiamo il manifest dinamico con Pretty URL isolati per utente
    const manifest = {
      "id": `/u/${utenteMinuscolo}`,
      "name": `myquicktag ${displayUtente}`,
      "short_name": displayUtente,
      "description": "Luxury Digital Identity",
      "start_url": `/u/${utenteMinuscolo}`,
      "scope": "/",
      "display": "standalone",       // <-- RISOLVE LA BARRA BIANCA
      "background_color": "#050505", // <-- SPLASH SCREEN BLACK LUXURY
      "theme_color": "#050505",      // <-- COLORA LA BARRA DI STATO DI NERO
      "orientation": "portrait",
      "icons": [
        { "src": icon192, "sizes": "192x192", "type": "image/svg+xml", "purpose": "any maskable" },
        { "src": icon512, "sizes": "512x512", "type": "image/svg+xml", "purpose": "any maskable" }
      ]
    };
    
    // Forziamo il browser a non tenere MAI in cache questo file per non mischiare gli utenti
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.status(200).json(manifest);
  } catch (error) {
    console.error("Errore Manifest:", error);
    return res.status(500).json({ error: "Errore di configurazione" });
  }
}
