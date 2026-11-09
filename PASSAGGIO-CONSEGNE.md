# Passaggio di consegne — myquicktag

Da leggere all'inizio di ogni nuova sessione di lavoro, insieme a `PRE-LANCIO.md`
(decisioni aperte e cose da fare prima del lancio). Aggiornato al 23/10/2026.

---

## Come lavorare con il titolare

- Scrivere **in italiano** e **dare del tu** al titolare (richiesta del 23/10/2026), con spiegazioni semplici e concrete: il titolare non è uno sviluppatore.
  Dire cosa cambia per lui e per i clienti, non i dettagli tecnici.
- **Nomi e parole (04/11/2026, richiesta del titolare):** il marchio si scrive sempre **myquicktag**, tutto minuscolo
  (mai "MyQuickTag"). Nei testi usare il maschile universale ("l'amico", non "l'amica").
- **"Clic", non "tocco" (05/11/2026, richiesta del titolare):** nei testi si scrive "con un clic", "fai clic".
- **Marketing e conversione (richiesta del 27/10/2026):** il titolare non è un esperto di web marketing. Per ogni
  cosa che vedono i clienti proporre sempre, di propria iniziativa, la versione più professionale e orientata alla
  conversione (testi, posizione dei pulsanti, anteprime, misurazione), spiegando in breve il perché. Non limitarsi a
  "far funzionare" quello che chiede.
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

- **Tono e stile "lusso"** (24/10/2026, decisione del titolare): grafica, testi, manifest ed esperienza restano sulla linea
  del lusso (es. nero e verde, parole come "Identity", "Elite"). Il glossario "più semplice" proposto nell'audit (punto 2.2)
  non va applicato d'ufficio: eventuali ritocchi ai testi solo se il titolare li chiede e restando in quel tono.

- **Checkout senza pagamento** (`checkout.html`, rifatto il 23/10/2026: "Oggi paghi 0,00 €", "Nessuna carta richiesta",
  niente loghi delle carte): è il segnaposto del futuro pagamento con Stripe. Durante la prova l'attivazione resta gratuita. Va collegato a Stripe quando il titolare decide prezzi e aspetti fiscali.
- Se il titolare indica altre scelte volute, aggiungerle qui.

## Dove sta cosa

