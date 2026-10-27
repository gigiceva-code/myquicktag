import { trovaTag } from '../lib/db.js';
import { nomeTag } from '../lib/nome-canonico.js';
import { calcolaAbbonamento } from '../lib/abbonamento.js';

// ============================================================
// ANTEPRIMA DEI LINK (WhatsApp, Facebook, Telegram, iMessage…)
// ============================================================
// Chi genera l'anteprima di /u/<nome> non esegue il JavaScript della tag, quindi vedrebbe solo
// "myquicktag". vercel.json manda QUI solo questi programmi (riconosciuti dallo user-agent), con
// ?anteprima=1: ricevono una pagina minima con nome, bio e foto della tag. Le persone ricevono
// sempre tag.html come prima. Sta in questo file per non superare le 12 funzioni del piano gratuito.
const SITO = 'https://myquicktag.it';
// Link condivisi di una sezione (/u/<nome>?sezione=network.contatti): l'anteprima dice quale
const NOMI_SEZIONI = {
  identity: 'Identity', business: 'Business', media: 'Vetrina', network: 'Network', action_center: 'Action Center',
  contatti: 'Contatti', social: 'Social & link', sito: 'Sito web', bio: 'Biografia', cv: 'Curriculum',
  qr: 'Access Tag', gallery: 'Galleria', pdf: 'Documenti', flash: 'Offerta flash', quickpass: 'Quick Pass'
};
const IMMAGINE_PREDEFINITA = `${SITO}/icons/og-image.png`;

function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Testo semplice su una riga, al massimo n caratteri
function riga(t, n) {
  const pulito = String(t ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return pulito.length > n ? pulito.slice(0, n - 1).trimEnd() + '…' : pulito;
}

// Foto della tag (caricata su Cloudinary dall'editor) ritagliata quadrata e leggera per WhatsApp
function fotoAnteprima(url) {
  const u = String(url || '');
  if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(u)) return null;
  return u.replace('/image/upload/', '/image/upload/c_fill,g_face,w_600,h_600,f_jpg,q_auto/');
}

async function anteprima(req, res, nome) {
  const parti = String(req.query.sezione || '').toLowerCase().split('.');
  const nomeSezione = NOMI_SEZIONI[parti[1]] || NOMI_SEZIONI[parti[0]] || '';
  let titolo = 'myquicktag';
  let descrizione = 'Il tuo @nome. Il tuo spazio digitale.';
  let immagine = IMMAGINE_PREDEFINITA;
  let foto = false;
  try {
    const record = nome ? await trovaTag(nome, ['stato', 'username_display', 'bio', 'avatar_url', 'data_scadenza']) : null;
    const f = record ? record.fields : {};
    if (record && String(f.stato || '').toLowerCase().trim() === 'attivo') {
      const nomeVisibile = riga(String(f.username_display || nome).replace(/^@/, ''), 40);
      titolo = nomeSezione ? `@${nomeVisibile} · ${nomeSezione}` : `@${nomeVisibile}`;
      descrizione = `Scopri @${nomeVisibile} su myquicktag.`;
      // Tag scaduta: ai visitatori solo il nome (come in get-profile.js)
      if (calcolaAbbonamento(record).fase !== 'scaduta') {
        if (riga(f.bio, 160)) descrizione = riga(f.bio, 160);
        const urlFoto = fotoAnteprima(f.avatar_url);
        if (urlFoto) { immagine = urlFoto; foto = true; }
      }
    }
  } catch (e) {
    console.error('Anteprima tag:', e.dettagli || e.message);
  }
  const indirizzo = `${SITO}/u/${nome}${nomeSezione ? `?sezione=${encodeURIComponent(req.query.sezione)}` : ''}`;
  const html = `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8">
<title>${esc(titolo)}</title>
<meta name="description" content="${esc(descrizione)}">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="myquicktag">
<meta property="og:url" content="${esc(indirizzo)}">
<meta property="og:title" content="${esc(titolo)}">
<meta property="og:description" content="${esc(descrizione)}">
<meta property="og:image" content="${esc(immagine)}">
${foto ? '<meta property="og:image:width" content="600">\n<meta property="og:image:height" content="600">' : '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">'}
<meta name="twitter:card" content="${foto ? 'summary' : 'summary_large_image'}">
<meta name="twitter:title" content="${esc(titolo)}">
<meta name="twitter:description" content="${esc(descrizione)}">
<meta name="twitter:image" content="${esc(immagine)}">
<link rel="canonical" href="${esc(indirizzo)}">
<meta http-equiv="refresh" content="0;url=/tag.html?u=${esc(nome)}">
</head><body><a href="/tag.html?u=${esc(nome)}">${esc(titolo)}</a></body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(html);
}

export default async function handler(req, res) {
  if (req.query.anteprima) return anteprima(req, res, nomeTag(req.query.u));
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

    // Icone PNG del brand, uguali per tutti. Niente SVG (/api/generate-icons): Chrome lo preferiva ai PNG,
    // non riusciva a usarlo come icona dell'app e rifiutava l'installazione ("no-acceptable-icon").

    // Costruiamo il manifest dinamico con i link corretti (usando i backticks ``)
    const manifest = {
      "id": `/u/${finalUser}`,
      "name": `myquicktag ${displayUtente}`,
      "short_name": displayUtente,
      "description": "Luxury Digital Identity",
      "start_url": `/u/${finalUser}`,
      "scope": `/u/${finalUser}`,
      "display": "fullscreen",     
      "background_color": "#050505", // Schermata di avvio nera in stile luxury
      "theme_color": "#050505",      // Colora la barra di stato del telefono di nero
      "orientation": "portrait",
      "icons": [
        { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
        { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
        { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
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
