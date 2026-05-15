export default function handler(req, res) {
    const { u } = req.query;
    const username = (u || 'user').toLowerCase();

    const manifest = {
        "short_name": `@${username.toUpperCase()}`,
        "name": `MyQuickTag - @${username}`,
        "icons": [
            {
                "src": `/api/generate-icon?u=${username}`,
                "sizes": "512x512",
                "type": "image/svg+xml",
                "purpose": "any maskable"
            }
        ],
        "start_url": `/?u=${username}`,
        "background_color": "#000000",
        "display": "standalone",
        "scope": "/",
        "theme_color": "#000000"
    };

    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(manifest));
}
