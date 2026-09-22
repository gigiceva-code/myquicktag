// Wrapper per le chiamate ad Airtable con retry automatico
// su errori temporanei (rate limit 429, errori server 5xx).
export async function airtableFetch(url, options = {}, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response;
    try {
      response = await fetch(url, options);
    } catch (networkError) {
      // Errore di rete (es. connessione caduta): trattato come transitorio
      lastError = networkError;
      if (attempt < maxRetries) {
        await wait(backoffDelay(attempt));
        continue;
      }
      throw networkError;
    }

    // Successo, oppure errore non transitorio (es. 400, 404): niente retry
    if (response.ok || !isTransientError(response.status)) {
      return response;
    }

    // Errore transitorio: aspettiamo e riproviamo, se ci sono tentativi rimasti
    lastError = response;
    if (attempt < maxRetries) {
      await wait(backoffDelay(attempt));
      continue;
    }
    return response; // Tentativi esauriti: restituiamo l'ultima risposta (in errore)
  }

  throw lastError;
}

function isTransientError(status) {
  return status === 429 || status >= 500;
}

function backoffDelay(attempt) {
  // Attesa crescente: 300ms, 600ms, 1200ms...
  return 300 * Math.pow(2, attempt);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
