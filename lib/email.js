// ============================================================
// EMAIL AI TITOLARI (Resend, dominio notifiche.myquicktag.it)
// ============================================================
// Due email di servizio, mai promozionali:
//  - benvenuto: appena la tag viene attivata (api/update-profile.js)
//  - promemoria: una sola volta, il giorno dopo, se alla tag mancano foto, bio o un contatto
//    (api/account.js, chiamato ogni mattina da Vercel Cron, vedi vercel.json)
// Se Resend non risponde l'attivazione va avanti lo stesso: l'email è un di più.

const MITTENTE = 'myquicktag <no-reply@notifiche.myquicktag.it>';
const RISPOSTE = 'info@myquicktag.it';
const SITO = 'https://myquicktag.it';

function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Cosa manca alla tag per essere convincente: foto, due righe su di sé, un contatto
export function partiMancanti(fields = {}) {
  let vcf = {};
  try { vcf = typeof fields.modulo_vcf === 'object' && fields.modulo_vcf ? fields.modulo_vcf : JSON.parse(fields.modulo_vcf || '{}'); } catch { vcf = {}; }
  let canali = [];
  try { canali = JSON.parse(fields.config_canali || '[]'); } catch { canali = []; }
  const pieno = v => String(v || '').trim() !== '';
  const mancanti = [];
  if (!pieno(fields.avatar_url)) mancanti.push('foto');
  if (!pieno(fields.bio)) mancanti.push('bio');
  if (!(pieno(fields.email) || pieno(vcf.telefono1) || pieno(vcf.telefono2) || pieno(vcf.email1) || (Array.isArray(canali) && canali.length))) mancanti.push('contatto');
  return mancanti;
}

const VOCI = {
  foto: ['La foto o il logo', 'È la prima cosa che si guarda: una tag con il volto o il logo ispira subito fiducia.'],
  bio: ['Due righe su di te', 'Chi sei, cosa fai, dove: chi apre la tag deve capirlo in tre secondi.'],
  contatto: ['Un contatto', 'Telefono, email o un social: il modo più semplice per farti trovare.']
};

