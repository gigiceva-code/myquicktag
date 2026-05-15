export default function handler(req, res) {
    const { u } = req.query;
    const utente = u ? u.toUpperCase() : 'USER';
    const displayUtente = utente.startsWith('@') ? utente : `@${utente}`;

    // Configurazione Icona: Nero assoluto, Testo bianco, Font rimpicciolito per eleganza
    const userIcon = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUtente)}&background=000000&color=ffffff&size=512&font-size=0.35&uppercase=true&bold=true&length=10`;

    const manifest = {
        "name": `MyQuickTag ${displayUtente}`,
        "short_name": displayUtente,
        "description": "Luxury Digital Identity",
        "start_url": `/tag.html?u=${utente.toLowerCase()}`,
        "display": "standalone",
        "orientation": "portrait",
        "background_color": "#000000",
        "theme_color": "#000000",
        "icons": [
            {
                "src": userIcon,
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any maskable"
            }
        ]
    };

    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).json(manifest);
}
