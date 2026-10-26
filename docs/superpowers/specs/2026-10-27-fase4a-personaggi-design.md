# Fase 4a — Libreria personaggi: nucleo, quadrupede e blob (gatto e mostro)

Data: 2026-10-27 · Branch: `fase4-personaggi` · Stato: design approvato da Andrea, spec in revisione

## Obiettivo

Una libreria di personaggi riusabile in tutti gli stili e i formati. La 4a costruisce il nucleo e due tipi di corpo,
e porta due personaggi dei riferimenti fino al model sheet approvato:

- **gatto** (`reference/characters/gatto/`): quadrupede;
- **mostro** (`reference/characters/mostro/`): blob.

Criteri di successo:

1. Una scena disegna un personaggio con una chiamata, `character('gatto', x, y, u, opzioni)`, in posa, vista ed
   espressione scelte, con transizioni recitate tra espressioni, nello stile e nel formato attivi.
2. Per ogni personaggio esistono due model sheet automatici (viste ed espressioni; pose), confrontabili con
   `base.png` e `pose.png`, approvati da Andrea in `classic` e in `acquerello-leggero`.
3. `npm test` verifica, senza browser, su ogni vista, posa ed espressione: tratti distintivi presenti o assenti dove
   dichiarato, conteggi, proporzioni, colori solo dai ruoli, volume del blob costante.
4. `npm run check` resta `OK` (classic e demo identici al byte): Clawd e le scene esistenti non cambiano.

Fuori scope (4b e 4c): corpi bipede e strisciante, ali, gli altri quattro personaggi, la pagina web di modifica.
Gli stili cozy, anime, marker-comic e visual-novel sono della Fase 3: qui si predispone solo il punto in cui uno
stile traduce i colori dei personaggi.

## Decisioni già prese (Andrea, 2026-10-27)

