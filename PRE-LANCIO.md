# Promemoria pre-lancio — myquicktag

Cose da decidere o completare **prima di andare online** su myquicktag.it.
Aggiornare questo file ogni volta che un punto viene chiuso o se ne aggiunge uno.

---

## 1. Da decidere (prodotto)

### Rinnovo e checkout prima/dopo i 90 giorni
- **Regola già decisa:** i 90 giorni gratuiti valgono **una sola volta**, alla prima attivazione della tag.
- **Da decidere al lancio:** prezzi dei piani (Base / Premium / Gold), periodicità (mensile, annuale…), cosa paga il cliente alla scadenza.
- **Stato attuale del codice (solo per i test):** il pulsante "Rinnova gratis per 90 giorni" nella dashboard allunga la scadenza di 90 giorni **gratis e all'infinito**. ⚠️ **Non deve arrivare così sul sito pubblico.**
- Dove si cambia:
  - `profile.html` → testo e link del pulsante `btn-rinnova`
  - `checkout.html` → modalità rinnovo (`?rinnovo=1`, funzione `eseguiRinnovo`)
  - `api/update-profile.js` → ramo `body.rinnova`
  - `lib/abbonamento.js` → durate (`GIORNI_PIANO`, `GIORNI_GRAZIA`) e regole del rinnovo
- Con il pagamento vero (Stripe) l'attivazione e il rinnovo dovranno essere confermati da Stripe al server (webhook), non dal browser.

### Prezzo mostrato nel checkout di attivazione
- `checkout.html` mostra **"€19,00"**, ma oggi l'attivazione è gratuita (scelta voluta per i primi 3 mesi).
- Decidere cosa mostrare (es. "Gratis per 3 mesi") e allineare i testi del checkout.

---

## 2. Da fare prima del passaggio su `main`

- [ ] Test completi sul Preview di `sviluppo-v2`, usando sempre l'indirizzo **fisso** del branch:
  `https://myquicktag-git-sviluppo-v2-gigiceva-codes-projects.vercel.app`
  (ogni deploy ha anche un indirizzo suo, ma i dati salvati nel browser e le app installate restano legati all'indirizzo usato).
- [ ] **Database di produzione (Airtable):** il Preview usa la base "MyQuickTag (Copy)". Verificare che la base usata dal sito pubblico abbia le stesse colonne, in particolare:
  - `quick_action_copertina` (testo)
  - `data_inizio` e `data_scadenza` (data)
- [ ] **Variabili d'ambiente su Vercel (Production):** `SESSION_SECRET`, `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_ID`.
- [ ] Unire `sviluppo-v2` in `main` (pull request) e ricontrollare il sito pubblico.
- [ ] Dopo il passaggio, le tag già attive ricevono 90 giorni pieni dal primo accesso (nessuna viene disattivata d'ufficio): verificare su un paio di tag reali.

---

## 3. Da sapere (comportamenti voluti, non bug)

- **Sessione:** dopo il login il "pass" vale 90 giorni e si rinnova a ogni utilizzo (come Instagram/Google). Va rifatto il login solo dopo 90 giorni senza aprire la tag o l'editor.
- **Prenotazione:** dura 24 ore ed è legata al browser che l'ha fatta (ricevuta firmata).
- **iPhone:** l'app installata ha dati separati da Safari, quindi dopo l'installazione il proprietario deve rifare il login una volta dentro l'app (limite di Apple).
- **Durata tag:** 90 giorni + 14 di grazia (tag ancora online e modificabile), poi disattivata finché non viene rinnovata. I contenuti non vengono cancellati.
