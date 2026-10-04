# Promemoria pre-lancio — myquicktag

Cose da decidere o completare **prima di andare online** su myquicktag.it.
Aggiornare questo file ogni volta che un punto viene chiuso o se ne aggiunge uno.
Per il contesto di lavoro (come lavorare, dove sta cosa, test) vedi `PASSAGGIO-CONSEGNE.md`.

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

### Piani Premium / Gold (upgrade)
- Oggi il piano scelto nell'editor è solo un'**anteprima** salvata sul telefono: il server non lo vede.
  Il piano vero è la colonna `plan` del database (vuota = Base) e deve scriverlo solo il server, dopo il pagamento.
- "Fai l'Upgrade" (dashboard) e il checkout di una tag già attiva mostrano per ora "Upgrade in arrivo".
- Per i test si può impostare il piano a mano su Supabase (tabella `tags`, colonna `plan`: `PREMIUM` o `GOLD`).

### Modello dei piani e pagamenti (in sospeso)
- Proposta discussa: Base gratis per sempre (con "Creato con myquicktag"), Premium e Gold a pagamento,
  prova con tutto sbloccato (Gold) e cambio piano libero durante la prova; a fine prova si torna al Base
  senza perdere contenuti (sezioni nascoste, non cancellate).
- Prezzi indicativi emersi dal confronto con i concorrenti: Premium ~4,90 €/mese, Gold ~14,90 €/mese
  (annuale scontato), eventuale prezzo fondatori. Da validare con clienti veri.
- Fiscale: finché tutto è gratis non c'è incasso. Prima di attivare i pagamenti: consulenza con un
  commercialista (codice ATECO, forfettario da dipendente, esonero INPS commercianti, IVA vendite online).

### Prezzo mostrato nel checkout di attivazione
- `checkout.html` mostra **"€19,00"**, ma oggi l'attivazione è gratuita (scelta voluta per i primi 3 mesi).
- Decidere cosa mostrare (es. "Gratis per 3 mesi") e allineare i testi del checkout.

---

## 2. Stato del passaggio su `main` e prima del lancio

- [x] **Database migrato da Airtable a Supabase** (progetto `myquicktag`, Francoforte, tabella `tags`).
  Struttura in `supabase/migrations/`; importate le 8 tag di prova della base "MyQuickTag (Copy)".
- [x] **Variabili d'ambiente su Vercel (Preview e Production):** `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`.
  - `SUPABASE_URL` = `https://atlhrkkfovblkhgzfeuo.supabase.co`
  - `SUPABASE_SECRET_KEY` = dashboard Supabase → Project Settings → API Keys → **Secret key** (`sb_secret_…`). Mai nel codice o nel browser.
  - Le variabili `AIRTABLE_*` non servono più e si possono togliere.
- [x] Unito `sviluppo-v2` in `main` (pull request #2, 04/10/2026).
- [ ] Test con due telefoni sul sito pubblico: contatto lasciato da un visitatore → Dashboard → I miei contatti.
- [x] **Secondo giro di sicurezza** (su `sviluppo-v2`, da unire in `main`):
  - testi del proprietario ripuliti prima di salvarli e prima di mostrarli (`lib/pulizia.js`, `session.js` → `mqtPulisci`): nessun codice nascosto o link `javascript:` nella tag pubblica; Pocket mostrato in modo sicuro;
  - password protette con scrypt (`lib/password.js`); le vecchie si aggiornano da sole al primo login;
  - limiti ai tentativi (`lib/limiti.js`, tabella `limiti`): login, cambio password, prenotazioni, contatti del vasetto;
  - black list e gold list controllate dal server: le liste sono nella tabella `nomi_riservati` del database (si gestiscono dal Table Editor di Supabase, con regole "esatto"/"contiene" e riconoscimento delle varianti come "p0ste"); nel codice restano solo i nomi delle pagine del sito (`lib/nomi-riservati.js`);
  - lo stato della tag si cambia solo all'attivazione ("in attesa" → "attivo" con la password).
- [ ] Rivedere e caricare la proposta di nomi riservati: `supabase/proposta-nomi-riservati.csv` (305 nomi).
- [x] Documenti interni, test e `supabase/` esclusi dal sito pubblico (`.vercelignore`).
- [ ] Prima del lancio: svuotare la tabella `tags` dalle tag di prova.
- [ ] Ancora aperti (minori): cambiare password non fa uscire gli altri dispositivi; visite e click delle statistiche non hanno limiti (si possono gonfiare); attivazione senza pagamento finché non c'è Stripe; funzioni server a 11 su 12 del piano gratuito di Vercel.

---

## 3. Da sapere (comportamenti voluti, non bug)

- **Sessione:** dopo il login il "pass" vale 90 giorni e si rinnova a ogni utilizzo (come Instagram/Google). Va rifatto il login solo dopo 90 giorni senza aprire la tag o l'editor.
- **Prenotazione:** dura 24 ore ed è legata al browser che l'ha fatta (ricevuta firmata).
- **iPhone:** l'app installata ha dati separati da Safari, quindi dopo l'installazione il proprietario deve rifare il login una volta dentro l'app (limite di Apple).
- **Dati privati del proprietario:** contatti lasciati dai visitatori, statistiche, Pocket e bozza non arrivano mai ai visitatori: `get-profile` li restituisce solo al proprietario con sessione valida. I visitatori aggiungono contatti e click tramite `api/add-lead.js` e `api/track-click.js`, che aggiungono una voce senza poter leggere o cancellare le altre. Ogni altra scrittura richiede il login.
- **Contatti del vasetto (Lead Capture):** arrivano in Dashboard → I miei contatti (`contatti.html`), con il numero dei nuovi sul pulsante e sul campanello; "nuovo/visto" e "richiamato" sono salvati sul server, quindi valgono su tutti i dispositivi del proprietario. Nell'editor resta solo l'impostazione del vasetto, con l'indicazione di dove trovare i contatti (anche nella guida della funzione).
- **Password:** si imposta la prima volta dal checkout; dopo si cambia solo da Account & Piano (`api/change-password.js`), che chiede anche quella attuale. Nota: cambiare password non fa uscire gli altri dispositivi già collegati (le sessioni restano valide fino alla loro scadenza).
- **Database:** solo le funzioni in `api/` parlano con Supabase (tramite `lib/db.js`), con la chiave segreta. Il browser non ha accesso diretto.
- **Durata tag:** 90 giorni + 14 di grazia (tag ancora online e modificabile), poi disattivata finché non viene rinnovata. I contenuti non vengono cancellati.