- **Viste chiave 2D parametriche**: fronte (`front`), 3/4 (`q`), profilo (`side`), retro (`back`), disegnate da codice
  a partire dalle misure della scheda; `flip` per guardare a sinistra. Niente scheletro 3D proiettato (regola "flat
  2D" dell'ANIMATION_GUIDE).
- Dalle idee di anidoodle (solo idee, niente codice): palette a ruoli tradotta da ogni stile, tratti distintivi
  dichiarati e verificati in ogni vista, model sheet da approvare una volta.
- Proporzioni nella scheda, mai in `STYLE`. Clawd resta solo demo: la libreria non usa niente di `clawd.js`.
- Blob a volume costante: larghezza × altezza = 1. Schiacciato 1,4 × 0,71, allungato 0,8 × 1,25 (nota del mostro
  corretta di conseguenza).
- Espressioni del mostro ricavate da `base.png`: felice, triste, arrabbiato, sorpreso, assonnato, spaventato.

## Architettura

```
src/characters/
  registry.js         CHARACTERS = {}, BODIES = {}; validazione delle schede
  shapes.js           geometria pura: ellissi, fagiolo, goccia, catena morbida, nastro; niente p5
  faces.js            occhi e bocche come forme (pure), misurati sulla testa
  act.js              transizioni di espressione (act) e fusione di pose; pure
  bodies/quadruped.js layout del quadrupede (puro)
  bodies/blob.js      layout del blob (puro)
  draw.js             character(): layout → paint()/inkLine() con lo stile attivo; boil per parte
  modelsheets.js      model sheet automatici: LOOPS.sheet_<id> e LOOPS.pose_<id>
  gatto.js            scheda del gatto (solo dati)
  mostro.js           scheda del mostro (solo dati)
tools/
  pagecode.mjs        carica i file "puri" della pagina in un contesto node:vm, per i test
  characters.test.mjs i controlli sul layout
  approve.mjs         salva e verifica i model sheet approvati
```

Tutti i file tranne `draw.js` e `modelsheets.js` sono **puri**: solo matematica, nessuna chiamata a p5, al DOM o allo
stile. Sono script classici come il resto della pagina (caricati da `studio.html` dopo `core.js`) e, negli stessi
byte, caricabili da `tools/pagecode.mjs` nei test.

### 1. La scheda

Un file per personaggio che registra un oggetto di soli dati (stringhe, numeri, array, oggetti; nessuna funzione),
quindi serializzabile in JSON. È il formato che userà la pagina web della 4c.

```js
CHARACTERS.gatto = {
  id: 'gatto', version: 1, body: 'quadruped',
  proportions: { length: 10, height: 6.4, head: 3.4, legLength: 1.3, ... },   // in unità u
  parts: { ears: { shape: 'roundTriangle', size: .9 }, tail: { length: 4.5, hook: .6 }, collar: { bell: true },
           blaze: { shape: 'drop' } },
  roles: { fur: '#D9956C', cream: '#F6EBD8', earInner: '#C99595', collar: '#B8674F', bell: '#E8BF78',
           line: '#59463B', shadow: '#8C8074', eyeWhite: '#F6EBD8' },
  features: [ { id: 'bell', part: 'bell', views: ['front', 'q', 'side'] },
              { id: 'collar', part: 'collar', views: ['front', 'q', 'side', 'back'] }, ... ],
  expressions: { felice: { eyes: 'happy', mouth: 'open', ears: 0, tail: .6 }, triste: { ears: -1, ... }, ... },
  poses: { inPiedi: { ... }, corsa: { cycle: true, ... }, salto: { ... }, balzo: {...}, zampata: {...}, agguato: {...} },
  styles: {},          // facoltativo: colori di un ruolo per uno stile preciso, solo dove la traduzione non basta
};
```

- `proportions`: le misure che i riferimenti fissano (gatto: testa circa 1/3 della lunghezza, corpo tondo e basso,
  zampe corte; mostro: larghezza circa 3/4 dell'altezza, antenne escluse). I valori esatti si fissano nel piano
  misurando `base.png`.
- `roles`: esattamente i colori delle note. Il disegno usa **solo** questi colori, passati dallo stile (sezione 4).
- `features`: ogni tratto distintivo delle note, con le viste in cui deve comparire. Facoltativi `count` (mostro:
  2 dentini, 2 antenne) e `poses: 'all'` (i dentini ci sono in tutte le pose). Un tratto non elencato in una vista
  deve essere assente.
- `expressions` e `poses`: i nomi dei riferimenti, ciascuno un insieme di parametri del tipo di corpo.
- La validazione (in `registry.js`) rifiuta una scheda con corpo sconosciuto, ruoli mancanti per il corpo, tratti
  che puntano a parti inesistenti, espressioni o pose con parametri sconosciuti. Nella pagina l'errore passa da
  `window.loadError`, come per stili e formati: `render.mjs` si ferma subito con il messaggio.

### 2. Layout separato dal disegno

`BODIES.<tipo>.layout(scheda, stato)` è una funzione pura. `stato = { view, flip, pose, expression, t, ... }`
(dopo `act()` e la fusione di pose). Restituisce:

```js
{ parts: [ { id, role, depth, pts, line, feature?, shade? } ... ], bounds, ground }
```

- `pts`: un poligono chiuso o una linea, in unità relative ai piedi (0, 0); `depth` l'ordine di pittura;
  `line`: se e quanto contorno; `shade`: la parte è la forma d'ombra (ruolo `shadow`).
- Lo stesso layout serve al disegno, ai controlli e al model sheet: c'è una sola fonte di verità.

### 3. I due corpi

**Quadrupede** (gatto):

- parti: corpo a fagiolo, testa tonda grande, muso, macchia crema a goccia dal muso al petto, orecchie triangolari
  arrotondate con interno, 4 zampe a cilindro arrotondato (le lontane più scure), coda a uncino con punta crema,
  collarino, campanellino, baffi;
- viste: `front`, `q`, `side`, `back` come in `base.png` (dal retro: collarino sì, campanellino no; nessun muso);
- pose da `pose.png`: `inPiedi`, `corsa` (ciclo con fase delle zampe), `salto`, `balzo`, `zampata`, `agguato`;
- espressioni da `base.png`: felice, triste (orecchie basse), arrabbiato (orecchie indietro), sorpreso (coda
  dritta), assonnato (coda arrotolata), curioso (testa inclinata);
- la coda si muove sempre, anche da fermo (`t`).

**Blob** (mostro):

- parti: goccia arrotondata, pancia a mezzaluna, occhio unico ovale con pupilla verticale e palpebra, 2 dentini,
  bocca, 2 guance, 2 antenne sottili con pallina;
- `squash` s: larghezza × s, altezza × 1/s (area costante); i limiti della nota (s = 1,4 e s = 0,8) sono le pose
  `schiacciato` e `slancio`; le antenne seguono con un ritardo elastico (`spring`), calcolato da `t` in forma chiusa
  (nessuno stato tra fotogrammi);
- viste: `front`, `q`, `side` da `base.png`; `back` dedotta (solo corpo e antenne), segnata come inventata sul
  model sheet;
- pose da `pose.png`: `fermo`, `rotolamento` (ciclo: il corpo ruota e l'occhio si sposta di lato), `salto`,
  `slancio`, `broncio`, `schiacciato`;
- espressioni: felice, triste, arrabbiato, sorpreso, assonnato, spaventato (contorno tremolante); passano da
  palpebra, bocca e forma del corpo.

### 4. Disegno e stile

`character(id, x, y, u, o)` (in `draw.js`) chiama il layout e dipinge ogni parte con `paint()`/`inkLine()`, cioè
con la tecnica e i moltiplicatori dello stile attivo (Fase 1). Opzioni: `view`, `flip`, `pose`, `expression` (o
il risultato di `act()`), `t`, `key` (seme del boil), `noShadow`.

- I colori passano da `roleColor(scheda, ruolo)`: prima `scheda.styles[STYLE_NAME][ruolo]` se esiste, poi il colore
  del ruolo tradotto dal blocco `STYLE.character` dello stile:

  ```js
  character: { toPaper: 0, shadow: 'fill', lineWeight: 1 }
  ```

  `toPaper` mescola i colori verso `PAL.paper` (0 in `classic`, 0,3 in `acquerello-leggero` come il resto della sua
  palette); `shadow: 'fill'` dipinge l'ombra come velatura ad acquerello (`'hard'` sarà la forma netta di cozy e
  anime, Fase 3); `lineWeight` scala il contorno. Il blocco è facoltativo: uno stile che non lo ha usa questi
  valori, quindi gli stili esistenti restano validi e `classic` non cambia.
- Il contorno usa il ruolo `line` del personaggio, non `PAL.ink`.
- Ogni parte prende il suo seme del boil (`boilSeed('char <key> <parte>')`), come fa Clawd, così una parte che si
  muove non fa ribollire le altre.

### 5. Espressioni e pose in movimento

- `act(t, chiavi, scheda)` restituisce l'espressione al tempo `t` da chiavi `[[t0, 'felice'], [t1, 'sorpreso'], ...]`:
  i parametri numerici si fondono con un'andatura morbida, quelli discreti (forma dell'occhio e della bocca) cambiano
  a metà, sotto un breve strizzo d'occhi; un piccolo "take" del corpo dopo il cambio (anticipazione e assestamento,
  principio dell'ANIMATION_GUIDE). Funzione pura di `t`.
- `blendPose(a, b, k)` fonde due pose dello stesso corpo; i cicli (`corsa`, `rotolamento`) prendono la fase da `t`.

### 6. Controlli (`npm test`)

`tools/characters.test.mjs` carica i file puri con `tools/pagecode.mjs` e, per ogni personaggio, per ogni vista ×
posa × espressione (e per alcuni istanti dei cicli):

- ogni tratto distintivo è presente nelle viste dichiarate e assente nelle altre; i conteggi (`count`) tornano;
- le proporzioni dichiarate tornano entro il 10% (per esempio la testa del gatto circa 1/3 della lunghezza);
- ogni colore usato è un ruolo della scheda;
- blob: l'area del corpo resta costante entro l'1% per ogni `squash` tra 0,8 e 1,4;
- stesso input, stesso layout (determinismo);
- la validazione rifiuta schede sbagliate, ognuna con il suo messaggio (un test per errore).

Quello che i test non vedono, cioè se il personaggio somiglia a sé, lo giudica Andrea sui model sheet.

### 7. Model sheet e approvazione

- `modelsheets.js` crea per ogni personaggio registrato due loop in formato `landscape`, lunghi 4 s:
  - `LOOPS.sheet_<id>`: le viste in fila, le sei espressioni, la sagoma nera, i campioni dei ruoli colore (come
    `base.png`); le viste inventate hanno una piccola etichetta "dedotta";
  - `LOOPS.pose_<id>`: le sei pose (come `pose.png`).
- Il fotogramma a `t = 0` è l'immagine da approvare; il loop intero mostra il movimento a riposo (coda, antenne).
- Comando: `node render.mjs --loop=sheet_gatto --stills=0 --style=classic --out=out/sheets/gatto-classic`.
- **Approvazione:** quando Andrea approva un personaggio in uno stile, `node tools/approve.mjs gatto classic` salva
  i due PNG in `reference/characters/gatto/approvati/` (`sheet-classic.png`, `pose-classic.png`) e aggiorna
  `reference/characters/gatto/approvati/approvati.json` (`{ "classic": <version> }`). La scheda non viene mai
  riscritta da uno strumento.
- **Deriva:** `node tools/approve.mjs --check` rifà i PNG di ogni coppia approvata e li confronta byte per byte;
  fallisce se un cambio di codice altera un personaggio approvato senza che la sua `version` sia cresciuta, e
  segnala le coppie "da approvare" (versione nuova o stile nuovo). Uno script `npm run check-characters`.

### 8. Cosa non cambia

- `npm run check` resta `OK`: la libreria aggiunge solo file e tag `<script>`; il blocco `character` è facoltativo e
  non viene aggiunto a `classic` (che usa i valori predefiniti, identici).
- Tutti i formati (`landscape`, `vertical`, `feed`) e `--draft` funzionano: il personaggio dipinge con `paint()`.
- Clawd, la demo e `src/sheets.js` (i model sheet di Clawd) restano come sono.

## Misure da raccogliere

| render | tempo |
|---|---|
| `sheet_gatto` / `pose_gatto`, `--stills=0`, classic | 14,0 s / 10,3 s (fotogramma 5,1 s / 2,8 s) |
| `sheet_mostro` / `pose_mostro`, `--stills=0`, classic | 9,6 s / 9,0 s (fotogramma 2,4 s / 1,9 s) |
| gli stessi in `acquerello-leggero` | gatto 10,4 s / 8,5 s; mostro 8,4 s / 8,0 s |
| loop verticale di prova (gatto + mostro, 4 s) in `--clip --draft --format=vertical` | 22,2 s (48 fotogrammi) |

Misurati il 2026-10-27; il tempo totale comprende l'avvio di Chrome (circa 7 s).

## Rischi

- **Somiglianza:** una forma parametrica può non rendere il "cicciottello" del gatto o la goccia del mostro.
  Mitigazione: si costruisce prima la vista più riconoscibile di ciascuno e la si confronta con il riferimento
  prima di fare le altre; al massimo due giri di correzioni con Andrea per personaggio prima di fissarlo.
- **Contorno sulle parti chiare:** le parti crema del gatto sono quasi del colore della carta; la nota chiede che
  il contorno `line` resti sempre visibile. Il controllo è visivo, sul model sheet.
- **Costo:** molte parti piccole con riempimenti ad acquerello rallentano il render (Fase 1). Le parti del
  personaggio usano campiture piatte (`wash`) e un solo riempimento per l'ombra; si misura sul model sheet.
- **Test e pagina divergenti:** i test caricano gli stessi file della pagina con `node:vm`, mai una copia.

## Regole operative

- Comandi per Andrea in CMD. Nessun `git push`: i push li fa Andrea con GitHub Desktop.
- `package-lock.json` non va nei commit.
