# Fase 4b1 — Bipede bambino, ali, strisciante: ragazza, supereroe, draghetto, bruco

Data: 2026-10-27 · Branch: `fase4b1-personaggi` · Stato: design approvato da Andrea, spec in revisione

## Obiettivo

Estendere la libreria della 4a (`src/characters/`, spec `2026-10-27-fase4a-personaggi-design.md`) con:

- il corpo **strisciante** a segmenti: **bruco**;
- le **ali** come parte aggiuntiva del quadrupede: **draghetto**;
- il corpo **bipede** costruito in "teste": **ragazza** (circa 3 teste) e **supereroe** (circa 5,5 teste);
- la coda del **gatto** vista dal retro, rifatta insieme a quella del draghetto (gatto versione 2).

Criteri di successo:

1. I quattro personaggi nuovi si disegnano con `character()` in quattro viste, sei pose e sei espressioni ciascuno,
   nei due stili esistenti e in tutti i formati.
2. `npm test` verifica per ognuno, senza browser: tratti distintivi e conteggi delle note in ogni vista, posa ed
   espressione; proporzioni; colori solo dai ruoli; nessun `NaN`; specchio esatto; i movimenti richiesti dalle note.
3. Model sheet (viste ed espressioni; pose su 2 righe da 3) approvati da Andrea per bruco, draghetto, ragazza,
   supereroe, e di nuovo per il gatto v2.
4. `npm run check` resta `OK`; `npm run check-characters` resta `ok` per il **mostro** e per tutto ciò che non è
   cambiato apposta (solo il gatto cambia, per la coda).

Fuori scope: il bipede adulto con il viso a parti separate (4b2: Vale e Mara), la vista dall'alto del draghetto (solo
se servirà a una scena), gli stili nuovi (Fase 3), la pagina web (4c).

## Decisioni di Andrea (2026-10-27)

- Approccio: **rig 2D piano in teste** (braccia e gambe a due segmenti guidati da angoli), niente disegni per posa né
  3D proiettato. Ordine di lavoro: bruco → draghetto → bipede.
- Gatto: la coda dal retro parte dal basso del sedere e non sembra un manico; versione 2, riapprovata dallo sheet.
- Sesta espressione: "imbarazzata" (ragazza) e "imbarazzato" (supereroe), con il rossore sulle guance.
- Il bianco degli occhi del supereroe è `#F7F2E8`, mai bianco puro (nota).
- Niente vista dall'alto del draghetto per ora.

## Design

Valgono tutti i principi della 4a: scheda di soli dati, layout puro (`BODIES.<tipo>.layout`), disegno con `paint()`
nello stile attivo, controlli sul layout con `node:vm`, nessun nome globale nuovo fuori dagli oggetti della libreria,
model sheet automatici e approvazione con `tools/approve.mjs`.

### 1. Strisciante (`bodies/crawler.js`) — bruco

- **Proporzioni:** `segments` (8), `segR` (raggio di un segmento), `headK` (testa / segmento = 1,4), `antenna`.
- **Parti:** testa con faccia (occhi scuri con riflesso, guance, bocca), 2 antenne con pallina, N segmenti tondi,
  una macchia gialla ovale in alto su ogni segmento, una coppia di piedini crema sotto ogni segmento.
- **Spina dorsale:** i centri dei segmenti stanno su una curva; ogni segmento è un cerchio agganciato al precedente
  (distanza fissa tra i centri). Il corpo si piega spostando i centri, mai deformando i cerchi (nota).
- **Pose** (`pose.png`): `testaAlzata`, `onda` (ciclo: un'arcata passa dalla coda alla testa, ogni segmento segue la
  testa con un ritardo costante), `salto`, `disteso`, `testaAlta` (decisa), `arrotolato`.
- **Espressioni** (`base.png`): felice, triste, arrabbiato, sorpreso, assonnato, curioso.
- **Viste:** profilo, 3/4, fronte (la testa davanti, il corpo che si allontana dietro), retro (l'ultimo segmento
  davanti, la testa dietro con le antenne).
- Le antenne oscillano con un leggero ritardo (come quelle del mostro, in forma chiusa in `t`).

### 2. Quadrupede: parti facoltative, ali e draghetto

- Le parti del gatto diventano **facoltative e dichiarate dalla scheda**: orecchie (`ears`), muso e bavaglina crema
  (`blaze`), baffi (`whiskers`), collarino, campanellino. Il gatto le dichiara tutte: il suo disegno dalle viste
  frontali non cambia (la sua coda dal retro sì, punto 4).
- Ruoli richiesti dal corpo: `fur`, `cream`, `line`, `shadow`; ogni parte facoltativa porta i suoi (`ears` →
  `earInner`, `collar`, `bell`, `wings` → `membrane`, `crests` → `crest`, `horns` → `cream`).
- **Parti nuove:** corna (2, crema, rivolte indietro), creste (contate: `head: 3`, `tail: 4`), pancia crema dal
  collo alla coda (`belly`), coda lunga quanto il corpo con le creste sopra, occhi con iride gialla e pupilla tonda
  (`FACES` tipo `iris`, ruolo `iris`).
- **Ali** (`wings: { span, sections: 3 }`): attaccate alle spalle; una nervatura principale con 3 dita e 3 sezioni di
  membrana. Parametro di posa `wingOpen` (0 chiuse lungo il fianco, con solo un pezzetto di membrana visibile; 1
  aperte, apertura totale circa `span` × larghezza del corpo) e un ciclo di battito (`flap`) in cui si anima la
  nervatura e la membrana la segue come forma unica (nota). Nel profilo l'ala lontana sta dietro il corpo.
