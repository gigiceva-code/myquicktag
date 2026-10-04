# Liste dei nomi protetti

- `liste.py`: le liste per categoria, scritte a mano (i nomi si scrivono "come vengono").
- `genera.py`: le porta in forma canonica, toglie i doppioni (vince system, poi black, poi gold)
  e scrive `nomi-protetti.csv`. Uso: `python3 genera.py . nomi-protetti.csv`
- `nomi-protetti.csv`: quello che si carica nella tabella `nomi_riservati` di Supabase.

Dopo il caricamento la fonte vera è la tabella (Table Editor): aggiunte e correzioni si fanno lì.
La regola "contiene" va usata solo per nomi lunghi e a rischio, dopo aver controllato che non
blocchi parole normali (es. "revolut" blocchererebbe "revolution": per questo è "esatto").
