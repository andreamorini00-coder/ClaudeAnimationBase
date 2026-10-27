# Fase 4b1 — Bruco, draghetto con ali, bipede bambino: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** bruco (strisciante), draghetto (quadrupede con ali), ragazza e supereroe (bipede in teste) disegnabili con `character()`, controllati da `npm test` e approvati da Andrea sui model sheet; coda del gatto rifatta (gatto v2).

**Architecture:** come la 4a: schede di soli dati, layout puri per tipo di corpo (`src/characters/bodies/*.js`), disegno nello stile attivo (`draw.js`), controlli sul layout via `node:vm` (`tools/characters.test.mjs`), model sheet automatici (`modelsheets.js`), approvazioni con `tools/approve.mjs`.

**Tech Stack:** script classici nel browser (p5.js + p5.brush), Node 24 `node:test` + `node:vm`, `render.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-27-fase4b1-personaggi-design.md` (e, per i principi comuni, `2026-10-27-fase4a-personaggi-design.md`)

## Global Constraints

- `npm run check` resta `OK 9/9 identici` dopo ogni task. `npm run check-characters` resta `ok` per il **mostro** in ogni task; per il **gatto** resta `ok` fino al Task 4 compreso, poi diventa `da approvare` (v2) e basta.
- Nessun nome globale nuovo: tutto sta in `CG`, `FACES`, `BODIES`, `CHARACTERS` o dentro le funzioni esistenti. I file `bodies/*.js` e le schede sono puri (niente p5, DOM, `PAL`, `STYLE`, `W`, `H`, `T`, `random`).
- Schede di soli dati; colori esattamente quelli di `reference/characters/<id>/note.md`:
  - **bruco**: `body #A6B39A`, `spot #E8BF78`, `cheek #C99595`, `antenna #A47C61`, `cream #F6EBD8` (piedini e bianco degli occhi), `line #59463B`, `shadow #8C8074`;
  - **draghetto**: `fur #3FAE9B`, `cream #F7F2E8` (pancia, corna), `membrane #ADA2E8`, `iris #FFD166`, `crest #FF5D73`, `line #1C2440`, `shadow #555B91`;
  - **ragazza**: `skin #F2D6BC`, `hair #A47C61`, `top #A6B39A` (maglione), `skirt #C99595`, `cheek #C99595`, `shoes #7A5C49`, `legs #F2D6BC`, `line #59463B`, `shadow #8C8074`, `eyeWhite #F6EBD8`;
  - **supereroe**: `top #427BEF` (tuta), `legs #427BEF`, `accent #FF5D73` (guanti, stivali, mantello), `emblem #FFD166`, `hair #2B3766` (capelli e maschera), `skin #F5C6A5`, `skinShadow #D99A86`, `cheek #FF5D73`, `line #1C2440`, `shadow #555B91`, `eyeWhite #F7F2E8`.
- Viste `front`, `q`, `side`, `back`. Pose ed espressioni con i nomi della spec. Pose sheet su 2 righe da 3 (già così).
- Comandi per Andrea in CMD; nessun `git push`; `package-lock.json` mai nei commit; aggiungere i file uno per uno.
- Gli script Python di modifica vanno scritti in un file (scratchpad) ed eseguiti da lì, non in un heredoc (lezione della 4a).

## Review Focus

1. **Gatto e mostro non devono cambiare per sbaglio**: il refactor delle parti facoltative del quadrupede (Task 2) lascia il gatto identico byte per byte (`check-characters` → `ok`), e il mostro resta `ok` fino alla fine. → verifiche nei Task 2, 3, 4, 7.
2. **Segmenti del bruco che si deformano o si staccano** in pose estreme (`arrotolato`, salto): la distanza tra centri resta costante e nessun segmento si sovrappone a più di metà del vicino. → test nel Task 1.
3. **Ali che bucano il corpo o spariscono**: da chiuse restano lungo il fianco con un pezzetto di membrana visibile, da aperte non attraversano la testa nel profilo. → test nel Task 3.
4. **Arti che si allungano o si spezzano** nelle pose del bipede (volo, accovacciata): la lunghezza di braccia e gambe resta costante; nessun ginocchio o gomito piegato al contrario. → test nel Task 5.
5. **Parti facoltative mancanti nella scheda**: un bipede senza gonna, mantello, maschera o stella si disegna senza errori e senza quelle parti; una parte dichiarata senza il suo ruolo colore è rifiutata dalla validazione. → test nei Task 2 e 5.

