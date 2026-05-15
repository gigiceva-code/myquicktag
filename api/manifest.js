export default function handler(req, res) {
    try {
        const { u } = req.query;
        const utente = u ? u.toUpperCase() : 'USER';
        const displayUtente = utente.startsWith('@') ? utente : `@${utente}`;

        const icon192 = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUtente)}&background=000000&color=ffffff&size=192&font-size=0.35&uppercase=true&bold=true&length=10`;
        const icon512 = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUtente)}&background=000000&color=ffffff&size=512&font-size=0.35&uppercase=true&bold=true&length=10`;

        const manifest = {
            "name": `MyQuickTag ${displayUtente}`,
            "short_name": displayUtente,
            "description": "Luxury Digital Identity",
            "start_url": `/tag.html?u=${utente.toLowerCase()}`,
            "display": "standalone",
            "background_color": "#000000",
            "theme_color": "#000000",
            "orientation": "portrait",
            "icons": [
                { "src": icon192, "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
                { "src": icon512, "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
            ]
        };

        res.setHeader('Content-Type', 'application/manifest+json');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.status(200).json(manifest);
    } catch (error) {
        // Se c'è un errore, risponde in modo pulito senza far crashare Vercel
        return res.status(500).json({ error: "Configurazione temporaneamente non disponibile" });
    }
}
