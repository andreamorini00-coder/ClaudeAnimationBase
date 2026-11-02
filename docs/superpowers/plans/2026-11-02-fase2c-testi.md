# Fase 2c — Testi, sottotitoli e controllo del tempo di lettura: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un livello opzionale di testi (sottotitoli e titoli) disegnato dalla pagina sopra la grana, dichiarato nel codice della scena con `testi()`, con un controllo automatico del tempo di lettura (15 lettere/s, `--lettura=bambini` a 13), l'esportazione `.srt` e un reel di prova in verticale.

**Architecture:** `src/testi.js` ha una parte pura (`TESTI`, testabile con `node:vm`: validazione, visibilità con dissolvenza, a capo, layout nella fascia del formato, controllo di lettura, `.srt`) e le funzioni di pagina (`testi()`, `drawTesti`, `window.testiPlan`, `window.testiControl`); `core.js` chiama `drawTesti` in `composite()` dopo la grana; `render.mjs` aggiunge `--lettura`, `--controlla-testi`, `--srt` e l'avviso a inizio render.

**Tech Stack:** p5.js (compositor 2D), Node 24 `node:test` + `node:vm`, `render.mjs`, Atkinson Hyperlegible (woff2 locale, già in `assets/fonts/`) e Permanent Marker.

**Spec:** `docs/superpowers/specs/2026-11-02-fase2c-testi-design.md`

## Global Constraints

- Senza testi dichiarati il video è **identico al byte** a oggi: `npm run check` resta `OK 9/9 identici` dopo ogni task; `npm run check-characters` resta `ok` (24 ok, 12 bozza).
- **Controlli sempre uno alla volta** (mai render o check in parallelo); leggere l'intero output.
- Caratteri solo locali: titoli `"Permanent Marker"`, sottotitoli `"Atkinson Hyperlegible"`; **nessun** carattere di sistema nello stack (niente `Comic Sans`, `Arial`, `sans-serif` come ripiego).
- Targa `PAL.ink` al 72% con testo `PAL.paper`; dissolvenza 0,2 s; nessuna camera né boil sui testi.
- Velocità di lettura: `TESTI.LETTURA = { base: 15, bambini: 13 }`; regole: visibile ≥ 1,8 s; ≥ `battuta` + 0,6 s; `visibile − 0,2 ≥ lettere ÷ velocità + 1,5`; titolo ≥ 4 s. `lettere` = caratteri senza spazi.
- Nomi globali nuovi ammessi: `TESTI`, `testi`, `drawTesti`, `TESTI_LIST`, `window.testiPlan`, `window.testiControl`.
- Italiano per i messaggi all'utente; commenti nel codice come quelli intorno. Nessun `git push`; `package-lock.json` mai nei commit; file aggiunti uno per uno; script Python di modifica in file nello scratchpad. Branch `fase2c-testi`.

## Review Focus

1. **Caratteri fuori dal font locale** (emoji, cirillico, virgolette tipografiche oltre il sottoinsieme latin): ricadrebbero su un font di sistema e romperebbero il determinismo → `TESTI.problems` li segnala, con test (Task 1).
2. **Testo che non entra** (frase lunga nel 9:16 o nel feed, parola più larga della riga): riduzione del corpo fino al 70%, poi `fuori` vero → avviso (Task 1).
3. **Sottotitoli sovrapposti** o testi oltre la durata del video/loop: segnalati dal controllo, non disegnati l'uno sull'altro in silenzio (Task 1).
4. **Nessun testo = nessun cambio di byte**, anche con `testi([])` e con un loop senza `.testi` (Task 2, `check` 9/9).
5. **`--lettura` sbagliato** o assente: errore chiaro che elenca i profili, prima di aprire Chrome; assente = `base` (Task 3).

---

### Task 1: La parte pura (`TESTI`)

**Files:** Create `src/testi.js` (solo `const TESTI = {...}` per ora), `tools/testi.test.mjs`. Modify `tools/pagecode.mjs` (`TESTI_SCRIPTS = ['src/testi.js']`).

