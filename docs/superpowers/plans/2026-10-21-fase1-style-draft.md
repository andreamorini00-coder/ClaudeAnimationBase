# Fase 1 — STYLE, anteprima --draft, acquerello leggero: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** stile selezionabile da `config.js` senza cambiare l'output attuale, un render d'anteprima della demo sotto i 120 s e il primo stile nuovo, "acquerello leggero".

**Architecture:** gli stili sono file in `src/styles/` che si registrano in `STYLES`; `core.js` legge `STYLE` e delega il disegno a `TECHNIQUES[STYLE.technique]` (solo `watercolor` in questa fase). `render.mjs` riapre la pagina ogni N fotogrammi in ogni render e, con `--draft`, applica i tagli scelti misurando. Ogni passo del refactor si verifica con un confronto byte per byte contro fotogrammi di riferimento.

**Tech Stack:** p5.js 2.3.3 + p5.brush 2.2.3 in WEBGL, puppeteer-core 25 su Chrome (ANGLE/D3D11, Intel UHD), ffmpeg, Node 24 (`node:test` per i test degli script).

**Spec:** `docs/superpowers/specs/2026-10-21-fase1-style-draft-design.md`

## Global Constraints

- Con `style: 'classic'` i fotogrammi devono essere identici byte per byte al riferimento salvato prima del refactor.
- `node render.mjs --clip --draft --out=out/draft.mp4` sulla demo: meno di 120 s dal lancio alla scrittura dell'mp4, su questo PC.
- Le scene (`src/scenes/*.js`, `src/clawd.js`, `src/sheets.js`, `src/timeline.js`) non cambiano.
- Le proporzioni dei personaggi non vanno in `STYLE`.
- Nessun `git push`. `package-lock.json` non va nei commit (aggiungere i file uno per uno, mai `git add -A`).
- Comandi documentati per Andrea in sintassi CMD (`cd /d …`, `^` per andare a capo).
- Ogni fotogramma resta una funzione pura di `t`: niente stato tra fotogrammi, niente `Math.random()`.

## Review Focus

1. **Nome di stile sbagliato** (`--style=acquerello` invece di `acquerello-leggero`): il render deve fermarsi subito con un messaggio che elenca gli stili disponibili, non aspettare 60 s il timeout. → test nel Task 3.
2. **Crop e sheet in draft** (`--sheet … --crop=760,420,500,400 --draft`): le coordinate del crop restano in pixel 1920×1080, anche se la tela interna è più piccola. → verifica nel Task 5.
3. **Riapertura con `--range` che non parte da 0** (`--clip --range=4:7 --recycle=24`): i fotogrammi devono essere gli stessi di un render senza riapertura. → test nel Task 2.
4. **`studio.html` aperto a mano senza parametri**: usa lo stile di `config.js` e la piena qualità; `?style=` e `?draft` funzionano anche lì. → verifica nel Task 3 e nel Task 5.
5. **Audio con il draft a 12 fps** (`PROJECT.audio` o `--audio`): durata del video e dell'audio uguali. → verifica nel Task 5 con un file audio di prova generato da ffmpeg.

---

### Task 1: Riferimento e strumento di confronto

**Files:**
- Create: `tools/compare.mjs`
- Create: `tools/compare.test.mjs`
- Modify: `package.json` (script `test`, `ref`, `check`)

**Interfaces:**
- Produces: `compareDirs(refDir: string, newDir: string) => { same: number, total: number, firstDiff: string | null, missing: string[] }`, esportata da `tools/compare.mjs`. Da riga di comando: `node tools/compare.mjs <ref> <new>` stampa `OK n/n identici` ed esce 0, altrimenti stampa il primo file diverso o mancante ed esce 1.
- Produces: `npm run ref` scrive il riferimento in `out/ref/`; `npm run check` renderizza gli stessi fotogrammi in `out/check-ref/` e chiama il confronto.

- [ ] **Step 1: Write the failing tests** in `tools/compare.test.mjs` con `node:test`, usando cartelle temporanee (`fs.mkdtempSync`):
  - `identical dirs pass`: due cartelle con gli stessi due file → `{ same: 2, total: 2, firstDiff: null, missing: [] }`.
  - `one changed byte fails`: stesso contenuto tranne un byte in `b.png` → `firstDiff === 'b.png'`.
  - `missing file is reported`: un file presente solo nel riferimento → `missing` contiene il suo nome.
  - `empty reference is an error`: riferimento vuoto → lancia `Error` con messaggio che contiene `nessun file`.
