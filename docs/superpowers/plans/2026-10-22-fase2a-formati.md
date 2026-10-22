# Fase 2a — Formati vertical e feed: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** scegliere per progetto il formato `landscape` / `vertical` / `feed`, con zone sicure social verificabili sugli sheet, senza cambiare l'orizzontale.

**Architecture:** `FORMATS` in `core.js` dà `W`/`H` e le zone sicure (`SAFE`) del formato scelto (`PROJECT.format`, `--format`, `?format`). Scene e loop dichiarano i formati per cui sono composti e i formati non dichiarati si fermano su `window.loadError`. Un overlay di verifica (`--safe`) si disegna in `composite()` solo per sheet, strip e stills. Un esempio `LOOPS.tall` prova i formati alti.

**Tech Stack:** p5.js 2.3.3 + p5.brush 2.2.3, puppeteer-core 25, ffmpeg, Node 24 (`node:test`).

**Spec:** `docs/superpowers/specs/2026-10-22-fase2a-formati-design.md`

## Global Constraints

- `npm run check` → `OK 5/5 identici` dopo ogni task: l'orizzontale `classic` non cambia di un byte.
- Misure: `landscape` 1920×1080, `vertical` 1080×1920, `feed` 1080×1350.
- Zone `vertical` (Andrea): margini alto 220, basso 420, destra 140, sinistra 0; sottotitoli y 1150–1500.
- Zone `feed` (proposta): margini alto 60, basso 60, sinistra 100, destra 100; sottotitoli y 940–1170.
- `landscape`: nessun margine, nessuna fascia sottotitoli.
- Scene e loop senza dichiarazione valgono `'landscape'`. La demo e gli sheet dei modelli sono `'landscape'`.
- `--safe` mai in un video: ammesso solo con `--sheet`, `--strip`, `--stills`.
- Nessun `git push`. `package-lock.json` mai nei commit (file aggiunti uno per uno). Comandi per Andrea in CMD.

## Review Focus

1. **Crop in un formato alto** (`--sheet=2 --crop=0,1100,1080,500 --format=vertical`): il crop resta in pixel del fotogramma 1080×1920 e non viene tagliato al 1920×1080 di prima. → verifica nel Task 1.
2. **Draft a mezza risoluzione in verticale** (`--draft=flat,half --format=vertical`): tela interna 540×960, output 1080×1920, crop in coordinate piene. → verifica nel Task 5.
3. **`studio.html?format=vertical&loop=tall` aperto a mano**: la tela si vede alta e intera, senza deformazioni né bande. → verifica nel Task 5.
4. **`--encode` di fotogrammi verticali**: video 1080×1920, `yuv420p` (misure pari). → verifica nel Task 3.
5. **`--safe` con `--draft`**: l'overlay resta allineato ai pixel finali. → verifica nel Task 4.

---

### Task 1: FORMATS, W/H dal formato, `--format`

