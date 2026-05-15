export default function handler(req, res) {
  // Recuperiamo il nome utente dalla richiesta (es: /api/manifest?u=boss)
  const { u } = req.query;
  const username = u ? u.replace('@', '').toLowerCase() : 'user';
  const displayName = u ? `@${u.replace('@', '').toUpperCase()}` : 'MyQuickTag';

  // Costruiamo il Manifest "Luxury" dinamico
  const manifest = {
    "name": displayName,
    "short_name": displayName,
    "description": "La tua Identità Digitale",
    "start_url": `/tag.html?u=${username}`, // Qui diciamo all'icona di NON andare in Index
    "display": "standalone", // Qui diciamo a Chrome di sparire
    "background_color": "#000000",
    "theme_color": "#000000",
    "icons": [
      {
        "src": `https://ui-avatars.com/api/?name=${username}&background=000&color=fff&size=512&bold=true`,
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any maskable"
      }
    ]
  };

  // Restituiamo il file JSON con l'intestazione corretta per il browser
  res.setHeader('Content-Type', 'application/manifest+json');
  res.status(200).json(manifest);
}