// Impaginazione comune: nero, verde del marchio, una colonna, leggibile su ogni client di posta
function pagina({ anteprima, titolo, corpo, bottone, link, piede }) {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>${esc(titolo)}</title></head>
<body style="margin:0;padding:0;background:#000000;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(anteprima)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000000;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0b0b0d;border:1px solid #1e1e22;border-radius:20px;">
<tr><td style="padding:36px 32px 8px;font-family:Helvetica,Arial,sans-serif;">
<div style="font-size:20px;font-weight:800;letter-spacing:0.5px;color:#ffffff;"><span style="color:#50C878;">@</span> myquicktag</div>
</td></tr>
<tr><td style="padding:20px 32px 0;font-family:Helvetica,Arial,sans-serif;">
<h1 style="margin:0 0 14px;font-size:26px;line-height:1.25;font-weight:700;color:#ffffff;">${titolo}</h1>
${corpo}
</td></tr>
<tr><td style="padding:26px 32px 8px;font-family:Helvetica,Arial,sans-serif;">
<a href="${esc(bottone.url)}" style="display:block;text-align:center;background:#50C878;color:#000000;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;padding:16px 20px;border-radius:12px;">${esc(bottone.testo)}</a>
${link ? `<p style="margin:14px 0 0;text-align:center;font-size:13px;"><a href="${esc(link.url)}" style="color:#9fe2b6;">${esc(link.testo)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:22px 32px 32px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8a8a8f;border-top:1px solid #1e1e22;">
${piede}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function elenco(righe) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 0;">${righe.map(([n, t, d]) => `
<tr><td valign="top" style="width:34px;padding:10px 0;"><div style="width:24px;height:24px;line-height:24px;border-radius:12px;border:1px solid #2f6b45;color:#50C878;font-size:12px;text-align:center;font-family:Helvetica,Arial,sans-serif;">${n}</div></td>
<td style="padding:10px 0;font-family:Helvetica,Arial,sans-serif;"><div style="font-size:15px;font-weight:700;color:#ffffff;">${esc(t)}</div><div style="font-size:13px;line-height:1.5;color:#b8b8bd;">${esc(d)}</div></td></tr>`).join('')}</table>`;
}

function dataItaliana(d) {
  try { return new Date(d + (String(d).length === 10 ? 'T12:00:00Z' : '')).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; }
}

export function emailBenvenuto({ tag, nome, mancanti = [], scadenza }) {
  const chi = '@' + String(nome || tag).replace(/^@+/, '');
  const urlTag = `${SITO}/u/${encodeURIComponent(tag)}`;
  const passi = mancanti.length
    ? [['1', 'Completala in un minuto', 'Ti manca ancora: ' + mancanti.map(m => VOCI[m][0].toLowerCase()).join(', ') + '. Con questi dettagli viene condivisa molto di più.'],
       ['2', 'Condividila', 'Metti il link nella bio di Instagram, nello stato di WhatsApp e nella firma delle email.'],
       ['3', 'Fai inquadrare il QR', 'Sul bancone, sul biglietto da visita, in vetrina: si apre con un clic, senza app.']]
    : [['1', 'Condividila', 'Metti il link nella bio di Instagram, nello stato di WhatsApp e nella firma delle email.'],
       ['2', 'Fai inquadrare il QR', 'Sul bancone, sul biglietto da visita, in vetrina: si apre con un clic, senza app.'],
       ['3', 'Tienila a portata di mano', 'Aprila dal telefono e aggiungila alla schermata Home: la mostri a chiunque in un secondo.']];
  const corpo = `<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#d6d6da;">Da questo momento ${esc(chi)} è solo tuo. Ecco come farlo lavorare per te.</p>${elenco(passi)}
<p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#d6d6da;">Il tuo indirizzo: <a href="${esc(urlTag)}" style="color:#50C878;">myquicktag.it/u/${esc(tag)}</a></p>`;
  const html = pagina({
    anteprima: `${chi} è online: ecco come farlo lavorare per te.`,
    titolo: `${esc(chi)} è online.`,
    corpo,
    bottone: mancanti.length ? { testo: 'Completa la tua tag', url: `${SITO}/edit.html?u=${encodeURIComponent(tag)}` } : { testo: 'Apri la tua tag', url: urlTag },
    link: { testo: 'Vai alla tua Identity Console', url: `${SITO}/dashboard.html` },
    piede: `${scadenza ? `Hai tutte le funzioni sbloccate fino al ${esc(dataItaliana(scadenza))}. Poi la tag resta online gratis con il piano Base: nessun rinnovo automatico, nessun addebito.<br><br>` : ''}Ricevi questa email perché hai attivato una tag su myquicktag.it. Hai una domanda? Rispondi qui: ti leggiamo noi.`
  });
  const text = [`${chi} è online.`, '', `Da questo momento ${chi} è solo tuo. Ecco come farlo lavorare per te:`, ...passi.map(([n, t, d]) => `${n}. ${t}: ${d}`), '', `La tua tag: ${urlTag}`, `La tua Identity Console: ${SITO}/dashboard.html`, '', 'Hai una domanda? Rispondi a questa email.'].join('\n');
  return { subject: `${chi} è online`, html, text };
}

export function emailPromemoria({ tag, nome, mancanti }) {
  const chi = '@' + String(nome || tag).replace(/^@+/, '');
  const urlEditor = `${SITO}/edit.html?u=${encodeURIComponent(tag)}`;
  const oggetto = mancanti.length === 1 ? `${chi}: ti manca solo ${VOCI[mancanti[0]][0].toLowerCase()}` : `${chi}: ancora un minuto e la tua tag è completa`;
  const corpo = `<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#d6d6da;">La tua tag è online, ma chi la apre oggi la trova a metà. Bastano pochi dettagli per renderla una tag che si condivide volentieri:</p>${elenco(mancanti.map((m, i) => [String(i + 1), VOCI[m][0], VOCI[m][1]]))}`;
  const html = pagina({
    anteprima: 'Bastano pochi dettagli per una tag che si condivide volentieri.',
    titolo: mancanti.length === 1 ? `Ti manca solo ${esc(VOCI[mancanti[0]][0].toLowerCase())}.` : 'Ancora un minuto.',
    corpo,
    bottone: { testo: 'Completa la tua tag', url: urlEditor },
    link: { testo: 'Guarda com\'è adesso', url: `${SITO}/u/${encodeURIComponent(tag)}` },
    piede: 'È l\'unico promemoria che ti mandiamo. Ricevi questa email perché hai attivato una tag su myquicktag.it. Hai una domanda? Rispondi qui: ti leggiamo noi.'
  });
  const text = [oggetto, '', 'La tua tag è online, ma chi la apre oggi la trova a metà. Ti manca:', ...mancanti.map(m => `- ${VOCI[m][0]}: ${VOCI[m][1]}`), '', `Completa la tua tag: ${urlEditor}`, '', 'È l\'unico promemoria che ti mandiamo.'].join('\n');
  return { subject: oggetto, html, text };
}

// Prenotazione in scadenza: chi ha un account e ha prenotato un nome senza attivarlo (una sola volta)
export function emailScadenza({ tag, nome, oreRimaste }) {
  const chi = '@' + String(nome || tag).replace(/^@+/, '');
  const ore = Math.max(1, Math.floor(oreRimaste || 1));
  const quando = ore === 1 ? 'meno di un\'ora' : `circa ${ore} ore`;
  const urlEditor = `${SITO}/edit.html?u=${encodeURIComponent(tag)}`;
  const passi = [['1', 'Aggiungi una cosa sola', 'Due righe su di te, un contatto, un social o il sito: basta questo per partire.'],
                 ['2', 'Premi «Attiva gratis»', 'Tre mesi con tutte le funzioni sbloccate, nessuna carta richiesta.']];
  const corpo = `<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#d6d6da;">Hai prenotato ${esc(chi)}, ma non l'hai ancora attivato. La prenotazione scade tra ${esc(quando)}: poi il nome torna libero e chiunque potrà prenderlo.</p>${elenco(passi)}`;
  const html = pagina({
    anteprima: `${chi} è ancora tuo per ${quando}.`,
    titolo: `${esc(chi)} è ancora tuo, per poco.`,
    corpo,
    bottone: { testo: `Tieni il mio ${chi}`, url: urlEditor },
    link: null,
    piede: 'Ricevi questa email perché hai prenotato un nome su myquicktag.it con il tuo account. È l\'unico avviso che ti mandiamo. Hai una domanda? Rispondi qui: ti leggiamo noi.'
  });
  const text = [`${chi} è ancora tuo, per poco.`, '', `Hai prenotato ${chi}, ma non l'hai ancora attivato. La prenotazione scade tra ${quando}: poi il nome torna libero.`, ...passi.map(([n, t, d]) => `${n}. ${t}: ${d}`), '', `Tieni il tuo nome: ${urlEditor}`].join('\n');
  return { subject: `${chi} è ancora tuo per ${quando}`, html, text };
}

// Invio con Resend. true se è partita; non lancia mai errori.
export async function inviaEmail({ to, subject, html, text }) {
  const chiave = process.env.RESEND_API_KEY;
  if (!chiave || !to) { if (!chiave) console.error('EMAIL: RESEND_API_KEY mancante'); return false; }
  try {
    const risposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chiave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MITTENTE, to: [to], reply_to: RISPOSTE, subject, html, text }),
      signal: AbortSignal.timeout(8000)
    });
    if (!risposta.ok) console.error('EMAIL: non inviata', risposta.status);
    return risposta.ok;
  } catch (e) {
    console.error('EMAIL: non inviata', e.message);
    return false;
  }
}