**Interfaces (produce, tutto puro):**
- `TESTI.LETTURA = { base: 15, bambini: 13 }`; `TESTI.FADE = .2`; `TESTI.CORPO = { landscape: 44, vertical: 54, feed: 50 }`; `TESTI.TIPI = ['sottotitolo', 'titolo']`.
- `TESTI.problems(lista, durata)` → `string[]` (uno per errore, con l'indice «testo 2: …»): `da`/`a` non numerici o `da < 0` o `a <= da`; `a > durata`; `testo` non stringa o vuoto (dopo `trim`); `tipo` non in `TIPI` (se presente); `battuta` presente e non numero ≥ 0; caratteri fuori dal sottoinsieme del font locale (`/[^\n -ÿıŒœʻʼˆ˚˜ -⁯€™↑↓−∕]/`).
- `TESTI.at(lista, t)` → `[{ ...voce, alpha }]`: visibili con `da <= t < a`, `alpha = clamp(min((t-da)/FADE, (a-t)/FADE), 0, 1)`, escluse quelle con `alpha` 0.
- `TESTI.wrap(testo, larghezza, misura)` → `string[]`: `misura(riga)` dà i px; a capo sulle parole e su `\n`; una parola più larga di `larghezza` si spezza per lettere; stringa vuota → `[]`.
- `TESTI.layout(voce, formato, misura)` → `{ righe, size, x, y, w, h, fuori }`; `formato = { nome, w, h, safe }` (come `FORMATS[nome]` più `nome`). Sottotitolo: banda `safe.subs` o, se nulla, `[h × .80, h × .93]`; larghezza utile `w − safe.left − safe.right − 2×40`, corpo `CORPO[nome]`, interlinea 1,25, margine targa 14; massimo 2 righe. Titolo: corpo 2 × `CORPO[nome]`, massimo 3 righe, in alto con la targa che comincia a `safe.top + 40`. Se non entra il corpo scende a passi del 5% fino al 70%; se anche allora non entra (troppe righe o più alto della banda) `fuori: true`. `x` = centro orizzontale dell'area utile; `y` = bordo alto della targa; `w`, `h` = dimensioni della targa (misura più 14 per lato).
- `TESTI.leggi(lista, durata, lettura = 'base')` → `string[]` dei problemi di lettura e di sovrapposizione (messaggio «1,2–2,0 s «frase»: resta 0,8 s, ne servono 3,3 (lettere ÷ 15 + 1,5)»); profilo sconosciuto → `throw new Error('Lettura "x" inesistente. Disponibili: base, bambini')`. Due voci dello stesso `tipo` con intervalli che si toccano → un problema.
- `TESTI.controllo(lista, durata, lettura, formato, misura)` → `problems + leggi + «fuori»` in un elenco solo (stesso ordine, senza duplicati).
- `TESTI.srt(lista)` → stringa `.srt`: solo i sottotitoli, ordinati per `da`, numerati da 1, `hh:mm:ss,mmm --> hh:mm:ss,mmm`, righe separate da `\n`, una riga vuota dopo ogni voce.

- [ ] **Step 1: Test** (`tools/testi.test.mjs`, helper `lib() = loadPageScripts(TESTI_SCRIPTS)`, `near`): `problems: a good list has none`; un test per ogni errore di forma (`da` mancante, `a <= da`, `da < 0`, `a > durata`, `testo` vuoto e solo spazi, `testo` numero, `tipo` 'didascalia', `battuta` -1); `problems flags characters the local font does not have` («é à ù ’ …» passano; un'emoji, «Привет» e «你好» no, messaggio che cita il carattere); `at: fades in and out in 0.2 s` (a `da` assente, a `da + .1` 0,5, a `da + .2` 1, a `a − .1` 0,5, a `a` assente), `at: a short text never goes above its own fade` (`a − da = .2` → massimo 0,5); `wrap: words, newlines, a long word, empty` (misura finta `s => s.length * 10`: «uno due tre» a 70 → `['uno due','tre']`, `'a\nb'` → due righe, parola di 12 lettere a 50 → pezzi ≤ 5 lettere, `''` → `[]`); `layout: a subtitle sits in the band of the format` (vertical: `y ≥ 1150` e `y + h ≤ 1500`, `x` centro dell'area utile, `fuori` falso per «Ma dov'è finito?»; landscape: banda 864–1004,4); `layout: a title sits under the top safe margin` (vertical: `y ≥ 260`); `layout: a long subtitle shrinks, then is out` (50 lettere nel vertical: `size` < 54 e ≥ 37,8; 400 lettere: `fuori` vero); `leggi: the roadmap's rules` (una voce di 1,2 s → «resta»; `battuta: 2` con `a − da = 2,3` → problema, con 2,6 niente; 24 lettere in 3,3 s → problema con `base`? `24/15 + 1,5 + .2 = 3,3` → niente a 3,3, problema a 3,2; un titolo di 3,9 s → problema, 4,0 niente); `leggi: kids' speed is slower` (la stessa voce passa con `base` e non con `bambini`); `leggi: unknown profile throws` col messaggio che elenca `base, bambini`; `leggi: overlapping subtitles are reported, a title over a subtitle is not`; `controllo has no duplicates and no NaN with extreme values` (`n` voci 0, `da`/`a` enormi, `testo` di 1 lettera); `srt: format, order, titles left out` (due sottotitoli fuori ordine + un titolo → 2 voci, `00:00:01,200 --> 00:00:03,600`, numerate da 1, `a` oltre un'ora → `01:00:00,000`).
- [ ] **Step 2: FAIL** (`node --test tools/testi.test.mjs`: `TESTI` non definito) → **Step 3:** implementare `src/testi.js` (parte pura sopra) → **Step 4: PASS**.
- [ ] **Step 5:** `npm test` verde. **Commit** — «TESTI: parte pura (controllo, a capo, layout, .srt) con test».

### Task 2: Il livello nella pagina

**Files:** Modify `src/testi.js` (funzioni di pagina), `src/core.js` (`composite()`, `setup()`), `studio.html` (`@font-face` dell'Atkinson, tag dello script), `src/config.js` (`PROJECT.lettura`, documentazione in testa).

**Interfaces:**
- Consumes: Task 1 (`TESTI.*`), `FORMATS`, `FORMAT_NAME`, `SAFE`, `W`, `H`, `PAL`, `T`, `DUR`, `window.LOOP`.
- Produces: `testi(lista)` (somma all'elenco `TESTI_LIST`); `LOOPS.x.testi = [...]`; `drawTesti(c, t)` (disegna sul compositor, esce subito se non c'è nulla da vedere); `window.testiPlan()` → `{ lista, duration, formato: { nome, w, h, safe }, lettura }` (`lista` = `window.LOOP.testi || []` in un loop, altrimenti `TESTI_LIST`; `lettura` = `PROJECT.lettura || 'base'`); `window.testiControl(lettura)` → `TESTI.controllo(...)` con la misura reale del canvas, per formato e durata correnti.
- `composite()` chiama `drawTesti(c, t)` **dopo** il multiply della grana, prima di `drawSafeOverlay`; `setup()` aspetta `document.fonts.load('100px "Atkinson Hyperlegible"')` oltre a Permanent Marker.

- [ ] **Step 1: Test** (in `tools/testi.test.mjs`): `testiPlan has the shape the CLI reads` non è vm-testabile (usa p5): coperto dal passo a mano e dal Task 3. Si testa invece la funzione pura `TESTI.draw(voce, lay, pal)` → `{ placca: { x, y, w, h, r, fill }, righe: [{ txt, x, y, font, fill }] }` (nuova, pura: cosa disegnare, senza canvas): `draw: the plate is ink at 72% and the text paper` (`fill` `rgba(<ink>,.72)`, testo = `pal.paper`), `draw: subtitles use Atkinson, titles Permanent Marker, and no system font in the stack`, `draw: lines are centred inside the plate`, `draw: alpha scales the plate and the text`.
- [ ] **Step 2–4:** FAIL → implementare `TESTI.draw`, `testi()`, `drawTesti` (canvas: `roundRect`, `fillText`, `globalAlpha = alpha`, `textBaseline 'middle'`), `window.testiPlan`, `window.testiControl`, il `@font-face` in `studio.html` (come Permanent Marker, `font-display: block`), il caricamento in `setup()`, la riga in `composite()` → PASS.
- [ ] **Step 5:** il disegno si guarda a occhio nel reel del Task 4; qui `npm run check` deve restare `OK 9/9` (senza testi nulla cambia, Review Focus 4, anche con `testi([])`) e `check-characters` come sopra. **Commit** — «Livello testi nella pagina: testi(), disegno sopra la grana, caratteri locali».

### Task 3: Il comando (`--lettura`, `--controlla-testi`, `--srt`, avviso)

**Files:** Create `tools/testi.mjs`. Modify `render.mjs` (argomenti, un ramo `--controlla-testi`, un ramo `--srt`, l'avviso), `tools/testi.test.mjs` (o `tools/testi-cli.test.mjs`).

**Interfaces:**
- `tools/testi.mjs`: `export function profiloLettura(nome)` → il nome valido o `throw` con «Lettura "x" inesistente. Disponibili: base, bambini» (legge `TESTI.LETTURA` dal vm: nessun numero duplicato); `export function srtDi(lista)` → `TESTI.srt(lista)` (vm); `export function righeAvviso(problemi)` → `string[]` formattati «Testi: …».
- `render.mjs`: `--lettura=<profilo>` controllato **prima** di aprire Chrome (errore e `exit 1`); vince su `PROJECT.lettura`. All'apertura della prima pagina di un render che ha testi stampa ogni problema come avviso, senza fermare nulla. `--controlla-testi`: apre la pagina, esegue `window.testiControl(lettura)`, stampa «Testi: ok (N voci)» o i problemi, `exit 0`/`1`. `--srt`: scrive `${OUT}sottotitoli.srt` (o `--out=`), «wrote …»; senza sottotitoli esce con messaggio e codice 1.

- [ ] **Step 1: Test:** `profiloLettura accepts base and bambini`, `profiloLettura rejects an unknown name and lists the profiles`, `profiloLettura default is base`, `srtDi matches TESTI.srt`, `righeAvviso formats one line per problem`.
- [ ] **Step 2–4:** FAIL → implementare `tools/testi.mjs` e i rami di `render.mjs` → PASS. Aggiornare l'intestazione d'uso di `render.mjs`.
- [ ] **Step 5:** `node render.mjs --lettura=boh --controlla-testi` stampa l'errore con i profili ed esce con 1 senza aprire Chrome (verificato a mano). `npm test` verde; `npm run check` e `check-characters` come sopra. **Commit** — «render.mjs: --lettura, --controlla-testi, --srt e avviso a inizio render».

### Task 4: Reel di prova in verticale (punto d'arresto: approvazione di Andrea)

**Files:** Create `progetti/prova-testi/progetto.js`, `progetti/prova-testi/scena.js`.

**Interfaces:** progetto verticale di 8 s in `cozy` (`format: 'vertical'`) con il gatto che cammina su un prato, e `testi([...])`: titolo «Il gatto e il mostro» `da .3 a 4.3`; sottotitolo 1 «Ma dov'è finito?» `da 1.2 a 4.2`, `battuta: 1.9`; sottotitolo 2 «Eccolo! È dietro il cespuglio.» `da 4.4 a 8` (tutti e tre passano con `base` e con `bambini`).

- [ ] **Step 1:** scrivere il progetto e la scena (il gatto come in `prova-stili`, nessun testo dipinto: solo `testi()`).
- [ ] **Step 2:** `node render.mjs --progetto=prova-testi --controlla-testi` → «Testi: ok (3 voci)»; con `--lettura=bambini` ancora ok; un controllo con un testo volutamente corto (solo a mano, mai committato) mostra il messaggio.
- [ ] **Step 3:** tre fotogrammi a piena risoluzione (`--stills=0.9,2.5,6` senza `--safe`) e uno con `--safe` (2,5 s); `node render.mjs --progetto=prova-testi --srt`. Il 16:9 e il feed si provano con un loop di `prova-stili` con `LOOPS.x.testi` (un render alla volta, con `--safe`) e si dice cosa si è visto.
- [ ] **Step 4: Gate:** mandare ad Andrea i tre fotogrammi, quello con le zone sicure e il contenuto del `.srt`; **fermarsi**. Commit del progetto — «Reel di prova dei testi (verticale, 2 sottotitoli e 1 titolo)».

### Task 5: Dopo l'approvazione (guida, revisione, chiusura)

**Files:** Modify `ANIMATION_GUIDE.md`, `docs/superpowers/plans/roadmap.md`.

- [ ] **Step 1:** sezione «Testi e sottotitoli» nella guida (`testi()`, campi, `--lettura`, `--controlla-testi`, `--srt`, i caratteri locali e i caratteri non ammessi) e nota nella regola «No text».
- [ ] **Step 2:** revisione indipendente del branch (un revisore nuovo sul modello più capace, con la Review Focus di questo piano); correzioni Critical/Important con un test che fallisce prima; piccolezze in roadmap.
- [ ] **Step 3:** `npm test`, poi `npm run check`, poi `npm run check-characters` (uno alla volta, output letto); roadmap: 2c chiusa. **Commit**; merge in `main` in locale solo se Andrea lo dice; nessun push.
