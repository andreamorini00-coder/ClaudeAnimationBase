# Fase 4a — Libreria personaggi (gatto e mostro): piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `character('gatto' | 'mostro', x, y, u, o)` disegna un personaggio in vista, posa ed espressione scelte, nello stile attivo, con controlli automatici sul layout e model sheet da far approvare ad Andrea.

**Architecture:** schede di soli dati in `src/characters/`; per ogni tipo di corpo una funzione pura `layout()` che restituisce le parti (forme, ruolo colore, profondità, tratto distintivo); `draw.js` le dipinge con `paint()`/`inkLine()`. I file puri si caricano anche in Node con `node:vm`, così `npm test` controlla tratti, conteggi, proporzioni, colori e volume senza browser.

**Tech Stack:** script classici nel browser (p5.js 2.3.3 + p5.brush 2.2.3, come il resto), Node 24 `node:test` + `node:vm`, `render.mjs` per i model sheet.

**Spec:** `docs/superpowers/specs/2026-10-27-fase4a-personaggi-design.md`

## Global Constraints

- `npm run check` deve restare `OK 9/9 identici` dopo ogni task (classic, demo e loop esistenti invariati).
- Nessun file della libreria usa niente di `clawd.js`. `src/sheets.js`, `src/clawd.js` e le scene esistenti non si toccano.
- **Nessun nome globale nuovo che esista già nella pagina.** Già presi, tra gli altri: `clamp lerp ease easeIn easeOut spring ring wob seg kf mixCol hash jit eye eyes mouth blush turn VIEWS feel emotions move draw paint inkLine ellPts rectPts through ribbon`. I file della libreria definiscono solo questi globali: `CHARACTERS`, `BODIES`, `CG` (geometria e matematica), `FACES`, `validateCharacter`, `act`, `blendPose`, `resolveState`, `character`, `roleColor`, `CHAR_STYLE`.
- File **puri** (`registry.js`, `shapes.js`, `faces.js`, `act.js`, `bodies/*.js`, `gatto.js`, `mostro.js`): solo `Math`, nessun p5, DOM, `PAL`, `STYLE`, `W`, `H`, `T`, `random()`/`jit()`. Nessuno stato tra fotogrammi.
- Le schede sono solo dati serializzabili in JSON (nessuna funzione, nessun `undefined`).
- Colori dei personaggi: solo i ruoli della scheda, esattamente gli esadecimali di `reference/characters/<id>/note.md`.
- Blob: larghezza × altezza = 1. `schiacciato` = squash 1,4 (altezza 0,714), `slancio` = squash 0,8 (altezza 1,25).
- Nomi di viste: `front`, `q`, `side`, `back`. Pose ed espressioni con i nomi italiani dei riferimenti (sotto).
- Comandi per Andrea in CMD; nessun `git push`; `package-lock.json` mai nei commit (aggiungere i file uno per uno).

## Review Focus

1. **Nome sbagliato in una scena** (`pose: 'corri'`, `expression: 'contento'`, `view: 'left'`): errore immediato che elenca i nomi validi, non un fotogramma vuoto o un `NaN`. → test nel Task 5.
2. **`flip: true`**: il personaggio guarda a sinistra con gli stessi tratti e le stesse proporzioni (specchio esatto in x). → test nel Task 3.
3. **Dimensioni estreme** (`u` = 4 in un campo lungo, `u` = 80 in un primo piano; `squash` fuori da 0,8–1,4): nessun `NaN`, contorno proporzionato, `squash` limitato a [0,6; 1,6] sempre ad area costante. → test nei Task 2 e 4.
4. **Formato verticale e `--draft`**: un personaggio in una scena 1080×1920 e in anteprima si disegna senza errori. → verifica nel Task 7.
5. **Approvazione mancante o vecchia**: `npm run check-characters` senza approvazioni elenca "da approvare" ed esce 0; esce 1 solo se un personaggio approvato è cambiato senza aumentare `version`. → test nel Task 8.

---

### Task 1: Caricatore per i test, registro e validazione delle schede

**Files:**
- Create: `tools/pagecode.mjs`, `src/characters/registry.js`, `tools/characters.test.mjs`

