# Passaggio di consegne — myquicktag

Da leggere all'inizio di ogni nuova sessione di lavoro, insieme a `PRE-LANCIO.md`
(decisioni aperte e cose da fare prima del lancio). Aggiornato al 04/10/2026.

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
  o un "link di condivisione"), quindi le prove con altri telefoni si fanno sul sito pubblico.
- Il titolare non vuole spese: piano gratuito di Supabase e di Vercel.
- ChatGPT fa da "product strategist": il titolare a volte incolla i suoi messaggi. Valutarli nel merito
  (si può dissentire motivando); l'ultima parola è del titolare.

## Dove sta cosa

- **Sito pubblico:** https://myquicktag.it (Vercel, ramo `main`). Tag pubblica: `/u/<nome>`.
- **Vercel:** team `gigiceva-codes-projects`, progetto `myquicktag`.
  Variabili: `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (Preview e Production).
  Funzioni server: 11 su 12 consentite dal piano gratuito → prima di aggiungerne, accorparne.
- **Supabase:** progetto `myquicktag` (id `atlhrkkfovblkhgzfeuo`, Francoforte).
  Tabelle: `tags` (una riga per tag), `limiti` (contatori anti-abuso), `nomi_riservati` (nomi protetti: system/black/gold, con `categoria` e `attivo`).
  Tutte con RLS attivo e nessuna policy: ci accede solo il server con la chiave segreta.
  Struttura e funzioni SQL in `supabase/migrations/` (vanno applicate anche al database, non bastano nel codice).
- **Airtable:** non più usato (le basi restano solo come archivio).

## Come è fatto il codice

- Pagine statiche HTML/JS (`index`, `tag` + `tag-logic.js`, `edit` + `edit-logic.js`, `profile`
  = dashboard, `contatti`, `account`, `pocket`, `analytics`, `checkout`, `celebration`).
- `api/` = funzioni server Vercel; `lib/` = moduli comuni del server:
  `db.js` (Supabase), `pulizia.js` (testi senza codice), `password.js` (scrypt), `limiti.js`,
  `nome-canonico.js` (forma unica dei @nomi: usarla per ogni nome che arriva dal browser),
  `nomi-riservati.js`, `abbonamento.js` (90 giorni + 14 di grazia).
- `session.js` (caricato da tutte le pagine): `mqtSessione` (token di sessione del dispositivo) e
  `mqtPulisci` (pulizia dei testi prima di mostrarli).
- I dati privati del proprietario (contatti del vasetto, statistiche, Pocket, bozza) arrivano solo con
  sessione valida. I visitatori scrivono solo tramite `api/add-lead.js` e `api/track-click.js`.
- `.vercelignore` esclude dal sito pubblico documenti interni, test e `supabase/`.

## Test

- `node test/api.test.mjs` → 108 prove delle funzioni `api/` con un finto database (nessuna installazione).
  Rilanciarle dopo ogni modifica al server e aggiungerne per le novità.
- `test/xss-tag.e2e.mjs` → prova nel browser che la tag pubblica non esegua codice nascosto
  (istruzioni d'uso in testa al file; serve Playwright).
- Dalla sessione cloud non si raggiungono `*.vercel.app` né molti siti esterni: le prove sul sito vero
  le fa il titolare, poi si controllano i log/dati su Supabase.

## Prossimi passi (in ordine)

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