- [ ] **Step 2:** `node --test tools/` → FAIL (modulo mancante).
- [ ] **Step 3: Implement `compareDirs`** confrontando i `Buffer` con `buf.equals()`, file ordinati per nome, solo `.png`.
- [ ] **Step 4:** `node --test tools/` → 4 PASS.
- [ ] **Step 5: Script in `package.json`:**
  - `"test": "node --test tools/"`
  - `"ref": "node render.mjs --stills=0.5,2,6.5,9.9 --out=out/ref && node render.mjs --loop=emotions --stills=1 --out=out/ref/emotions"`
  - `"check": "node render.mjs --stills=0.5,2,6.5,9.9 --out=out/check-ref && node render.mjs --loop=emotions --stills=1 --out=out/check-ref/emotions && node tools/compare.mjs out/ref out/check-ref"`
  - `compareDirs` scende nelle sottocartelle (serve per `emotions/`): aggiungere il test `nested dirs are compared` prima di implementarlo.
- [ ] **Step 6: Salvare il riferimento sul codice ancora intatto:** `npm run ref`, poi `npm run check` → `OK 5/5 identici`.
- [ ] **Step 7: Commit** `tools/compare.mjs tools/compare.test.mjs package.json` — "Strumento di confronto byte per byte e script ref/check".

### Task 2: Riapertura periodica della pagina in render.mjs

**Files:**
- Modify: `render.mjs` (rami `--clip`, `--frames`, `--png`; helper nuovo vicino a `openPage`)

**Interfaces:**
- Consumes: `openPage(tag)` esistente.
- Produces: opzione `--recycle=N` (default `RECYCLE_DEFAULT`, costante in testa a `render.mjs`, valore fissato dallo Step 4; `0` = mai). Helper `async function pageFor(state, i)` che restituisce la pagina corrente e la chiude/riapre quando `i` è multiplo di N.
- Produces: opzione `--out` accettata anche da `--png` con `--range` (già esistente: la usano i test).

- [ ] **Step 1: Test di equivalenza (script, non unit test):** con il codice attuale `node render.mjs --png --range=4:5 --workers=1 --out=out/t/norecycle` (24 PNG).
- [ ] **Step 2: Implementare `--recycle`** nei tre rami. Nel ramo `--png`/`--frames` ogni worker conta i suoi fotogrammi e ricicla la propria pagina.
- [ ] **Step 3: Verifica Review Focus 3:** `node render.mjs --png --range=4:5 --workers=1 --recycle=5 --out=out/t/recycle5` poi `node tools/compare.mjs out/t/norecycle out/t/recycle5` → `OK 24/24 identici`.
- [ ] **Step 4: Scegliere il default misurando** `--clip --range=0:6` (144 fotogrammi) con `--recycle=0`, `24`, `48`, `96`. Annotare i quattro tempi; il default è il più veloce (a pari tempo, il numero più alto). Scriverlo in `RECYCLE_DEFAULT`.
- [ ] **Step 5: Render completo classico con riapertura:** `node render.mjs --clip --out=out/classic-recycle.mp4`, misurare il tempo e scriverlo nella tabella "Misure" della spec.
- [ ] **Step 6:** aggiornare il commento d'uso in testa a `render.mjs` e la sezione "Render" di `ANIMATION_GUIDE.md` con `--recycle`.
- [ ] **Step 7: Commit** `render.mjs ANIMATION_GUIDE.md docs/superpowers/specs/…-design.md` — "Riapertura periodica della pagina in ogni render".

### Task 3: Registro degli stili e stile `classic`

**Files:**
- Create: `src/styles/registry.js` (solo `const STYLES = {};`)
- Create: `src/styles/classic.js`
- Modify: `src/config.js` (`style: 'classic'` in `PROJECT`)
- Modify: `src/core.js:4-10` (BOIL, PAL), `:246-272` (makePaper, makeGrain, defineBrushes), `:276-277` (scaleBrushes)
- Modify: `studio.html` (script tag di `registry.js` e degli stili prima di `core.js`)
- Modify: `render.mjs` (`--style=nome` → `?render&style=nome`; attesa di `window.ready || window.loadError`)

