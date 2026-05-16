export default function handler(req, res) {
  try {
    const { u } = req.query;
    const utente = u ? u.toUpperCase() : 'USER';
    const utenteMinuscolo = utente.toLowerCase().trim();
    const displayUtente = utente.startsWith('@') ? utente : `@${utente}`;

    const icon192 = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUtente)}&background=000000&color=ffffff&size=192&font-size=0.35&uppercase=true&bold=true&length=10`;
    const icon512 = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUtente)}&background=000000&color=ffffff&size=512&font-size=0.35&uppercase=true&bold=true&length=10`;

    const manifest = {
      // L'id dice ad Android che questa app è strutturalmente diversa dalle altre
      "id": `/myquicktag-pwa-${utenteMinuscolo}`,
      "name": `MyQuickTag ${displayUtente}`,
      "short_name": displayUtente,
      "description": "Luxury Digital Identity",
      // Lo start_url unico impedisce la sovrascrittura delle icone sulla Home
      "start_url": `/tag.html?u=${utenteMinuscolo}&pwa_id=${utenteMinuscolo}`,
      "display": "standalone",
      "background_color": "#000000",
      "theme_color": "#000000",
      "orientation": "portrait",
      "icons": [
        { "src": icon192, "sizes": "192x192", "type": "image/png", "purpose": "any" },
        { "src": icon512, "sizes": "512x512", "type": "image/png", "purpose": "any" }
      ]
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).json(manifest);
  } catch (error) {
    return res.status(500).json({ error: "Errore di configurazione" });
  }
}
