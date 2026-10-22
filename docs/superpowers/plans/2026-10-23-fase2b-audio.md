# Fase 2b — Audio: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** effetti sonori, ambienti e musica dichiarati dalla scena e mixati da ffmpeg a −14 LUFS / AAC 48 kHz, con video in `yuv420p`.

**Architecture:** la pagina raccoglie un piano dichiarativo (`sounds()` / `LOOPS.x.sounds`) e lo espone con `window.audioPlan()`. In Node, `tools/audio.mjs` (funzioni pure, testate) sceglie le variazioni, calcola la curva di ducking e costruisce il grafo ffmpeg; misura i livelli dei file con una cache. `render.mjs` usa il mix in `--clip`, `--encode` e nel nuovo `--mix`.

**Tech Stack:** Node 24 (`node:test`), ffmpeg 8 (`ebur128`, `loudnorm`, `adelay`, `aloop`, `afade`, `amix`), puppeteer-core, p5.js.

**Spec:** `docs/superpowers/specs/2026-10-23-fase2b-audio-design.md`

## Global Constraints

- Uscita audio: −14 LUFS integrati (±1), picco ≤ −1 dBTP, AAC 48 kHz 192 kbps nel video; wav 48 kHz con `--mix`.
- Livelli di partenza: effetti −18 LUFS, ambienti −30, musica −20. `vol` in dB si somma.
- Ducking: −6 dB (×0,5), inizio 0,05 s prima dell'effetto, discesa 0,1 s, tenuta = durata del file + 0,2 s, risalita 0,4 s; sovrapposizioni = massimo, non somma.
- Default: `duck: true`, `fadeIn: .5`, `fadeOut: .8`, `vol: 0`.
- Variazioni: occorrenze dello stesso nome ordinate per tempo → `_01`, `_02`, `_03`, ricomincia; nome con numero = quel file; scelta sull'elenco intero, prima di `--range`.
- `voice` presente → errore "voce non ancora supportata". Nome inesistente → errore con l'elenco. Errori prima di qualsiasi mix o render, codice 1.
- Video: `scale=in_range=pc:out_range=tv,format=yuv420p` in `--clip` ed `--encode`.
- `npm run check` → `OK 9/9 identici` dopo ogni task. Nessun `git push`; `package-lock.json` mai nei commit; comandi per Andrea in CMD.

## Review Focus

1. **Suono a t = 0 o oltre la fine** (`[0, 'pop']`, `[12, 'pop']` in un video di 11 s): il primo parte subito (adelay 0), il secondo è escluso senza errori. → test nel Task 2.
2. **`--range=4:7` con un ambiente `from: 0, to: 11`**: l'ambiente copre 0–3 s del clip, con la dissolvenza in uscita solo se `to` cade nell'intervallo. → test nel Task 2 e nel Task 3.
3. **Nessun suono dichiarato e nessuna musica**: `--clip` produce un video muto come oggi (nessuna traccia audio, nessun errore); `--mix` si ferma con "nessun suono da mixare". → verifica nel Task 6.
4. **Lo stesso file usato due volte nello stesso istante** (`[2, 'pop_01']`, `[2, 'pop_01']`): grafo valido (un input, `asplit`), somma udibile, nessun errore ffmpeg. → test nel Task 3.
5. **Cache dei livelli dopo aver sostituito un file con lo stesso nome**: cambia dimensione o data → nuova misura. → test nel Task 4.

---

### Task 1: Video in `yuv420p` a gamma TV

**Files:**
- Modify: `render.mjs` (argomenti ffmpeg di `--encode` e `--clip`)

**Interfaces:**
- Produces: in entrambi i rami, prima di `-c:v`: `-vf scale=in_range=pc:out_range=tv,format=yuv420p`, al posto di `-pix_fmt yuv420p`.

- [ ] **Step 1: RED:** `node render.mjs --clip --draft --range=0:1 --out=out/t/col.mp4` poi `ffprobe -v error -show_entries stream=pix_fmt,color_range -of csv=p=0 out/t/col.mp4` → `yuvj420p,pc`.
- [ ] **Step 2: Implementare.**
- [ ] **Step 3: GREEN:** stesso comando → `yuv420p,tv`. Stesso controllo dopo `--frames --draft --range=0:1 --workers=1` + `--encode` (svuotare `out/frames` dopo).
- [ ] **Step 4: Confronto visivo:** un fotogramma estratto dall'mp4 nuovo (`ffmpeg -ss .5 -frames:v 1`) accanto a quello vecchio: stessi colori (nessun nero schiacciato o slavato).
- [ ] **Step 5:** `npm run check` → `OK 9/9 identici`.
- [ ] **Step 6: Commit** `render.mjs` — "Video in yuv420p a gamma TV".