**Interfaces:**
- Produces: `STYLES[name]` con la forma della spec (`technique`, `palette`, `paper`, `grain`, `brushes`, `brushScale`, `boil`, `paint`). Valori di `classic` = i numeri attuali di `core.js`, copiati senza ricalcoli.
- Produces: in `core.js`, `const STYLE_NAME` (da `?style=` oppure `PROJECT.style`), `const STYLE = STYLES[STYLE_NAME]`, `const PAL = STYLE.palette`, `BOIL = STYLE.boil`.
- Produces: se lo stile non esiste, `core.js` imposta `window.loadError = 'Stile "x" inesistente. Disponibili: classic, …'` e lancia `Error` con lo stesso testo; `render.mjs` stampa il messaggio ed esce con codice 1.

Parametri da estrarre (tutti i letterali, nello stesso ordine di chiamata):
- `makePaper`: seme `11`, 70 macchie, raggio `120 + rnd()*380`, alpha `.045`, colore `160,125,80`; 1400 fibre, lunghezza `6 + rnd()*26`, alpha `.035 + rnd()*.06`, colore `110,88,60`, `lineWidth 1`.
- `makeGrain`: seme `5`, soglia `.55`, profondità `34`, offset canali `-1`/`-3`, vignetta raggi `H*.45`→`H*1.05`, colore `120,95,70`, alpha `.35`.
- `defineBrushes`: i tre oggetti passati a `brush.add`, identici.

- [ ] **Step 1: Test Review Focus 1:** `node render.mjs --stills=1 --style=nope --out=out/t/nope` → oggi non fallisce (ignora il parametro): annotare.
- [ ] **Step 2: Creare `registry.js`, `classic.js`, aggiornare `studio.html` e `config.js`.**
- [ ] **Step 3: Spostare palette, BOIL e scaleBrushes** su `STYLE`. `npm run check` → `OK 5/5 identici`.
- [ ] **Step 4: Spostare pennelli, carta e grana** su `STYLE`. Le chiamate a `rnd()` restano nello stesso numero e ordine. `npm run check` → `OK 5/5 identici`.
- [ ] **Step 5: `--style` e `loadError` in `render.mjs`.** Ripetere lo Step 1 → esce con codice 1 in meno di 10 s e il messaggio elenca `classic`. `node render.mjs --stills=2 --style=classic --out=out/t/cls` + confronto con `out/ref/t2_00.png` → identico.
- [ ] **Step 6: Verifica Review Focus 4:** aprire `studio.html` e `studio.html?style=classic&t=2` nel browser (comando per Andrea: `start "" "%CD%\studio.html"`); nessun errore in console.
- [ ] **Step 7:** sezione "Stili" breve in `ANIMATION_GUIDE.md` (dove stanno, come se ne crea uno copiando `classic.js`, `--style`).
- [ ] **Step 8: Commit** `src/styles/registry.js src/styles/classic.js src/config.js src/core.js studio.html render.mjs ANIMATION_GUIDE.md` — "STYLE selezionabile da config.js, stile classic".

### Task 4: Tecniche e moltiplicatori di `paint()`

**Files:**
- Create: `src/techniques/watercolor.js`
- Modify: `src/core.js` (`paint`, `paintAt`, `inkLine`, `makePaper`, `makeGrain` delegano), `studio.html` (script tag di `watercolor.js` prima di `core.js`)

