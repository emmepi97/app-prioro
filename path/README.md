# Prioro

**Prioro — Organizza la tua settimana. Completa ciò che conta.**

Web app React/Vite pronta per GitHub e deploy su Vercel, con Supabase Auth, database Supabase e dati separati per ogni utente.

## Funzionalità

- Login e registrazione utenti tramite Supabase Auth.
- Database Supabase con Row Level Security.
- Ogni utente vede solo le proprie attività e categorie.
- Stile minimal.
- Mega elenco attività a sinistra.
- Calendario settimanale LUNEDI-VENERDI a destra.
- Drag & drop delle attività nei giorni.
- Nel calendario le attività sono volutamente pulite: solo checkbox + testo.
- Clic sulla checkbox = attività fatta, rimossa dalla settimana e spostata in **Archivio cose fatte**.
- Archivio cose fatte con ripristino o eliminazione.
- Export Excel dal browser.
- Responsive desktop/mobile.

## Struttura progetto

```text
prioro
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── README.md
├── eslint.config.js
├── supabase
│   └── schema.sql
└── src
    ├── App.jsx
    ├── main.jsx
    ├── styles.css
    └── supabaseClient.js
```

## Setup Supabase

1. Crea un progetto su Supabase.
2. Vai su `SQL Editor`.
3. Copia tutto il contenuto di:

```text
supabase/schema.sql
```

4. Esegui lo script.
5. Vai su `Authentication > Providers > Email` e abilita la registrazione tramite email.
6. Per i test puoi disattivare la conferma email.
7. Vai su `Project Settings > API` e copia:
   - Project URL
   - anon public key

## Setup locale

Crea un file `.env` copiando `.env.example`:

```bash
cp .env.example .env
```

Compila:

```env
VITE_SUPABASE_URL=https://TUO-PROGETTO.supabase.co
VITE_SUPABASE_ANON_KEY=INCOLLA_LA_TUA_ANON_PUBLIC_KEY
```

Installa e avvia:

```bash
npm install
npm run dev
```

## Deploy su Vercel

1. Carica la cartella su GitHub.
2. Importa il repository su Vercel.
3. Framework: `Vite`.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Inserisci su Vercel le variabili ambiente:

```env
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

7. Deploy.

## Database e sicurezza

Lo schema in `supabase/schema.sql` crea:

- tabella `categories`;
- tabella `tasks`;
- indici;
- trigger `updated_at`;
- policy RLS per leggere, creare, modificare ed eliminare solo i propri dati;
- funzione per creare le categorie base al primo accesso.


## Fix pagina bianca su Vercel

Se Vercel mostra pagina bianca, quasi sempre mancano le variabili ambiente oppure sono scritte male.

Controlla in Vercel > Project > Settings > Environment Variables:

```env
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Dopo averle aggiunte devi fare:

```text
Deployments > ultimo deploy > Redeploy
```

Questa versione non mostra più pagina bianca: se le variabili mancano mostra una schermata di errore guidata.

## Versione robusta anti pagina bianca

Questa versione valida le variabili Supabase prima di avviare l'app.
Se la pagina resta bianca, aprire DevTools > Console e copiare l'errore.


## Fix React is not defined

Questa versione include `vite.config.js` con `@vitejs/plugin-react`, necessario per compilare correttamente JSX su Vercel.

## Conferma email obbligatoria e link reale

Per obbligare gli utenti a confermare la mail:

1. Vai in Supabase > Authentication > Providers > Email.
2. Abilita/conserva attiva l'opzione di conferma email.
3. Vai in Supabase > Authentication > URL Configuration.
4. Imposta `Site URL` con il dominio reale Vercel, ad esempio:

```text
https://app-prioro.vercel.app
```

5. In `Redirect URLs` aggiungi:

```text
https://app-prioro.vercel.app/**
```

Il codice usa `emailRedirectTo: window.location.origin`, quindi il link di conferma punterà al dominio reale in cui l'app è pubblicata e non a `localhost`.

## Aggiornamento planner settimanale

- Nel planner settimanale, sotto ogni attività ora compare la categoria in piccolo con pallino colorato.
- Da telefono il focus è sui giorni: il calendario settimanale viene mostrato prima dell'elenco.
- Da telefono i giorni sono navigabili con swipe orizzontale.

## Obiettivi medio/lungo periodo senza perdere il focus settimanale

Questa versione aggiunge un livello leggero di obiettivi che serve ad alimentare l'operatività settimanale, senza trasformare Prioro in un gestionale OKR complesso.

Funzionalità aggiunte:

- Obiettivi divisi in tre orizzonti: `Questo mese`, `Prossimi 3 mesi`, `Quest'anno`.
- Ogni attività può essere collegata opzionalmente a un obiettivo.
- Nel planner settimanale rimane il focus sul drag & drop e sul check, ma sotto ogni attività si vedono categoria e obiettivo collegato.
- Avanzamento obiettivo calcolato automaticamente sulle attività collegate completate.
- Mini indicatori in alto: attività in settimana, da pianificare, completate, obiettivi attivi.

Se il progetto Supabase esiste già, riesegui `supabase/schema.sql`: contiene anche le istruzioni `alter table` per aggiungere `goal_id` alla tabella `tasks`.

## Refinement layout operativo

Ultima revisione layout:

- Destra: sezione `Settimana` come focus principale.
- Sotto la settimana: banner orizzontale `Nuova attività`.
- Sotto il banner: `Archivio cose fatte`.
- Sinistra: prima `Elenco` delle attività da trascinare.
- Sotto l'elenco: `Obiettivi`.
- Sotto ancora: `Categorie`.
- Da telefono: il planner settimanale resta in alto e i giorni continuano a funzionare in swipe orizzontale.

## Revisione layout obiettivi/categorie

- Il blocco `Nuova attività` contiene ora il pulsante `+ Aggiungi categoria`.
- Cliccando il pulsante compare un mini form temporaneo per creare una categoria senza uscire dal flusso operativo.
- A sinistra rimane l'elenco delle categorie già create, eliminabili con la `x`.
- Il blocco `Obiettivi` è stato spostato sotto `Nuova attività` e prima dell'archivio, così resta più vicino alla pianificazione settimanale ma senza rubare focus alla settimana.
- La colonna sinistra ora parte sempre da `Elenco`, poi `Categorie`.

## Chiarezza campi obiettivi

Nel blocco Obiettivi sono state aggiunte etichette esplicite ai campi:

- Nome obiettivo
- Orizzonte temporale
- Priorità obiettivo
- Categoria collegata
- Scadenza indicativa
- Descrizione

In questo modo non ci sono più pulsanti/campi non spiegati.

## Obiettivi super minimal

Le label del form obiettivi sono state rimosse e sostituite con placeholder/testi direttamente nei campi, senza emoji, per mantenere Prioro più compatto e meno dispersivo.

## Select obiettivi più chiari

I menu del form Obiettivi ora mostrano direttamente il significato del campo quando non è ancora stata fatta una scelta:

- Orizzonte temporale
- Priorità obiettivo
- Categoria collegata
- Scadenza indicativa

Dopo la selezione mostrano il valore scelto, mantenendo il layout minimal senza label esterne e senza emoji.

## Nuova attività più chiara

Anche il blocco `Nuova attività` ora usa placeholder esplicativi dentro i campi select:

- Categoria attività
- Priorità attività
- Obiettivo collegato

Quando non viene scelta una priorità, Prioro salva automaticamente l'attività con priorità `Media`. Il layout resta minimal e senza label esterne.