### Task 2: Variazioni e risoluzione del piano

**Files:**
- Create: `tools/audio.mjs`, `tools/audio.test.mjs`

**Interfaces:**
- Produces: `variantsOf(name: string, files: string[]) => string[]` — i file `name_NN.mp3` ordinati; `[name + '.mp3']` se esiste così com'è; `[]` se nessuno.
- Produces: `resolvePlan(raw, { files: string[], dir: string, duration: number, range?: [a, b], music?: string }) => { sfx: [{ t, file, vol, duck }], ambience: [{ file, from, to, fadeIn, fadeOut, vol }], music: { file, vol } | null, duration }`. Percorsi `file` completi (`dir/nome.mp3`); tempi già spostati di `−a` e tagliati a `[0, b − a]`; `duration = b − a`. Lancia `Error` per nomi inesistenti (messaggio con l'elenco dei nomi senza numero) e per `voice`.

- [ ] **Step 1: Test che falliscono** in `tools/audio.test.mjs` (file finti: un array di nomi, nessun disco):
  - `three variants rotate by time`: `[[3,'bonk'],[1,'bonk'],[2,'bonk'],[4,'bonk']]` con `bonk_01..03` → file per tempo 1,2,3,4 = `_01,_02,_03,_01`;
  - `two variants rotate`: `scintillio` con `_01,_02` → `_01,_02,_01`;
  - `explicit variant is kept`: `pop_02` → `pop_02.mp3` e non conta nella rotazione di `pop`;
  - `unknown name lists the valid ones`: `'tonfo'` → `Error` che contiene `caduta_tonfo`;
  - `voice is refused`: `{ voice: {...} }` → `Error` che contiene `voce non ancora supportata`;
  - `defaults are filled`: `[[1,'pop']]` → `{ vol: 0, duck: true }`; ambiente senza fade → `fadeIn .5, fadeOut .8`;
  - `sound at 0 and past the end` (Review Focus 1): durata 11, `[[0,'pop'],[12,'pop']]` → un solo sfx a `t 0`;
  - `range shifts and trims` (Review Focus 2): `range [4,7]`, sfx a 3 / 5 / 8 → uno solo a `t 1`; ambiente `0–11` → `from 0, to 3`; variazioni scelte prima del taglio (lo sfx a 5 è la seconda occorrenza → `_02`);
  - `project music is used when the scene has none`: `music: 'assets/m.mp3'` nelle opzioni → `{ file: 'assets/m.mp3', vol: 0 }`.
- [ ] **Step 2:** `npm test` → i test nuovi FAIL (modulo mancante).
- [ ] **Step 3: Implementare** `variantsOf` e `resolvePlan`.
- [ ] **Step 4:** `npm test` → tutti PASS.
- [ ] **Step 5: Commit** `tools/audio.mjs tools/audio.test.mjs` — "Piano audio: variazioni e risoluzione dei tempi".

### Task 3: Curva di ducking e grafo ffmpeg

**Files:**
- Modify: `tools/audio.mjs`, `tools/audio.test.mjs`

**Interfaces:**
- Consumes: forma del piano risolto (Task 2).
- Produces: `duckAmount(t: number, cues: [{ t, dur }]) => number` (0 = musica piena, 1 = abbassata del tutto) con i valori dei Global Constraints; `duckExpr(cues) => string`, espressione ffmpeg equivalente (`clip()`, `max()`), con `1` se non ci sono cue.
- Produces: `mixGraph(resolved, { gains: { [file]: dB }, durs: { [file]: s } }) => { inputs: string[], filter: string, out: '[mix]' }`. Un input per file distinto (`-i`), `asplit` per gli usi multipli; ogni catena `aresample=48000,aformat=channel_layouts=stereo,volume=<dB>dB`; sfx `adelay=<ms>:all=1`; ambienti `aloop=loop=-1:size=2e9,atrim=duration=<to-from>,afade=t=in:d=<fadeIn>,afade=t=out:st=<to-from-fadeOut>:d=<fadeOut>,adelay=<from ms>:all=1`; musica `volume='<duckExpr>':eval=frame,atrim=duration=<duration>`; somma `amix=inputs=N:normalize=0:duration=longest,apad,atrim=duration=<duration>`.

- [ ] **Step 1: Test che falliscono:**
  - `duck curve`: cue `{ t: 2, dur: 1 }` → `duckAmount(1.9)=0`, `(2.0)=0.5`, `(2.05)=1`, `(3.2)=1`, `(3.4)=0.5`, `(3.6)=0`;
  - `overlapping cues take the max`: due cue sovrapposti → mai oltre 1;
  - `duckExpr matches duckAmount`: valutando l'espressione in JS (sostituendo `t`, `clip`, `max`) agli stessi istanti → stessi valori ±1e-9;
  - `graph delays and gains`: sfx a 1,25 s con guadagno −4,1 dB → il filtro contiene `adelay=1250:all=1` e `volume=-4.1dB`;
  - `ambience in range` (Review Focus 2): ambiente `from 0, to 3, fadeOut .8` → `atrim=duration=3`, `afade=t=out:st=2.2:d=0.8`;
  - `same file twice` (Review Focus 4): due sfx `pop_01` a t 2 → un solo input `pop_01.mp3`, `asplit=2` nel filtro;
  - `no music, no duck filter`: piano senza musica → nessuna espressione `volume='…':eval=frame`.
- [ ] **Step 2:** `npm test` → nuovi FAIL.
- [ ] **Step 3: Implementare.**
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Prova reale del grafo:** script di prova in `out/t/` che costruisce un piano con 2 sfx e 1 ambiente dei file veri e lancia ffmpeg col grafo (senza normalizzazione) → wav senza errori, durata giusta.
- [ ] **Step 6: Commit** `tools/audio.mjs tools/audio.test.mjs` — "Ducking e grafo di mix ffmpeg".

### Task 4: Livelli di partenza con cache

**Files:**
- Modify: `tools/audio.mjs`, `tools/audio.test.mjs`

**Interfaces:**
- Produces: `measureLufs(file) => Promise<number>` (ffmpeg `ebur128`, legge `I:` del riepilogo); `TARGETS = { sfx: -18, ambience: -30, music: -20 }`; `levelGains(resolved, cachePath = 'out/audio-cache.json') => Promise<{ gains, durs }>`: per ogni file distinto, guadagno = target della categoria − LUFS misurati (+ `vol` si aggiunge nel grafo per suono), durata da `ffprobe`. Cache: `{ [path]: { size, mtimeMs, lufs, dur } }`.

- [ ] **Step 1: Test che falliscono:**
  - `measures a real file`: `assets/sfx/caduta_tonfo_01.mp3` → −13,9 ±0,3 LUFS;
  - `gain per category`: un sfx a −13,9 → guadagno −4,1 ±0,3; un ambiente a −48,2 → +18,2 ±0,3;
  - `cache is reused`: seconda chiamata con cache esistente non lancia ffmpeg (contatore delle misure iniettabile o tempo < 50 ms);
  - `cache notices a changed file` (Review Focus 5): copia di un file in una cartella temporanea, misura, sostituzione con un altro file con lo stesso nome → nuova misura.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Implementare.**
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `tools/audio.mjs tools/audio.test.mjs` — "Livelli di partenza per categoria, con cache".

### Task 5: Piano nella pagina, `--mix`, normalizzazione

**Files:**
- Create: `src/audio.js`
- Modify: `studio.html` (script dopo `timeline.js`), `src/config.js` (`music: ''`), `render.mjs` (`--mix`, `--music`, `--audio` come alias, funzione di mix con `loudnorm` in due passaggi), `tools/audio.mjs` (`renderMix`)

**Interfaces:**
- Produces (pagina): `sounds(plan)` unisce più chiamate (`sfx` e `ambience` concatenati, `music`/`voice` l'ultima vince); `window.audioPlan() => { raw, duration, music }`: `raw` = `window.LOOP.sounds || {}` se c'è un loop, altrimenti il piano della scena; `duration` = `LOOP.len` o `DUR`; `music` = `PROJECT.music || ''`.
- Produces (Node): `renderMix(resolved, { out, gains, durs }) => Promise<{ lufs, tp }>`: passaggio 1 = grafo + `loudnorm=I=-14:TP=-1:LRA=11:print_format=json` su `-f null`; passaggio 2 = grafo + `loudnorm` con i valori misurati e `linear=true`, `-ar 48000`, uscita `out` (wav o m4a secondo estensione).
- Produces: `node render.mjs --mix [--loop=…] [--range=a:b] [--music=file] --out=file.wav`. Piano vuoto e nessuna musica → "nessun suono da mixare", codice 1.

- [ ] **Step 1: RED:** `node render.mjs --mix --loop=tall --out=out/t/tall.wav` → oggi "nothing to do" (nessun file).
- [ ] **Step 2: Implementare** `src/audio.js`, `music` in config, `--mix`, `renderMix`.
- [ ] **Step 3: Esempio:** `LOOPS.tall.sounds` come da spec (`oh_sorpresa` 1,3; `salto_boing` 2,8; `atterraggio_morbido` 3,3; `transizione_whoosh` 4,7 con `duck: false`; `amb_notte_grilli_loop` 0–5, fade 0,5 / 0,6).
- [ ] **Step 4: GREEN e misure:** `--mix --loop=tall --format=vertical --out=out/t/tall.wav` → file esistente; `ebur128=peak=true` → I −14 ±1, picco ≤ −1 dBTP; `ffprobe` → 48000 Hz, durata 5,0 s; tempo del comando annotato.
- [ ] **Step 5: Ducking reale:** musica di prova `ffmpeg -f lavfi -i sine=f=220:d=5 out/t/tone.mp3`; script di prova in `out/t/` che chiama `resolvePlan` + `levelGains` + `mixGraph` con il solo tono come musica e un sfx `[2.8, 'salto_boing', { vol: -120 }]` (inudibile, ma con `duck`), e scrive un wav **senza** `loudnorm`. `astats` su 0,6–1,0 s e su 2,9–3,3 s: RMS più basso di 6 ±0,5 dB nella seconda finestra.
- [ ] **Step 6: Errori:** `--mix` su un loop senza suoni → "nessun suono da mixare", codice 1; scena di prova con `'tonfo'` → errore con l'elenco, codice 1 prima di ffmpeg.
- [ ] **Step 7:** `npm test` PASS, `npm run check` → `OK 9/9 identici`.
- [ ] **Step 8: Commit** `src/audio.js studio.html src/config.js render.mjs tools/audio.mjs src/scenes/tall_example.js` — "Piano audio nella pagina, --mix e normalizzazione".

### Task 6: Audio nei video (`--clip`, `--encode`) e loop nel timbro

**Files:**
- Modify: `render.mjs` (rami `--clip` ed `--encode`), `tools/stamp.mjs` + `tools/stamp.test.mjs` (`loop`)

**Interfaces:**
- Consumes: `resolvePlan`, `levelGains`, `renderMix`.
- Produces: `--clip` e `--encode` preparano il mix in `out/tmp-mix.m4a` (AAC 48 kHz 192 kbps) e lo uniscono al video con `-map 0:v -map 1:a -c:a copy -shortest`; senza suoni né musica → video muto (Review Focus 3). `--encode` legge `loop` e `range` dal timbro per ricostruire il piano.
- Produces: timbro `{ style, draft, fps, format, loop }`; timbro vecchio senza `loop` → `''`.

- [ ] **Step 1: Test che falliscono** in `stamp.test.mjs`: `another loop blocks a resume`; `old stamp without loop counts as no loop`.
- [ ] **Step 2: RED reale:** `--clip --draft --loop=tall --format=vertical --out=out/t/v.mp4` → oggi nessuna traccia audio (`ffprobe -select_streams a`).
- [ ] **Step 3: Implementare.**
- [ ] **Step 4: GREEN:** `npm test` PASS; stesso comando → traccia AAC 48000 Hz, durata audio = video (±0,05 s), video `yuv420p,tv`; `--frames --draft --loop=tall --format=vertical` + `--encode` → stesso risultato senza ripassare `--loop`.
- [ ] **Step 5: Review Focus 3:** demo `--clip --draft --range=0:1` (nessun suono dichiarato) → nessuna traccia audio, codice 0.
- [ ] **Step 6:** `npm run check` → `OK 9/9 identici`.
- [ ] **Step 7: Commit** `render.mjs tools/stamp.mjs tools/stamp.test.mjs` — "Audio nei video e loop nel timbro".

### Task 7: Guida, README, ascolto di Andrea

**Files:**
- Modify: `ANIMATION_GUIDE.md` (sezione "Sound", righe nella tabella dei file, storyboard: riga `Sound:`), `README.md` (comandi CMD), spec (misure)

- [ ] **Step 1: Guida:** sezione "Sound": `sounds()` e `LOOPS.x.sounds`, tempi condivisi con l'animazione, variazioni automatiche, ambienti, musica e ducking, `vol`/`duck`, livelli di partenza, −14 LUFS, `--mix`, `voice` riservato; storyboard con una riga `Sound: ambience, key effects, music (optional)`; file `src/audio.js`, `tools/audio.mjs`, `assets/sfx/` nella tabella.
- [ ] **Step 2: README:** `--mix` e `--music`, un esempio CMD ciascuno.
- [ ] **Step 3: Video per Andrea:** `--clip --loop=tall --format=vertical --out=out/tall-vertical-audio.mp4` (qualità piena) e `--clip --draft --loop=tall --format=feed --out=out/tall-feed-audio.mp4`; misure (LUFS, picco, durata, formato) nella spec.
- [ ] **Step 4: Mostrare ad Andrea** e correggere livelli o tempi su sua indicazione, massimo due giri.
- [ ] **Step 5:** `npm test` PASS; `npm run check` → `OK 9/9 identici`.
- [ ] **Step 6: Commit** `ANIMATION_GUIDE.md README.md docs/superpowers/specs/2026-10-23-fase2b-audio-design.md` (+ file toccati nei giri di correzione) — "Guida all'audio e misure".
