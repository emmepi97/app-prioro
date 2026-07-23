# Prioro

Prioro — Organizza la tua settimana. Completa ciò che conta.

## Fix incluso in questa versione

- Drag and drop riscritto in modo stabile.
- Nessun reload pagina durante il trascinamento.
- Salvataggio Supabase più robusto con filtro `user_id`.
- Bottoni interni impostati con `type="button"` per evitare submit involontari.
- Mobile mantenuto con giorni selezionabili tramite pulsanti filtro.
- Settimana da lunedì a domenica.

## Setup

1. Copia `.env.example` in `.env`.
2. Valorizza:

```env
VITE_SUPABASE_URL=https://TUO-PROGETTO.supabase.co
VITE_SUPABASE_ANON_KEY=INCOLLA_LA_TUA_ANON_PUBLIC_KEY
```

3. Installa e avvia:

```bash
npm install
npm run dev
```

## Deploy Vercel

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