**Interfaces:**
- Produces: `TECHNIQUES.watercolor = { paintAt(pts, o), inkLine(P, sw, col, br, curv), makePaper(style), makeGrain(style) }`. Il registro `const TECHNIQUES = {}` sta in `src/styles/registry.js`; `watercolor.js` si carica prima di `core.js` e usa `PAL`/`W`/`H` solo dentro le funzioni (chiamate dopo il caricamento di `core.js`).
- Produces: `styled(o) => o'` in `core.js`. Se `STYLE.paint` è l'identità (tutti 1 e `fillAs: 'fill'`) restituisce **lo stesso oggetto** `o`. Altrimenti una copia dove:
  - `fillAs: 'wash'` e c'è `o.fill`: se c'è anche `o.wash` si toglie `fill`; altrimenti `wash = o.fill`, `washOp = (o.fillOp ?? 170) * m.fillOp`, e si toglie `fill`;
  - con `fill` mantenuto: `fillOp = (o.fillOp ?? 170) * m.fillOp`, `bleed = (o.bleed ?? .1) * m.bleed`, `tex = (o.tex ?? .4) * m.tex`;
  - `washOp` presente o wash attivo: `washOp = (o.washOp ?? 255) * m.washOp`, limitato a 255;
  - `sw` sempre: `(o.sw ?? 1) * m.sw`.
- Produces: `inkLine` applica `m.sw` allo spessore.

