# Fase 3a — Tecnica cel, stili cozy e anime, luci dell'anime: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `--style=cozy` e `--style=anime` disegnano la demo, i progetti e i personaggi a colori piatti con ombra netta e contorno costante; l'anime ha i set di luce giorno, notte e controluce (`luce()`); sei personaggi approvati in due stili nuovi; `classic` e `acquerello-leggero` identici al byte.

**Architecture:** una tecnica nuova `src/techniques/cel.js` (stesso contratto di `watercolor.js`) parametrizzata da `STYLE.cel`; stili in `src/styles/`; la logica delle luci pura in `src/lighting.js` (testabile con `node:vm`) e un'unica funzione di pagina `luce()` in `core.js`; `draw.js` traduce i ruoli dei personaggi con la luce corrente.

**Tech Stack:** p5.js (WEBGL) + p5.brush, canvas 2D per forma, Node 24 `node:test` + `node:vm`, `render.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-29-fase3a-stili-design.md` (principi: `2026-10-21-fase1-style-draft-design.md`)

## Global Constraints

- `npm run check` resta `OK 9/9 identici` dopo ogni task (classic invariato al byte); `npm run check-characters` resta `ok` per tutte le righe `classic` e `acquerello-leggero`; le righe `cozy` e `anime` sono `da approvare` fino al Task 8. Mai `deriva`.
- I nomi di `PAL` non cambiano: `paper, ink, clay, clayDk, clayLt, night, indigo, rose, ochre, sap, teal, violet, cream, sky`. Colori degli stili esattamente come nella tabella della spec §2 (dati dalle note, derivati con `mixCol` e la regola scritta).
- Nessun nome globale nuovo oltre a `TECHNIQUES.cel`, `STYLES.cozy`, `STYLES.anime`, `luce`, `CEL` (le funzioni pure della tecnica, es. `CEL.crescent`) e le funzioni pure di `src/lighting.js` raccolte in un oggetto `LIGHT` (`LIGHT.lum`, `LIGHT.contrast`, `LIGHT.hue`, `LIGHT.set`, `LIGHT.mix`, `LIGHT.role`). Nessun nero puro (#000000) né bianco puro (#FFFFFF).
- Una forma disegnata in `cel` non dipende dallo stato dei fotogrammi precedenti; `luce()` vale per il frame in corso e `draw()` ripristina `giorno` a inizio frame.
- File di prova e prototipi: nomi che iniziano con `_` (ignorati da `check-characters`), tolti entro il Task 4.
- Comandi per Andrea in CMD; nessun `git push`; `package-lock.json` mai nei commit; file aggiunti uno per uno; script Python di modifica in file nello scratchpad. Branch `fase3a-stili`.

## Review Focus

1. **Gli stili esistenti non devono cambiare per sbaglio:** `core.js`, `draw.js` e `draw()` cambiano per tutti (riscrittura di `PAL`, `roleColor`, validazione di `STYLE.cel`); `classic` (byte) e `acquerello-leggero` (via `check-characters`) restano uguali. → verifica in ogni task.
2. **La luce non deve filtrare tra fotogrammi o inquadrature:** una `luce('notte')` in un'inquadratura non tinge la successiva né un frame fuori ordine. → test del Task 5.
3. **Contorno sotto camera e zoom:** linee nitide e senza buchi a zoom 1,8 (limite noto di p5.brush: forme grandi lontane dall'origine). → prova del Task 1 e ritaglio del Task 7.
4. **Ombra al posto giusto:** solo sulle forme con contorno, dal lato opposto alla luce, anche su forme non convesse (mantello, coda); mai su cieli e prati. → test e sheet dei Task 3 e 6.
5. **Notte e pelle:** il contorno si legge sul fondo notturno e la pelle non diventa rosa sotto nessuna luce. → test del Task 2.

---

### Task 1: Prova di fattibilità e tempi (con punto d'arresto)

**Files:** Create `src/techniques/cel.js` (prototipo), `src/styles/_cel-prova.js`, `progetti/prova-stili/progetto.js`, `progetti/prova-stili/scena.js`. Modify `studio.html` (tag dopo `acquerello-leggero.js` e dopo `watercolor.js`).

**Interfaces:**
- Produces `TECHNIQUES.cel = { paintAt(pts, o), inkLine(P, sw, col, br, curv), makePaper(style), makeGrain(style) }`: ogni forma su un canvas 2D grande quanto la sua scatola (× zoom corrente della camera, minimo 1), in ordine riempimento piatto (`wash`/`fill`), ombra a mezzaluna (forma ritagliata con `clip` meno la forma spostata di `STYLE.cel.shadeSize` verso `STYLE.cel.light`), contorno costante `sw × STYLE.cel.line` con giunzioni tonde; poi `image()` sotto la matrice di p5.
- Produces `_cel-prova`: stile con `technique: 'cel'`, palette di `acquerello-leggero`, `STYLE.cel = { line: 1, lineInner: .6, wobble: .25, light: [-1, -1], shadow: '#8C8074', shadeK: .45, shadeSize: .22, tones: 1, outline: 'constant' }`, gli altri campi come `acquerello-leggero`.
- Produces il progetto `prova-stili` (3 s, `landscape`): un'inquadratura con gatto, mostro e ragazza in fila a scala 1 (primi 1,5 s) e poi la stessa fila con la camera a zoom 1,8 sul gatto; fa girare le pose `corsa`, `salto` e `inPiedi` perché i personaggi si muovano.

- [ ] **Step 1: Scrivere il prototipo** e il progetto; verificare a occhio con `node render.mjs --progetto=prova-stili --style=_cel-prova --sheet=0.3,1,2,2.8 --cols=4` che le forme si vedano piatte, con ombra dal lato giusto e contorno pieno.
- [ ] **Step 2: Misura.** Per ciascuno stile (`acquerello-leggero`, poi `_cel-prova`), due volte: `node render.mjs --progetto=prova-stili --stills=0.2,0.5,0.8,1.1,1.4,1.7,2.0,2.3,2.6,2.9 --style=<stile> --out=out/bench/<stile>`; prendere la **mediana dei ms a fotogramma** scartando il primo (avvio) e la mediana tra le due prove. Scrivere la tabella nel ledger e nella spec §7.
  Expected: `cel` ≤ 1,5 × `acquerello-leggero`.
- [ ] **Step 3: Nitidezza.** Un ritaglio a piena risoluzione del gatto a zoom 1,8 (`--sheet=2.5 --crop=…`): contorno continuo, nessun buco, mezzaluna senza scalini visibili.
- [ ] **Step 4: Punto d'arresto.**
  - Se il rapporto è ≤ 1,5 e la nitidezza regge: proseguire, con i numeri nel ledger e nel riassunto finale.
  - **Se è più lento di 1,5 volte (o la nitidezza non regge): non passare al Task 2.** Provare subito il piano B: `CG.minus(a, b)` (differenza tra due poligoni semplici, anche non convessi) in `shapes.js` con test (area di due cerchi spostati = area analitica ± 1%; una forma a L; poligoni disgiunti e contenuti), e un `paintAt` che disegna riempimento, mezzaluna e contorno con poligoni p5 senza canvas 2D. Rimisurare con lo stesso procedimento e **dire ad Andrea i numeri di entrambe le versioni** (ms a fotogramma di `acquerello-leggero`, piano A, piano B e i rapporti) prima di andare avanti. Il piano B resta il Task 3 solo se Andrea lo conferma o se A non regge.
- [ ] **Step 5:** `npm run check` → OK 9/9; `npm test` verde. **Commit** — "Prova della tecnica cel: prototipo, progetto prova-stili, tempi".

### Task 2: Luci: funzioni pure e set dell'anime

**Files:** Create `src/lighting.js`, `tools/stili.test.mjs`. Modify `tools/pagecode.mjs` (esporta `STYLE_SCRIPTS`: `src/styles/registry.js`, `src/lighting.js`, e gli stili, nell'ordine di `studio.html`).

**Interfaces:**
- `LIGHT.lum(hex)` (luminanza relativa 0..1), `LIGHT.contrast(a, b)` ((L1+.05)/(L2+.05), L1 ≥ L2), `LIGHT.hue(hex)` (gradi).
- `LIGHT.set(style, nome)` → `{ palette, ink, tone, k, skin, skinShadow, shadow, rim, light }` (il set `giorno` è la palette base dello stile, `k: 0`); `LIGHT.mix(style, da, a, k)` → un set intermedio (colori con `mixCol`, `k` e `rim.spessore` interpolati, `rim` presente se almeno uno dei due l'ha); `LIGHT.role(col, role, set)` → il colore di un ruolo in una luce: `line` e `eyeWhite` invariati, `skin`/`skinShadow` dal set, ogni altro `mixCol(col, set.tone, set.k)`.
- `STYLES.anime.luci = { giorno, notte, controluce }` con i valori iniziali della spec §3 (notte: `ink #111830`; controluce: `rim { colore '#FFD166', spessore 2.5 }`).

- [ ] **Step 1: Test** (`tools/stili.test.mjs`, helper `styleLib()` = `loadPageScripts(STYLE_SCRIPTS)`):
  - `LIGHT.contrast` e `LIGHT.lum`: contrasto di #000 su #FFF = 21 e di un colore con sé stesso = 1; `ink` #1C2440 su `night` #2B3766 = 1,34 ± .05 (i colori delle note);
  - `anime lights: night keeps the outline readable` — nel set `notte` il contrasto di `ink` con `sky` e con `night` ≥ 1,5; in `giorno` ink ≠ night e ≥ 1,3; in nessun set `ink` coincide con `sky` o `night` di quel set;
  - `anime lights: skin stays skin` — in ogni set `skin` e `skinShadow` hanno tinta entro 25° da #F5C6A5 e rosso − blu > 20 (non diventano rosa né grigi);
  - `LIGHT.mix(…, 0)` = `da` e `(…, 1)` = `a` su tutti i colori; un solo `luce` per volta: `LIGHT.mix(s, 'notte', 'notte', .5)` = `notte`;
  - `LIGHT.role`: `line` e `eyeWhite` invariati, `skin` = quella del set, un ruolo qualsiasi tra `giorno` e `notte` cambia (k > 0), `controluce` ha `rim`, `giorno` e `notte` no;
  - tutti i set coprono tutti i nomi di `PAL`; nessun colore dei set è #000000 o #FFFFFF.
- [ ] **Step 2:** `node --test tools/stili.test.mjs` → FAIL (`LIGHT` non esiste). **Step 3:** implementare `src/lighting.js` (puro, niente p5/DOM/`PAL`) e i set in uno stile `anime` provvisorio (palette completa dalla spec §2; il file vero arriva nel Task 4: qui si crea `src/styles/anime.js` con palette e `luci`, il resto dei campi nel Task 4). **Step 4:** test PASS.
- [ ] **Step 5:** `npm test` verde; `npm run check` OK. **Commit** — "Funzioni pure delle luci e set dell'anime".

### Task 3: La tecnica cel definitiva e `STYLE.cel`

**Files:** Modify `src/techniques/cel.js`, `src/core.js` (validazione dei campi richiesti dalla tecnica: `STYLE.cel`), `tools/stili.test.mjs`.

**Interfaces:**
- `STYLE.cel = { line, lineInner, wobble, light [dx, dy], shadow (hex), shadeK, shadeSize, tones, outline }`, tutti obbligatori per `technique: 'cel'`; la mancanza ferma la pagina con `Stile "x" incompleto: mancano cel.… (confronta con src/styles/anime.js)`.
- `paint(pts, o)` per `cel`: `wash`/`fill` → riempimento piatto (`washOp`/`fillOp` come trasparenza); `ink`/`sw`/`curv` → contorno `sw × cel.line` (e `× cel.lineInner` per le forme dichiarate interne con `o.inner`); **ombra** se `o.ink !== null` e `o.shade !== false`, o se `o.shade === true`, di colore `o.shadeCol` o `mixCol(colore, cel.shadow, cel.shadeK)`; `hatch`, `bleed`, `tex`, `border`, `br` ignorati (un solo avviso nel log per tipo). `inkLine` = linea piena di spessore costante.
- `makePaper(style)`: fondo piatto `palette.paper` più, se `style.paper.stains > 0`, la texture tenue di `watercolor`; `makeGrain(style)`: grana e vignetta come nelle altre tecniche ma con i valori dello stile.
- Il boil: oscillazione del contorno `cel.wobble` px con `jit()`, 0 = ferma.

- [ ] **Step 1: Test:** `a cel style missing a field is rejected` (stile senza `cel.shadeK` → errore che lo nomina), `cel params in range` (`line > 0`, `shadeK` in 0..1, `light` di lunghezza 2 non nulla, `tones` 1 o 2, `outline` in `constant`/`shadowThick`), e per la parte pura della mezzaluna (funzione `CEL.crescent(box, light, size)` che dà il vettore di spostamento e la scatola del canvas, esportata e testata in `node:vm`): spostamento opposto alla luce, modulo `size × lato maggiore`, scatola che contiene forma e spostamento. Il resto si verifica a occhio sugli sheet.
- [ ] **Step 2–4:** FAIL → implementare (prima i parametri, poi le opzioni di `paint`, poi carta e grana, poi `inkLine`) → PASS; sheet di prova in `cel` di una forma convessa, una a L e il mantello del supereroe: ombra sul lato opposto alla luce (Review Focus 4).
- [ ] **Step 5:** `npm run check` OK; `check-characters` come sopra. **Commit** — "Tecnica cel: opzioni di paint, ombra, carta e grana; STYLE.cel".

### Task 4: Gli stili cozy e anime

**Files:** Create `src/styles/cozy.js`; complete `src/styles/anime.js`; delete `src/styles/_cel-prova.js` e il suo tag. Modify `studio.html` (tag), `tools/stili.test.mjs`.

**Interfaces:** `STYLES.cozy` e `STYLES.anime` con `technique: 'cel'`, palette della spec §2, `paper`/`grain` (cozy: stains tenui e vignetta lieve; anime: `stains: 0`, grana quasi nulla), `brushes`/`brushScale`/`boil: 12`/`paint` come minimo richiesti da `classic.js`, `character: { toPaper, shadow: 'hard', lineWeight }` e `cel`: `cozy { line: 1, lineInner: .8, wobble: .6, light: [-1, -1], shadow: '#8C8074', shadeK: .5, shadeSize: .2, tones: 1, outline: 'constant' }`, `anime { line: 1, lineInner: .6, wobble: .25, light: [-1, -1], shadow: '#555B91', shadeK: .5, shadeSize: .24, tones: 1, outline: 'constant' }`.

- [ ] **Step 1: Test:** `cozy and anime are complete styles` (tutti i campi obbligatori come `classic`, tutti i nomi di `PAL`, tutti `#RRGGBB`, nessun #000000/#FFFFFF), `style palettes follow the notes` (i colori dati dalle note: i valori esatti della spec §2 per `paper`, `ink`, `clay`, `night`, `ochre`, `sap`, `violet`, `sky` in ciascuno; i derivati ricalcolati con la regola e confrontati), `anime ink is not night` (Task 2 già lo copre per le luci).
- [ ] **Step 2–4:** FAIL → implementare → PASS. Render a occhio: `node render.mjs --sheet=…` della demo in `cozy` e `anime` (tempi della demo, landscape): niente sfumature, contorno pieno, ombra dal lato giusto, la carta di `cozy` tenue, quella di `anime` assente.
- [ ] **Step 5:** `npm run check` OK; `check-characters`: righe `classic`/`acquerello-leggero` `ok`, `cozy`/`anime` `da approvare` (12 righe nuove). **Commit** — "Stili cozy e anime".

### Task 5: `luce()` nella pagina

**Files:** Modify `src/core.js` (`luce()`, ripristino in `draw()`), `tools/stili.test.mjs`; pagina di prova `progetti/prova-stili/scena.js` (aggiunge un'inquadratura con le tre luci).

**Interfaces:** `luce(nome)` e `luce(da, a, k)`: riscrive i valori di `PAL` col set (`LIGHT.set`/`LIGHT.mix`), imposta la luce corrente (`LUCE_NOW = { set, nome }`, che `draw.js` e `cel` leggono: `cel.light`, `rim`) e la direzione di `STYLE.cel.light` se il set ne dà una. `draw()` rimette `giorno` (palette di base) a inizio frame. In uno stile senza `STYLE.luci` (`classic`, `acquerello-leggero`, `cozy`) `luce()` non cambia nulla e lo dice una sola volta nel log.

- [ ] **Step 1: Test** (pagina vera, via `render.mjs` su un progetto o `--loop`, o la parte pura con `node:vm`): `luce does not leak between frames` (un frame con `luce('notte')` e uno senza, nello stesso render, dopo il secondo `PAL.sky` è quello di `giorno`), `luce is a pure function of the shot` (stesso `t`, due render → byte identici), `luce in a style without lights does nothing` (nessun errore, `PAL` invariato).
- [ ] **Step 2–4:** FAIL → implementare → PASS. Controllare che `glow()` ed `emote()` leggano `PAL` al momento della chiamata (nessuna cache di colori fuori da `makePaper`/`makeGrain`); se ce n'è una, farla dipendere dal set (Review Focus 2).
- [ ] **Step 5:** `npm run check` OK 9/9 (anche con `luce` nel codice); `check-characters` come prima. **Commit** — "luce(): set di illuminazione per frame, ripristino a inizio frame".

### Task 6: I personaggi negli stili nuovi (ombra, luce, bordo)

**Files:** Modify `src/characters/draw.js`, `tools/stili.test.mjs`.

**Interfaces:** `roleColor(spec, role)` applica `LIGHT.role` col set corrente (se lo stile ne ha); `character()` passa a `paint()` per ogni parte `shadeCol` (il colore `<ruolo>Shadow` se la scheda lo ha, altrimenti nulla: la tecnica deriva l'ombra) e `inner: true` per le parti con `line < 1`; nel controluce aggiunge a ogni parte con contorno il bordo `rim` (`paint(..., { rim: { colore, spessore } })`: una striscia ritagliata dalla forma sul lato verso la luce, sopra l'ombra). Le parti `dim` restano come oggi. Nessun cambio ai layout e alle versioni delle schede.

- [ ] **Step 1: Test:** `roleColor in a light` (con `luce('notte')` ogni ruolo diverso da `line`, `eyeWhite`, `skin` cambia; `skin` = quella del set), `no change without a light` (classic e acquerello-leggero: `roleColor` identico a prima, confrontato con i valori di `main`), `a character part with a Shadow role passes it` (la scheda di vale ha `skinShadow`, il supereroe anche: la parte `skin` passa `shadeCol`).
- [ ] **Step 2–4:** FAIL → implementare → PASS. Sheet dei personaggi in `anime` giorno/notte/controluce e in `cozy` (gatto, mostro, bruco, draghetto, ragazza, supereroe): contorno che si legge, ombra dal lato giusto, bordo di luce solo nel controluce, pelle viva anche di notte.
- [ ] **Step 5:** `npm run check` OK; `check-characters` → le righe `classic`/`acquerello-leggero` `ok` (stessi byte: Review Focus 1). **Commit** — "Personaggi in cel: ombra, luci e bordo di luce".

### Task 7: Sheet di confronto e tempi

**Files:** Modify `progetti/prova-stili/` (le inquadrature di confronto), `docs/superpowers/specs/2026-10-29-fase3a-stili-design.md` (§7: i tempi misurati).

- [ ] **Step 1: Sheet della demo** (landscape, gli stessi istanti): `classic`, `acquerello-leggero`, `cozy`, `anime`, uno accanto all'altro (un'immagine per stile, riuniti da `render.mjs --sheet` con gli stessi `--sheet=` e la stessa `--w`); **sheet delle luci:** la stessa inquadratura dell'anime in giorno, notte, controluce; **ritaglio a zoom 1,8** del contorno (Review Focus 3).
- [ ] **Step 2: Tempi.** Tabella ms/fotogramma (mediana) di `classic`, `acquerello-leggero`, `cozy`, `anime` sulla demo e sul progetto `reel-gatto-mostro` (finale e `--draft`), nella spec §7.
- [ ] **Step 3:** `npm run check` OK; `npm test` verde. **Commit** — "Sheet di confronto degli stili e tempi di render".

### Task 8: Autocritica, guida, revisione, approvazioni

**Files:** Modify `ANIMATION_GUIDE.md` (Styles: `cel`, `cozy`, `anime`, `STYLE.cel`; una sezione breve sulle luci e su `luce()`), `docs/superpowers/plans/roadmap.md` (3a in approvazione, poi chiusa), le specs solo per le correzioni.

- [ ] **Step 1: Autocritica scritta** contro le mood board di `cozy` e `anime` (forme, colori, ombra, contorno, nuvole a cumulo, cieli a fasce senza gradiente, coni di luce dei lampioni come forme semitrasparenti): cosa è vicino e cosa no, nella spec; correggere, `npm test` sempre verde.
- [ ] **Step 2: Revisione indipendente del branch** (un revisore nuovo sul modello più capace, con la Review Focus di questo piano), correzioni Critical/Important con test che fallisce prima, piccolezze in roadmap.
- [ ] **Step 3: Gate di Andrea:** mandargli gli sheet di confronto, le luci e i model sheet dei sei personaggi in `cozy` e `anime`; al massimo due giri di correzioni; sulle approvazioni `node tools/approve.mjs <id> cozy|anime` per gatto, mostro, bruco, draghetto, ragazza e supereroe (12); `npm run check-characters` → tutto `ok` (vale, mara: `bozza`); commit delle approvazioni.
- [ ] **Step 4:** guida e roadmap aggiornate; `npm run check` OK 9/9. **Commit** — "Fase 3a: guida, roadmap e approvazioni".
