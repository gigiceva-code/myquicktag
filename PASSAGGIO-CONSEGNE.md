# Passaggio di consegne — myquicktag

Da leggere all'inizio di ogni nuova sessione di lavoro, insieme a `PRE-LANCIO.md`
(decisioni aperte e cose da fare prima del lancio). Aggiornato al 14/10/2026.

---

## Come lavorare con il titolare

- Scrivere **in italiano**, con spiegazioni semplici e concrete: il titolare non è uno sviluppatore.
  Dire cosa cambia per lui e per i clienti, non i dettagli tecnici.
- Prima di cambiare il **prodotto** (piani, prezzi, cosa vede il cliente) chiedere; per correzioni e
  sicurezza si può procedere spiegando dopo.
- **Flusso git:** si lavora sul ramo `sviluppo-v2`; quando è pronto si apre una pull request verso
  `main` e, se il titolare lo chiede, la si unisce con "merge commit" (finora l'ha sempre chiesto).
  Dopo l'unione riallineare `sviluppo-v2` a `main` (fast-forward).
- **Prove:** il titolare prova dal telefono. Il Preview di Vercel è protetto (serve l'accesso a Vercel
  o un "link di condivisione"). Dall'11/10/2026 il Preview deve usare il **database di prova**
  (`myquicktag-prova`, vedi sotto): mai provare il codice di `sviluppo-v2` sul database di produzione.
- Il titolare non vuole spese: piano gratuito di Supabase e di Vercel.
- ChatGPT fa da "product strategist": il titolare a volte incolla i suoi messaggi. Valutarli nel merito
  (si può dissentire motivando); l'ultima parola è del titolare.

## Scelte volute (non segnalarle come errori negli audit)

- **Checkout con pagamento simulato** (`checkout.html`: prezzo, loghi delle carte, "pagamento sicuro",
  "Transazione approvata"): è lasciato apposta come segnaposto del futuro pagamento con Stripe.
  Durante i test l'attivazione resta gratuita. Va collegato a Stripe quando il titolare decide prezzi e aspetti fiscali.
- Se il titolare indica altre scelte volute, aggiungerle qui.

## Dove sta cosa

- **Sito pubblico:** https://myquicktag.it (Vercel, ramo `main`). Tag pubblica: `/u/<nome>`.
- **Vercel:** team `gigiceva-codes-projects`, progetto `myquicktag`.
  Variabili: `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (Production → progetto `myquicktag`;
  Preview → progetto `myquicktag-prova`, impostato il 12/10/2026). Facoltativa: `RINNOVO_GRATUITO=si`
  accende il rinnovo gratuito dalla dashboard (spento di base).
  Funzioni server: 10 su 12 consentite dal piano gratuito (limite riportato da forum/issue, da confermare nel pannello).
- **Supabase produzione:** progetto `myquicktag` (id `atlhrkkfovblkhgzfeuo`, Francoforte).
  Tabelle: `tags` (una riga per tag, con `proprietario_id` dopo la migrazione dell'11/10), `limiti` (contatori anti-abuso),
  `nomi_riservati` (nomi protetti: system/black/gold, con `categoria`, `attivo`, `assegnato_a`).
  Tutte con RLS attivo e nessuna policy: ci accede solo il server con la chiave segreta (scelta voluta: il browser non legge mai le tabelle).
  Struttura e funzioni SQL in `supabase/migrations/` (vanno applicate anche al database, non bastano nel codice).
  ⚠️ La migrazione `20261011000000_account_proprietari.sql` **non è ancora applicata alla produzione**.
- **Supabase prova:** progetto `myquicktag-prova` (id `lmxxoxrsrwmtunyqlpbh`, Francoforte, gratuito), creato l'11/10/2026
  con tutte le 7 migrazioni. Serve al Preview di Vercel e alle prove di account/recupero password.
  Contiene il nome gold di prova `barsport` assegnato a `mario@esempio.it`.
- **Account (Supabase Auth):** email privata + password, verifica con codice, recupero, sessioni. Le email
  (codici) le manda Supabase: senza un servizio SMTP collegato arrivano **solo ai membri del team del progetto**
  (limite di Supabase), quindi prima del lancio va collegato un servizio di invio (vedi `PRE-LANCIO.md`).
- **Resend (email):** dominio `notifiche.myquicktag.it` verificato il 14/10/2026 (record DNS su register.it) e collegato a
  `myquicktag-prova`; la produzione si collega al rilascio.
  Modelli in italiano e script di collegamento in `supabase/email/` (vedi `PRE-LANCIO.md` → C).
  Il Supabase di prova risponde con codici di **8 cifre** (`mailer_otp_length`); la pagina di accesso li accetta.
- **Airtable:** non più usato (le basi restano solo come archivio).

## Come è fatto il codice

- Pagine statiche HTML/JS (`index`, `tag` + `tag-logic.js`, `edit` + `edit-logic.js`, `profile`
  = dashboard della singola tag, `contatti`, `account`, `pocket`, `analytics`, `checkout`, `celebration`;
  `accesso` = accedi / crea account / codice / password dimenticata; `dashboard` = tutte le tag dell'account).
- `api/` = funzioni server Vercel; `lib/` = moduli comuni del server:
  `db.js` (Supabase), `pulizia.js` (testi senza codice), `password.js` (scrypt), `limiti.js`,
  `nome-canonico.js` (forma unica dei @nomi: usarla per ogni nome che arriva dal browser),
  `nomi-riservati.js`, `abbonamento.js` (90 giorni + 14 di grazia).
- **Accesso (dall'11/10/2026):** account Supabase Auth. Il browser usa la libreria ufficiale (caricata da `session.js`
  solo quando serve) e ogni chiamata a `/api/` parte con la sessione (intestazione Authorization). Il server
  (`lib/sessione.js`) chiede a Supabase chi è l'utente e controlla `tags.proprietario_id`: è l'unica prova di proprietà.
  Le **ricevute di prenotazione** (HMAC con `SESSION_SECRET`, 24 ore) valgono solo per una tag "in attesa" senza
  proprietario: servono a provare l'editor prima di avere un account. Il vecchio accesso "@nome + password" è dismesso
  (`api/login.js`, `api/change-password.js` rimossi); le tag vecchie si collegano a un account una volta sola dalla
  dashboard ("Hai una tag creata prima degli account?", `api/account.js` azione `collega-vecchia`).
- `api/account.js`: elenco delle tag dell'account (dashboard) e collegamento delle tag vecchie.
- **Pocket del visitatore (13/10/2026, testi approvati dal titolare):** "SALVA" sulla tag pubblica mette la tag nel
  Pocket (`pocket.html`) **solo su quel telefono** (`localStorage` `mqt_pocket`), senza account e senza dati al server.
  Al primo salvataggio un invito facoltativo; nel Pocket un riquadro "Ritrovalo con un tocco" per metterlo sulla
  schermata Home ("No, grazie" lo nasconde per sempre) e in fondo una sola riga "Hai un'attività? Crea anche tu la tua tag."
  Va percepito come un servizio, non come pubblicità: niente finestre automatiche, niente richieste di email.
  Il Pocket ha un suo manifest (`pocket-manifest.json`), ma **non su iPhone**: lì l'app installata avrebbe una memoria
  separata da Safari e risulterebbe vuota, quindi l'icona sulla Home apre Safari. Rimossa la vecchia sincronizzazione
  "cloud" del Pocket (era legata al login dismesso). Futuro, dopo il lancio: copia del Pocket legata a un account.
- **Forma "divider" del @nome:** il rombo va sotto il nome se sta su una riga, esattamente tra le due righe se va a capo.
  Lo decide `session.js` → `mqtBadgeNome` misurando il nome (non contando le lettere). Nell'esagono il nome lungo si
  rimpicciolisce fino a stare dentro.
- `session.js` (caricato da tutte le pagine): `mqtSessione` (account, ricevute, portachiavi del dispositivo,
  `proprietarioOppureEsci`) e `mqtPulisci` (pulizia dei testi prima di mostrarli).
- I dati privati del proprietario (contatti del vasetto, statistiche, Pocket, bozza) arrivano solo al proprietario
  (`api/get-profile.js` usa elenchi espliciti dei campi). I visitatori scrivono solo tramite `api/add-lead.js` e `api/track-click.js`.
- **Account omaggio al lancio (intenzione del titolare, chiarita il 12/10/2026):** il titolare regalerà l'uso di
  myquicktag ad alcune persone scelte (titolari di attività, amici influencer), configurando lui le loro tag **sul
  telefono di ciascuno**, a mano, con l'account e l'email della persona. Quando lo chiederà, servirà un modo per rendere
  quegli account **senza obbligo di rinnovo** (per un anno o per sempre): **non è ancora nel codice**, non anticiparlo.
  ⚠️ Malinteso della sessione precedente: il titolare **non** ha mai chiesto di "assegnare una tag Gold a un'altra persona".
- **Nome protetto riservato a un'email (`nomi_riservati.assegnato_a`, nel codice dall'11/10):** se il nome di una persona
  scelta è nella lista dei nomi protetti (es. un nome famoso), si scrive la sua email in `assegnato_a`: solo il suo
  account può prenotarlo ("Le mie tag" → "Aggiungi una tag") e la tag nasce già sua. Non c'entra con il piano Gold né
  con la durata. Dopo l'attivazione si può svuotare `assegnato_a`. Il titolare non conosce mai la password della persona.
- `.vercelignore` esclude dal sito pubblico documenti interni, test e `supabase/`.

## Test

- `node test/api.test.mjs` → 152 prove delle funzioni `api/` con un finto database e un finto Supabase Auth
  (nessuna installazione). Rilanciarle dopo ogni modifica al server e aggiungerne per le novità.
- `test/account.e2e.mjs` + `test/finto-supabase.mjs` → 46 prove nel browser (telefono simulato): registrazione con
  codice, attivazione, multi-tag, nome gold assegnato, tag di altri account, recupero password, revoca delle sessioni,
  uscita, pagina ricaricata mentre si aspetta il codice (succede passando all'app della posta). Istruzioni in testa al file (servono Playwright e la libreria di Supabase).
- `test/xss-tag.e2e.mjs` → prova nel browser che la tag pubblica non esegua codice nascosto
  (istruzioni d'uso in testa al file; serve Playwright).
- Dalla sessione cloud non si raggiungono `*.vercel.app` né molti siti esterni: le prove sul sito vero
  le fa il titolare, poi si controllano i log/dati su Supabase.

## Prossimi passi (in ordine)

0. **Account con Supabase Auth (11/10/2026) — da collaudare e configurare**: codice su `sviluppo-v2`, migrazione
   applicata solo al database di prova. Prima dell'unione in `main` servono le configurazioni manuali e le prove
   elencate in `PRE-LANCIO.md` → "Account". Non unire in `main` prima della revisione.
1. **Audit di UI, UX e marketing: fatto (04/10/2026)** → `AUDIT-UI-UX-MARKETING.md` (schermate in `audit/`).
   Contiene il piano di lavoro A/B/C: prima le correzioni (A, a partire dall'errore "contenuti non pubblicati
   all'attivazione"), poi i testi (B, serve l'ok del titolare) e le decisioni di prodotto (C).
   Per rifare le schermate: copia locale del sito con finto database + Playwright (vedi "Come è stato fatto" nel file).
2. **Nomi protetti**: sistema e liste attivi (3.238 nomi, sorgente `supabase/nomi-protetti/`). Correggere i
   buchi o i blocchi sbagliati che segnala il titolare (Table Editor, o `liste.py` → `genera.py` → caricamento).
3. **Test con due telefoni** (in sospeso): un visitatore lascia un contatto nel vasetto → il titolare lo
   trova in Dashboard → I miei contatti.
4. Decisioni di prodotto aperte (vedi `PRE-LANCIO.md`): modello dei piani e prezzi, pagamenti Stripe,
   aspetti fiscali (prima di incassare: commercialista).
