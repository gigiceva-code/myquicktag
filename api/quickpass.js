import crypto from 'crypto';
import { trovaTag, aggiornaTag, leggiRighe, inserisciRiga, aggiornaRighe, aggiungiLead } from '../lib/db.js';
import { calcolaAbbonamento } from '../lib/abbonamento.js';
import { pulisciTesto } from '../lib/pulizia.js';
import { entroILimiti, rispondiTroppiTentativi } from '../lib/limiti.js';
import { nomeTag } from '../lib/nome-canonico.js';
import { dirittiSullaTag } from '../lib/sessione.js';
import { pinValido, proteggiPin, verificaPin } from '../lib/password.js';

// ============================================================
// QUICK PASS: il programma "porta un amico" (migrazione 20261029000000_quick_pass.sql)
// ============================================================
// Azioni (POST, campo "azione"):
//   invito     (visitatore)  chi consiglia crea il suo invito personale → link /u/<tag>?pass=<invito>
//   info       (visitatore)  dati per la pagina dell'amico: chi lo invita e cosa riceve
//   ritira     (visitatore)  l'amico ritira il suo pass personale (uno per telefono)
//   stato      (visitatore)  stato dei pass e dei premi conservati su questo telefono
//   verifica   (cassa)       mostra un pass prima di convalidarlo
//   convalida  (cassa)       usa il pass in cassa; al pass giusto chi ha consigliato riceve il premio
//   pin        (proprietario) imposta o toglie il PIN di cassa per i dipendenti
//   riepilogo  (proprietario) numeri e ultimi pass, per la dashboard
// "Cassa" = il proprietario con la sua sessione, oppure chiunque abbia il PIN di cassa della tag.
// I codici dei pass e degli inviti sono casuali e valgono come prova di possesso.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // senza 0/O e 1/I, facili da dettare
const GIORNO_MS = 24 * 60 * 60 * 1000;
const GIORNI_PASS = 30;
const GIORNI_PREMIO = 60;
const COLONNE_TAG = ['stato', 'data_scadenza', 'proprietario_id', 'username_display', 'quickpass_premio_a', 'quickpass_premio_b',
  'quickpass_limite', 'quickpass_scadenza', 'quickpass_amici_per_premio', 'quickpass_pin_hash'];

function codiceCasuale(lunghezza) {
  let c = '';
  for (let i = 0; i < lunghezza; i++) c += ALFABETO[crypto.randomInt(ALFABETO.length)];
  return c;
}

// Testo semplice su una riga, ripulito, al massimo n caratteri
function testo(valore, max) {
  return pulisciTesto(String(valore || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max));
}

function codiceValido(c, lunghezza) {
  return typeof c === 'string' && c.length === lunghezza && [...c].every(ch => ALFABETO.includes(ch));
}

// Impronta del telefono (identificativo casuale salvato nel browser): mai salvato in chiaro
function impronta(dispositivo) {
  const d = String(dispositivo || '');
  if (!/^[A-Za-z0-9-]{16,64}$/.test(d)) return null;
  return crypto.createHmac('sha256', process.env.SESSION_SECRET || 'mqt').update(`qp|${d}`).digest('hex').slice(0, 40);
}

function campagna(record) {
  const f = record?.fields || {};
  const scadenza = f.quickpass_scadenza ? Date.parse(f.quickpass_scadenza) : null;
  const attiva = !!record && String(f.stato || '').toLowerCase().trim() === 'attivo' &&
    calcolaAbbonamento(record).fase !== 'scaduta' &&
    !!String(f.quickpass_premio_a || '').trim() && !!String(f.quickpass_premio_b || '').trim() &&
    !(scadenza && Date.now() > scadenza);
  return { attiva, scadenza: scadenza || null, limite: parseInt(f.quickpass_limite, 10) > 0 ? parseInt(f.quickpass_limite, 10) : null,
    perPremio: parseInt(f.quickpass_amici_per_premio, 10) > 0 ? parseInt(f.quickpass_amici_per_premio, 10) : 1 };
}

// Solo il nome (prima parola): sulla pagina dell'amico basta "Marco ti ha regalato…"
const primoNome = n => String(n || '').split(' ')[0];

function vistaPass(p) {
  return { codice: p.codice, tipo: p.tipo, nome: p.nome, premio: p.premio, scadenza: p.scadenza, stato: p.stato,
    scaduto: p.stato === 'attivo' && Date.parse(p.scadenza) < Date.now(), usato_il: p.usato_il || null };
}

