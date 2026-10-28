# Fase 4b2 — Bipede adulto: vale e mara, viso a parti, abiti: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** vale e mara (bipede adulto a 7,5 teste, fedeli ai `base.png`) disegnabili con `character()`, con viso a parti, gesti, abito ufficio di vale, controllati da `npm test` e approvati da Andrea; arti morbidi e capelli corretti anche per ragazza e supereroe (v2).

**Architecture:** come 4a e 4b1: schede di soli dati, layout puro in `src/characters/bodies/biped.js`, forme in `shapes.js` (`CG`) e `faces.js` (`FACES`), recitazione in `act.js`, disegno in `draw.js`, sheet in `modelsheets.js`, approvazioni con `tools/approve.mjs`, controlli in `tools/characters.test.mjs` via `node:vm`.

**Tech Stack:** script classici nel browser (p5.js + p5.brush), Node 24 `node:test` + `node:vm`, `render.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-28-fase4b2-personaggi-design.md` (principi comuni: `2026-10-27-fase4a-personaggi-design.md`; bipede: `2026-10-27-fase4b1-personaggi-design.md`)

## Global Constraints

- `npm run check` resta `OK 9/9 identici` dopo ogni task. `npm run check-characters`: gatto, mostro, bruco, draghetto restano `ok` in ogni task; ragazza e supereroe diventano `da approvare` (v2) dal Task 1; vale, mara, `vale.ufficio` sono `da approvare` finché Andrea non approva. Mai `deriva`.
- Nessun nome globale nuovo oltre a `outfitSpec`, `blink`, `talk` (in `act.js`): il resto sta in `CG`, `FACES`, `BODIES`, `CHARACTERS`. `bodies/*.js`, `shapes.js`, `faces.js`, `act.js` e le schede restano puri (niente p5, DOM, `PAL`, `STYLE`, `W`, `H`, `T`, `random`).
- Colori esattamente quelli della spec §6:
  - **vale**: `skin #F4C3AA`, `skinShadow #E0A88A`, `hair #C6C4C2`, `hairShadow #A3A1A6`, `top #C995A7`, `legs #292A34`, `shoes #292A34`, `clothLight #4A4B5A`, `iris #527D9C`, `eyeWhite #F7F2E8`, `line #1C2440`, `shadow #8D86AA`, `cheek #E0A88A`; abito `ufficio`: `legs #292A34`;
  - **mara**: `skin #F5C6A5`, `skinShadow #E0A88A`, `hair #263450`, `hairLight #3E4F78`, `top #24242C`, `legs #24242C`, `shoes #24242C`, `clothLight #44444F`, `insert #777985`, `iris #66515B`, `eyeWhite #F7F2E8`, `lip #D99A8E`, `line #1C2440`, `shadow #8D86AA`, `cheek #E0A88A`.
- Nomi del viso: occhi `open sleepy closed happy`; bocca `flat ajar open o grin`; sopracciglia `neutral raised frown sad` (o un numero -1..1).
- Espressioni di vale e mara: `neutra sorriso risata triste arrabbiata sorpresa imbarazzata pensierosa`; gesti `maniGiunte manoDietroTesta manoSulPetto bracciaIncrociate maniAlzate manoSulCollo manoAlMento`; pose `inPiedi manoSulFianco voltataIndietro camminata manoTraICapelli saluto`.
- Comandi per Andrea in CMD; nessun `git push`; `package-lock.json` mai nei commit; file aggiunti uno per uno; script Python di modifica in file nello scratchpad, non in heredoc. Branch `fase4b2-personaggi`.

## Review Focus

