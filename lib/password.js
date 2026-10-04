// ============================================================
// PASSWORD: protezione robusta lato server (scrypt + sale casuale)
// ============================================================
// Il browser invia l'hash SHA-256 della password (64 caratteri esadecimali). Il server non
// salva più quell'hash così com'è: lo passa a scrypt con un sale casuale, così anche chi
// ottenesse una copia del database dovrebbe provare le password una per una, lentamente.
// Formato salvato: "scrypt$<sale hex>$<risultato hex>".
// Le password salvate col vecchio formato (hash SHA-256 nudo) funzionano ancora e vengono
// aggiornate al primo login riuscito (vedi api/login.js).
import crypto from 'crypto';

const PREFISSO = 'scrypt$';
const LUNGHEZZA = 32;
const PARAMETRI = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function scrypt(valore, sale) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(valore, sale, LUNGHEZZA, PARAMETRI, (err, chiave) => (err ? reject(err) : resolve(chiave)));
  });
}

// L'hash SHA-256 inviato dal browser: esattamente 64 caratteri esadecimali
export function hashClienteValido(h) {
  return typeof h === 'string' && /^[a-f0-9]{64}$/i.test(h);
}

export async function proteggiPassword(hashCliente) {
  const sale = crypto.randomBytes(16).toString('hex');
  const chiave = await scrypt(hashCliente.toLowerCase(), sale);
  return `${PREFISSO}${sale}$${chiave.toString('hex')}`;
}

// Restituisce { ok, daAggiornare }: daAggiornare = password ancora nel vecchio formato
export async function verificaPassword(hashCliente, salvata) {
  const inviata = String(hashCliente || '').toLowerCase();
  const memorizzata = String(salvata || '');
  if (!hashClienteValido(inviata) || !memorizzata) return { ok: false, daAggiornare: false };

  if (memorizzata.startsWith(PREFISSO)) {
    const [, sale, risultato] = memorizzata.split('$');
    if (!sale || !risultato) return { ok: false, daAggiornare: false };
    const chiave = await scrypt(inviata, sale);
    const atteso = Buffer.from(risultato, 'hex');
    const ok = atteso.length === chiave.length && crypto.timingSafeEqual(atteso, chiave);
    return { ok, daAggiornare: false };
  }

  // Vecchio formato: hash SHA-256 salvato così com'è
  const vecchia = memorizzata.toLowerCase();
  const ok = vecchia.length === 64 && crypto.timingSafeEqual(Buffer.from(vecchia), Buffer.from(inviata));
  return { ok, daAggiornare: ok };
}
