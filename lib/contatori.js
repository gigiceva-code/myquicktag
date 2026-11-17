// ============================================================
// CONTATORI ANONIMI DEL PERCORSO (17/11/2026) — tabella "contatori", migrazione 20261117000000
// ============================================================
// Solo numeri totali per giorno: niente IP, nomi, email o identificativi. Gli eventi sono un elenco chiuso
// e li conta solo il server. Un contatore che non va non deve mai fermare il sito: gli errori si ignorano.
import { contaEventoDb, numeriLancioDb } from './db.js';

export const EVENTI = [
  'home_visita',        // qualcuno apre la home
  'nome_verificato',    // qualcuno prova un @nome
  'nome_prenotato',     // il nome era libero ed è stato prenotato
  'tag_attivata',       // la prenotazione diventa una tag attiva (account collegato)
  'console_aperta',     // un titolare apre la sua Identity Console (chi torna)
  'tag_visita',         // visita a una tag pubblica (oltre ai limiti anti-raffica)
  'tag_condivisa',      // clic su CONDIVIDI in una tag
  'contatto_lasciato',  // un visitatore lascia il recapito nel Vasetto
  'quickgift_link',     // qualcuno crea il suo link QuickGift
  'quickgift_richiesto',// qualcuno riceve un regalo QuickGift
  'quickgift_usato'     // un regalo o un premio QuickGift viene confermato in cassa
];

export async function contaEvento(evento) {
  if (!EVENTI.includes(evento)) return;
  try { await contaEventoDb(evento); } catch (e) { console.error('Contatore non registrato:', evento, e.dettagli || e.message); }
}

export function numeriLancio(giorni = 30) { return numeriLancioDb(giorni); }

// Chi può vedere la pagina "Numeri": le email elencate in NUMERI_EMAIL su Vercel (separate da virgola),
// altrimenti l'account ufficiale del sito
export function puoVedereNumeri(email) {
  const ammessi = String(process.env.NUMERI_EMAIL || 'info@myquicktag.it').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  return !!email && ammessi.includes(String(email).toLowerCase());
}
