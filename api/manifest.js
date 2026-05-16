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

    // Generazione icone Luxury Dinamiche
    const icon192 = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUtente)}&background=000000&color=ffffff&size=192&font-size=0.35&uppercase=true&bold=true&length=10`;
    const icon512 = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUtente)}&background=000000&color=ffffff&size=512&font-size=0.35&uppercase=true&bold=true&length=10`;

   // Costruiamo il manifest dinamico blindando ID univoco per ogni utente
  const manifest = {
      "id": `tag_pwa_${utenteMinuscolo}`,
      "name": `MyQuickTag ${displayUtente}`,
      "short_name": displayUtente,
      "description": "Luxury Digital Identity",
      "start_url": `/tag.html?u=${utenteMinuscolo}&pwa_mode=true`,
      
      // MODIFICATO: Isoliamo lo scope sulla pagina specifica dell'utente
      "scope": `/tag.html`, 
      
      "display": "standalone",
      "background_color": "#000000",
      "theme_color": "#000000",
      "orientation": "portrait",
      "icons": [
        { "src": icon192, "sizes": "192x192", "type": "image/png", "purpose": "any" },
        { "src": icon512, "sizes": "512x512", "type": "image/png", "purpose": "any" }
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
