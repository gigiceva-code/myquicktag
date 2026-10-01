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
  - **Controllo dell'1/10/2026** sulla base "MyQuickTag" (Table 1): `data_inizio` e `data_scadenza` ci sono, ma mancano **24 colonne** presenti nella copia:
    `pocket_cloud`, `cv`, `live_status_micro`, `live_status_action_type`, `live_status_action_label`, `live_status_action_url`, `flash_micro`, `analytics_data`, `analytics_log`, `review_url`, `review_contact`, `video_url`, `video_cta_text`, `video_cta_url`, `partners_data`, `lead_capture_attivo`, `lead_capture_titolo`, `lead_capture_leads`, `shop_attivo`, `shop_titolo`, `shop_prezzo`, `shop_link`, `shop_scadenza`, `quick_action_copertina`.
    Inoltre due colonne hanno un tipo diverso: `avatar_url` (allegato in produzione, testo nella copia) e `digital_style` (selezione singola in produzione, testo nella copia).
    Da verificare anche quale base usa davvero il sito pubblico (`AIRTABLE_BASE_ID` in Production).
- [ ] **Variabili d'ambiente su Vercel (Production):** `SESSION_SECRET`, `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_ID`.
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
