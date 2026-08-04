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

## Correzione v8 - Premium stats, archivio Premium, ricorrenze compatte

- Ricorrenze rese più compatte e meno prioritarie visivamente.
- Pulsante `Genera ricorrenza` trasformato da CTA nera grande a bottone soft piccolo.
- Pulsante `Elimina ricorrenza` trasformato in azione rossa leggera.
- Archivio cose fatte reso parzialmente Premium:
  - Free: ultimi 30 giorni, massimo 100 attività visibili;
  - Premium: storico completo.
- Statistiche Premium ampliate con:
  - attività create;
  - completate;
  - tasso completamento;
  - categoria dominante;
  - giorno migliore;
  - attività nel Futuro;
  - backlog non pianificato;
  - tempo medio di chiusura;
  - stato report email.
- Inserito box per i prossimi insight Premium: trend, heatmap e procrastinazione.

## Correzione v9 - Prossimi insight Premium

- Aggiunti insight Premium reali nella pagina Statistiche:
  - trend ultime 4 settimane;
  - heatmap produttività ultimi 35 giorni;
  - possibile procrastinazione basata su attività aperte da oltre 7 giorni.
- Trend e heatmap si basano sulle attività completate usando `updated_at`/`created_at`.
- La procrastinazione è una stima sicura senza nuova tabella: conta attività aperte e vecchie. Il tracciamento preciso degli spostamenti potrà arrivare con una tabella dedicata.

## Correzione v10 - Procrastinazione completa con task_movements

- Aggiunta tabella Supabase dedicata `task_movements` tramite file `supabase_task_movements_v10.sql`.
- Ogni spostamento attività viene tracciato con:
  - `task_id`;
  - `from_day`;
  - `to_day`;
  - `moved_at`.
- La statistica Premium `Procrastinazione tracciata` ora usa gli spostamenti reali.
- Se non ci sono ancora spostamenti tracciati, Prioro mostra ancora la stima sulle attività aperte da oltre 7 giorni.
- Dopo aver lanciato il file SQL, ogni drag & drop successivo alimenterà gli insight Premium.

## Correzione v11 - Giorno corrente e ripianificazione automatica

- Desktop: il giorno corrente viene evidenziato con overlay azzurro leggero e badge `OGGI`.
- Mobile: il giorno mostrato come default all'apertura non è più sempre Lunedì, ma il giorno corrente dell'utente.
- Rollover giornaliero client-side:
  - quando cambia giorno, le attività non completate dei giorni passati vengono spostate automaticamente in `Da pianificare`;
  - ogni spostamento automatico viene registrato in `task_movements` con `from_day` e `to_day = ''`;
  - questo migliora il calcolo della procrastinazione/difficoltà realizzativa.
- Il rollover viene eseguito all'apertura dell'app e poi controllato ogni minuto.
- Per evitare doppi spostamenti nello stesso giorno, viene salvata una chiave locale per utente/data.

## Correzione v12 - Premium sotto Categorie

- La sezione `Premium / Ricorrenze` è stata spostata sotto alla sezione `Categorie`.
- La sezione `Categorie` resta subito sotto al calendario, così rimane comoda per filtrare e gestire il planner.
- L'ordine della pagina Planner ora è:
  1. Calendario
  2. Categorie
  3. Premium / Ricorrenze
  4. Archivio cose fatte
  5. Download PDF

## Correzione v13 - Fix menu mobile overlay

- Corretto il menu hamburger mobile che si apriva sotto al contenuto.
- Il menu mobile ora è una overlay fullscreen sempre sopra alla pagina.
- Aumentati z-index di header, toggle hamburger e pannello menu.
- Bloccato lo scroll della pagina quando il menu è aperto.
- Nessun SQL richiesto: modifica solo frontend/CSS.

## Correzione v14 - Ricorrenze e statistiche categorie

