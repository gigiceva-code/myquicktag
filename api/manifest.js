export default function handler(req, res) {
  try {
    // 1. Recupero robusto del parametro 'u' (controlla sia la query classica che l'URL grezzo)
    let u = req.query.u;
    if (!u && req.url.includes('?')) {
      const urlParams = new URLSearchParams(req.url.split('?')[1]);
      u = urlParams.get('u');
    }

    // Pulisci e formatta il nome utente in modo sicuro
    const utente = u ? u.toUpperCase() : 'USER';
    const utenteMinuscolo = utente.replace('@', '').trim().toLowerCase();
    
    // --- FIX SICUREZZA & PULIZIA ---
    const safeUser = utenteMinuscolo.replace(/[^a-zA-Z0-9_-]/g, '');
    const finalUser = safeUser || 'user';
    const displayUtente = `@${finalUser.toUpperCase()}`;

    // Collega le icone dinamiche generate dall'altro file
    const icon192 = `/api/generate-icons?u=${finalUser}`;
    const icon512 = `/api/generate-icons?u=${finalUser}`;

    // Costruiamo il manifest dinamico con i link corretti (usando i backticks ``)
    const manifest = {
      "id": `/u/${finalUser}`,
      "name": `myquicktag ${displayUtente}`,
      "short_name": displayUtente,
      "description": "Luxury Digital Identity",
      "start_url": `/u/${finalUser}`,
      "scope": `/u/${finalUser}/`,
      "display": "fullscreen",     
      "background_color": "#050505", // Schermata di avvio nera in stile luxury
      "theme_color": "#050505",      // Colora la barra di stato del telefono di nero
      "orientation": "portrait",
      "icons": [
        { "src": icon192, "sizes": "192x192", "type": "image/svg+xml", "purpose": "any maskable" },
        { "src": icon512, "sizes": "512x512", "type": "image/svg+xml", "purpose": "any maskable" }
      ]
    };
    
    // Forziamo il browser a non tenere MAI in cache questo file per evitare mix di utenti
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