**Interfaces:**
- Produces: `loadPageScripts(paths: string[]) => { get(name: string): any }` in `tools/pagecode.mjs`: un `vm.createContext({ Math, console })`, ogni file eseguito con `vm.runInContext` nello stesso contesto (i `const` di primo livello sono condivisi tra script, come nella pagina); `get('CHARACTERS')` valuta il nome nel contesto.
- Produces (registry.js): `const CHARACTERS = {}`, `const BODIES = {}`, `function validateCharacter(spec) => string[]` (messaggi in italiano, vuoto se valida). Un corpo registra `BODIES.<tipo> = { roles: string[], parts: string[], poseParams: string[], exprParams: string[], views: string[], layout(spec, state) }`.
- Produces: `CHAR_SCRIPTS`, l'elenco ordinato dei file puri, esportato da `tools/pagecode.mjs` e usato da tutti i test: `registry.js, shapes.js, faces.js, act.js, bodies/quadruped.js, bodies/blob.js, gatto.js, mostro.js` (i file non ancora creati si aggiungono nel task che li crea).

- [ ] **Step 1: Test** in `tools/characters.test.mjs`, con un corpo finto `BODIES.test` definito nel test (`roles: ['line'], parts: ['body'], poseParams: ['a'], exprParams: ['b'], views: ['front']`) e una scheda valida minima:
  - `valid spec has no errors` → `[]`;
  - `unknown body` (`body: 'drago'`) → un messaggio che contiene `drago` e `quadruped`/i corpi registrati;
  - `missing role` (manca `line`) → contiene `line`;
  - `feature on unknown part` → contiene il nome della parte;
  - `unknown pose param` / `unknown expression param` → contengono il parametro;
  - `function in spec` (un valore funzione) → contiene `solo dati`;
  - `bad hex` (`'#12345'`) → contiene il ruolo.
- [ ] **Step 2:** `npm test` → FAIL (moduli mancanti).
- [ ] **Step 3:** implementare `pagecode.mjs` e `registry.js` (campi obbligatori della scheda: `id, version, body, proportions, parts, roles, features, expressions, poses`; `styles` facoltativo; `features[i] = { id, part, views, count? }`, `count` numero o `{ <vista>: numero }`).
- [ ] **Step 4:** `npm test` → tutti PASS (anche i test esistenti: 38 + i nuovi).
- [ ] **Step 5: Commit** `tools/pagecode.mjs src/characters/registry.js tools/characters.test.mjs` — "Registro personaggi, validazione e caricatore per i test".

### Task 2: Geometria e facce

**Files:**
- Create: `src/characters/shapes.js`, `src/characters/faces.js`
- Modify: `tools/pagecode.mjs` (CHAR_SCRIPTS), `tools/characters.test.mjs`

**Interfaces:**
- Produces `CG` (shapes.js), tutte pure, punti `[x, y]` con y verso il basso:
  - `CG.clamp(x, a, b)`, `CG.lerp(a, b, k)`, `CG.smooth(k)` (smoothstep), `CG.spring(t, t0, k = 6, w = 18)` (stessa formula di `spring` in core.js), `CG.area(pts)` (shoelace, valore assoluto);
  - `CG.ellipse(cx, cy, rx, ry, n = 32, rot = 0)`;
  - `CG.bean(cx, cy, len, h, belly)`: il corpo a fagiolo del gatto (dorso piatto, pancia rotonda);
  - `CG.drop(cx, baseY, w, h, n = 48)`: la goccia del mostro, base piatta a `baseY`, punta arrotondata in alto;
  - `CG.chain(p0, angle0, lengths, bends)`: punti di una catena morbida (coda, antenne);
  - `CG.tube(path, w0, w1)`: nastro chiuso intorno a un percorso (coda, zampe);
  - `CG.mirror(pts)`: x → −x, ordine invertito.
