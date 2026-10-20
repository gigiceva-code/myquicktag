# Promemoria pre-lancio — myquicktag

Cose da decidere o completare **prima di andare online** su myquicktag.it.
Aggiornare questo file ogni volta che un punto viene chiuso o se ne aggiunge uno.
Per il contesto di lavoro (come lavorare, dove sta cosa, test) vedi `PASSAGGIO-CONSEGNE.md`.

---

## 0. Account (Supabase Auth) — da completare prima di unire in `main`

Codice pronto su `sviluppo-v2` (11/10/2026): account con email privata verificata, password, recupero con codice,
dashboard con più tag, nomi protetti riservabili a un'email. Provato con un finto Supabase (152 prove server + 39 nel
browser). **Mancano le prove con il Supabase vero** (da questa sessione non si raggiunge) e alcune impostazioni che
può fare solo il titolare (o va autorizzato esplicitamente):

**Semplificato l'11/10/2026:** il browser usa sempre lo stesso progetto Supabase del server
(`api/account.js?azione=config`), quindi basta che le variabili di Vercel puntino al progetto giusto (Preview →
`myquicktag-prova`, Production → `myquicktag`); la conferma dell'email
funziona col link dell'email standard di Supabase (si tocca il link, si torna e si preme "Ho confermato"), quindi
**non serve cambiare i modelli delle email**. Resta una sola impostazione di Supabase (Authentication → URL Configuration),
da fare su ciascun progetto:

**A. Progetto di prova `myquicktag-prova` (usato dal Preview) — fatto il 12/10/2026 via API:**
- [x] *Site URL* = `https://myquicktag.it`
- [x] *Redirect URLs*: `https://myquicktag.it/**` e `https://*-gigiceva-codes-projects.vercel.app/**`
- [x] Lunghezza minima password 8 (la pagina la chiede già).
- [x] Vercel, solo ambiente **Preview**: `SUPABASE_URL` e `SUPABASE_SECRET_KEY` puntano a `myquicktag-prova`
      (Production invariato: progetto `myquicktag`).
- *Email Templates* con il codice (`{{ .Token }}`): **non si possono cambiare** sul piano gratuito finché non c'è un
  servizio SMTP (risposta dell'API di Supabase, 12/10/2026). Fino ad allora l'email contiene **solo il link** (in inglese):
  la pagina dice "tocca il link, poi torna qui e premi Ho confermato". Con l'SMTP (punto C) si mettono i modelli in
  italiano con il codice (già pronti nella sessione del 12/10: codice grande + link come alternativa).
- Il progetto di produzione `myquicktag` **non è ancora configurato**: si fa al rilascio (punto E).
- Le email arrivano solo agli indirizzi del team Supabase finché non c'è l'SMTP (punto C).

**B. Database:** il Preview usa il **database di prova** (`myquicktag-prova`), che ha già tutte le migrazioni: le prove
si fanno lì e non toccano la produzione. La migrazione `20261011000000_account_proprietari.sql` (solo aggiunte) va
applicata alla produzione solo al rilascio (punto E), con una copia di sicurezza prima (decisione del titolare).

**C. Email ai clienti (prima del lancio, anche per il progetto di produzione):**
- Scelto **Resend** (13/10/2026: gratis 3.000 email/mese, 100/giorno, nessun marchio nelle email). La chiave è
  nell'ambiente della sessione come `RESEND_API_KEY` (è "solo invio": basta per l'SMTP, non per gestire i domini; per
  quello si usa il connettore Resend della sessione).
- [x] Dominio `notifiche.myquicktag.it` aggiunto su Resend (14/10/2026, regione Europa `eu-west-1`, tracciamento di
      aperture e click spento). Il DNS di myquicktag.it è su **register.it** (nameserver `ns1/ns2.register.it`).
- [x] **Titolare:** (fatto il 14/10/2026) aggiungere in register.it → Gestione DNS di myquicktag.it questi 4 record (il "Nome" è la parte prima
      di `.myquicktag.it`; i valori esatti si rileggono su resend.com → Domains → notifiche.myquicktag.it):
      - TXT `resend._domainkey.notifiche` → la chiave lunga `p=MIGf…` (DKIM)
      - MX `send.notifiche` → `feedback-smtp.eu-west-1.amazonses.com`, priorità 10
      - TXT `send.notifiche` → `v=spf1 include:amazonses.com ~all`
      - CNAME `rsend.notifiche` → `send.forge.rmta.net`
      Non toccano il sito né altre email del dominio (sono tutti sotto `notifiche`).
