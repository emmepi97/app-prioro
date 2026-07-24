# Prioro

Planner settimanale minimal con React/Vite, Supabase Auth e database Supabase.

## Modifiche incluse

- Testo dei pulsanti e dei campi adattato per non smarginare o sovrapporsi.
- Pulsante `+ Categoria` reso secondario, trasparente e meno importante rispetto a `+ Aggiungi`.
- Layout responsive migliorato su desktop, tablet e telefono.
- Mobile con selezione giorno tramite pulsanti filtro, senza scroll orizzontale.
- Drag & drop tramite pointer events per evitare reload pagina.

## Setup

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

## Deploy Vercel

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Aggiornamento obiettivi

La creazione di un obiettivo richiede ora una tempistica obbligatoria: `Questo mese`, `Prossimi 3 mesi` oppure `Quest'anno`. Non esiste più una sezione generica `Da assegnare`. Gli obiettivi possono poi essere trascinati da una tempistica all'altra.

## Aggiornamento categorie

Le categorie sono nuovamente eliminabili tramite il pulsante `×` sul chip categoria. Se la categoria è collegata ad attività o obiettivi, Prioro chiede conferma e poi lascia gli elementi collegati senza categoria.

## Aggiornamento modifica rapida

Ripristinata la modifica con doppio click:
- doppio click su attività in elenco o in settimana per modificare testo, categoria, obiettivo, priorità e note;
- doppio click su categoria per rinominarla;
- `Enter` salva, `Esc` annulla.
