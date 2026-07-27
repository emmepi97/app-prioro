# Prioro

Planner settimanale minimal con Supabase Auth e database per utente.

## Versione attuale

Questa versione mantiene la logica principale di Prioro e rimuove temporaneamente gli obiettivi.

### Incluso

- Planner settimanale LUNEDI-DOMENICA.
- Sezione `OGNI GIORNO`.
- Sezione `FUTURO` per cose da ricordare ma da fare prossimamente.
- Categorie creabili, modificabili ed eliminabili.
- Modifica attività con doppio click da desktop.
- Modifica attività da mobile tramite pannello dal basso.
- Drag & drop attività tra elenco, giorni, `OGNI GIORNO` e `FUTURO`.
- Da mobile puoi trascinare un'attività direttamente sul pulsante del giorno.
- Pagina `Statistiche` minimal e premium.

### Statistiche incluse

- Completate.
- Aperte.
- Completion rate.
- Giorno più produttivo.
- Distribuzione categorie.
- Cosa ho fatto.
- Cosa non ho fatto.
- Cosa spostare nel `FUTURO`.

## Setup locale

```bash
npm install
cp .env.example .env
npm run dev
```

Compila `.env` con:

```bash
VITE_SUPABASE_URL=https://TUO-PROGETTO.supabase.co
VITE_SUPABASE_ANON_KEY=INCOLLA_LA_TUA_ANON_PUBLIC_KEY
```

## Supabase

Esegui `supabase/schema.sql` nel SQL Editor di Supabase.

Se arrivi da una versione precedente con obiettivi, la tabella `goals` può rimanere nel database: questa versione dell'app non la usa più.

## Deploy Vercel

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Aggiornamento filtro statistiche

Aggiunto filtro periodo nella pagina `Statistiche`:
- Ultimi 7 giorni
- Ultimi 30 giorni
- Questo mese
- Ultimi 3 mesi
- Quest'anno
- Sempre

I giorni più produttivi continuano a essere calcolati in base al giorno del planner in cui l'attività era assegnata quando viene completata.

## Aggiornamento mobile footer

- Da mobile il pulsante `Excel` non viene mostrato.
- Da mobile il pulsante `Esci` non è più fisso: resta nel footer naturale della pagina.
- Il titolo e le tab `Planner / Statistiche` restano sticky in alto da mobile.

## Aggiornamento review scalabile

Le sezioni `Cosa ho fatto` e `Cosa non ho fatto` nella pagina Statistiche sono ora collassabili e scalabili:
- mostrano il totale tra parentesi;
- mostrano inizialmente massimo 20 attività;
- permettono di caricare altre 20 attività alla volta;
- evitano liste lunghissime quando lo storico avrà migliaia di attività completate.

## Aggiornamento archivio scalabile

La sezione `Archivio cose fatte` è ora collassabile e scalabile:
- mostra il totale tra parentesi;
- mostra inizialmente massimo 20 attività;
- permette di caricare altre 20 attività alla volta;
- evita elenchi lunghissimi quando lo storico cresce.

## Aggiornamento pulizia iniziale

- Rimossi i quattro dati iniziali sopra il planner: `in settimana`, `da pianificare`, `completate`, `in futuro`.
- Rimossa la doppia scritta `Prioro` nell'header: resta solo il titolo principale.

## Aggiornamento layout sezioni

- Le sezioni `Categorie` e `Archivio cose fatte` non sono più affiancate: ora sono una sotto l'altra.
- Nella pagina `Statistiche` è stata rimossa la sezione `Cosa spostare nel FUTURO`.

## Aggiornamento hero Planner

La creazione attività è stata spostata in un hero iniziale coerente con la pagina Statistiche:
- label `PLANNER`;
- titolo `Crea nuova attività`;
- campi di creazione attività direttamente dentro la card hero;
- il resto della pagina Planner resta invariato.