- [ ] **Step 1: Spostare `paintAt` e `inkLine`** in `watercolor.js` senza cambiare una riga del corpo; `paint()`/`inkLine()` in `core.js` chiamano `TECHNIQUES[STYLE.technique]`. `npm run check` → identico.
- [ ] **Step 2: Spostare `makePaper`/`makeGrain`** nella tecnica. `npm run check` → identico.
- [ ] **Step 3: Aggiungere `styled()`** e chiamarlo in `paint()`. `npm run check` → identico (classic è l'identità).
- [ ] **Step 4: Prova di funzionamento:** stile temporaneo di prova passato con un file `src/styles/_probe.js` non committato, `paint: { …, fillAs: 'wash' }`. `node render.mjs --sheet=2,6.5 --style=_probe --out=out/t/probe.jpg` → guardare l'immagine: niente bordi sfumati ad acquerello negli sfondi, nessun errore in pagina. Cancellare `_probe.js`.
- [ ] **Step 5: Commit** `src/techniques/watercolor.js src/styles/registry.js src/core.js studio.html` — "Tecnica watercolor separata e moltiplicatori di stile in paint()".

### Task 5: Anteprima `--draft`

**Files:**
- Modify: `render.mjs` (`--draft`: fps, parametro `?draft`, default di workers/recycle se misurati utili)
- Modify: `src/core.js` (`DRAFT` letto da `?draft`; scala della tela se tenuta)
- Modify: `studio.html` (dimensione di `#out` se cambia la risoluzione)

**Interfaces:**
- Consumes: `styled()` (Task 4), `--recycle` (Task 2).
- Produces: `const DRAFT = { on: boolean, scale: number, flatFills: boolean }` in `core.js`. Con `flatFills` `styled()` forza `fillAs: 'wash'` sopra qualunque stile.
- Produces: `render.mjs --draft` → fps `12` (salvo `--fps` esplicito), mp4 a 12 fps con la stessa durata.

Misure, ognuna su `node render.mjs --clip --range=4:7` (la parte più costosa della demo), con la riapertura attiva:

| prova | come attivarla |
|---|---|
| base | nessun flag |
| 12 fps | `--fps=12` |
| riempimenti piatti | `?draft` con solo `flatFills` |
| mezza risoluzione | `?draft` con solo `scale: .5` |
| 2 worker | `--frames --range=4:7 --workers=2` |

- [ ] **Step 1: Implementare `flatFills`** (una riga in `styled()`) e `--draft`: `openPage` aggiunge `&draft` all'URL in ogni modalità (`--clip`, `--frames`, `--png`, `--sheet`, `--stills`); in `--clip`/`--frames`/`--png`/`--encode` il fps di default diventa 12.
- [ ] **Step 2: Implementare la mezza risoluzione:** `createCanvas(W*s, H*s)`, `scale(s)` subito dopo il `translate` in `draw()`, `brush.scaleBrushes(STYLE.brushScale * s)`, carta e grana generate a `W*s × H*s`, `#out` a `W*s × H*s`. Verifica visiva su `--sheet=2,6.5 --draft`: spessori delle linee e grana in proporzione con la versione piena. Se non sono in proporzione, rimuovere la mezza risoluzione e annotarlo nella spec (sezione Rischi).
- [ ] **Step 3: Verifica Review Focus 2:** `--sheet=2.3 --crop=760,420,500,400 --draft` mostra la stessa zona (la faccia) di `--sheet=2.3 --crop=760,420,500,400`. In `renderSheet` crop e `at` si moltiplicano per `s`.
- [ ] **Step 4: Fare le cinque misure della tabella** e scriverle nella spec. Tenere i tagli in quest'ordine finché la stima sulla demo intera (tempo spezzone × 11/3) scende sotto 100 s: 12 fps, riempimenti piatti, mezza risoluzione, worker.
- [ ] **Step 5: Render completo:** `node render.mjs --clip --draft --out=out/draft-classic.mp4`, tempo misurato con `time` → < 120 s. Se è sopra, fermarsi e riportare le misure ad Andrea prima di aggiungere altri tagli.
- [ ] **Step 6: Verifica Review Focus 5:** `ffmpeg -f lavfi -i sine=d=11 out/t/tone.mp3`, poi `--clip --draft --audio=out/t/tone.mp3 --out=out/t/audio.mp4`; `ffprobe` → durate video e audio entrambe 11,0 s (±0,1).
- [ ] **Step 7: Verifica che la piena qualità non sia toccata:** `npm run check` → identico.
- [ ] **Step 8:** `--draft` nel commento d'uso di `render.mjs`, in "Render" di `ANIMATION_GUIDE.md` e nel README (con i comandi CMD).
- [ ] **Step 9: Commit** `render.mjs src/core.js studio.html ANIMATION_GUIDE.md README.md docs/superpowers/specs/…-design.md` — "Anteprima veloce --draft".

### Task 6: Stile `acquerello-leggero`

**Files:**
- Create: `src/styles/acquerello-leggero.js`
- Modify: `studio.html` (script tag)
- Modify: spec (tabella "Misure")

**Interfaces:**
- Consumes: forma di `STYLES.classic` (Task 3), `paint` multipliers (Task 4).
- Produces: `STYLES['acquerello-leggero']`, valori di partenza:
  - `palette`: ogni colore di `classic` tranne `paper` e `ink` = `mixCol(colore, '#FBF6EC', .3)`, scritti come esadecimali letterali nel file; `paper: '#FBF6EC'`; `ink: '#4A4152'` (più morbido, non nero);
  - `paint: { fillOp: .5, bleed: .7, tex: .6, washOp: 1, sw: .7, fillAs: 'wash' }`;
  - pennello `ink`: `weight 3.2, opacity 190`, il resto come `classic`; `inkfine` e `dry` come `classic`;
  - `paper`: macchie e fibre al 60% dell'alpha di `classic`; `grain`: profondità `20`, vignetta `.2`;
  - `technique: 'watercolor'`, `boil: 12`, `brushScale: 5`.

- [ ] **Step 1: Creare lo stile** con i valori sopra e aggiungerlo a `studio.html`.
- [ ] **Step 2: Sheet di confronto:** `node render.mjs --sheet=0.5,2,4,6.5,8.5,9.9 --cols=6 --w=320 --out=out/cmp/classic.jpg` e lo stesso con `--style=acquerello-leggero` in `out/cmp/leggero.jpg`. Controlli: niente nero o bianco puri, Clawd ben leggibile sullo sfondo, `glow()` non spento sul cielo più chiaro.
- [ ] **Step 3: Mostrare i due sheet ad Andrea** e correggere i valori su sua indicazione (massimo due giri; poi si fissano).
- [ ] **Step 4: Anteprima:** `node render.mjs --clip --draft --style=acquerello-leggero --out=out/leggero-draft.mp4` → tempo < 120 s, annotato nella spec.
- [ ] **Step 5: Render finale:** `node render.mjs --clip --style=acquerello-leggero --out=out/leggero.mp4` (in background, ~10 min previsti), tempo annotato nella spec.
- [ ] **Step 6:** `npm test` → PASS; `npm run check` → `OK 5/5 identici` (classic invariato).
- [ ] **Step 7: Commit** `src/styles/acquerello-leggero.js studio.html docs/superpowers/specs/…-design.md` — "Stile acquerello leggero e misure finali".

---

## Fasi successive

Fase 2 (Social), Fase 3 (Stili cozy e anime) e Fase 4 (Creatore di personaggi) sono descritte in [roadmap.md](roadmap.md).
