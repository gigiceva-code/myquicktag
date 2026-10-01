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
- ✅ Fatto: il checkout di attivazione mostra "Gratis per 3 mesi", il pulsante "Attiva gratis" e la nota "Nessun pagamento richiesto"; i loghi delle carte sono nascosti.
- Con il pagamento vero vanno ripristinati prezzo, pulsante, nota e loghi in `checkout.html`.

---

### Database: migrazione da Airtable a Supabase (prima del lancio)
- **Deciso:** la migrazione a Supabase avviene **prima del lancio**. La data del lancio la decide il proprietario del progetto.
- **Perché:** Airtable ha un limite mensile di chiamate API. Oggi ogni visita a una tag pubblica fa circa 3 chiamate (`get-profile` + `track-view`) e ogni click tracciato altre 2: con il piano gratuito bastano poche centinaia di visite al mese per bloccare il sito. La base "MyQuickTag (Copy)" esiste proprio perché la base originale aveva raggiunto il limite.
- **Cosa coinvolge:** `api/check-and-create.js`, `api/get-profile.js`, `api/update-profile.js`, `api/track-view.js`, `api/login.js` e `lib/airtable-fetch.js`. Non cambiano `lib/abbonamento.js`, `lib/nomi-riservati.js` e le sessioni.
- **Schema:** le colonne della base "MyQuickTag (Copy)" sono lo schema da ricreare come tabella su Supabase.
- **Dati:** importare le tag reali dalla base in uso (al 1/10/2026 la Copy ne ha 8, tra cui `luigimicelli` e `lamaestraelalunno`) e scartare quelle di prova (`verificatest`, `utenteprova`, `nuovoaccount`…).
- **Da fare per iniziare:** collegare il connettore Supabase su claude.ai (Personalizza → Connettori) e aprire una nuova sessione.

### Sicurezza: da risolvere durante la migrazione (trovati il 1/10/2026)
- [ ] **Dati privati leggibili da chiunque:** `/api/get-profile?u=nome` restituisce tutti i campi tranne password e bozza, compresi `lead_capture_leads` (nomi e contatti lasciati dai visitatori), `email` del proprietario e `analytics_log`. È un problema GDPR. Correzione: `get-profile` deve restituire ai visitatori solo i campi pubblici.
- [ ] **Contatti e statistiche modificabili senza login:** la pagina pubblica invia a `update-profile` l'intera lista di `lead_capture_leads` e di `analytics_log`, che sono scrivibili senza token. Chiunque può svuotarle o riempirle di dati falsi. Correzione: un'API che aggiunge **un solo** contatto e una che registra **un solo** click, senza mai ricevere o rimandare l'intera lista.
- [ ] **VIP Vault:** PIN e link protetto arrivano entrambi al browser e il controllo avviene lì, quindi il link si legge dagli strumenti per sviluppatori. Correzione: verificare il PIN sul server e mandare il link solo se il PIN è giusto.

---

## 2. Da fare prima del passaggio su `main`

- [ ] Test completi sul Preview di `sviluppo-v2`, usando sempre l'indirizzo **fisso** del branch:
  `https://myquicktag-git-sviluppo-v2-gigiceva-codes-projects.vercel.app`
  (ogni deploy ha anche un indirizzo suo, ma i dati salvati nel browser e le app installate restano legati all'indirizzo usato).
- [ ] **Database di produzione (Airtable):** il Preview usa la base "MyQuickTag (Copy)". Verificare che la base usata dal sito pubblico abbia le stesse colonne, in particolare:
  - `quick_action_copertina` (testo)
  - `data_inizio` e `data_scadenza` (data)
  - **Sistemato l'1/10/2026** sulla base "MyQuickTag" (Table 1), che risultava vuota (0 record):
    - aggiunte le 24 colonne che mancavano rispetto alla copia (`quick_action_copertina`, `analytics_log`, `lead_capture_*`, `shop_*`, `video_*`, `partners_data`, ecc.);
    - `avatar_url` e `digital_style` ora sono testo, come nella copia: prima erano allegato e selezione singola, e Airtable rifiutava i salvataggi dell'editor;
    - le due colonne vecchie, vuote, sono state rinominate `avatar_url_VECCHIO_da_eliminare` e `digital_style_VECCHIO_da_eliminare` e si possono eliminare a mano.
  - Al 1/10/2026 su Vercel `AIRTABLE_BASE_ID` è un'unica variabile per Production e Preview e punta alla Copy, usata solo per il limite di chiamate. Con la migrazione a Supabase questo punto viene superato.
- [x] **Variabili d'ambiente su Vercel (Production):** `SESSION_SECRET`, `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_ID` (verificate il 1/10/2026, tutte presenti). Dopo la migrazione andranno sostituite da quelle di Supabase.
- [ ] Unire `sviluppo-v2` in `main` (pull request) e ricontrollare il sito pubblico.
- [ ] Dopo il passaggio, le tag già attive ricevono 90 giorni pieni dal primo accesso (nessuna viene disattivata d'ufficio): verificare su un paio di tag reali.

---

## 3. Da sapere (comportamenti voluti, non bug)

- **Blacklist e goldlist dei nomi:** l'elenco è in `lib/nomi-riservati.js` e lo controlla il server (`api/check-and-create.js`), non più il browser. Per aggiungere o togliere un nome basta modificare quel file.
  - Blacklist: il nome non si può prenotare.
  - Goldlist e nomi con meno di 3 caratteri: niente prenotazione automatica, compare il popup "Global Premium Tag" con l'email a vip@myquicktag.it. Un nome Premium già assegnato risulta "occupato".
  - Le nuove prenotazioni accettano solo lettere e numeri, come già indicato nella home.

- **Sessione:** dopo il login il "pass" vale 90 giorni e si rinnova a ogni utilizzo (come Instagram/Google). Va rifatto il login solo dopo 90 giorni senza aprire la tag o l'editor.
- **Prenotazione:** dura 24 ore ed è legata al browser che l'ha fatta (ricevuta firmata).
- **iPhone:** l'app installata ha dati separati da Safari, quindi dopo l'installazione il proprietario deve rifare il login una volta dentro l'app (limite di Apple).
- **Durata tag:** 90 giorni + 14 di grazia (tag ancora online e modificabile), poi disattivata finché non viene rinnovata. I contenuti non vengono cancellati.