- **Sito pubblico:** https://myquicktag.it (Vercel, ramo `main`). Tag pubblica: `/u/<nome>`.
- **Vercel:** team `gigiceva-codes-projects`, progetto `myquicktag`. È l'unico progetto collegato al codice: il doppione
  `myquicktag-e34a` (senza variabili né dominio, rifaceva ogni pubblicazione) è stato eliminato dal titolare il 23/10/2026.
  Variabili: `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (Production → progetto `myquicktag`;
  Preview → progetto `myquicktag-prova`, impostato il 12/10/2026). Facoltativa: `RINNOVO_GRATUITO=si`
  accende il rinnovo gratuito dalla dashboard (spento di base).
  Funzioni server: 12 su 12 consentite (dal 29/10/2026, con `api/quickpass.js`) dal piano gratuito (limite riportato da forum/issue, da confermare nel pannello).
- **Supabase produzione:** progetto `myquicktag` (id `atlhrkkfovblkhgzfeuo`, Francoforte).
  Tabelle: `tags` (una riga per tag, con `proprietario_id` dopo la migrazione dell'11/10), `limiti` (contatori anti-abuso),
  `nomi_riservati` (nomi protetti: system/black/gold, con `categoria`, `attivo`, `assegnato_a`).
  Tutte con RLS attivo e nessuna policy: ci accede solo il server con la chiave segreta (scelta voluta: il browser non legge mai le tabelle).
  Struttura e funzioni SQL in `supabase/migrations/` (vanno applicate anche al database, non bastano nel codice).
  La migrazione `20261011000000_account_proprietari.sql` è applicata anche alla produzione dal 18/10/2026.
- **Supabase prova:** progetto `myquicktag-prova` (id `lmxxoxrsrwmtunyqlpbh`, Francoforte, gratuito), creato l'11/10/2026
  con tutte le 7 migrazioni. Serve al Preview di Vercel e alle prove di account/recupero password.
  Contiene il nome gold di prova `barsport` assegnato a `mario@esempio.it`.
- **Account (Supabase Auth):** email privata + password, verifica con codice, recupero, sessioni. Le email
  (codici) le manda Supabase: senza un servizio SMTP collegato arrivano **solo ai membri del team del progetto**
  (limite di Supabase), quindi prima del lancio va collegato un servizio di invio (vedi `PRE-LANCIO.md`).
- **Resend (email):** dominio `notifiche.myquicktag.it` verificato il 14/10/2026 (record DNS su register.it) e collegato a
  `myquicktag-prova` e, dal 18/10/2026, anche a `myquicktag` (produzione).
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
  (`api/login.js`, `api/change-password.js` rimossi). Tolto il 15/10/2026, su richiesta del titolare, anche il
  collegamento delle tag "create prima degli account" (riquadro della dashboard e azione `collega-vecchia`): la
  produzione non ha tag vecchie, quindi non servirà mai.
- `api/account.js`: elenco delle tag dell'account (dashboard) e configurazione pubblica di Supabase.
- `api/track-view.js` e `api/track-click.js` (statistiche): dal 23/10/2026 hanno limiti per IP (`lib/limiti.js`), oltre i quali
  la visita o il click non si conta (risposta normale, il visitatore non vede nulla).
- **Anteprima dei link (24/10/2026):** WhatsApp, Facebook, iMessage, Telegram ecc. non eseguono il JavaScript della tag.
  `vercel.json` riconosce questi programmi dallo user-agent e li manda a `api/manifest.js?anteprima=1`, che risponde
  con una pagina minima: titolo `@Nome`, bio come descrizione, foto della tag (Cloudinary, ritagliata 600×600) oppure
  l'immagine del marchio `icons/og-image.png` (1200×630, usata anche dalla home). Tag non attiva → anteprima generica;
  tag scaduta → solo il nome. Le persone ricevono sempre `tag.html`. Sta in `manifest.js` per restare a 11 funzioni.
  WhatsApp tiene in memoria le anteprime: per rivedere un link già mandato può servire qualche ora.
  Provato dal titolare il 24/10 (immagine, @nome e bio compaiono). Il link va scritto con `https://` e serve
  aspettare qualche secondo prima di inviarlo, altrimenti WhatsApp non prepara l'anteprima. Dal 25/10 "Condividi",
  QR, condivisione di sezione e Quick Pass usano tutti l'indirizzo `/u/<nome>` (prima `tag.html?u=`, senza anteprima).
- `api/segnala.js` (20/10/2026): "Segnala questa tag" dal pannello del QR; salva in `segnalazioni` (Table Editor,
  colonna `stato`: nuova / in esame / chiusa) e manda un'email a info@myquicktag.it con Resend (`RESEND_API_KEY` su Vercel).
- **Pocket del visitatore (13/10/2026, testi approvati dal titolare; dal 19/10 la conferma dice "@NOME è nel tuo Pocket…"):** "SALVA" sulla tag pubblica mette la tag nel
  Pocket (`pocket.html`) **solo su quel telefono** (`localStorage` `mqt_pocket`), senza account e senza dati al server.
  Al primo salvataggio un invito facoltativo; nel Pocket un riquadro "Ritrovalo con un tocco" per metterlo sulla
  schermata Home ("No, grazie" lo nasconde per sempre) e in fondo una sola riga "Hai un'attività? Crea anche tu la tua tag."
  Va percepito come un servizio, non come pubblicità: niente finestre automatiche, niente richieste di email.
  Il Pocket ha un suo manifest (`pocket-manifest.json`), ma **non su iPhone**: lì l'app installata avrebbe una memoria
  separata da Safari e risulterebbe vuota, quindi l'icona sulla Home apre Safari. Rimossa la vecchia sincronizzazione
  "cloud" del Pocket (era legata al login dismesso). Futuro, dopo il lancio: copia del Pocket legata a un account.
