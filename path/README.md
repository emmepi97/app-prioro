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

## Aggiornamento responsive mobile

Ottimizzata tutta l'interfaccia mobile:
- eliminato overflow orizzontale;
- hero Planner responsive;
- form creazione attività a colonna su mobile;
- card attività più leggibili su schermi piccoli;
- tab giorni sticky e compatte;
- categorie, archivio, statistiche e review adattate a mobile;
- migliorati spazi, font, bottoni e liste su smartphone.

## Aggiornamento stampa planner PDF

Aggiunto un pulsante `Stampa PDF` sotto il Planner e prima delle sezioni `Categorie` / `Archivio cose fatte`.

Il pulsante apre la stampa del browser con una versione compatta e ottimizzata del planner su una pagina A4 orizzontale. Da lì è possibile scegliere `Salva come PDF`.

## Aggiornamento download PDF reale

Il pulsante sotto il calendario ora scarica direttamente un PDF (`prioro-planner-settimanale.pdf`) invece di aprire la stampa del browser.

Il PDF contiene solo:
- giorni della settimana;
- sezione `OGNI GIORNO`;
- sezione `FUTURO`.

Il layout PDF è adattato su una singola pagina A4 orizzontale.

## Aggiornamento layout PDF

Migliorata l'esportazione PDF:
- ridotta l'altezza delle colonne dei giorni per recuperare spazio;
- sezioni `OGNI GIORNO` e `FUTURO` ridimensionate correttamente;
- le card in basso sono più compatte e disposte su due colonne;
- il PDF resta su una sola pagina A4 orizzontale.

## Freemium / Premium

Questa versione introduce la struttura Free/Premium.

### Piano Free
- Planner settimanale.
- Categorie.
- Sezione `OGNI GIORNO`.
- Sezione `FUTURO`.
- Archivio cose fatte.
- Statistiche base.
- Download PDF base.

### Piano Premium
Prezzi impostati nell'interfaccia:
- `€9,99/mese`
- `€99 per sempre`

Feature Premium incluse:
- attività ricorrenti settimanali;
- generazione automatica delle attività ricorrenti nella settimana corrente;
- template premium mono pagina;
- statistiche evolute;
- report settimanale via email, con impostazione database pronta;
- storico completo.

### Nota pagamenti reali
I pulsanti Premium aggiornano la tabella `user_subscriptions`. Per incassare pagamenti reali va collegato un provider come Stripe, Polar o Lemon Squeezy e il webhook deve aggiornare `user_subscriptions`.

## Correzione Premium v2

Questa versione corregge la prima implementazione Premium:

- Se l'utente ha Premium mensile o Lifetime attivo, i pulsanti `Attiva mensile` e `Attiva lifetime` non vengono più mostrati.
- Rimossi i template multipli che creavano categorie e attività automaticamente.
- Il template Premium ora è uno solo ed è automatico: il download PDF usa il template Premium se l'utente è Premium.
- Le ricorrenze non vengono più generate automaticamente all'apertura dell'app.
- Le ricorrenze sono visibili in lista, eliminabili e generabili manualmente per la settimana corrente.
- Aggiunto indice univoco anti-duplicazione per le attività ricorrenti generate.
- Aumentate le statistiche Premium.
- Aggiunta condivisione attività Premium tramite email durante la modifica dell'attività.
- Aggiornato SQL Supabase con `share_task_by_email`, colonne di condivisione e indici anti-duplicati.

## Correzione layout/menu/statistiche v3

- Rimossa la sezione `PDF Premium automatico` dalle feature Premium.
- Ricorrenze rese più chiare: form, lista, eliminazione e generazione manuale della settimana.
- Le ricorrenze non generano più automaticamente attività all'apertura.
- Rimossi i blocchi `Cosa ho fatto` e `Cosa non ho fatto` dalla pagina Statistiche.
- Le statistiche Premium sono subito sotto ai due grafici principali.
- Header desktop trasformato in menu unico sticky: titolo, Planner/Statistiche/Premium, Excel/Esci.
- Mobile: resta sticky solo la barra con titolo e hamburger; il menu hamburger apre Planner, Statistiche, Premium, Excel e Logout.

## Correzione v4 - Header fisso desktop e ricorrenze orizzontali

- Header desktop reso realmente fisso in alto con `position: fixed` e padding compensativo sull'app.
- Su mobile resta sticky solo la barra titolo + hamburger, senza menu fisso aperto.
- Sezione ricorrenze ridisegnata in orizzontale su desktop:
  - campi della nuova ricorrenza sulla stessa riga;
  - lista ricorrenze a card orizzontali;
  - spiegazione più chiara del funzionamento.

## Correzione v5 - Ricorrenze per card e menu mobile full page

- Ogni ricorrenza ha ora due pulsanti propri:
  - `Genera ricorrenza`
  - `Elimina ricorrenza`
- Rimosso il pulsante globale `Genera attività della settimana`.
- Su desktop le ricorrenze sono disposte in griglia a 4 colonne, 3 colonne su schermi medi.
- Su mobile il menu hamburger apre un pannello full page chiudibile ricliccando sull'hamburger.
- Le categorie e attività generate in automatico erano state create dai vecchi template Premium multipli delle versioni precedenti. In questa versione non esistono più template che creano categorie o attività.

## Correzione v6 - Menu mobile full page robusto

- Il menu hamburger mobile ora apre un vero pannello full page sotto la barra fissa.
- Il titolo `Prioro` e il pulsante hamburger restano sempre fissi in alto.
- Ricliccando sull'hamburger il menu si chiude.
- Il vecchio pannello mobile è stato disattivato via CSS per evitare conflitti.
- Quando il menu full page è aperto, lo scroll della pagina viene bloccato.

## Correzione v7 - Home page Problema / Soluzioni / CTA

- Home page non autenticata completamente ridisegnata.
- Nuova struttura commerciale:
  - Hero con problema principale;
  - blocco `Problema`;
  - blocco `Soluzioni`;
  - CTA finale;
  - form login/registrazione integrato nella hero.
- Design minimal coerente con Prioro.
- Responsive mobile ottimizzato.