**Files:**
- Modify: `src/config.js` (`format: 'landscape'` in `PROJECT`), `src/core.js:23` (`W`, `H`), `src/core.js` (commenti "1920×1080"), `src/techniques/watercolor.js:37` (vignettatura), `studio.html` (tela `#out` e CSS), `render.mjs` (`--format` → `&format=`, commento d'uso)

**Interfaces:**
- Produces: `FORMATS = { landscape: { w, h, safe }, vertical: {…}, feed: {…} }` e `FORMAT_NAME` in `core.js`; `W = FORMATS[FORMAT_NAME].w`, `H = … .h`; `SAFE = FORMATS[FORMAT_NAME].safe` con forma `{ top, bottom, left, right, subs: [y0, y1] | null }` (valori dai Global Constraints).
- Produces: formato sconosciuto → `window.loadError = 'Formato "x" inesistente. Disponibili: landscape, vertical, feed'`; `render.mjs` lo riconosce come gli stili (filtro `pageerror` esteso a `inesistente|incompleto`, già presente).
- Produces: `studio.html` imposta `#out.width/height = W/H` e `style.aspectRatio = W + ' / ' + H` in `setup()` (prima di `outX = outC.getContext('2d')`).

- [ ] **Step 1: Verifiche RED con il codice attuale:**
  - `node render.mjs --stills=1 --format=quadrato --out=out/t/q` → oggi esce 0 (parametro ignorato): annotare;
  - `node render.mjs --stills=1 --format=vertical --out=out/t/v` → oggi PNG 1920×1080: annotare le misure.
- [ ] **Step 2: Implementare FORMATS, W/H, SAFE, `--format`, tela di `studio.html`.**
- [ ] **Step 3: Vignettatura** con `Math.min(W, H)` al posto di `H` nei due raggi.
- [ ] **Step 4:** `npm run check` → `OK 5/5 identici`.
- [ ] **Step 5: GREEN:** `--format=quadrato` → codice 1 in < 10 s con l'elenco; `--format=vertical` sulla demo → PNG 1080×1920 (`ffprobe -show_entries stream=width,height`). Qui la demo serve solo a misurare la tela: dal Task 2 lo stesso comando diventerà un errore di formato, ed è giusto così.
- [ ] **Step 6: Review Focus 1:** `--sheet=2 --crop=0,1100,1080,500 --w=540 --format=vertical` → l'immagine mostra la parte bassa della tela alta (prato), non un'area nera.
- [ ] **Step 7: Commit** `src/config.js src/core.js src/techniques/watercolor.js studio.html render.mjs` — "Formati landscape/vertical/feed: W/H e zone sicure dal formato".

### Task 2: Scene e loop dichiarano il formato

**Files:**
- Modify: `src/timeline.js` (`shots(list, opts)`), `src/scenes/demo.js:162` (`{ format: 'landscape' }`), `src/sheets.js` (`LOOPS.emotions.format`, `LOOPS.views.format`), `render.mjs` (`openPage`, controllo del loop), `src/core.js` o `src/timeline.js` (controllo del formato dei loop in `studio.html`)

**Interfaces:**
- Consumes: `FORMAT_NAME` (Task 1).
- Produces: `shots(list, { format })` con `format` stringa o array; default `'landscape'`. `formatsOf(x) => string[]` normalizza stringa/array/assenza.
- Produces: scena non compatibile → `window.loadError = 'La scena è composta per landscape, non per vertical'`. Il controllo avviene nella prima `draw()` o subito dopo il caricamento degli script di scena (dove `SHOTS` è pieno), prima di `window.ready = true`.
- Produces: loop non compatibile → in `render.mjs`, dopo aver scelto `LOOPS[name]`: errore `Il loop "emotions" è composto per landscape, non per vertical`, codice 1. In `studio.html?loop=…` lo stesso messaggio in `window.loadError`.

- [ ] **Step 1: RED:** `node render.mjs --stills=1 --format=vertical --out=out/t/demo-v` → oggi esce 0 con un fotogramma sbagliato; `--loop=emotions --stills=1 --format=vertical` → idem.
- [ ] **Step 2: Implementare** dichiarazioni e controlli.
- [ ] **Step 3: GREEN:** i due comandi dello Step 1 escono con codice 1 in < 10 s con i messaggi sopra; `--format=landscape` esplicito sulla demo funziona.
- [ ] **Step 4:** `npm run check` → `OK 5/5 identici` (il loop `emotions` è landscape).
- [ ] **Step 5: Commit** `src/timeline.js src/scenes/demo.js src/sheets.js render.mjs src/core.js` — "Scene e loop dichiarano il formato".

### Task 3: Il formato nel timbro dei fotogrammi

**Files:**
- Modify: `tools/stamp.mjs` (`show`, `checkStamp`, `writeStamp`), `tools/stamp.test.mjs`, `render.mjs` (oggetto `stamp` in `--frames`)

**Interfaces:**
- Consumes: `FORMAT_NAME` (Task 1).
- Produces: timbro `{ style, draft, fps, format }`. Un timbro vecchio senza `format` vale `'landscape'` (le cartelle della Fase 1 restano riprendibili).

- [ ] **Step 1: Test che falliscono** in `stamp.test.mjs`:
  - `another format blocks a resume`: timbro `{…final, format: 'landscape'}`, richiesta `format: 'vertical'` → messaggio che contiene `vertical`;
  - `old stamp without format counts as landscape`: timbro scritto a mano senza `format`, richiesta `format: 'landscape'` → `null`.
- [ ] **Step 2:** `npm test` → i 2 test nuovi FAIL.
- [ ] **Step 3: Implementare** e passare `format` dalla pagina in `render.mjs`.
- [ ] **Step 4:** `npm test` → 13/13 PASS.
- [ ] **Step 5: Prova reale:** scrivere a mano in `out/frames/stamp.json` un timbro `{"style":"classic","draft":"","fps":24,"format":"vertical"}`, poi `node render.mjs --frames --range=0:0.5 --workers=1` (demo, `landscape`) → codice 1 con un messaggio che nomina `vertical`; svuotare `out/frames`. La verifica di `--encode` in verticale (1080×1920, `yuv420p`, Review Focus 4) si fa nel Task 5 con `LOOPS.tall`.
- [ ] **Step 6: Commit** `tools/stamp.mjs tools/stamp.test.mjs render.mjs` — "Il formato nel timbro dei fotogrammi".

### Task 4: Overlay delle zone sicure (`--safe`)

**Files:**
- Modify: `src/core.js` (`composite()`, lettura di `?safe`), `render.mjs` (`--safe` → `&safe`, rifiuto nei modi video, commento d'uso)

**Interfaces:**
- Consumes: `SAFE` (Task 1).
- Produces: `drawSafeOverlay(c)` in `core.js`, chiamata in `composite()` dopo la grana solo se `?safe`. Margini `rgba(255,0,0,.25)`, fascia sottotitoli `rgba(255,210,0,.3)`, bordo del centro sicuro linea 3 px `rgba(255,0,0,.8)`. In `landscape` non disegna niente.
- Produces: `render.mjs` con `--safe` e uno tra `--clip`, `--frames`, `--png`, `--encode` → `--safe è solo per sheet, strip e stills: non va mai in un video`, codice 1, prima di aprire Chrome.

- [ ] **Step 1: RED:** `node render.mjs --clip --range=0:0.1 --safe --out=out/t/safe.mp4` → oggi esce 0.
- [ ] **Step 2: Implementare** overlay e rifiuto.
- [ ] **Step 3: GREEN:** il comando dello Step 1 esce con codice 1 e il messaggio, senza scrivere `out/t/safe.mp4`.
- [ ] **Step 4:** `npm run check` → identico (senza `?safe` l'overlay non c'è).
- [ ] **Step 5: Review Focus 5:** sheet `--safe` in `vertical` con e senza `--draft=flat,half`: le bande stanno sugli stessi pixel.
- [ ] **Step 6: Commit** `src/core.js render.mjs` — "Overlay delle zone sicure per gli sheet (--safe)".

### Task 5: Esempio `LOOPS.tall`, transizioni, riferimenti

**Files:**
- Create: `src/scenes/tall_example.js`
- Modify: `studio.html` (script tag dopo `demo.js`), `package.json` (`ref`/`check` aggiungono `tall`), `src/timeline.js` (`brushWipe`, solo se lo strip lo richiede)

**Interfaces:**
- Consumes: `SAFE`, `W`, `H`, `formatsOf` (Task 1-2).
- Produces: `LOOPS.tall` (`len` 5, `format: ['vertical', 'feed']`). Posizioni calcolate da `W`, `H`, `SAFE`, non scritte per un solo formato:
  - orizzonte a ~`H * .72`; Clawd con i piedi sopra `SAFE.subs[0]` quando c'è la fascia, centrato nel centro sicuro (`x = (SAFE.left + W - SAFE.right) / 2`), `u` 30;
  - evento: una lucciola (`glow`) entra dall'alto, Clawd la segue con gli occhi (`lookY`), sorpresa (`emotions` → `surprised` → `happy`), salto (`jump`) verso la lucciola;
  - `iris` in entrata (0–0.45 s), `brushWipe` in uscita (ultimi 0.3 s, cioè `p` 0 → .5).
- Produces: `npm run ref`/`check` aggiungono `--loop=tall --stills=1,3 --format=vertical` in `out/ref/tall-vertical/` e lo stesso in `feed` in `out/ref/tall-feed/`. `out/ref` già esistente: prima `npm run check` (deve passare), poi `npm run ref` rigenera il tutto.

- [ ] **Step 1: Scrivere `tall_example.js`** e aggiungerlo a `studio.html`.
- [ ] **Step 2: Sheet di lavoro:** `--loop=tall --sheet=0.2,1,2,3,4,4.85 --cols=6 --w=240 --format=vertical --safe` e lo stesso in `feed`: visi e salto nel centro sicuro, fascia sottotitoli libera da azioni importanti, nessuna area scoperta.
- [ ] **Step 3: Strip delle transizioni:** `--loop=tall --strip=4.7:5 --format=vertical` e `--strip=0:.45`, in entrambi i formati: `brushWipe` e `iris` coprono tutta la tela. Se `brushWipe` lascia scoperto o le bande sono troppo grosse: `n = Math.max(5, Math.round(5 * H / 1080))` **solo quando `H > W`**; `npm run check` deve restare identico.
- [ ] **Step 4: Review Focus 3:** `studio.html?format=vertical&loop=tall&t=2` aperto in Chrome headless con lo script di controllo della Fase 1 (`studio_check.mjs`): nessun errore, tela 1080×1920.
- [ ] **Step 5: Review Focus 2:** `--sheet=2 --crop=0,1100,1080,500 --format=vertical --loop=tall --draft=flat,half` mostra la stessa zona della versione piena.
- [ ] **Step 6: Draft e video:** `--clip --draft --loop=tall --format=vertical --out=out/tall-vertical-draft.mp4` e in `feed`, tempi misurati; `--frames --loop=tall --format=vertical --draft` + `--encode` → `ffprobe`: 1080×1920, `yuv420p` (Review Focus 4).
- [ ] **Step 7: Riferimenti:** `npm run check` (orizzontale ancora identico), poi aggiornare `package.json` e `npm run ref`, poi `npm run check` → `OK 9/9 identici` (5 + 2 vertical + 2 feed).
- [ ] **Step 8: Commit** `src/scenes/tall_example.js studio.html package.json src/timeline.js` (solo se cambiato) — "Esempio LOOPS.tall per i formati alti".

### Task 6: Guida, README, sheet per Andrea

**Files:**
- Modify: `ANIMATION_GUIDE.md` (storyboard, nuova sezione "Social formats", tabella file), `README.md` (comandi CMD), spec (misure)

**Interfaces:**
- Consumes: tutto quanto sopra.

- [ ] **Step 1: Guida:**
  - storyboard: primo rigo `Format: landscape | vertical | feed`;
  - sezione "Social formats": tabella formati e zone sicure (valori dei Global Constraints), comporre per il formato e mai ritagliare, visi e azioni nel centro sicuro, `SAFE` nelle scene, `--safe` sugli sheet, `shots(list, { format })`;
  - taglie di Clawd: `vertical` largo 12–16, medio 24–34, primo piano 50–80; `feed` come `vertical` ma con meno spazio in alto.
- [ ] **Step 2: README:** `--format` e `--safe`, con un esempio CMD per ciascuno.
- [ ] **Step 3: Sheet per Andrea:** `LOOPS.tall` con `--safe` in `vertical` e `feed`, in `classic` e `acquerello-leggero` (4 immagini) in `out/cmp/`.
- [ ] **Step 4: Mostrare gli sheet ad Andrea** e fissare i valori di `feed` (margini e fascia sottotitoli) su sua indicazione, massimo due giri; aggiornare spec e `FORMATS` se cambiano, poi `npm run ref` + `npm run check`.
- [ ] **Step 5:** `npm test` → PASS; `npm run check` → `OK 9/9 identici`.
- [ ] **Step 6: Commit** `ANIMATION_GUIDE.md README.md docs/superpowers/specs/2026-10-22-fase2a-formati-design.md` (+ `src/core.js` se cambiano i valori di `feed`) — "Guida ai formati social e misure".
