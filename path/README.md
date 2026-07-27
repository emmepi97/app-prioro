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