- [x] Dominio verificato su Resend (14/10/2026) e prima email di prova arrivata al titolare nella posta principale di Gmail (non nello spam).
- [x] Modelli email in italiano con codice grande + pulsante (`supabase/email/`: conferma, recupero, cambio email,
      accesso) e script `supabase/email/applica.py` che collega l'SMTP di Resend a un progetto Supabase, carica modelli e
      oggetti e alza il limite a 30 email/ora. Mittente: `myquicktag <no-reply@notifiche.myquicktag.it>`.
- [x] SMTP di Resend e modelli italiani collegati a `myquicktag-prova` (14/10/2026, `applica.py lmxxoxrsrwmtunyqlpbh`):
      ora le email arrivano a **qualsiasi** indirizzo, non solo al team Supabase.
- [x] Prova del titolare sul Preview (14/10/2026): registrazione con il codice e "Password dimenticata" con il codice
      funzionano; la vecchia password non è accettata come nuova. Corretto prima un difetto: tornando dall'app della
      posta il telefono ricaricava la pagina, che ripartiva da email e password (ora ricorda il passaggio in corso).
- [x] Produzione collegata il 18/10/2026 (`applica.py atlhrkkfovblkhgzfeuo`).
- [ ] Dopo l'SMTP: valutare con il titolare se la pagina di accesso deve mettere il **codice** al primo posto e il link
      come alternativa (oggi è il contrario, perché finora l'email aveva solo il link).

**D. Collaudo sul Preview (titolare, dal telefono) — da annotare qui:**
- [x] crea account con la propria email → conferma col link → la tag si attiva (12/10/2026);
- [x] il visitatore la vede da un altro telefono (QR) e prova "SALVA" → Pocket (19/10/2026, sito vero, Android della moglie:
      "Salvata", poi la tag nel Pocket con l'invito "Ritrovalo con un tocco");
- [x] seconda tag dalla dashboard (15/10/2026); [x] "Password dimenticata" → codice → nuova password (14/10/2026); [x] l'altro dispositivo deve
      riaccedere; [x] la vecchia password non funziona (15/10/2026); [x] "Esci da tutti i dispositivi" (18/10/2026, da PC → telefono);
- [ ] app installata su iPhone (18/10/2026, sito vero, iPhone 16 Pro): installazione e flusso ok come su Android, ma l'app
      riapriva ogni volta l'invito "Installa ora / Continua senza installare" (l'indirizzo conservava `welcome=1`).
      Corretto lo stesso giorno (pull request #8): ricontrollato il 19/10, l'app apre direttamente la tag. Il bordo alto
      della card spariva sotto la barra di stato: corretto con la pull request #10 (spazi riservati di iPhone);
- [x] app installata su Android (18/10/2026: due tag dello stesso account installate, tutto a posto): aprire il link **direttamente in Chrome** (non dal browser interno di Gmail/WhatsApp,
      che non permette l'installazione: lì compare "Apri dal browser Chrome per installare").
      L'installazione si fa dalla **tag pubblica** (`/u/<nome>`), non dall'editor (l'editor non è un'app installabile).
      Corretto il 12/10/2026 su `sviluppo-v2`: il manifest non elenca più l'icona SVG, che Chrome sceglieva e scartava
      ("Questa app non può essere installata"). **Lo stesso difetto c'è in produzione** finché non si unisce in `main`.
- (non necessaria ora) nome protetto riservato a un'email: richiede un secondo indirizzo del team Supabase.

**E. Rilascio in produzione (dopo D e la revisione):**
- [x] Backup (18/10/2026): `nomi_riservati` esportata in CSV (3.238 nomi) e salvata dal titolare sul suo PC; `tags` vuota.
- [x] Applicata `20261011000000_account_proprietari.sql` al progetto `myquicktag` (18/10/2026, con conferma del titolare).
- [x] Produzione `myquicktag` (18/10/2026): Site URL `https://myquicktag.it`, Redirect `https://myquicktag.it/**` e
      `https://www.myquicktag.it/**`, password minima 8; SMTP di Resend e modelli italiani (`applica.py atlhrkkfovblkhgzfeuo`).
- [x] Unito `sviluppo-v2` in `main` (18/10/2026, pull request #7, merge commit).
- [ ] Prove sul sito vero: [x] account del titolare con email vera e tag @myquicktog (18/10); [x] visitatore (19/10); [x] iPhone (19/10, cornice corretta con #10).
- Annullamento: "Instant Rollback" di Vercel al deployment precedente. La colonna `proprietario_id` è innocua per il
  codice vecchio (si può lasciare).

**Note legali (non è una consulenza):** informativa privacy e termini da aggiornare con email dell'account,
consenso promozionale facoltativo (salvato con data e versione del testo), comunicazioni di servizio, Supabase come
fornitore dell'autenticazione e il servizio email scelto.

**Privacy, cookie e termini (prima del lancio pubblico, non prima delle prove):**
- Oggi i link "Privacy Policy" e "Termini di Vendita" in fondo alla home sono vuoti (`href="#"`): non esistono le pagine.
- Il sito non usa cookie di profilazione né statistiche esterne: solo memoria tecnica del telefono (accesso, Pocket,
  bozza). Per i soli strumenti tecnici di norma non serve il banner dei cookie, ma serve l'informativa.
- [x] Caratteri: dal 18/10/2026 il carattere Inter è servito dal sito stesso (`fonts/`, licenza libera OFL), non più da
      Google Fonts. Dal 18/10 lo caricano anche la home e `celebration.html` (richiesta del titolare): ora tutte le pagine usano Inter.
- [x] Icone dei link nell'editor (20/10/2026): tolto il servizio favicon di Google; l'editor mostra la stessa icona della
      tag pubblica. Ora il sito non carica più niente dai server di Google.
- Da scrivere: informativa privacy (titolare, email dell'account, contatti lasciati nel vasetto — di cui è titolare
  l'attività, myquicktag li custodisce per suo conto —, fornitori Supabase, Vercel, Resend, durata, diritti),
  informativa cookie, termini del servizio (con la regola sui nomi usati per imitare persone o marchi, sezione 2).
- Serve dal titolare: nome e un recapito da indicare come titolare del trattamento (anche un'email dedicata).
  Consigliata una revisione da un professionista prima del lancio.
- Collaudo: 16/10/2026 il titolare prova da PC il secondo dispositivo ("Esci da tutti i dispositivi", riaccesso dopo
  cambio password); iPhone sabato 17/10 (telefono della figlia); Android = il suo telefono.

---

## 1. Da decidere (prodotto)

### Rinnovo e checkout prima/dopo i 90 giorni
- ~~Regola: i 90 giorni gratuiti valgono una sola volta.~~ **Superata il 09/10/2026:** vedi "Strategia di lancio"
  qui sotto (se i rinnovi non bastano, altri 3 mesi gratis con tutto sbloccato).
- **Da decidere al lancio:** prezzi dei piani (Base / Premium / Gold), periodicità (mensile, annuale…), cosa paga il cliente alla scadenza.
- **Stato attuale del codice:** dall'11/10/2026 il rinnovo gratuito dalla dashboard è **spento** (il pulsante non compare e il server lo rifiuta). Si accende con la variabile `RINNOVO_GRATUITO=si` su Vercel quando il titolare decide di regalare altri 3 mesi.
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

### Strategia di lancio: 3 mesi gratis con tutto sbloccato (deciso il 09/10/2026)
- **Perché (il titolare non vuole doverlo ripetere):** il titolare è lavoratore dipendente e la famiglia
  (moglie e tre figli) vive del suo unico stipendio. Non vuole aprire partita IVA e pagare tasse e
  contributi prima di sapere se il prodotto vende. Quindi al lancio **nessun incasso**: tutto è gratis.
- **Durante i 3 mesi:** ogni tag attiva ha **tutto sbloccato** (come il Gold), nell'editor e sulla tag
  pubblica. La frase della home "Tre mesi di accesso completo" diventa vera.
- **Alla fine dei 3 mesi (da decidere allora, in base ai numeri):**
  - se ci sono abbastanza clienti pronti a rinnovare → si apre l'attività (prima: commercialista) e si
    attiva il pagamento con Stripe;
  - altrimenti → messaggio di ringraziamento ai clienti e **altri 3 mesi gratis, sempre tutto sbloccato**.
- **Quando si fa nel codice:** il titolare propone il giorno del lancio. Concordato: **nell'ultima
  settimana prima del lancio**, non il giorno stesso (vedi sezione 2). Il lavoro:
  - una regola sola decisa dal server ("questa tag ha tutto sbloccato fino al…"), letta da editor e
    tag pubblica; oggi editor e tag usano regole diverse e "Simula Gold" nell'editor sblocca tutto per sempre;
  - togliere i blocchi/sfocature e "Simula" durante la prova;
  - rinnovo gratuito di altri 3 mesi attivabile dal titolare (oggi c'è un pulsante di prova "Rinnova
    gratis" da rivedere, vedi sopra).
- **Collegato:** per mandare il messaggio a fine prova serve l'**email del cliente**, che oggi non chiediamo
  (audit, punto 1.4): va raccolta dal lancio, altrimenti non si potrà avvisare nessuno.

### Account omaggio per persone scelte (al lancio, su richiesta del titolare)
- Il titolare configurerà personalmente, sul telefono di ciascuno, le tag di alcuni titolari di attività e amici
  influencer, e vuole che quegli account siano **senza obbligo di rinnovo** per un anno o per sempre.
- Da fare nel codice **solo quando il titolare lo chiede** (es. una data di scadenza "omaggio" decisa dal server).

### Modello dei piani e pagamenti (dopo la prova, in sospeso)
- Proposta discussa: Base gratis per sempre (con "Creato con myquicktag"), Premium e Gold a pagamento,
  prova con tutto sbloccato (Gold) e cambio piano libero durante la prova; a fine prova si torna al Base
  senza perdere contenuti (sezioni nascoste, non cancellate).
- Prezzi indicativi emersi dal confronto con i concorrenti: Premium ~4,90 €/mese, Gold ~14,90 €/mese
  (annuale scontato), eventuale prezzo fondatori. Da validare con clienti veri.
- Fiscale: finché tutto è gratis non c'è incasso. Prima di attivare i pagamenti: consulenza con un
  commercialista (codice ATECO, forfettario da dipendente, esonero INPS commercianti, IVA vendite online).

### Prezzo mostrato nel checkout di attivazione
- [x] Deciso dal titolare il 20/10/2026: il totale mostra **"Gratis per 3 mesi"** (prima "€19,00").
- Restano nel checkout loghi delle carte, "pagamento sicuro" e "Procedi al pagamento sicuro" (segnaposto voluto di Stripe):
  da valutare con il titolare se cambiarli finché è tutto gratis.

---

## 2. Stato del passaggio su `main` e prima del lancio

- [x] **Database migrato da Airtable a Supabase** (progetto `myquicktag`, Francoforte, tabella `tags`).
  Struttura in `supabase/migrations/`; importate le 8 tag di prova della base "MyQuickTag (Copy)".
- [x] **Variabili d'ambiente su Vercel (Preview e Production):** `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`.
  - Production: `SUPABASE_URL` = `https://atlhrkkfovblkhgzfeuo.supabase.co` (progetto `myquicktag`).
  - Preview (dal 12/10/2026): `SUPABASE_URL` = `https://lmxxoxrsrwmtunyqlpbh.supabase.co` (progetto `myquicktag-prova`).
  - `SUPABASE_SECRET_KEY` = dashboard Supabase del progetto corrispondente → Project Settings → API Keys → **Secret key** (`sb_secret_…`). Mai nel codice o nel browser.
  - Le variabili `AIRTABLE_*` non servono più e si possono togliere.
- [x] Unito `sviluppo-v2` in `main` (pull request #2, 04/10/2026).
- [ ] Test con due telefoni sul sito pubblico: contatto lasciato da un visitatore → Dashboard → I miei contatti.
- [x] **Secondo giro di sicurezza** (su `sviluppo-v2`, da unire in `main`):
  - testi del proprietario ripuliti prima di salvarli e prima di mostrarli (`lib/pulizia.js`, `session.js` → `mqtPulisci`): nessun codice nascosto o link `javascript:` nella tag pubblica; Pocket mostrato in modo sicuro;
  - password protette con scrypt (`lib/password.js`); le vecchie si aggiornano da sole al primo login;
  - limiti ai tentativi (`lib/limiti.js`, tabella `limiti`): login, cambio password, prenotazioni, contatti del vasetto;
  - black list e gold list controllate dal server: le liste sono nella tabella `nomi_riservati` del database (si gestiscono dal Table Editor di Supabase, con regole "esatto"/"contiene" e riconoscimento delle varianti come "p0ste"); nel codice restano solo i nomi delle pagine del sito (`lib/nomi-riservati.js`); vedi sotto "sistema dei nomi protetti";
  - lo stato della tag si cambia solo all'attivazione ("in attesa" → "attivo" con la password).
- [x] Liste dei nomi protetti caricate (3.238 nomi, `supabase/nomi-protetti/`).
  - Deciso (04/10/2026): i nomi generici di attività (`@pizzeria`, `@avvocato`, `@fotografo`…, fisiche e digitali) sono **riservati a myquicktag** come future vetrine di categoria. Solo la parola nuda: `@pizzeriadamario` resta libero. Si possono liberare in seguito.
  - Fatto (04/10/2026, specifica concordata con ChatGPT): **sistema dei nomi protetti**.
    - Forma canonica unica (`lib/nome-canonico.js`): "Coca-Cola", "coca_cola", "Cristiáno Ronaldo" → `cocacola`, `cristianoronaldo`. Simboli/emoji rifiutati, max 30 caratteri. Il database accetta solo questa forma, quindi `mario`, `Mario`, `mario-` sono la stessa tag; `mario1` e `marioi` restano diverse.
    - Tabella `nomi_riservati`: `tipo` = system / black (riservato) / gold (il titolare lo chiede a vip@myquicktag.it); `categoria`; `attivo`. Nel Table Editor il nome si può scrivere come viene ("Coca-Cola"): si salva da solo in forma canonica. Somiglianze riconosciute: 0→o, 1→i/l, 3→e, 4→a, 5→s, 7→t ("netf1ix").
    - Il controllo si ripete all'attivazione: un nome entrato in lista dopo la prenotazione non si attiva.
    - **Come assegnare un nome gold al titolare verificato** (finché non c'è il codice di sblocco): nella riga del nome metti `attivo` = false → il titolare prenota e attiva la tag → rimetti `attivo` = true (le tag già attive non vengono toccate dalla lista).
    - Liste caricate il 04/10/2026: 3.238 nomi (sorgente in `supabase/nomi-protetti/`). Se emergono buchi o blocchi sbagliati si correggono dal Table Editor (o in `liste.py` + caricamento).
    - Futuro: codice di sblocco per le assegnazioni manuali; eventuale tipo "segnala"; liste ampliate per categoria.
- [x] Documenti interni, test e `supabase/` esclusi dal sito pubblico (`.vercelignore`).
- [x] Svuotata la tabella `tags` della produzione (13/10/2026, 10 tag di prova, su richiesta del titolare). Da ripetere
      prima del lancio se nel frattempo se ne creano altre di prova.
- [ ] **Ultima settimana prima del lancio:** regola "3 mesi tutto sbloccato" nel codice (sezione 1,
  "Strategia di lancio"), provata dal titolare sul telefono prima del giorno del lancio.
- [ ] **Da fare prima del lancio pubblico (deciso 04/10/2026):** tasto **"Segnala questa tag"** sulla tag pubblica (impersonazione, marchi, contenuti offensivi) e **regola nei termini di servizio**: myquicktag può riprendersi un nome usato per imitare una persona o che viola un marchio e assegnarlo al legittimo titolare. Coprono i casi che le liste non possono prevedere (come fanno Instagram, X, Google).
- [ ] Ancora aperti (minori): ~~cambiare password non fa uscire gli altri dispositivi~~ (risolto con gli account: dopo cambio/recupero password gli altri dispositivi escono); visite e click delle statistiche non hanno limiti (si possono gonfiare); attivazione senza pagamento finché non c'è Stripe; funzioni server a 10 su 12 del piano gratuito di Vercel.

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