- **Navigazione dashboard (01/11/2026, segnalato dal titolare dopo la prova di Martina):** le dashboard sono due:
  `dashboard.html` = **"Identity Console"** (account, nuova; nome scelto dal titolare l'01/11) e `profile.html` =
  **"Gestione tag"** della singola tag (piano, rinnovo, bozza, QR; grafica vecchia). Tutti i "torna alla dashboard" portano all'Identity Console: editor dopo "Salva in dashboard",
  pulsante "Dashboard" della tag, accesso dalla home con il proprio @nome. `profile.html` resta raggiungibile da
  "Gestisci (piano, bozza, QR)" e dal checkout del rinnovo. Nell'editor, con un account, pulsante **"‹ IDENTITY CONSOLE"** in basso
  a sinistra (speculare a EDITOR) e freccia in alto a sinistra nel menu: esce senza modificare (con modifiche non salvate
  chiede conferma e scarta la bozza locale).
- **CONDIVIDI (27/10/2026, richiesta del titolare: "il biglietto da visita a un tocco"):** in copertina pillola
  CONDIVIDI in alto a sinistra (speculare a SALVA); in ogni stanza e sezione CONDIVIDI in basso accanto a
  CHIUDI/INDIETRO. Il link `/u/<nome>?sezione=stanza.sezione` (es. `network.contatti`) riapre la tag direttamente lì
  (`apriSezioneDaLink`, solo stanze/sezioni che la tag mostra). Solo per tag attive. I pulsanti erano stati tolti
  durante i rifacimenti di giugno e agosto. Prova: `test/condividi.e2e.mjs`.
  Il link parte con un messaggio ("@Nome: contatti, social e servizi in un unico tocco." / "@Nome · Contatti");
  l'anteprima di WhatsApp di un link di sezione è "@Nome · Contatti" (`NOMI_SEZIONI` in `api/manifest.js`);
  le condivisioni dei visitatori si contano nelle statistiche come "CONDIVISIONE TAG" / "CONDIVISIONE <STANZA>".
  Iconcine accanto ai singoli recapiti (28/10/2026): numero/email/indirizzo si condividono come testo + link ai
  contatti della tag (prima il numero diventava un link → 404, segnalato dal titolare); link social senza `https://`
  completati; i canali VIP (con PIN) non hanno più l'iconcina, che condivideva il link privato.
- **Killer features: testi delle strategie e delle info (audit del 28/10/2026, `edit-logic.js` → `databaseStrategie`,
  `edit.html` → `mostraInsight`):** stessa struttura per tutte (perché / come usarla con esempi da copiare / cosa ottieni),
  tono professionale, nessuna statistica senza fonte, nessuna promessa che la funzione non mantiene. Da rispettare anche
  in futuro: Scudo Reputazione mai "filtro delle recensioni negative" (vietato da Google, vedi sotto); Acquisto Istantaneo
  solo con scadenze reali; Vasetto: per le promozioni serve il consenso. Prova automatica in `test/api.test.mjs`.
- **Quick Pass "porta un amico" (Fase 1, 29/10/2026, decisa con il titolare):** `api/quickpass.js` (12ª funzione:
  il piano gratuito di Vercel è al completo, per altre funzioni accorparle), `quickpass-tag.js` (tag pubblica), cassa
  nell'editor (`caricaCassaQuickPass` in `edit-logic.js`), tabelle `quickpass_inviti` e `quickpass_pass` (migrazione
  `20261029000000_quick_pass.sql`, applicata a `myquicktag-prova` e, il 28/10/2026 con l'ok del titolare, a `myquicktag`). Percorso: chi consiglia crea dalla tag (Action Center → Quick Pass) il suo invito
  personale `/u/<tag>?pass=<invito>` → l'amico ritira un pass personale (nome obbligatorio, recapito facoltativo con
  consenso → "I miei contatti") → in cassa il QR apre `/u/<tag>?cassa=<codice>`: convalida il titolare (sessione) o un
  dipendente con il **PIN di cassa** (4-6 cifre, salvato solo come impronta scrypt, 10 tentativi ogni 15 minuti) →
  ogni N amici usati (impostazione `quickpass_amici_per_premio`, decisa dal commerciante) chi ha consigliato riceve un
  pass premio, da usare a sua volta in cassa. Un pass per telefono, niente pass con il proprio invito, codici monouso,
  limite di pass e fine campagna veri. I vecchi link `?qp_ref=invito` danno ancora il pass all'amico (senza premio).
  Pass amico valido 30 giorni (o fino a fine campagna), premio 60 giorni.
  **Antifrode (01/11/2026, dopo la prova del titolare: invito da Chrome, pass ritirato dallo stesso telefono con il
  browser di WhatsApp e convalidato → premio sbloccato a se stesso):** il titolare (sessione) non crea inviti né ritira
  pass sulla propria tag e vede invece un pannello con "Apri la cassa" e i numeri; si salvano anche le impronte del
  **telefono** (caratteristiche uguali in ogni browser: schermo, processore, fuso, lingue) e della **rete** (IP): stesso
  telefono + stessa rete di chi ha creato l'invito → ritiro bloccato; stesso telefono da un'altra rete o stesso nome →
  pass `sospetto`, la cassa vede "⚠ … verifica che sia davvero un nuovo cliente". In cassa compare sempre "Consigliato da".
  Migrazione `20261101000000_quick_pass_antifrode.sql`. Limite noto: due telefoni uguali sulla stessa rete risultano
  "stesso telefono" (raro); un telefono diverso aggira il controllo, ma il pass si usa solo in cassa davanti al commerciante.
  **Configurazione guidata (01/11/2026, il titolare la trovava poco intuitiva e con esempi solo da bar):** il cassetto
  Quick Pass dell'editor è una procedura in 5 schermate: 0 "Come funziona" (3 schermate, solo la prima volta, poi dal
  tasto in fondo), 1 attività (locale/negozio, servizi e professionisti, vendita online, creator e consulenze: resta solo
  sul telefono e serve a proporre esempi, `QP_PROPOSTE`), 2 regalo per l'amico, 3 premio per chi consiglia + ogni N amici,
  4 riepilogo con "Modifica", opzioni avanzate (limite, fine campagna), cassa e "Salva e pubblica" (un tocco per le tag attive).
  Già configurato → si apre sul riepilogo. Campi `field-qp-*` invariati.
  **Modalità online (02/11/2026):** nel riepilogo "Dove si usa il pass" (`quickpass_modo`: negozio / online / entrambi,
  proposto in base all'attività) e, per l'online, "Dove ti scrivono" (`quickpass_contatto`: WhatsApp o email, precompilato
  con i recapiti della tag). Il pass dell'amico e il premio hanno "Usa il pass su WhatsApp / via email": messaggio già
  scritto con premio, codice e link `/u/<tag>?cassa=<codice>`, che il titolare tocca per convalidare. Solo online: niente QR.
  Migrazione `20261102000000_quick_pass_online.sql`.
  **QuickGift (04/11/2026, decisione del titolare dopo un audit di ChatGPT valutato insieme):** il Quick Pass si chiama
  **QuickGift** in tutto ciò che si vede ("Un regalo da condividere. Un premio da guadagnare."). Il nome tecnico resta
  `quickpass` (file, API, colonne, tabelle, chiavi del telefono, `?pass=`, `?cassa=`): nessuna migrazione, vecchi link e
  codici validi. **Parole fisse:** *regalo* = quello dell'amico invitato, *premio* = quello del cliente che condivide.
  Tag: pulsante "REGALA A UN AMICO" nell'Action Center; il cliente vede i tre passi (mandi il regalo → l'amico riceve X →
  quando lo usa guadagni Y), "Crea il tuo link regalo", poi "Il tuo link da condividere", barra di avanzamento
  ("Ti manca 1 amico…") e conteggi in parole semplici. L'amico vede: chi gli fa il regalo → il regalo in grande → dove si
  usa → nome → "Ricevi il tuo regalo"; recapito e consenso dopo, sotto "Facoltativo", mai spuntati. Dopo: riquadro "Come si
  usa" (negozio: "prima di pagare, mostra il QR…"; online: solo il pulsante). Cassa: "✓ VALIDO", "DA CONSEGNARE", per chi e
  chi glielo ha mandato, poi "Ho consegnato: conferma". Editor: schema delle tre figure sempre in vista (Tu → il tuo cliente
  → il suo amico, evidenziata quella del passo) e **3 passi** al posto di 5 (1 regalo + proposte per attività, 2 premio +
  "dopo quanti amici" 1·3·5 con 1 consigliato, 3 dove si usa + riepilogo + cassa); freccia in alto e INDIETRO tornano al
  passo precedente. Non adottate (motivato al titolare): le tre configurazioni "Semplice / Crescita / Fidelizzazione"
  (cambiavano solo il numero di amici: più scelte, più confusione). Da far vedere al legale: premiare chi porta clienti può
  rientrare nelle "operazioni a premio".
  **QuickGift universale e su larga scala (05/11/2026, dopo un secondo audit di ChatGPT valutato con il titolare):**
  "QuickGift non regala necessariamente qualcosa: permette di condividere qualcosa di valore" (materiale, digitale, un
  accesso, un'esperienza, un vantaggio), per attività, professionisti, creator e influencer. Niente più categorie di
  attività nell'editor (`QP_PROPOSTE` è un'unica lista di idee universali); domande "Che cosa vuoi regalare?" e "Che cosa
  riconosci a chi lo condivide?"; schema "Tu → Chi condivide → Chi riceve"; "In negozio" → "Di persona" (valore salvato
  sempre `negozio`); "dopo quanti utilizzi"; pulsante sulla tag "CONDIVIDI UN REGALO". **Link regalo del titolare**
  `/u/<tag>?regalo=1` (nel pannello del titolare sulla tag e nel riquadro cassa dell'editor): chi lo apre riceve il regalo
  con un codice personale, senza premio a nessuno (stessa strada dei vecchi `?qp_ref=invito`). **Conti giusti oltre le
  1.000 righe:** Supabase restituisce al massimo 1.000 righe per lettura, quindi i numeri ora si contano con
  `contaRighe` (lib/db.js, `Prefer: count=exact`) in info, ritira (numero massimo), stato, convalida (premio ogni N) e
  riepilogo (che restituisce solo gli ultimi 30 movimenti). **Limiti per connessione alzati** (molti operatori mobili fanno
  uscire migliaia di clienti dallo stesso IP): ritira 100/ora per IP e tag + 500/giorno per IP; link personali 30/ora per
  IP e tag + 100/giorno per IP. Prove "scala" in `test/api.test.mjs` (1.520 regali, 1.500 premi), che falliscono con il
  codice di prima. **Limiti noti, non risolti:** il premio scatta a ogni utilizzo (un influencer "affiliato" con
  "ogni 1" riceve un premio per ogni follower: usare "dopo quanti" e il numero massimo); la conferma resta manuale (online
  ogni persona scrive al titolare: non regge migliaia di utilizzi); un regalo per browser, non per persona (chi usa due
  browser ne riceve due: per i regali di valore impostare il numero massimo). **Prossima fase proposta: consegna
  automatica** per i regali digitali (chi riceve il regalo ottiene subito il contenuto o il link, l'utilizzo si registra
  da solo, senza cassa): da decidere con il titolare.
  **Dopo il terzo audit (05/11/2026):**
  - **Conferme simultanee:** due conferme insieme sullo stesso link potevano leggere lo stesso conteggio e far saltare
    un premio. Ora `allineaPremi` (api/quickpass.js) ricalcola a ogni conferma tutti i premi dovuti (uno per soglia,
    `ordine` 1, 2, 3…) e crea quelli mancanti; i doppioni li rifiuta il vincolo unique `(invito, ordine)` già esistente,
    quindi nessuna migrazione. Lo stesso ricalcolo parte quando chi condivide apre la sua pagina (azione `stato`): un
    premio perso per una conferma interrotta a metà si ricrea lì. Prove: "conferme simultanee" (ogni 1, 2, 3) e
    "conferma interrotta" in `test/api.test.mjs`, che falliscono con il codice precedente. ChatGPT chiedeva una
    transazione nel database (funzione SQL): possibile in futuro, ma il ricalcolo dà la stessa garanzia senza migrazioni.
  - **Avviso nell'editor** (non un blocco) con "1 utilizzo" e nessun numero massimo: "chi condivide guadagnerà un premio
    per ogni regalo effettivamente utilizzato… non è previsto un tetto ai premi maturabili" (passo 2 e riepilogo).
  - **Limiti per connessione attuali:** `ritira` 100/ora per IP e tag + 500/giorno per IP; link personali 30/ora per IP e
    tag + 100/giorno per IP; PIN di cassa 10 tentativi ogni 15 minuti. Altre protezioni non legate all'IP: un regalo per
    browser, numero massimo di regali facoltativo, codici monouso. Rischio residuo: un grande evento su un unico Wi-Fi
    (oltre 100 regali all'ora dallo stesso IP). **Proposta (non fatta):** verifica anti-robot invisibile (Cloudflare
    Turnstile, gratuita) che scatta solo oltre la soglia, al posto del blocco.
  - **Prove di carico (proposta, non fatte):** le prove "scala" verificano i conti oltre le 1.000 righe su un database
    finto, non la tenuta sotto migliaia di richieste insieme. Prova realistica, solo su `myquicktag-prova` e sul Preview
    (mai sulla produzione): 1) caricare 5.000-10.000 righe finte con SQL su una tag di prova; 2) uno script (es. k6 o
    autocannon) con il bypass della protezione del Preview: 20-50 ritiri al secondo per 2-3 minuti da indirizzi diversi,
    più conferme simultanee; 3) misurare errori, tempi e i limiti del piano gratuito (Vercel: durata e numero delle
    chiamate; Supabase: connessioni); 4) cancellare le righe di prova.
  - **Parole:** "clic" al posto di "tocco" in tutto il sito e nelle email (richiesta del titolare); "CONDIVIDI UN
    REGALO" anche nell'anteprima dell'editor; corona al posto del negozio per "Tu" nello schema. I modelli in
    `supabase/email/` vanno ricaricati su entrambi i progetti (`applica.py`, serve `SUPABASE_ACCESS_TOKEN`) oppure
    corretti a mano in Supabase → Authentication → Email Templates.
  - **Affiliazione:** il titolare non vuole un programma di affiliazione per ora. Chiunque, influencer compresi, può già
    creare il suo link personale da una tag: basta così finché myquicktag non sarà molto diffuso.
  **QuickGift in una pagina (08/11/2026, idea del titolare):** la configurazione dell'editor non ha più passi. In alto
  la frase "Come funziona il tuo QuickGift" che si compila mentre si scrive (`qpFrase`), poi una scheda per persona
  nell'ordine in cui succede: **Tu · titolare della tag** (dove si usa) → **Amico A · chi manda il link** (premio e "dopo
  quanti utilizzi", con l'avviso senza tetto) → **Amico B · chi riceve il link** (regalo); idee da scegliere con un clic
  (4 per campo), opzioni avanzate, cassa e link regalo, un solo pulsante "Salva e pubblica". Al salvataggio, se manca
  qualcosa si viene portati al campo. "Amico A / Amico B" sono le parole della configurazione; sulla tag pubblica i testi
  restano "chi condivide / chi riceve".
  Poi (stesso giorno, richiesta del titolare): **nessun campo precompilato** nella pagina (niente idee da scegliere,
  niente esempi nei campi, il recapito online non si riempie da solo); le idee per regalo e premio stanno nella
  **Strategia** di QuickGift (riquadro "Idee per il regalo e il premio"), raggiungibile dal link "Ti servono idee…" sotto la
  frase. La Strategia non mostra più "Scopri i piani e sblocca" a chi è già Gold.
  **Tutto in myquicktag (09/11/2026, decisione del titolare: il titolare deve lavorare nell'app, non su WhatsApp):**
  - **Online con il codice personale** (funziona come un coupon, ma nei testi non si dice "sconto"): niente più "Usa il
    regalo su WhatsApp". L'amico B ha "Copia il codice" e l'istruzione "indica questo codice quando ordini, prenoti o
    richiedi il regalo"; il titolare lo verifica e lo conferma nella cassa. La casella `quickpass_contatto` ora contiene un
    **link facoltativo dove si usa il regalo** ("Vai dove usarlo"); i vecchi valori (numero o email) non vengono mostrati
    come link. Nessuna migrazione.
  - **Parole neutre (09/11/2026, richiesta del titolare):** mai "codice sconto" nei testi di QuickGift, perché farebbe
    pensare che il regalo debba essere uno sconto. Online si parla di "codice personale" da indicare "quando ordini,
    prenoti o richiedi il regalo"; in cassa "Prima consegna il regalo, poi conferma". I campi restano vuoti: decide il titolare.
  - **Condivisione dell'amico A:** WhatsApp (pulsante principale), Telegram, Facebook, SMS, email, copia link, **mostra
    QR** (il QR del link sullo schermo, da far inquadrare dal vivo) e "Altre app" (menu del telefono: Instagram, Messenger…).
  - **Cassa dei dipendenti senza invii:** tolto "Invia il link della cassa ai dipendenti"; c'è il **QR della cassa** da far
    inquadrare al telefono o tablet della cassa e la frase "Il PIN dillo a voce… basta inserirlo una volta".
  - **E-commerce con centinaia di ordini al giorno (piano, non fatto):** 1) conferma di più codici insieme in cassa
    (si incolla l'elenco dei codici degli ordini); 2) conferma automatica: una chiave segreta per tag e un'azione nuova in
    `api/quickpass.js` (nessuna funzione in più) che il negozio chiama quando riceve un ordine con il codice, tramite
    Shopify Flow, WooCommerce webhook, Zapier o Make; la parte myquicktag è piccola, il collegamento va configurato per
    ogni negozio. Da costruire quando arriva un cliente con quei numeri.
  Nell'**Identity Console** ogni tag con QuickGift ha il pulsante "Cassa QuickGift · conferma i regali" (`/u/<tag>?cassa=1`). Prove: `test/api.test.mjs`,
  `test/quickpass.e2e.mjs` (tre telefoni). **Fase 2 (da fare):** scheda risultati con stima in euro, avviso al
  commerciante a ogni pass usato, testi di rinnovo basati sui risultati.
- **Nomi assegnati anche se "black" (09/11/2026):** in `controllaNome` (lib/nomi-riservati.js) un nome con una riga
  "esatto" e `assegnato_a` vale per quella sola email verificata, qualunque sia il tipo (tranne `system`). Serve per dare
  **@myquicktag** al titolare del sito: le righe `quicktag` e `myquicktag` "contiene" (black) continuano a bloccare per
  tutti gli altri ogni nome che contiene "quicktag" (anche "myquicktagofficial"). Per assegnarlo: in `nomi_riservati`
  la riga `myquicktag` diventa regola `esatto` con `assegnato_a` = email dell'account del titolare.
- **Consenso alle offerte nel Vasetto (28/10/2026, richiesto dal titolare):** casella facoltativa e mai già spuntata
  «Accetto di ricevere offerte e novità da @Nome» sotto il modulo, con nota «Facoltativo…» e link alla Privacy.
  `api/add-lead.js` salva nel contatto `consenso_offerte` (solo se `true` esplicito), `consenso_testo` (il testo accettato)
  e `consenso_data`; "I miei contatti" mostra chi ha accettato. Informativa privacy aggiornata (punto 3).
- **Scudo Reputazione (28/10/2026, approvato dal titolare: "nessuna grana legale"):** chi dà 1-3 stelle riceve
  prima il contatto diretto, ma vede sempre anche il link alla recensione pubblica. Prima il link a Google era nascosto
  sotto le 4 stelle: è il "review gating", vietato dalle regole di Google.
- **Invito a installare dopo il checkout (25/10/2026):** il checkout porta a `/u/<nome>` e chiede l'invito con un segno in
  `sessionStorage` (`mqt_benvenuto`), non più con `?welcome=1` nell'indirizzo: l'iPhone salva nell'icona l'indirizzo da cui
  è stata creata e l'invito ricompariva a ogni apertura (segnalato da Martina, iPhone 16). Le icone vecchie con
  `welcome=1` ora aprono la tag senza invito.
- **Pulizia nel browser e "Pubblica" (25/10/2026):** `mqtPulisci` (session.js) pulisce anche dentro i JSON annidati nella
  bozza (recapiti, galleria…), come `lib/pulizia.js`. Prima "Pubblica" dalla tag salvava `{”telefono1”:…}` (illeggibile):
  è successo solo alla tag `martina` in produzione, riparata a mano il 25/10.
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
  account può prenotarlo ("Identity Console" → "Aggiungi una tag") e la tag nasce già sua. Non c'entra con il piano Gold né
  con la durata. Dopo l'attivazione si può svuotare `assegnato_a`. Il titolare non conosce mai la password della persona.
- `.vercelignore` esclude dal sito pubblico documenti interni, test e `supabase/`.

## Test

- `node test/api.test.mjs` → 231 prove delle funzioni `api/` con un finto database e un finto Supabase Auth
  (nessuna installazione). Rilanciarle dopo ogni modifica al server e aggiungerne per le novità.
- `test/account.e2e.mjs` + `test/finto-supabase.mjs` → 46 prove nel browser (telefono simulato): registrazione con
  codice, attivazione, multi-tag, nome gold assegnato, tag di altri account, recupero password, revoca delle sessioni,
  uscita, pagina ricaricata mentre si aspetta il codice (succede passando all'app della posta). Istruzioni in testa al file (servono Playwright e la libreria di Supabase).
- `test/quickpass.e2e.mjs` → 38 prove nel browser di QuickGift: dal link alla cassa, uso online e configurazione guidata nell'editor (istruzioni in testa al file).
- `test/condividi.e2e.mjs` → 12 prove nel browser di CONDIVIDI e dei link alle sezioni (istruzioni in testa al file).
- `test/xss-tag.e2e.mjs` → prova nel browser che la tag pubblica non esegua codice nascosto
  (istruzioni d'uso in testa al file; serve Playwright).
- Dalla sessione cloud non si raggiungono `*.vercel.app` né molti siti esterni: le prove sul sito vero
  le fa il titolare, poi si controllano i log/dati su Supabase.

## Prossimi passi (in ordine)

0. **Account con Supabase Auth: online su myquicktag.it dal 18/10/2026** (pull request #7 unita in `main`, produzione
   configurata). Restano le prove sul sito vero: account del titolare, iPhone (app installata), visitatore da un altro
   telefono con "SALVA" → Pocket (vedi `PRE-LANCIO.md` → "Account", punti D ed E).
   **Stato al 28/10/2026:** online fino alla PR #20 (`main` = `sviluppo-v2`). Dal 23/10: limiti a visite e click,
   checkout rifatto, anteprima WhatsApp, CONDIVIDI ovunque, correzioni dalla prova di Martina (iPhone). Tutto provato
   dal titolare sul sito vero. Il titolare sta per elencare nuove richieste.
   **Stato al 23/10/2026:** online fino alla PR #14 (`main` = `sviluppo-v2`). Prove fatte dal titolare: email e codici,
   recupero password, seconda tag, "Esci da tutti i dispositivi", Android, iPhone, visitatore → Pocket, segnalazioni
   (arrivano a info@myquicktag.it, inoltrata a Gmail). Da fare: ricontrollo della cornice su iPhone dopo la PR #10,
   revisione legale da un professionista, "3 mesi tutto sbloccato" nell'ultima settimana prima del lancio.
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