- Aggiunta opzione `Ogni giorno` nel selettore delle ricorrenze.
- Rimossa l'anteprima/placeholder `Es. Presenze da inserire` dal campo nome ricorrenza.
- La pagina Statistiche ora mostra tutte le barre e i pallini delle categorie in nero, senza colori categoria.
- Nessun nuovo SQL richiesto.

## Correzione v15 - Premium Weeko Score minimal

- Aggiunta metrica interna `Weeko Score` nella sezione Statistiche Premium.
- Aggiunte card minimal:
  - Streak attuale;
  - Record streak;
  - Procrastinazione;
  - Trend settimana.
- Aggiunta voce `Giorni produttivi` nelle statistiche Premium.
- Formula Weeko Score:
  - 40% completion rate;
  - 25% anti-procrastinazione;
  - 20% streak;
  - 15% trend settimanale.
- Nessuna tabella nuova e nessun SQL richiesto.
- Le funzionalità esistenti non sono state modificate.

## Correzione v16 - Pulsante PDF sotto calendario

- Spostato il pulsante `Scarica PDF` subito sotto il calendario/planner settimanale.
- Il pulsante non è più in fondo sotto categorie, premium e archivio.
- Da mobile il pulsante resta visibile subito dopo il calendario ed è largo 100%.
- Nessun SQL richiesto.

## Correzione v17 - Statistiche Premium più leggibili

- Giorni più produttivi e Categorie ora sono uno sotto l'altro, a tutta larghezza.
- I grafici Giorni e Categorie mostrano due linee:
  - nero = attività completate/produttività;
  - rosso chiaro = attività procrastinate/spostate.
- Rimosso il box numerico `Procrastinazione tracciata`.
- Aggiunta `Heatmap procrastinazione` al posto del box numerico.
- Rimosso il KPI poco chiaro `Giorni produttivi` dalle statistiche Premium.
- Aggiunta `Affidabilità pianificazione` al posto di `Giorni produttivi`.
- Resi più chiari i KPI alti della pagina statistiche.
- Aggiunta FAQ finale per spiegare significato di KPI, grafici, Weeko Score, streak, trend, heatmap e procrastinazione.
- Nessun nuovo SQL richiesto.

## Correzione v18 - Statistiche full width

- La pagina Statistiche ora usa tutta la larghezza disponibile.
- Tutti i blocchi statistiche sono estesi orizzontalmente full page.
- Giorni più produttivi e Categorie restano uno sotto l'altro ma con barre estese a tutta larghezza.
- Weeko Score, KPI Premium, trend, heatmap produttività e heatmap procrastinazione sono stati forzati a larghezza piena.
- Da desktop le heatmap si estendono orizzontalmente; da tablet/mobile tornano compatte e leggibili.
- Nessun SQL richiesto.

## Correzione v19 - Barre statistiche pulite

- Rimossa la riga testuale `X completate · Y procrastinate` sotto ogni giorno/categoria.
- Il numero è ora mostrato a destra di ciascuna barra.
- La legenda rimane nel testo sopra il grafico: nero = completate, rosso chiaro = procrastinate.
- Grafico più minimal, pulito e leggibile.
- Nessun SQL richiesto.

## Correzione v23 - Grafici più puliti

- Rimossa la proiezione grigia di sfondo delle barre statistiche.
- Non vengono più mostrati numeri quando il valore è 0.
- Mantenuti i colori soft: grigio grafite per completate e rosa per procrastinate.
- Numeri ancora agganciati alla fine reale della barra colorata.
- Nessun SQL richiesto.

## Correzione v24 - Grafici Premium più eleganti

- Ridisegnati i grafici Giorni e Categorie con layout più pulito.
- Rimossa la struttura visivamente pesante a binari.
- Le barre partono dopo una colonna label più stretta e respirano meglio su tutta la larghezza.
- Mostrate solo le barre con valore maggiore di 0.
- Numeri agganciati alla fine reale della barra colorata.
- Colori soft mantenuti: grigio grafite per completate, rosa soft per procrastinate.
- Nessun SQL richiesto.