1. **I quattro personaggi approvati non quadrupedi non devono cambiare**: `faces.js`, `act.js`, `registry.js`, `draw.js`, `modelsheets.js` e `approve.mjs` cambiano per tutti; gatto, mostro, bruco, draghetto restano `ok`. → Step "check-characters" in ogni task.
2. **Arti che si incrociano su se stessi** con il contorno nuovo (gomito o ginocchio molto piegato: accovacciata, salto, volo, braccia incrociate): il contorno resta un poligono semplice. → test nel Task 1, ripetuto per vale e mara nei Task 4–6.
3. **Gesti che rompono i controlli delle braccia**: con `crossL/R` le braccia restano lunghe uguali; il verso del gomito nelle viste di fronte e dal retro è libero solo dove `cross > 0`. → test nel Task 5.
4. **Figure scure illeggibili** (mara, le gambe di vale): le parti `clothLight` ci sono in ogni vista e posa, anche nel mezzo busto per la maglietta di mara. → test nei Task 4 e 6.
5. **Abito che perde parti o ruoli**: `outfitSpec` dà una scheda valida; un abito con una parte nuova senza il suo ruolo è rifiutato; lo sheet dell'abito si approva e si controlla a parte da quello principale. → test nel Task 7.

---

### Task 1: Arti morbidi per tutti i bipedi (ragazza e supereroe v2)

**Files:** Modify `src/characters/shapes.js`, `src/characters/bodies/biped.js`, `src/characters/ragazza.js` e `supereroe.js` (`version: 2`), `tools/characters.test.mjs`.