- Produces `FACES` (faces.js): `FACES.eye(kind, cx, cy, r, look = 0)` → `{ parts: [{ id, role, pts, line }] }` per `kind` in `open happy closed sad angry wide sleepy oval` (l'`oval` con pupilla verticale per il mostro); `FACES.mouth(kind, cx, cy, w)` per `smile open frown o flat pout catSmile`. Ruoli usati: `eyeWhite`, `line` (pupilla e tratti), `mouthInside` facoltativo (se la scheda non lo ha: `line`).

- [ ] **Step 1: Test:**
  - `ellipse area` ≈ π·rx·ry entro 1% (n = 64);
  - `drop keeps its box`: larghezza e altezza del bounding box = `w`, `h` entro 1%;
  - `drop area scales with w*h` (stessa forma, `w·h` costante → area costante entro 0,5%);
  - `mirror twice is identity`;
  - `no NaN at extremes`: `ellipse/drop/bean/chain/tube` con dimensioni 0,01 e 1000 → nessun `NaN`;
  - `every eye and mouth kind` produce almeno una parte, senza `NaN`; un `kind` sconosciuto lancia un errore con l'elenco dei tipi.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** implementare `shapes.js` e `faces.js`; aggiungerli a `CHAR_SCRIPTS`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** — "Geometria e facce dei personaggi (pure)".

### Task 3: Corpo quadrupede e scheda del gatto

**Files:**
- Create: `src/characters/bodies/quadruped.js`, `src/characters/gatto.js`
- Modify: `tools/pagecode.mjs`, `tools/characters.test.mjs`

**Interfaces:**
- Consumes: `CG`, `FACES`, `BODIES`.
- Produces: `BODIES.quadruped` con
  - `roles: ['fur', 'cream', 'earInner', 'line', 'shadow', 'eyeWhite']` (+ i ruoli delle parti facoltative presenti: `collar`, `bell`);
  - `parts: ['body', 'head', 'muzzle', 'blaze', 'ears', 'legs', 'tail', 'tailTip', 'collar', 'bell', 'whiskers', 'eyes', 'mouth', 'shadow']`;
  - `poseParams: ['crouch', 'pitch', 'lift', 'stretch', 'legPhase', 'legSwing', 'pawRaise', 'cycle']`;
  - `exprParams: ['eyes', 'mouth', 'ears', 'tail', 'headTilt', 'tailCurl']` (`ears`: −1 basse … 0 … +1 indietro; `tail`: 0 normale, 1 dritta);
  - `layout(spec, state) => { parts: [{ id, role, depth, pts, line, feature? }], bounds: { x0, x1, y0, y1 } }`, unità `u` = 1, origine a terra tra le zampe, `state = { view, flip, pose: {...}, expression: {...}, t }` già risolto (Task 5).
  - `state.expression.squint` (0..1, scritto da `act()` del Task 5; assente = 0) chiude gli occhi verso una linea: il layout lo legge anche se non è un parametro della scheda.
- Produces: `CHARACTERS.gatto` (ruoli dalla nota: fur `#D9956C`, cream `#F6EBD8`, earInner `#C99595`, collar `#B8674F`, bell `#E8BF78`, line `#59463B`, shadow `#8C8074`, eyeWhite `#F6EBD8`), `version: 1`, proporzioni di partenza `length 10, height 6.4, head 3.6, legLength 1.1, tail 4.5`, pose `inPiedi corsa salto balzo zampata agguato` (`corsa` con `cycle: 1`), espressioni `felice triste arrabbiato sorpreso assonnato curioso` con i segni della nota (orecchie basse, indietro, coda dritta, coda arrotolata, testa inclinata).
- Tratti: `blaze` (front, q, side), `collar` (tutte), `bell` (front, q, side), `tailTip` (tutte), `earInner` (front, q, side), `whiskers` (front, q, side).

- [ ] **Step 1: Test** (per ogni vista × posa × espressione, `t` = 0 e 0,37):
  - `gatto spec is valid`;
  - `gatto features per view`: le parti con `feature` corrispondono esattamente a quelle dichiarate per quella vista (presenti tutte, nessuna in più);
  - `gatto head is about a third of the length`: in `side` + `inPiedi`, larghezza della testa / lunghezza del corpo senza coda tra 0,30 e 0,37;
  - `gatto uses only its roles`;
  - `gatto layout is deterministic` (due chiamate uguali → stessi numeri);
  - `flip mirrors exactly` (Review Focus 2): ogni punto con `flip: true` = punto senza flip con x negata;
  - `tail moves at rest`: in `inPiedi` la punta della coda a `t` = 0 e 0,5 differisce di almeno 0,1 u;
  - `run cycle moves the legs`: in `corsa` le zampe a `t` = 0 e 0,25 differiscono.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** implementare. Si costruisce prima `side` (la vista più riconoscibile di `base.png`), poi `q`, `front`, `back`. Profondità: zampe lontane → corpo → coda (dietro in `front`/`q`, davanti in `back`) → zampe vicine → testa → muso e macchia → occhi, bocca, baffi → collarino → campanellino.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** — "Corpo quadrupede e scheda del gatto".

### Task 4: Corpo blob e scheda del mostro

**Files:**
- Create: `src/characters/bodies/blob.js`, `src/characters/mostro.js`
- Modify: `tools/pagecode.mjs`, `tools/characters.test.mjs`

**Interfaces:**
- Il blob legge `state.expression.squint` come il quadrupede (chiude la palpebra).
- Produces `BODIES.blob`: `roles: ['body', 'belly', 'tip', 'cheek', 'line', 'shadow']` (occhio e dentini usano `belly`, come la nota: pancia, occhio e dentini `#F7F2E8`); `parts: ['body', 'belly', 'eye', 'lid', 'teeth', 'mouth', 'cheeks', 'antennae', 'antennaTips', 'shadow']`; `poseParams: ['squash', 'lean', 'roll', 'hop', 'cycle']`; `exprParams: ['eye', 'lid', 'mouth', 'shiver']`; `layout` come il quadrupede.
  - `squash` s limitato a [0,6; 1,6]: larghezza `w0·s`, altezza `h0/s`.
  - Antenne: punta = posizione a riposo + ritardo `CG.spring(t, tCambio)` sulla variazione di `squash`/`hop` (forma chiusa in `t`).
  - `shiver` (spaventato): contorno ondulato `sin` sul bordo, ampiezza piccola, che non cambia l'area più dell'1%.
- Produces `CHARACTERS.mostro` (body `#ADA2E8`, belly `#F7F2E8`, tip `#FFD166`, cheek `#FF5D73`, line `#1C2440`, shadow `#555B91`), `version: 1`, proporzioni `height 6, width 4.5` (3/4), `antenna 2.2`, `eyeH 2.3, eyeW 1.7`; pose `fermo rotolamento salto slancio broncio schiacciato` (`schiacciato` squash 1,4; `slancio` squash 0,8; `rotolamento` con `cycle: 1`); espressioni `felice triste arrabbiato sorpreso assonnato spaventato`.
- Tratti: `eye` (front, q, side), `teeth` con `count: 2` (front, q, side), `antennae` con `count: 2` (tutte), `belly` (front, q, side), `cheeks` con `count: { front: 2, q: 2, side: 1 }`. Vista `back` dedotta: solo corpo e antenne.

- [ ] **Step 1: Test:**
  - `mostro spec is valid`;
  - `mostro features per view` e `mostro counts` (dentini 2 in ogni posa ed espressione, antenne 2 in ogni vista, guance secondo la vista);
  - `blob volume is constant`: area del corpo per squash 0,6 / 0,8 / 1 / 1,4 / 1,6 uguale entro 1%; con `shiver` 1 entro 1%;
  - `squash limits match the note`: in `schiacciato` larghezza/altezza a riposo = 1,4 e 0,714 (±1%); in `slancio` 0,8 e 1,25;
  - `squash is clamped` (Review Focus 3): squash 5 e 0,05 → stesso risultato di 1,6 e 0,6, nessun `NaN`;
  - `antennae lag`: subito dopo un salto le punte non sono nella posizione di riposo, dopo 1 s sì (entro 0,05 u);
  - `mostro uses only its roles`, `deterministic`, `flip mirrors exactly`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** implementare (prima `front`, la vista di `base.png`).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** — "Corpo blob e scheda del mostro".

### Task 5: Espressioni recitate, pose e risoluzione dello stato

**Files:**
- Create: `src/characters/act.js`
- Modify: `tools/pagecode.mjs`, `tools/characters.test.mjs`

**Interfaces:**
- Produces (pure):
  - `act(t, keys: [number, string][], spec) => { expression: object, take: number }`: tra due chiavi i parametri numerici si fondono in 0,3 s con `CG.smooth`; i discreti (`eyes`, `mouth`, `eye`, `lid`) cambiano a metà, dove `expression.squint` = 1 (0 fuori dalla transizione); `take` (0..1) è il piccolo sobbalzo del corpo dopo il cambio, `CG.spring`.
  - `blendPose(a, b, k) => object` (numeri interpolati, discreti da `b` se k ≥ 0,5).
  - `resolveState(spec, o) => { view, flip, pose, expression, t }` da `o = { view = 'q', flip, pose = <prima posa>, expression = <prima espressione> | { act result }, t }`; i nomi sono stringhe della scheda, oppure oggetti di parametri già pronti.
- Errori (Review Focus 1): nome di vista, posa o espressione sconosciuto → `Error` con il nome sbagliato e l'elenco dei validi, per esempio `Posa "corri" inesistente per gatto. Disponibili: inPiedi, corsa, …`.

- [ ] **Step 1: Test:** `act holds the first key before it`; `act swaps discrete params at the midpoint` (prima: `eyes` della prima chiave, dopo: della seconda, a metà `squint` = 1); `act blends numbers` (a metà ≈ media); `take settles` (dopo 1 s < 0,02); `blendPose`; `unknown names throw with the list` (tre casi: vista, posa, espressione; il messaggio contiene il nome sbagliato e uno dei nomi validi); `act with an unknown expression throws`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** implementare.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** — "Espressioni recitate, fusione di pose, stato del personaggio".

### Task 6: Disegno nello stile attivo

**Files:**
- Create: `src/characters/draw.js`
- Modify: `studio.html` (dopo `src/sheets.js`: `registry, shapes, faces, act, bodies/quadruped, bodies/blob, gatto, mostro, draw`), `src/styles/acquerello-leggero.js` (blocco `character`)

**Interfaces:**
- Consumes: tutto il resto della libreria; `paint`, `inkLine`, `boilSeed`, `mixCol`, `PAL`, `STYLE`, `STYLE_NAME` da core.js.
- Produces:
  - `CHAR_STYLE = { toPaper: 0, shadow: 'fill', lineWeight: 1, ...(STYLE.character || {}) }`;
  - `roleColor(spec, role) => hex`: `spec.styles?.[STYLE_NAME]?.[role]` se c'è, altrimenti `mixCol(spec.roles[role], PAL.paper, CHAR_STYLE.toPaper)`;
  - `character(id, x, y, u, o = {})`: `resolveState` → `layout` → per ogni parte in ordine di `depth`: `boilSeed('char ' + (o.key ?? id) + ' ' + part.id)`, poi `paint(pts in px, { wash: roleColor, washOp: 255, ink: line ? roleColor(spec, 'line') : null, sw })` con `sw = clamp(u / 15, .45, 2.4) * part.line * CHAR_STYLE.lineWeight`; le parti `shade` con `fill` (`fillOp` 110, `bleed` .1) se `CHAR_STYLE.shadow === 'fill'`, con `wash` se `'hard'`; ombra a terra come `fill` di `roleColor(spec, 'shadow')` salvo `o.noShadow`. Al caricamento, `validateCharacter` su ogni scheda registrata: al primo errore `window.loadError = 'Personaggio "<id>": <messaggio>'` e `throw`.
- `acquerello-leggero.js` riceve `character: { toPaper: .3 }`; `classic.js` **non** cambia.
- `render.mjs`: aggiungere `Personaggio` alle parole del filtro degli errori di caricamento (`/inesistente|incompleto|Personaggio/`).

- [ ] **Step 1: Verifica di partenza:** `npm run check` → `OK 9/9 identici`.
- [ ] **Step 2: Implementare** `draw.js`, i tag in `studio.html`, il blocco di `acquerello-leggero`.
- [ ] **Step 3:** `npm run check` → `OK 9/9 identici` (classic e demo invariati).
- [ ] **Step 4: Prova veloce** con uno sheet temporaneo non committato (`src/scenes/_prova.js` con un `LOOPS._prova` che disegna gatto e mostro in `q`, aggiunto a `studio.html` solo per la prova): `node render.mjs --loop=_prova --stills=0 --out=out/t/prova` → nessun errore di pagina; guardare l'immagine.
- [ ] **Step 5: Errore di scheda:** una copia temporanea del gatto con `body: 'drago'` → `render.mjs` esce con codice 1 in pochi secondi e il messaggio `Personaggio "…": …`. Togliere i file di prova.
- [ ] **Step 6: Commit** `src/characters/draw.js studio.html src/styles/acquerello-leggero.js render.mjs` — "Disegno dei personaggi nello stile attivo".

### Task 7: Model sheet automatici

**Files:**
- Create: `src/characters/modelsheets.js` (tag in `studio.html` dopo `draw.js`)
- Modify: `ANIMATION_GUIDE.md` (sezione "Characters"), spec (tabella "Misure")

**Interfaces:**
- Produces: per ogni `id` in `CHARACTERS`, `LOOPS['sheet_' + id]` e `LOOPS['pose_' + id]`, `len = 4`, `format = 'landscape'`.
  - `sheet_<id>`: riga alta con le viste del corpo (`side, front, q, back` come `base.png`), u scelto perché la riga riempia ~90% della larghezza; riga sotto con le sei espressioni in `q` (u più piccolo); in basso la sagoma (tutte le parti in `roleColor(spec,'line')`) e un cerchio per ruolo. Etichette con `letter()` piccole (nome espressione; "dedotta" sotto le viste non presenti nel riferimento, cioè il `back` del mostro): i model sheet sono riferimenti, dove le etichette sono ammesse come in `src/sheets.js`.
  - `pose_<id>`: le sei pose in fila, come `pose.png`.

- [ ] **Step 1:** implementare e renderizzare, per gatto e mostro, in `classic` e `acquerello-leggero`: `node render.mjs --loop=sheet_gatto --stills=0 --style=classic --out=out/sheets/gatto-classic` (e gli altri sette). Annotare i tempi nella spec.
- [ ] **Step 2: Autocritica scritta** confrontando ogni sheet con `base.png`/`pose.png` (forma a fagiolo e "cicciottello", testa ~1/3, coda a uncino, orecchie; goccia, occhio, dentini, antenne; contorno visibile sulle parti crema) e correzione di quello che non torna; `npm test` sempre verde.
- [ ] **Step 3: Verifica Review Focus 4:** un loop temporaneo verticale (`format = 'vertical'`) con i due personaggi, renderizzato con `--format=vertical --draft --clip` (4 s) → nessun errore; tempo annotato. Togliere il loop.
- [ ] **Step 4:** sezione "Characters" in `ANIMATION_GUIDE.md`: `character()`, opzioni, `act()`, viste, come si legge e si approva un model sheet, il comando CMD.
- [ ] **Step 5:** `npm run check` → OK. **Commit** — "Model sheet automatici dei personaggi".

### Task 8: Approvazione e controllo di deriva

**Files:**
- Create: `tools/approve.mjs`, `tools/approve.test.mjs`
- Modify: `package.json` (`"check-characters": "node tools/approve.mjs --check"`)

**Interfaces:**
- Produces (pure, in `approve.mjs`): `approvalStatus({ version, approvedVersion, sameBytes }) => 'ok' | 'da approvare' | 'deriva'` (`approvedVersion` assente o < `version` → `da approvare`; uguale e byte diversi → `deriva`; uguale e byte uguali → `ok`).
- CLI: `node tools/approve.mjs <id> <style>` renderizza `sheet_<id>` e `pose_<id>` a `t = 0` con `--style`, li salva in `reference/characters/<id>/approvati/sheet-<style>.png` e `pose-<style>.png` e scrive la `version` corrente in `reference/characters/<id>/approvati/approvati.json`. `--check` lo fa per ogni coppia approvata in una cartella temporanea e confronta i byte; stampa una riga per coppia; esce 1 solo se c'è almeno una `deriva` (Review Focus 5).

- [ ] **Step 1: Test** `approvalStatus` (i tre esiti, più "nessuna approvazione" → `da approvare`).
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implementare. **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** `npm run check-characters` senza approvazioni → righe "da approvare", uscita 0.
- [ ] **Step 6: Commit** — "Approvazione dei model sheet e controllo di deriva".
- [ ] **Step 7: Revisione di Andrea (gate):** mandare gli otto PNG (sheet e pose, due personaggi, due stili). Correzioni su sua indicazione, al massimo due giri per personaggio (ogni giro: `npm test`, nuovi PNG). Quando approva un personaggio in uno stile: `node tools/approve.mjs <id> <stile>`, poi `npm run check-characters` → `ok` per quella coppia. **Commit** delle immagini approvate e di `approvati.json`.