async function nuovoCodice(tabella, valori, lunghezza) {
  for (let i = 0; i < 4; i++) {
    const riga = await inserisciRiga(tabella, { ...valori, codice: codiceCasuale(lunghezza) });
    if (riga) return riga;
  }
  throw new Error('Codice Quick Pass non disponibile');
}

// Cassa: proprietario con la sua sessione, oppure PIN di cassa corretto (tentativi limitati)
async function autorizzaCassa(req, body, record, tag) {
  const diritti = await dirittiSullaTag({ req, token: body.sessionToken, record, tag });
  if (diritti.proprietario) return { ok: true };
  const pin = String(body.pin || '');
  if (!pin) return { ok: false, serve_pin: true };
  if (!(await entroILimiti(req, tag, [{ nome: 'qp-pin', per: 'ip+tag', max: 10, finestra: 900, chiuso: true }]))) {
    return { ok: false, troppi: true };
  }
  const giusto = await verificaPin(pin, record.fields.quickpass_pin_hash);
  return giusto ? { ok: true } : { ok: false, pin_errato: true, serve_pin: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Metodo non consentito' });
  const body = req.body || {};
  const azione = String(body.azione || '');
  const tag = nomeTag(body.u);
  if (!tag) return res.status(400).json({ success: false, error: 'Tag mancante' });

  try {
    const record = await trovaTag(tag, COLONNE_TAG);
    if (!record) return res.status(404).json({ success: false, error: 'Tag non trovata' });
    const f = record.fields;
    const c = campagna(record);

    // ---------- INVITO: chi consiglia ottiene il suo link personale ----------
    if (azione === 'invito') {
      if (!c.attiva) return res.status(410).json({ success: false, error: 'Il Quick Pass non è attivo su questa tag' });
      const nome = testo(body.nome, 40);
      if (!nome) return res.status(400).json({ success: false, error: 'Scrivi il tuo nome' });
      const disp = impronta(body.dispositivo);
      if (disp) {
        const gia = await leggiRighe('quickpass_inviti', { tag, dispositivo: disp }, { limite: 1 });
        if (gia[0]) return res.status(200).json({ success: true, invito: { codice: gia[0].codice, nome: gia[0].nome } });
      }
      if (!(await entroILimiti(req, tag, [
        { nome: 'qp-invito', per: 'ip+tag', max: 5, finestra: 3600 },
        { nome: 'qp-invito-ip', per: 'ip', max: 30, finestra: 86400 }
      ]))) return rispondiTroppiTentativi(res);
      const invito = await nuovoCodice('quickpass_inviti', { tag, nome, dispositivo: disp }, 8);
      return res.status(200).json({ success: true, invito: { codice: invito.codice, nome: invito.nome } });
    }

    // ---------- INFO: la pagina dell'amico ----------
    if (azione === 'info') {
      let da = null;
      if (codiceValido(body.invito, 8)) {
        const inv = (await leggiRighe('quickpass_inviti', { codice: body.invito, tag }, { limite: 1 }))[0];
        if (inv) da = primoNome(inv.nome);
      }
      let postiRimasti = null;
      if (c.attiva && c.limite) {
        const dati = await leggiRighe('quickpass_pass', { tag, tipo: 'amico' }, { colonne: 'codice' });
        postiRimasti = Math.max(0, c.limite - dati.length);
      }
      return res.status(200).json({ success: true, attiva: c.attiva && postiRimasti !== 0, esauriti: postiRimasti === 0,
        da, premio: c.attiva ? f.quickpass_premio_b : null, premio_invito: c.attiva ? f.quickpass_premio_a : null,
        amici_per_premio: c.perPremio, scadenza_campagna: c.scadenza ? new Date(c.scadenza).toISOString() : null, posti_rimasti: postiRimasti });
    }

    // ---------- RITIRA: l'amico riceve il suo pass personale ----------
    if (azione === 'ritira') {
      if (!c.attiva) return res.status(410).json({ success: false, error: 'Il Quick Pass non è più attivo' });
      const nome = testo(body.nome, 40);
      if (!nome) return res.status(400).json({ success: false, error: 'Scrivi il tuo nome' });
      const disp = impronta(body.dispositivo);
      if (!disp) return res.status(400).json({ success: false, error: 'Telefono non riconosciuto: riapri il link' });

      // Un solo pass amico per telefono: se c'è già, si restituisce quello
      const gia = (await leggiRighe('quickpass_pass', { tag, tipo: 'amico', dispositivo: disp }, { limite: 1 }))[0];
      if (gia) return res.status(200).json({ success: true, esistente: true, pass: vistaPass(gia) });

      let invito = null;
      if (codiceValido(body.invito, 8)) {
        invito = (await leggiRighe('quickpass_inviti', { codice: body.invito, tag }, { limite: 1 }))[0] || null;
        if (invito && invito.dispositivo && invito.dispositivo === disp) {
          return res.status(403).json({ success: false, error: 'Questo è il tuo invito: mandalo a un amico, il pass è per lui.' });
        }
      }
      if (!(await entroILimiti(req, tag, [{ nome: 'qp-ritira', per: 'ip+tag', max: 5, finestra: 3600 }]))) return rispondiTroppiTentativi(res);
      if (c.limite) {
        const emessi = await leggiRighe('quickpass_pass', { tag, tipo: 'amico' }, { colonne: 'codice' });
        if (emessi.length >= c.limite) return res.status(410).json({ success: false, esauriti: true, error: 'I pass disponibili sono esauriti' });
      }
      const ora = Date.now();
      const scadenza = Math.min(c.scadenza || Infinity, ora + GIORNI_PASS * GIORNO_MS);
      const contatto = testo(body.contatto, 120) || null;
      const pass = await nuovoCodice('quickpass_pass', {
        tag, tipo: 'amico', invito: invito ? invito.codice : null, nome, contatto,
        premio: testo(f.quickpass_premio_b, 200), scadenza: new Date(scadenza).toISOString(), dispositivo: disp
      }, 6);

      // Recapito facoltativo: arriva anche in "I miei contatti", con il consenso alle offerte se dato
      if (contatto) {
        const consenso = body.consenso === true;
        try {
          await aggiungiLead(tag, {
            id: crypto.randomUUID(), nome, contatto, ts: ora, fonte: 'Quick Pass',
            data: new Date(ora).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' }),
            visto: false, richiamato: false, consenso_offerte: consenso,
            ...(consenso ? { consenso_testo: testo(body.consenso_testo, 200) || 'Accetto di ricevere offerte e novità', consenso_data: new Date(ora).toISOString() } : {})
          });
        } catch (e) { console.error('QUICKPASS contatto non salvato:', e.dettagli || e.message); }
      }
      return res.status(200).json({ success: true, pass: vistaPass(pass) });
    }

    // ---------- STATO: pass e premi conservati su questo telefono ----------
    if (azione === 'stato') {
      const codici = (Array.isArray(body.codici) ? body.codici : []).filter(x => codiceValido(x, 6)).slice(0, 20);
      const pass = [];
      for (const codice of codici) {
        const p = (await leggiRighe('quickpass_pass', { codice, tag }, { limite: 1 }))[0];
        if (p) pass.push(vistaPass(p));
      }
      let invito = null;
      if (codiceValido(body.invito, 8)) {
        const inv = (await leggiRighe('quickpass_inviti', { codice: body.invito, tag }, { limite: 1 }))[0];
        if (inv) {
          const amici = await leggiRighe('quickpass_pass', { invito: inv.codice, tipo: 'amico' }, { colonne: 'stato' });
          const premi = await leggiRighe('quickpass_pass', { invito: inv.codice, tipo: 'premio' }, { ordine: 'created_at.desc' });
          invito = { codice: inv.codice, nome: inv.nome, amici_ritirati: amici.length, amici_usati: amici.filter(a => a.stato === 'usato').length,
            amici_per_premio: c.perPremio, premi: premi.map(vistaPass) };
        }
      }
      return res.status(200).json({ success: true, pass, invito, attiva: c.attiva });
    }

    // ---------- VERIFICA / CONVALIDA in cassa ----------
    if (azione === 'verifica' || azione === 'convalida') {
      const codice = String(body.codice || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!codiceValido(codice, 6)) return res.status(400).json({ success: false, error: 'Codice non valido: sono 6 caratteri' });
      const cassa = await autorizzaCassa(req, body, record, tag);
      if (cassa.troppi) return rispondiTroppiTentativi(res);
      if (!cassa.ok) return res.status(401).json({ success: false, serve_pin: true, pin_impostato: !!f.quickpass_pin_hash,
        error: cassa.pin_errato ? 'PIN di cassa errato' : 'Riservato alla cassa: accedi come titolare o inserisci il PIN di cassa' });

      const p = (await leggiRighe('quickpass_pass', { codice, tag }, { limite: 1 }))[0];
      if (!p) return res.status(404).json({ success: false, error: 'Pass non trovato per questa tag' });
      if (p.stato === 'usato') return res.status(409).json({ success: false, usato: true, pass: vistaPass(p), error: 'Pass già usato' });
      if (Date.parse(p.scadenza) < Date.now()) return res.status(410).json({ success: false, scaduto: true, pass: vistaPass(p), error: 'Pass scaduto' });
      if (azione === 'verifica') return res.status(200).json({ success: true, pass: vistaPass(p) });

      // Atomico: riesce una volta sola anche con due convalide contemporanee
      const usati = await aggiornaRighe('quickpass_pass', { codice, tag, stato: 'attivo' }, { stato: 'usato', usato_il: new Date().toISOString() });
      if (!usati.length) return res.status(409).json({ success: false, usato: true, error: 'Pass già usato' });

      // Pass di un amico: ogni N amici portati, chi ha consigliato riceve il premio
      let premioSbloccato = null;
      if (p.tipo === 'amico' && p.invito) {
        const inv = (await leggiRighe('quickpass_inviti', { codice: p.invito }, { limite: 1 }))[0];
        const amiciUsati = (await leggiRighe('quickpass_pass', { invito: p.invito, tipo: 'amico', stato: 'usato' }, { colonne: 'codice' })).length;
        if (inv && amiciUsati > 0 && amiciUsati % c.perPremio === 0 && String(f.quickpass_premio_a || '').trim()) {
          const premio = await nuovoCodiceOppureEsistente(inv, amiciUsati / c.perPremio, testo(f.quickpass_premio_a, 200), tag);
          if (premio) premioSbloccato = { nome: inv.nome, premio: premio.premio };
        }
      }
      return res.status(200).json({ success: true, pass: vistaPass(usati[0]), premio_sbloccato: premioSbloccato });
    }

    // ---------- Azioni del proprietario ----------
    const diritti = await dirittiSullaTag({ req, token: body.sessionToken, record, tag });
    if (!diritti.proprietario) return res.status(401).json({ success: false, error: 'Accedi come titolare della tag' });

    if (azione === 'pin') {
      const pin = String(body.pin ?? '');
      if (pin !== '' && !pinValido(pin)) return res.status(400).json({ success: false, error: 'Il PIN deve avere da 4 a 6 cifre' });
      await aggiornaTag(record.id, { quickpass_pin_hash: pin ? await proteggiPin(pin) : null });
      return res.status(200).json({ success: true, pin_impostato: !!pin });
    }

    if (azione === 'riepilogo') {
      const inviti = await leggiRighe('quickpass_inviti', { tag }, { colonne: 'codice,nome' });
      const pass = await leggiRighe('quickpass_pass', { tag }, { ordine: 'created_at.desc' });
      const nomeInvito = Object.fromEntries(inviti.map(i => [i.codice, primoNome(i.nome)]));
      const amici = pass.filter(p => p.tipo === 'amico'), premi = pass.filter(p => p.tipo === 'premio');
      return res.status(200).json({ success: true, pin_impostato: !!f.quickpass_pin_hash, numeri: {
        inviti: inviti.length, pass_ritirati: amici.length, pass_usati: amici.filter(p => p.stato === 'usato').length,
        premi_maturati: premi.length, premi_usati: premi.filter(p => p.stato === 'usato').length
      }, ultimi: pass.slice(0, 30).map(p => ({ ...vistaPass(p), invitato_da: p.invito ? nomeInvito[p.invito] || null : null })) });
    }

    return res.status(400).json({ success: false, error: 'Azione sconosciuta' });
  } catch (e) {
    console.error('CRASH QUICKPASS:', e.dettagli || e.message);
    return res.status(500).json({ success: false, error: 'Errore server' });
  }
}

// Il k-esimo premio di un invito è unico (vincolo unique invito+ordine): se due convalide
// arrivano insieme, il secondo inserimento non crea un doppione
async function nuovoCodiceOppureEsistente(inv, ordine, premio, tag) {
  for (let i = 0; i < 4; i++) {
    const riga = await inserisciRiga('quickpass_pass', {
      codice: codiceCasuale(6), tag, tipo: 'premio', invito: inv.codice, nome: inv.nome, premio,
      scadenza: new Date(Date.now() + GIORNI_PREMIO * GIORNO_MS).toISOString(), ordine
    });
    if (riga) return riga;
    const esistente = (await leggiRighe('quickpass_pass', { invito: inv.codice, tipo: 'premio', ordine }, { limite: 1 }))[0];
    if (esistente) return null;
  }
  return null;
}