**Interfaces:**
- Produces `CG.limb(joints, widths)` → polygon. `joints`: 3 punti `[a, b, c]` (spalla/anca, gomito/ginocchio, polso/caviglia); `widths`: 5 larghezze piene `[w0, w1, w2, w3, w4]` a u = 0, .25, .5, .75, 1 della lunghezza totale (w2 al giunto). Contorno liscio: i lati si campionano lungo la spezzata con la larghezza interpolata (cubica tra i 5 valori); al giunto il lato esterno è un arco, quello interno una piega (i due lati interni si tagliano nel punto d'incontro). Estremi aperti piatti (coperti da mano/piede/busto).
- `biped.js` usa `CG.limb` per `leg*` e `arm*`. Larghezze di default da `build`: gamba `[leg, leg*.92, leg*.8, leg*.82, leg*taper]`, braccio `[arm, arm*.95, arm*.78, arm*.8, arm*.72]`; se `build.thigh`/`calf`/`forearm` ci sono, sostituiscono w0 / w3 / w3 del braccio.
- Guanti: risvolto `armW * 1.15` (era 1.4). Stivali: tubo dal 15% `legW * 1.1` (era 1.4); punta stivale `1.4` (era 1.8).

- [ ] **Step 1: Test**:
  - `CG.limb makes a simple outline` — per angoli al giunto 0, .8, 1.6, 2.6 e i due versi: il poligono non si autointerseca (helper `simple(poly)`: nessuna coppia di lati non adiacenti che si taglia) e ha area > 0;
  - `biped limbs are simple outlines` (Review Focus 2) — per ragazza e supereroe, ogni vista, posa, `t` ∈ {0, .37}: ogni parte `arm*` e `leg*` è semplice;
  - `biped limbs taper` — in `inPiedi` vista `front`, la larghezza della gamba all'altezza della caviglia < quella a metà coscia; lo stesso per polso e spalla;
  - `slim gloves and boots` — il supereroe: larghezza massima di `glove*` ≤ 1,2 × larghezza del braccio al polso; `boot*` ≤ 1,15 × larghezza della gamba al ginocchio.
- [ ] **Step 2:** `npm test` → FAIL (`CG.limb` non esiste). **Step 3:** implementare. **Step 4:** `npm test` → PASS (anche `biped limbs keep their length`, `biped feet stand on the ground`).
- [ ] **Step 5:** `npm run check` → OK 9/9; `npm run check-characters` → gatto, mostro, bruco, draghetto `ok`; ragazza e supereroe `da approvare` (v2).
- [ ] **Step 6: Commit** — "Arti morbidi e affusolati per i bipedi; guanti e stivali più snelli".

### Task 2: Capelli della ragazza e del supereroe

**Files:** Modify `src/characters/bodies/biped.js` (`hair`, `bob`), `tools/characters.test.mjs`.

**Interfaces:**
- Frangia `bob` senza `part`: 3 ciocche a punta morbida, lunghezze `.17 / .25 / .2` HU (centrale la più lunga), larghe 1,25 × un terzo della frangia (si sovrappongono), punta piegata verso l'esterno (la sinistra a sinistra, la destra a destra; da 3/4 e profilo tutte verso la nuca). Tratto `fringe` count 3 invariato.
- `bob` dal retro (`inner = 0`): larghezza della massa = `headW * .56` (era .66 della metà), lati dritti dal punto più largo del cranio.
- `spiky` vista `front`: un ciuffo di 3 punte spazzate verso la destra dello schermo sopra la fronte, la centrale più alta; tratto `spikes` con count `locks` nelle altre viste e count 3 di fronte (aggiornare `supereroe.js` `features` con `count: { front: 3, q: 5, side: 5, back: 5 }`).

- [ ] **Step 1: Test**:
  - `ragazza fringe locks differ` — vista `front`: le 3 parti `lock*` hanno altezze diverse, la centrale la più alta, e ogni coppia vicina si sovrappone in x;
  - `bob from the back is no wider than the head` — ragazza vista `back`: larghezza di `hair` ≤ 1,15 × larghezza di `head`;
  - `hero quiff from the front` — supereroe vista `front`: 3 parti `spike*`, tutte con la punta a destra della base.
- [ ] **Step 2–4:** FAIL → implementare (confronto con `ragazza/base.png` e `supereroe/base.png` con lo script di anteprima SVG nello scratchpad) → PASS.
- [ ] **Step 5:** check → OK; check-characters come nel Task 1.
- [ ] **Step 6: Commit** — "Frangia a ciocche vere, caschetto dal retro, ciuffo del supereroe".

### Task 3: Viso a parti, battito di ciglia, bocca che parla

**Files:** Modify `src/characters/faces.js`, `src/characters/registry.js`, `src/characters/act.js`, `src/characters/bodies/biped.js` (sopracciglia per nome, `eyes.adult`, `mouth.lip`), `tools/characters.test.mjs`.

**Interfaces:**
- `FACES.MOUTHS` += `ajar`, `grin`. `ajar`: piccola forma aperta larga `w * .5`, alta `w * .18`, ruolo inside. `grin`: arco aperto del sorriso con una fascia di denti nel ruolo `o.roles.teeth` (default `eyeWhite`) e il contorno `line`.
- `FACES.BROWS = { neutral: [0, 0], raised: [-.15, 1], frown: [1, -.2], sad: [-1, .3] }` (`[k, lift]`); `FACES.brows(kind, cx, cy, w, k, lift = 0)`: `lift` alza tutto il sopracciglio di `lift * |w| * .35`.
- `FACES.eye(kind, cx, cy, r, { adult: true, … })`: `open` = mandorla (bianco `R.white` a forma di mandorla larga `r * 1.05`, alta `r * .8`), iride `R.iris` tonda `r * .55` tagliata dalla mandorla, pupilla `R.ink`, luce `R.white`, linea delle ciglia sopra (`stroke`, spessore 1, che si allunga di `r * .25` all'esterno: serve il verso, `o.outer` = -1 | 1); `sleepy` = la palpebra copre la metà alta dell'iride (linea delle ciglia abbassata); `closed` = arco verso il basso spessore 1; `happy` = arco verso l'alto spessore 1. Gli altri tipi con `adult` si disegnano come `open`.
- `biped.js`: `E.brows` può essere nome (`FACES.BROWS`) o numero; `exprParams` += `gesture` (usato nel Task 5); `parts.eyes.adult` → occhi adulti con `outer`; `parts.mouth.lip` → parte `lip` (ruolo `lip`) sotto la bocca se `flat` o `ajar`.
- `registry.js`: nomi delle sopracciglia validati (`brows` stringa non in `FACES.BROWS` → errore "sopracciglia … inesistenti"); `optionRoles(parts)` del corpo, se c'è, come `partRoles` (lista `[parte, ruolo]`). `BODIES.biped.optionRoles(parts)` copre le righe della spec §4 "Ruoli delle opzioni".
- `act.js`: `blink(t, seed = 0)` → `'open' | 'sleepy' | 'closed'`. Intervalli: l'i-esimo battito inizia a `Σ (3 + 2 * h(seed, k))` per k < i, con `h` = hash deterministico in [0, 1) (es. `fract(sin(seed * 12.9898 + k * 78.233) * 43758.5453)`); dentro il battito, 0–.05 `sleepy`, .05–.15 `closed`, .15–.2 `sleepy`. `talk(t, rate = 8)` → la sequenza fissa `['flat', 'ajar', 'open', 'ajar', 'o', 'flat', 'open', 'ajar']` indicizzata da `floor(t * rate) % 8`.

- [ ] **Step 1: Test**:
  - `adult face parts combine` — su una scheda di test (ragazza con `eyes: { adult: true }`, `mouth: { lip: true }`, ruoli `iris` e `lip` aggiunti) vista `front`: per ogni occhio × bocca × sopracciglia della spec, layout senza errori e senza NaN; `grin` ha una parte nel ruolo `eyeWhite`; `sleepy` adulto ha l'iride più bassa di `open` di almeno `r * .2`;
  - `brow names are validated` — `brows: 'stupite'` in un'espressione → errore che nomina `stupite`; `brows: 'raised'` valido; `raised` sta più in alto di `neutral`;
  - `option roles are required` — ragazza con `eyes: { adult: true }` senza `iris` → errore "vuole il ruolo colore \"iris\"";
  - `blink is deterministic and short` — `blink` campionata ogni 0,01 s su 20 s: identica a due chiamate; almeno un `closed` in ogni finestra di 5 s; nessuna sequenza di non-`open` più lunga di 0,25 s; con `seed` diversi gli istanti dei battiti cambiano;
  - `talk cycles mouth names` — `talk(0)` = `flat`, tutti i valori in `FACES.MOUTHS`, periodo 1 s a `rate` 8.
- [ ] **Step 2–4:** FAIL → implementare → PASS.
- [ ] **Step 5:** check → OK; check-characters: gatto, mostro, bruco, draghetto `ok` (Review Focus 1: `faces.js` toccato).
- [ ] **Step 6: Commit** — "Viso a parti: occhio adulto, bocca socchiusa e con denti, sopracciglia per nome; battito di ciglia e bocca che parla".

### Task 4: Figura adulta, vestiti, tacchi e scheda di vale

**Files:** Modify `src/characters/bodies/biped.js`. Create `src/characters/vale.js`. Modify `tools/pagecode.mjs` (CHAR_SCRIPTS, dopo `supereroe.js`), `studio.html` (tag dopo `supereroe.js`), `tools/characters.test.mjs`.

**Interfaces:**
- `BODIES.biped.parts` += `figure`, `neckline`, `legwear`, `top`. `partRoles` invariato; `optionRoles` (Task 3) già copre `legwear`, `top.rim`, `hair.part`.
- `figure { bust, waist, hips, bustDepth, rumpDepth, thigh }` (teste): busto = contorno liscio per vista da 8 punti per lato (spalla, ascella, petto, sotto il petto, vita, fianco alto, fianco, inguine), interpolati con la stessa cubica di `CG.limb`. Fronte/retro: larghezze `shoulders`, `bust`, `waist`, `hips`; profilo: davanti `bustDepth`, dietro `rumpDepth` (dal centro della vita); 3/4: larghezze × `V.w` con il petto spostato di `.35 bustDepth` verso il davanti. Le anche (`hip` dei giunti) stanno a `hips/2 - thigh/2`. Senza `figure`: il busto di oggi (`CG.block`). Con `figure`, `proportions.hips` resta la larghezza all'inguine (dove partono le gambe) e `figure.hips` è il punto più largo del bacino.
- `neckline { shape: 'round' | 'wide', depth }`: parte `neckline` ruolo `skin` dentro il busto (fronte, 3/4; nel profilo una striscia), più `collarbone0/1` (stroke `line` .4). `wide` = da spalla a spalla.
- `sleeves { length: 'long' | 'short' }`: `short` = parte `sleeve*` ruolo `top` sopra `arm*` (che diventa `skin`) fino a metà braccio. Le maniche larghe della ragazza (`wide`) restano come sono.
- `legwear { kind: 'leggings' | 'trousers', shine, insert, crease }`: `shine` = 1 o 2 strisce piatte `clothLight` per gamba lungo il bordo esterno (profilo: davanti e dietro), tratto `shine` in tutte le viste; `insert` = striscia `insert` sul lato esterno dall'anca alla caviglia (da fronte e retro sul bordo esterno, di profilo al centro della gamba); `trousers` = gamba larga `1.08 ×` e poco affusolata (taper .85), più la linea della piega (`stroke line .35`) dal ginocchio in giù.
- `shoes { heel }`: la caviglia si alza di `heel` HU; parte `heel*` (ruolo `shoes`) sottile sotto il tallone nelle viste `side` e `q`; la punta del piede inclinata giù. Il `drop` esistente tiene la suola a `y = 0`.
- `top { rim: true }`: striscia `clothLight` sul bordo del busto dal lato della luce (sinistra dello schermo da fronte, dietro di profilo).
- Ombra del collo: se la scheda ha `skinShadow`, parte `neckShadow` (ruolo `skinShadow`) sotto il mento.
- Capelli `bob` con `part: 'side'`: niente 3 ciocche; una frangia lunga spazzata da destra a sinistra dello schermo (tratto `fringe` count 1), la riga visibile da fronte e 3/4; parte `hairShadow` (ruolo `hairShadow`) dietro la testa ai lati del collo.
- Produces `CHARACTERS.vale` (`version: 1`, colori dei Global Constraints): `heads: 7.5`, `headW` stretto (circa .8), proporzioni misurate su `base.png` (somma = 7,5 teste); `parts`: `hair { style: 'bob', part: 'side' }`, `eyes { adult: true }`, `mouth {}`, `figure` dai riferimenti, `neckline { shape: 'round' }`, `sleeves { length: 'long' }`, `legwear { kind: 'leggings', shine: 2 }`, `shoes { heel: .25 }`, `build` adulto; espressioni e pose provvisorie (`neutra`, `inPiedi`), completate nel Task 5; `faceSheet: true`. Tratti: `fringe` count 1 (`front`, `q`, `side`), `shine` (tutte), `neckline` (`front`, `q`), `heels` (`side`, `q`).

- [ ] **Step 1: Test** (helper esistenti `checkFeatures`, `checkRoles`, `checkFinite`, `checkFlip`, `headsTall`, `checkLimbs`): `vale spec is valid`, features, roles, no NaN, flip, deterministic, `vale is 7.5 heads tall` (± 5%), limbs keep length, limbs simple outlines; più:
  - `vale figure follows the reference` — vista `front`: larghezza del busto alla vita < 0,75 × quella ai fianchi e < 0,8 × quella al petto; vista `side`: il busto sporge davanti al petto e dietro ai glutei oltre la linea spalla-anca;
  - `leggings shine in every view` (Review Focus 4) — ogni vista e posa: almeno una parte `clothLight` per gamba;
  - `heels stand on the ground` — ogni posa senza `lift`: minimo y di gambe e scarpe = 0 ± 1e-6, e la caviglia più alta di `heel` × HU rispetto a una vale senza tacchi;
  - `a figure without a body shape is the old torso` — ragazza invariata (la sua `torso` uguale a prima: confronto con `CG.block` degli stessi parametri).
- [ ] **Step 2–4:** FAIL → implementare (prima `front` in piedi, confrontata con `vale/base.png`; poi `side`, `q`, `back`) → PASS.
- [ ] **Step 5:** check → OK; check-characters: i quattro `ok`, vale `da approvare`.
- [ ] **Step 6: Commit** — "Figura adulta, scollo, leggings, tacchi; scheda di vale".

### Task 5: Gesti, mezzo busto, respiro, testa girata; espressioni e pose di vale

**Files:** Modify `src/characters/bodies/biped.js`, `src/characters/act.js` (`resolveState`), `src/characters/registry.js` (tabelle `gestures` e `poseViews`), `src/characters/modelsheets.js` (vista per posa), `src/characters/vale.js`, `tools/characters.test.mjs`.

**Interfaces:**
- `BODIES.biped.poseParams` += `crossL`, `crossR`, `handFrontL`, `handFrontR`, `headTurn`, `breath`, `handOpenL`, `handOpenR`; `POSE0` li mette a 0.
  - `crossX` (rad): nelle viste `front` e `back` l'avambraccio gira verso il centro del corpo di `crossX` invece che verso l'esterno; nelle altre viste si somma al gomito. La lunghezza resta.
  - `handFrontX` 1: mano e avambraccio a profondità 5.2 (davanti alla faccia).
  - `headTurn` 1 nella vista `back`: il gruppo della testa si disegna come `side`, il profilo rivolto al lato da cui guarda indietro (sinistra dello schermo senza `flip`); nelle altre viste non fa nulla.
  - `breath` (0..1): spalle e petto salgono di `.03 HU * breath * (1 - cos(2π t / 4)) / 2`.
  - `handOpenX` 1: mano aperta a ventaglio (4 dita come ellissi strette + pollice).
- Tabella `spec.gestures = { nome: { params di posa } }`; `exprParams` `gesture` (Task 3) = nome nella tabella. `validateCharacter`: gesti validati come pose; `gesture` di un'espressione deve esistere. `resolveState`: `pose = { ...POSE0, ...poseParams, ...gestures[expression.gesture] }` (il gesto vince sulla posa, solo per i parametri che dà).
- `state.bust` per una figura con `figure`: taglio a `shY + 1.35 HU`; tiene anche `arm|hand|thumb|finger|sleeve|cuff|glove` tagliate al bordo.
- Vale: le 8 espressioni e i 7 gesti dei Global Constraints, con le facce di `base.png`, seconda riga (`neutra` open/flat/neutral; `sorriso` happy/grin/neutral maniGiunte; `risata` happy/open/raised manoDietroTesta; `triste` open/flat/sad manoSulPetto; `arrabbiata` open/flat/frown squint .3 bracciaIncrociate; `sorpresa` open/o/raised maniAlzate; `imbarazzata` open/ajar/sad blush 1 look -.6 manoSulCollo; `pensierosa` open/flat/raised look .5 manoAlMento); le 6 pose (`voltataIndietro` = `headTurn: 1`, disegnata dal retro; `camminata` = `cycle: .5`).
- `spec.poseViews = { posa: vista }` (facoltativo, validato: posa e vista esistenti): lo sheet delle pose disegna quella posa in quella vista invece di `SHEET.poseView`. Vale e mara: `{ voltataIndietro: 'back' }`.

- [ ] **Step 1: Test**:
  - `gestures are validated` — un gesto con parametro sconosciuto e un'espressione con `gesture: 'nessuno'` → errori;
  - `a gesture overrides the arms only` — `resolveState(vale, { pose: 'manoSulFianco', expression: 'arrabbiata' })`: i parametri delle gambe sono quelli della posa, quelli delle braccia del gesto;
  - `crossed arms stay inside the shoulders` (Review Focus 3) — vale `arrabbiata` vista `front`: entrambi i polsi con |x| < metà della larghezza delle spalle; braccia lunghe uguali (± 1%);
  - `checkLimbs` aggiornato: nelle viste `front`/`back` il verso del gomito non si controlla dove `cross` > 0;
  - `thinking hand is over the face` — `pensierosa` vista `front`: la profondità di `handR` (o `handL`) > quella di `mouth`;
  - `bust keeps the gestures` — `bust: true` per ogni espressione: c'è almeno una parte `hand*`, e nessun punto sotto y = 0;
  - `breath moves only the upper body` — `breath: 1`, t = 0 e t = 2: le caviglie identiche, le spalle diverse;
  - `looking back shows a profile` — `voltataIndietro` vista `back`: ci sono parti `eye*` e `mouth`;
  - `pose views are validated` — `poseViews: { volo: 'back' }` (posa inesistente) e `{ inPiedi: 'sopra' }` → errori.
- [ ] **Step 2–4:** FAIL → implementare → PASS.
- [ ] **Step 5:** check → OK; check-characters: i quattro `ok`.
- [ ] **Step 6: Commit** — "Gesti, mezzo busto con le mani, respiro, testa girata; espressioni e pose di vale".

### Task 6: Mara e capelli lunghi

**Files:** Modify `src/characters/bodies/biped.js` (`hair` stile `long`). Create `src/characters/mara.js`. Modify `tools/pagecode.mjs`, `studio.html`, `tools/characters.test.mjs`.

**Interfaces:**
- `hair { style: 'long', locks: 5 }`: riga centrale; dietro la testa una massa fino a `shY + 1.6 HU`; davanti, `locks` ciocche ondulate (ognuna un nastro largo `.32 HU` lungo una curva a S, punta arrotondata), metà per lato, sopra le spalle da fronte e 3/4, sulla schiena dal retro (davanti al busto: profondità 3.6 da fronte, 3.0 dal retro); su ogni ciocca una striscia `hairLight` (tratto `hairLight`, count = `locks` da fronte e dal retro). Le ciocche si muovono solo con `breath`.
- Produces `CHARACTERS.mara` (`version: 1`, colori dei Global Constraints): `heads: 7.5`, figura da `mara/base.png`, `hair { style: 'long', locks: 5 }`, `eyes { adult: true }`, `mouth { lip: true }`, `neckline { shape: 'wide' }`, `sleeves { length: 'short' }`, `top { rim: true }`, `legwear { kind: 'leggings', insert: true, shine: 1 }`, `shoes { heel: .25 }`, `faceSheet: true`; espressioni, gesti e pose come vale (facce da `mara/base.png`). Tratti: `locks` count 5 (`front`, `q`, `back`), `insert` (tutte), `shine` (tutte), `neckline` (`front`, `q`), `heels` (`side`, `q`).

- [ ] **Step 1: Test:** mara valid, features, roles, no NaN, flip, deterministic, 7,5 teste, limbs (lunghezza, contorno semplice); più:
  - `mara stays readable` (Review Focus 4) — ogni vista, posa ed espressione, anche `bust: true`: almeno una parte `clothLight` sul busto e, tranne nel mezzo busto, una per gamba; almeno 3 parti `hairLight` tranne di profilo;
  - `hair stays still while the face changes` — vista `front`, `t` uguale: le parti `lock*` e `hair` identiche tra `neutra` e `sorpresa`;
  - `long hair below the shoulders` — vista `back`: il punto più basso dei capelli sotto la linea delle spalle di almeno 1 HU.
- [ ] **Step 2–4:** FAIL → implementare (confronto con `mara/base.png`) → PASS.
- [ ] **Step 5:** check → OK; check-characters: i quattro `ok`, mara `da approvare`.
- [ ] **Step 6: Commit** — "Capelli lunghi a ciocche; scheda di mara".

### Task 7: Abiti, sheet del viso, approvazione per abito

**Files:** Modify `src/characters/act.js` (`outfitSpec`, `resolveState`), `src/characters/registry.js`, `src/characters/draw.js`, `src/characters/modelsheets.js`, `src/characters/vale.js` (abito `ufficio`), `tools/approve.mjs`, `tools/characters.test.mjs`.

**Interfaces:**
- `outfitSpec(spec, name)` → scheda completa: `parts` e `roles` uniti chiave per chiave, `features` sostituite per `id` (un abito può toglierne con `{ id, remove: true }`), `id` = `<id>.<abito>`. `name` inesistente → errore con gli abiti disponibili. Senza `name`: `spec`.
- `validateCharacter`: ogni abito validato come scheda completa (errori prefissati `abito "<nome>": `).
- `character(id, x, y, u, { outfit })` e il `layoutOf` di `modelsheets.js` usano `outfitSpec`.
- `modelsheets.js`: `face_<id>` per le schede con `faceSheet: true` (3 righe di mezzi busti frontali: occhi `open sleepy closed happy` con bocca `flat`; bocche `flat ajar open o grin` con occhi `open`; sopracciglia `neutral raised frown sad`); per ogni abito, `sheet_<id>.<abito>`, `pose_<id>.<abito>`, `face_<id>.<abito>`.
- `approve.mjs`: id approvabili = personaggi + `<id>.<abito>`; cartella `reference/characters/<id>/approvati/` o `…/approvati/<abito>/`; tipi `sheet`, `pose` e `face` se la scheda ha `faceSheet`. Messaggio d'uso con gli abiti. Le approvazioni esistenti (solo `sheet` e `pose`) restano valide.
- Vale `outfits.ufficio`: `legwear { kind: 'trousers', crease: true }`, `roles.legs #292A34`, `figure` meno accentuata (da `pose-abito-ufficio.png`), tratto `shine` rimosso, tratto `crease` (tutte le viste).

- [ ] **Step 1: Test**:
  - `outfitSpec merges an outfit` — `outfitSpec(vale, 'ufficio')`: valida; `parts.legwear.kind` `trousers`; nessun tratto `shine`; `parts.hair` uguale al principale; `id` `vale.ufficio`;
  - `an outfit is validated as a whole` (Review Focus 5) — un abito con `top: { rim: true }` su una scheda senza `clothLight` → errore che nomina l'abito;
  - `office figure is less pronounced` — vista `front`: larghezza ai fianchi dell'abito < quella principale; nessuna parte `clothLight` sulle gambe; c'è la piega;
  - `unknown outfit` — `outfitSpec(vale, 'mare')` lancia un errore che elenca `ufficio`;
  - `approval ids include outfits` — una funzione esportata di `approve.mjs`, `sheetTargets(characters)` → `[{ id: 'vale.ufficio', dir: 'vale/approvati/ufficio', kinds: ['sheet', 'pose', 'face'] }, …]`, e `gatto` ha `kinds: ['sheet', 'pose']`.
- [ ] **Step 2–4:** FAIL → implementare → PASS.
- [ ] **Step 5:** check → OK; check-characters: i quattro `ok` (Review Focus 1: `approve.mjs` e `modelsheets.js` toccati); vale, mara, `vale.ufficio`, ragazza, supereroe `da approvare`.
- [ ] **Step 6: Commit** — "Abiti dei personaggi, sheet del viso, approvazione per abito; abito ufficio di vale".

### Task 8: Model sheet, autocritica, guida, revisione, approvazioni

**Files:** Modify `ANIMATION_GUIDE.md` (sezione Characters: figura, vestiti, viso a parti, `blink`/`talk`, gesti, `outfit`), `docs/superpowers/plans/roadmap.md` (4b2 in approvazione; pose sedute/sdraiate/al muro con gli oggetti di scena), le schede solo per le correzioni.

- [ ] **Step 1:** renderizzare `sheet_`, `pose_`, `face_` di vale, mara, `vale.ufficio` e `sheet_`, `pose_` di ragazza e supereroe in `classic` e `acquerello-leggero` in `out/sheets/`.
- [ ] **Step 2: Autocritica scritta** contro `base.png`, `viso.png`, `pose.png`, `pose-abito-ufficio.png` (proporzioni e figura, capelli, viso e leggibilità delle 13 varianti, gesti, luci delle figure scure, tacchi; per ragazza e supereroe le note della roadmap); correggere; `npm test` sempre verde.
- [ ] **Step 3: Verifica** di un mezzo busto di vale che parla e batte le ciglia (`blink`/`talk`) in formato verticale con `--draft` (loop temporaneo, poi tolto).
- [ ] **Step 4:** guida e roadmap aggiornate; `npm run check` → OK; check-characters → i quattro `ok`. **Commit** — "Model sheet della 4b2".
- [ ] **Step 5: Revisione indipendente del branch** (un revisore nuovo sul modello più capace, con questa Review Focus), correzioni Critical/Important con test che fallisce prima, piccolezze in roadmap.
- [ ] **Step 6: Gate di Andrea:** mandare gli sheet man mano che sono pronti; al massimo due giri di correzioni per personaggio; sulle approvazioni `node tools/approve.mjs <id> <stile>` per vale, mara, `vale.ufficio`, ragazza, supereroe; `npm run check-characters` → tutto `ok`; commit delle approvazioni.