---

### Task 1: Corpo strisciante e bruco

**Files:** Create `src/characters/bodies/crawler.js`, `src/characters/bruco.js`. Modify `tools/pagecode.mjs` (CHAR_SCRIPTS), `studio.html` (tag dopo `bodies/blob.js` e dopo `mostro.js`), `tools/characters.test.mjs`.

**Interfaces:**
- Produces `BODIES.crawler`: `roles ['body', 'spot', 'cheek', 'antenna', 'cream', 'line', 'shadow']`; `proportions ['segments', 'segR', 'headK', 'antenna']`; `parts ['head', 'segments', 'spots', 'feet', 'antennae', 'eyes', 'mouth', 'cheeks', 'shadow']`; `poseParams ['raise', 'wave', 'lift', 'curl', 'stretch', 'cycle']`; `exprParams ['eyes', 'mouth', 'headTilt']`; `views`, `SHEET: { views: ['side', 'q', 'front', 'back'], poseView: 'side', exprView: 'q' }`, `POSE0`, `EXPR0`, `layout(spec, state)` con lo stesso contratto della 4a.
- Spina: centri `c[0]` (testa) … `c[N]`, distanza `segR * 1.6` tra centri consecutivi (`headK` sposta solo il primo passo); `raise` alza i primi segmenti ad arco; `cycle` fa passare un'arcata dalla coda alla testa con ritardo costante `k / N` di periodo per segmento; `curl` avvolge la spina su una spirale; `lift` stacca tutto da terra.
- Produces `CHARACTERS.bruco` (`version: 1`, colori dei Global Constraints) con pose `testaAlzata onda salto disteso testaAlta arrotolato` e espressioni `felice triste arrabbiato sorpreso assonnato curioso`; tratti: `segments` count 8 (tutte le viste), `spots` count 8 (`side`, `q`, `back`), `feet` count 8 coppie (`side`, `q`), `antennae` count 2 (tutte), `eyes` (`front`, `q`, `side`).

- [ ] **Step 1: Test** (con gli helper esistenti `checkFeatures`, `checkRoles`, `checkFinite`, `checkFlip`): `bruco spec is valid`, `bruco features per view and counts`, `bruco uses only its roles`, `bruco has no NaN`, `bruco flip mirrors exactly`, `bruco deterministic`; più:
  - `bruco segments keep their spacing` (Review Focus 2): in ogni posa e per `t` ∈ {0, .3, .7}, distanza tra centri consecutivi = `segR * 1.6` ± 1%, e nessuna coppia di segmenti non vicini più vicina di `segR`;
  - `bruco wave travels from tail to head`: nella posa `onda`, la quota del segmento `i` a `t` è uguale a quella del segmento `i+1` a `t - Δ` (Δ = periodo / N) ± 0,02 u.
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implementare (prima `side`, confrontando con `base.png` con lo script di anteprima SVG usa-e-getta nello scratchpad). **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** `npm run check` → OK; `npm run check-characters` → gatto e mostro `ok`, bruco `da approvare`.
- [ ] **Step 6: Commit** — "Corpo strisciante e scheda del bruco".

### Task 2: Parti facoltative del quadrupede (gatto identico)

**Files:** Modify `src/characters/bodies/quadruped.js`, `src/characters/gatto.js`, `src/characters/faces.js`, `tools/characters.test.mjs`.

**Interfaces:**
- `BODIES.quadruped.roles` diventa `['fur', 'cream', 'line', 'shadow']`; `partRoles` diventa `{ ears: 'earInner', collar: 'collar', bell: 'bell', wings: 'membrane', crests: 'crest' }`; parti facoltative disegnate solo se in `spec.parts`: `ears`, `blaze` (muso e bavaglina), `whiskers`, `collar`, `bell` (e, dal Task 3, `horns`, `crests`, `belly`, `wings`).
- Ruolo del bianco/riflesso degli occhi: `eyeWhite` se la scheda lo ha, altrimenti `cream`.
- `FACES.eye` nuovo tipo `iris` (aggiunto a `FACES.EYES`): iride grande nel ruolo `o.roles.iris` (default `iris`), pupilla tonda `line`, riflesso; con `o.dark` ignorato.
- Il gatto aggiunge a `parts` `blaze: {}` e `whiskers: {}` (ha già `ears`, `collar`, `bell`).

