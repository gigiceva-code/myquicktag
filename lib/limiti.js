// ============================================================
// LIMITI AI TENTATIVI (contro chi prova password a raffica, prenota migliaia di nomi
// o riempie un vasetto di contatti finti)
// ============================================================
// Il conteggio è nel database (funzione SQL consuma_tentativo). La chiave è un'impronta
// HMAC di azione + IP (+ tag): l'indirizzo IP non viene mai salvato.
// Se il database non risponde si lascia passare (meglio un tentativo in più che bloccare tutti).
import crypto from 'crypto';
import { consumaTentativo } from './db.js';

export function ipRichiesta(req) {
  const inoltrato = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return inoltrato || String(req.headers?.['x-real-ip'] || '') || 'sconosciuto';
}

function chiave(...parti) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET || 'mqt').update(parti.join('|')).digest('hex').slice(0, 40);
}

// true = consentito. regole: [{ nome, per: 'ip' | 'tag' | 'ip+tag', max, finestra (secondi) }]
export async function entroILimiti(req, tag, regole) {
  const ip = ipRichiesta(req);
  for (const r of regole) {
    const parti = r.per === 'ip' ? [r.nome, ip] : r.per === 'tag' ? [r.nome, tag] : [r.nome, ip, tag];
    try {
      if (!(await consumaTentativo(chiave(...parti), r.max, r.finestra))) return false;
    } catch (e) {
      console.error('Limiti non verificabili, si lascia passare:', e.dettagli || e.message);
    }
  }
  return true;
}

export function rispondiTroppiTentativi(res) {
  res.setHeader('Retry-After', '600');
  return res.status(429).json({ success: false, error: 'Troppi tentativi. Riprova tra qualche minuto.', message: 'Troppi tentativi. Riprova tra qualche minuto.' });
}