## Versione v25 - Opzione 1

- Confermata la soluzione grafica premium dei grafici statistiche.
- Layout pulito per Giorni piu produttivi e Categorie.
- Barre senza proiezione grigia di sfondo.
- Numeri mostrati solo se maggiori di 0.
- Numeri agganciati alla fine reale della barra colorata.
- Colori soft: grigio grafite per produttivita, rosa soft per procrastinazione.
- Nessun SQL richiesto.

## Versione v27 - Home responsive e rollover corretto

### Home page
- Home ridisegnata con layout professionale e responsive.
- Hero più accattivante, card login/register più moderna, preview prodotto e blocchi beneficio.
- Ottimizzazione desktop, tablet e mobile.

### Rollover automatico attività
- Verificata la logica precedente: prima usava `days.slice(0, todayIndex)`, quindi in alcuni giorni poteva ripianificare tutti i giorni precedenti della settimana.
- Correzione applicata: ora a partire dalle 00:00 viene svuotato SOLO il giorno precedente.
- Esempi:
  - martedì -> ripianifica solo lunedì;
  - mercoledì -> ripianifica solo martedì;
  - lunedì -> ripianifica solo domenica.
- Nessun SQL richiesto.

## Versione v28 - Heatmap impaginate e KPI report rimosso

- Sistemata impaginazione heatmap: non sono più una riga lunga orizzontale.
- Heatmap ordinate in griglia 7 righe x 5 colonne, con pallini più leggibili e centrati nella card.
- Corretta resa responsive su desktop, tablet e mobile.
- Rimosso il KPI `Attivo / Report email` dalla sezione Statistiche Premium.
- Nessun SQL richiesto.

## Versione v29 - Heatmap settimanale e 10 KPI

- Heatmap produttività ridisegnata in stile calendario: colonne settimane (-4w, -3w, -2w, -1w, Ora) e righe Lun-Dom.
- Heatmap procrastinazione con la stessa struttura settimanale e scala rossa.
- KPI Premium portati a 10, aggiungendo:
  - Attività ripianificate
  - Giorni produttivi
- KPI Report Email non presente nella griglia KPI.
- Conservate le modifiche precedenti: home responsive, rollover solo giorno precedente, grafici premium e heatmap colorate.
- Nessun SQL richiesto.

## Versione v30 - Condivisione attività rimossa

- Rimossa la funzionalità di condivisione attività via email.
- Rimosso il campo email dal form di modifica attività.
- Rimossa la chiamata RPC `share_task_by_email` dal frontend.
- Rimossi riferimenti a "attività condivise" dalla pagina Premium.
- `supabase/schema.sql` non crea più funzione/colonne/indici legati alla condivisione.
- Aggiunto script opzionale `supabase/remove_task_sharing_cleanup.sql` per pulire Supabase dagli oggetti vecchi, se vuoi eliminarli anche dal database.
- Nessun SQL obbligatorio per usare questa versione: basta deployare su Vercel.

## Versione v31 - Check anche in Elenco attività

- Aggiunto il check direttamente sulle card della sezione Elenco attività.
- Cliccando il check, l'attività viene completata subito e finisce nell'archivio cose fatte.
- Il drag & drop resta funzionante: il check non avvia il trascinamento.
- Il cestino resta disponibile a destra della card.
- Nessun nuovo SQL richiesto.

## Versione v32 - Fix pagina bianca dopo check elenco attività

- Corretto errore `archiveTask is not defined` nelle sezioni OGNI GIORNO e FUTURO.
- Il check funziona su Elenco attività, Ogni Giorno e Futuro.
- Nessun SQL richiesto.

## Versione v33 - Check visibile in Elenco attività

- Reso il check visibile nelle card dell'Elenco attività.
- Check posizionato in alto a sinistra della card.
- Cestino mantenuto in alto a destra.
- Clic sul check completa subito l'attività e la manda nell'archivio.
- Nessun SQL richiesto.