- [ ] **Step 1: Test:** `a quadruped declares its own extras` (una scheda di quadrupede minima con solo i 4 ruoli e nessuna parte facoltativa è valida e si disegna senza orecchie, muso, baffi, collarino); `a declared ear needs earInner`; `iris eye` (ha una parte con ruolo `iris` e una pupilla `line`; nessun `eyeWhite`).
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implementare. **Step 4:** `npm test` → PASS.
- [ ] **Step 5 (Review Focus 1):** `npm run check-characters` → **gatto `ok`** e mostro `ok` (il gatto disegna gli stessi byte di prima); `npm run check` → OK.
- [ ] **Step 6: Commit** — "Parti facoltative del quadrupede; occhio con iride".

### Task 3: Ali, corna, creste, pancia e draghetto

**Files:** Modify `src/characters/bodies/quadruped.js`. Create `src/characters/draghetto.js`. Modify `tools/pagecode.mjs`, `studio.html`, `tools/characters.test.mjs`.

**Interfaces:**
- Nuovi `proportions` facoltativi del quadrupede: nessuno (si usano quelli esistenti); nuove parti: `horns: { size }`, `crests: { head: 3, tail: 4 }`, `belly: {}` (striscia crema dal collo alla coda, dentro il corpo), `wings: { span: 2.5, sections: 3 }`, `tail: { width, base }` (`base` = spessore alla radice, per la coda grossa del draghetto).
- Nuovi `poseParams`: `wingOpen` (0..1), `flap` (1 = le ali battono con `t`, circa 2 battiti al secondo). `EXPR0` invariato; gli occhi del draghetto: `parts.eyes: { iris: true }` → `FACES.eye('iris', …)`.
- Ali: per lato, spalla → gomito → polso (nervatura), 3 dita dal polso; membrana = 3 poligoni tra dita consecutive e il corpo, ruolo `membrane`, nervature ruolo `fur` (`line` 1); chiuse: angolo della nervatura lungo il fianco, membrana visibile solo come triangolo sopra la schiena; nel profilo l'ala lontana a profondità dietro il corpo, quella vicina davanti.
- Produces `CHARACTERS.draghetto` (`version: 1`): `proportions { length, head, bodyHeight, legLength, legWidth, tail }` con testa circa 1/3 del corpo senza coda e coda lunga quanto il corpo; pose `fermo corsa saltoAli volo zampata prontoDecollo` (`volo`: `wingOpen 1`, `flap 1`, `lift`, zampe raccolte; `prontoDecollo`: `wingOpen 1`, `crouch`); espressioni `felice triste arrabbiato sorpreso assonnato curioso`; tratti: `horns` count 2 (`front`, `q`, `side`, `back`), `crestsHead` count 3 (tutte), `crestsTail` count 4 (tutte), `belly` (`front`, `q`, `side`), `wings` count 2 (tutte le viste: un'ala per lato, anche quando quella lontana è quasi coperta). Ogni ala ha esattamente 3 parti di membrana (controllato a parte, non come tratto).

- [ ] **Step 1: Test:** `draghetto spec is valid`, features per view and counts, roles, no NaN, flip, deterministic; più:
  - `wings closed hug the body` (Review Focus 3): con `wingOpen 0`, al massimo il 25% dell'area delle membrane sta fuori dalla sagoma del corpo;
  - `wings open span about 2.5 bodies`: nella vista `front`, `wingOpen 1`, larghezza totale ali ≈ 2,5 × larghezza del corpo ± 15%;
  - `wings never cross the head in profile`: nel profilo, per ogni posa, nessun punto della membrana vicina dentro il contorno della testa;
  - `wings flap`: in `volo` le punte delle ali a `t = 0` e `t = 0.25` distano almeno 0,5 u;
  - `each wing has three membranes`: in ogni vista e posa, 3 parti `membrane` per ala.
- [ ] **Step 2–4:** FAIL → implementare (prima `side` con ali chiuse e aperte, confrontando con `base.png`) → PASS.
- [ ] **Step 5:** check → OK; check-characters → gatto e mostro `ok`.
- [ ] **Step 6: Commit** — "Ali, corna, creste, pancia del quadrupede; scheda del draghetto".

### Task 4: Coda dal retro (gatto v2)

**Files:** Modify `src/characters/bodies/quadruped.js` (vista `back` della coda), `src/characters/gatto.js` (`version: 2`), `tools/characters.test.mjs`.

**Interfaces:** nella vista `back` la radice della coda è in basso al centro (`y` ≥ 70% dell'altezza del corpo dal suo bordo alto); la catena sale nel terzo centrale e fa l'uncino sopra la schiena.

- [ ] **Step 0: Impronta della v1**, prima di toccare la coda: calcolare con il codice attuale, per le viste `front`, `q`, `side` di ogni posa ed espressione del gatto, la somma dei punti di ogni parte arrotondata a 1e-6, e scriverla come costante nel test (tabella generata da uno script nello scratchpad).
- [ ] **Step 1: Test:** sostituire `gatto: from the back the tail starts low on the rump` con `the back-view tail rises in the middle third` (gatto e draghetto): radice in basso al centro; tutti i punti della coda tranne l'ultimo quarto entro ±1/6 della larghezza del corpo dal centro; la punta sopra il bordo alto del corpo. `the cat changes only its back-view tail`: per le viste `front`, `q`, `side` le parti del gatto sono identiche a quelle calcolate con la v1 (l'impronta dello Step 0).
- [ ] **Step 2–4:** FAIL → implementare → PASS.
- [ ] **Step 5:** check → OK; check-characters → **gatto `da approvare` (v2)**, mostro `ok`.
- [ ] **Step 6: Commit** — "Gatto v2: la coda dal retro parte dal basso e sale al centro".

### Task 5: Corpo bipede e ragazza

**Files:** Create `src/characters/bodies/biped.js`, `src/characters/ragazza.js`. Modify `src/characters/faces.js` (sopracciglia e guance come parti del viso), `tools/pagecode.mjs`, `studio.html`, `tools/characters.test.mjs`.

**Interfaces:**
- Produces `BODIES.biped`: `roles ['skin', 'hair', 'top', 'legs', 'line', 'shadow', 'eyeWhite', 'cheek']`; `partRoles { skirt: 'skirt', shoes: 'shoes', gloves: 'accent', cape: 'accent', boots: 'accent', mask: 'hair', star: 'emblem' }`; `proportions ['heads', 'shoulders', 'hips', 'torso', 'arm', 'leg', 'headW']` (tutti in teste, tranne `heads` = altezza totale in teste); `parts ['head', 'hair', 'fringe', 'ears', 'eyes', 'brows', 'mouth', 'cheeks', 'neck', 'torso', 'arms', 'hands', 'legs', 'shoes', 'skirt', 'sleeves', 'gloves', 'boots', 'mask', 'star', 'cape', 'shadow']`; `poseParams ['shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'fistL', 'fistR', 'lean', 'lift', 'crouch', 'flight', 'capeFlow', 'cycle']` (angoli in radianti); `exprParams ['eyes', 'mouth', 'brows', 'blush', 'headTilt']`; `SHEET: { views: ['front', 'q', 'side', 'back'], poseView: 'q', exprView: 'front' }`.
- Arti: tubi a due segmenti, lunghezze fisse dalle proporzioni; il gomito e il ginocchio si piegano solo in un verso (angolo limitato a [0, 2.6]); le mani: ovale + pollice, `fist` 1 = pugno tondo.
- `parts.hair: { style: 'bob' | 'spiky', locks }`; `bob`: una massa + 3 ciocche di frangia separate (tratto `fringe` count 3, viste `front`, `q`, `side`); orecchie visibili.
- `FACES`: `FACES.brows(kind, cx, cy, w, k)` (k -1 tristi … 1 arrabbiate) e guance con `blush` (0 = solo le guance rosa della nota, 1 = rossore più grande e più acceso con 3 tratti).
- Produces `CHARACTERS.ragazza` (`version: 1`, colori dei Global Constraints; `heads: 3`, occhi `dark`, `parts { hair: { style: 'bob' }, skirt: {}, shoes: {}, sleeves: { wide: true } }`); pose `inPiedi corsa salto volo pugno accovacciata`; espressioni `felice triste arrabbiata sorpresa assonnata imbarazzata` (quest'ultima `blush: 1`); tratti `fringe` (count 3), `cheeks` (count 2 `front`, `q`; 1 `side`), `skirt` (tutte), `ears` (`front`, `q`, `side`).

- [ ] **Step 1: Test:** ragazza valid, features/counts, roles, no NaN, flip, deterministic; più:
  - `biped is heads tall`: in `inPiedi` vista `front`, altezza / altezza della testa = `heads` ± 5%;
  - `biped limbs keep their length` (Review Focus 4): per ogni posa, lunghezza spalla-gomito-polso e anca-ginocchio-caviglia costante ± 1%; nessun angolo di gomito o ginocchio fuori da [0, 2.6];
  - `biped without extras` (Review Focus 5): una ragazza senza `skirt`, `shoes`, `sleeves` è valida e si disegna senza quelle parti; `skirt` dichiarata senza ruolo `skirt` è rifiutata.
- [ ] **Step 2–4:** FAIL → implementare (prima `front` in piedi, confrontata con `base.png`; poi `side`, `q`, `back`; poi le pose) → PASS.
- [ ] **Step 5:** check → OK; check-characters → mostro `ok`.
- [ ] **Step 6: Commit** — "Corpo bipede in teste e scheda della ragazza".

### Task 6: Supereroe

**Files:** Modify `src/characters/bodies/biped.js` (capelli `spiky`, maschera, stella, mantello, guanti, stivali). Create `src/characters/supereroe.js`. Modify `tools/pagecode.mjs`, `studio.html`, `tools/characters.test.mjs`.

**Interfaces:**
- `spiky`: 4–5 ciocche a punta (`locks`, tratto `spikes` con count = `locks`); maschera a fascia sugli occhi (tratto `mask`, viste `front`, `q`, `side`; dal retro non si vede); stella a 5 punte sul petto (tratto `star` count 1, `front`, `q`, `side`); mantello corto fino alla vita come forma unica (tratto `cape`, tutte le viste), che segue `capeFlow` (0 a riposo … 1 disteso all'indietro in volo/corsa) e ondeggia con `t`; guanti fino a metà avambraccio e stivali al ginocchio nel ruolo `accent`.
- Produces `CHARACTERS.supereroe` (`version: 1`, colori dei Global Constraints; `heads: 5.5`; occhi bianchi `#F7F2E8` con pupilla; `cheek #FF5D73`); pose `inPiediEroico corsa salto voloOrizzontale pugno atterraggio`; espressioni `felice triste arrabbiato sorpreso assonnato imbarazzato`.

- [ ] **Step 1: Test:** supereroe valid, features/counts, roles, no NaN, flip, deterministic, `biped is heads tall` (5,5), `biped limbs keep their length`; `cape trails in flight`: in `voloOrizzontale` il mantello sta dietro le spalle rispetto alla direzione del volo.
- [ ] **Step 2–4:** FAIL → implementare → PASS.
- [ ] **Step 5:** check → OK; check-characters → mostro `ok`.
- [ ] **Step 6: Commit** — "Supereroe: capelli a punte, maschera, stella, mantello".

### Task 7: Model sheet, autocritica, guida, approvazioni

**Files:** Modify `ANIMATION_GUIDE.md` (sezione Characters: nuovi corpi, pose, parametri `wingOpen`/`flap`, `heads`), spec (misure). Le schede si toccano solo per le correzioni.

- [ ] **Step 1:** renderizzare `sheet_` e `pose_` di bruco, draghetto, ragazza, supereroe e gatto (v2) in `classic` e `acquerello-leggero` in `out/sheets/`; annotare i tempi nella spec.
- [ ] **Step 2: Autocritica scritta** contro `base.png` e `pose.png` di ciascuno (forme, proporzioni, tratti, leggibilità delle espressioni a misura di sheet, pose marcate); correggere; `npm test` sempre verde.
- [ ] **Step 3: Verifica** in formato verticale con `--draft` (loop temporaneo con i quattro personaggi, poi tolto).
- [ ] **Step 4:** guida aggiornata; `npm run check` → OK; check-characters → mostro `ok`. **Commit** — "Model sheet dei personaggi della 4b1".
- [ ] **Step 5: Revisione indipendente del branch** (un revisore nuovo sul modello più capace), correzioni Critical/Important con test, piccolezze in roadmap.
- [ ] **Step 6: Gate di Andrea:** mandare gli sheet; al massimo due giri di correzioni per personaggio; sulle approvazioni `node tools/approve.mjs <id> <stile>` per bruco, draghetto, ragazza, supereroe, gatto v2; `npm run check-characters` → tutto `ok`; commit delle approvazioni.