- **Draghetto:** testa tonda grande (circa 1/3 del corpo senza coda), zampe corte, coda lunga quanto il corpo. Pose
  (`pose.png`): `fermo`, `corsa`, `saltoAli`, `volo`, `zampata`, `prontoDecollo`. Espressioni (`base.png`): felice,
  triste, arrabbiato, sorpreso, assonnato, curioso.

### 3. Coda (gatto v2 e draghetto)

- Dal retro la coda parte **dal basso del sedere, al centro**, sale nel terzo centrale del corpo e fa l'uncino sopra
  la schiena: non corre lungo il fianco. Il gatto passa a `version: 2`.
- Il draghetto usa la stessa coda, più lunga e più grossa alla base, con le creste.

### 4. Bipede (`bodies/biped.js`) — ragazza e supereroe

- **Proporzioni in teste:** `heads` (altezza totale in teste), e in teste: larghezza delle spalle e dei fianchi,
  lunghezza di busto, braccia e gambe. La testa resta 1; tutto il resto si misura su di essa, così 3 teste e 5,5
  teste sono lo stesso codice (e la 4b2 a 7,5 teste lo riusa).
- **Rig:** spalle, gomiti, anche, ginocchia come angoli per lato; le parti sono tubi a due segmenti con le mani
  semplificate (pollice + blocco dita; a pugno nelle pose d'azione) e gli stivali. Un parametro `flight` ruota tutto
  il corpo in orizzontale (volo); `lift` lo stacca da terra; `crouch` piega le gambe; `cycle` fa correre con braccia e
  gambe in opposizione.
- **Viso:** occhi (`dark` per la ragazza; bianchi `#F7F2E8` con pupilla per il supereroe), sopracciglia (un parametro
  `brows`, -1 tristi … 1 arrabbiate), bocca, guance; `blush` 0..1 per il rossore dell'imbarazzo.
- **Capelli:** due stili parametrici: `bob` (caschetto con frangia a 3 ciocche, orecchie visibili) e `spiky` (4-5
  ciocche a punta). La 4b2 ne aggiungerà altri.
- **Vestiti e accessori facoltativi:** maglione con maniche larghe, gonna a trapezio, stivaletti (ragazza); tuta,
  guanti lunghi, stivali al ginocchio, maschera a fascia, stella a 5 punte sul petto (assente dal retro), mantello
  corto come forma unica che segue il movimento e ondeggia con `t` (supereroe).
- **Pose** (`pose.png`): ragazza `inPiedi`, `corsa`, `salto`, `volo`, `pugno`, `accovacciata`; supereroe
  `inPiediEroico`, `corsa`, `salto`, `voloOrizzontale`, `pugno`, `atterraggio`.
- **Espressioni** (`base.png`): felice, triste, arrabbiato/a, sorpreso/a, assonnato/a, imbarazzato/a.

### 5. Controlli (`npm test`)

Per ogni personaggio nuovo, su ogni vista × posa × espressione: tratti distintivi presenti dove dichiarato e assenti
altrove, con i conteggi delle note (8 segmenti, 8 macchie, 8 paia di piedini, 2 antenne; 2 corna, creste 3 sulla
testa e 4 sulla coda, 3 sezioni di membrana per ala; 3 ciocche di frangia; 4-5 ciocche a punta; stella a 5 punte);
colori solo dai ruoli; nessun `NaN`; determinismo; specchio esatto. In più:

- bruco: distanza costante tra i centri dei segmenti (i cerchi non si deformano); nell'onda ogni segmento ripete il
  movimento della testa con un ritardo costante;
- draghetto: ali chiuse dentro la sagoma del corpo tranne un pezzetto, aperte larghe circa `span` × il corpo;
- bipede: altezza / testa = `heads` entro il 5% in piedi; lunghezza costante di braccia e gambe in ogni posa;
- gatto: dal retro la coda parte in basso al centro e resta nel terzo centrale; il resto del gatto identico (le
  viste con il muso non cambiano: lo dimostra un confronto delle parti con la versione 1, tranne la coda).

### 6. Model sheet e approvazione

Come la 4a: `sheet_<id>` e `pose_<id>` nascono da soli; ogni corpo dichiara in `SHEET` l'ordine delle viste e la
vista per pose ed espressioni. Approvazione di Andrea per bruco, draghetto, ragazza, supereroe e gatto v2 nei due
stili, al massimo due giri di correzioni per personaggio.

## Rischi

- **Somiglianza del bipede:** un rig a tubi può sembrare un manichino. Mitigazione: niente contorno dove braccio e
  busto si sovrappongono, maniche e gonna come forme proprie, mani semplificate come chiede la nota; si costruisce
  prima la ragazza in `front` e la si confronta con `base.png`.
- **Ali leggibili da chiuse e da aperte:** si controlla sullo sheet prima delle pose.
- **Il gatto cambia solo nella coda:** il test di confronto con la v1 lo garantisce; `check-characters` lo segnalerà
  come "da approvare" (versione nuova), il mostro deve restare `ok`.

## Regole operative

- Comandi per Andrea in CMD. Nessun `git push`. `package-lock.json` mai nei commit.
