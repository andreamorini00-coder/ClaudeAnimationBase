# Progetto anime — roadmap

Aggiornata il 2026-10-22. È il piano d'insieme: ogni fase, quando parte, ha il suo brainstorming, la sua spec in
`docs/superpowers/specs/` e il suo piano eseguibile in `docs/superpowers/plans/`.

Motore unico: ClaudeAnimationBase (p5.js + p5.brush). Da html-anime si prendono solo le regole di regia (shot sheet,
timing, camera, palette a ruoli), non GSAP né HyperFrames.

Regole che valgono per tutte le fasi:

- Comandi per Andrea in CMD. Nessun `git push`: i push li fa Andrea con GitHub Desktop.
- Ogni fase lavora in un branch suo e mostra il piano prima di scrivere codice.
- Lo stile `classic` resta identico al byte (`npm run check`) salvo decisione esplicita.
- Gli stili e i formati nuovi si approvano su sheet di confronto prima di chiuderli.

## Stili previsti

Quattro, e nessun altro:

| stile | stato | fase |
|---|---|---|
| `classic` | fatto | 1 |
| `acquerello-leggero` | fatto | 1 |
| `cozy` | da fare | 3 |
| `anime` | da fare | 3 |

## Fase 1 — STYLE, anteprima, acquerello leggero · **chiusa**

Piano: `2026-10-21-fase1-style-draft.md` · Spec: `../specs/2026-10-21-fase1-style-draft-design.md`

- Stili selezionabili da `src/config.js` o `--style=`, tecnica di disegno separata (`src/techniques/`).
- `--draft`: demo da 13 min 47 s a 25 s. Acquerello leggero: render finale in 67 s.
- Confronto byte per byte (`npm run check`), timbro della cartella fotogrammi, errori immediati per stili sbagliati.
- Unita in `main` (9ac23cf), push fatto da Andrea.

## Fase 2 — Social · **in design**

Tre sotto-progetti, in quest'ordine (scelta di Andrea): ognuno con spec e piano suoi.

### 2a. Formati verticale 9:16 e feed 4:5 · **design approvato, in corso**

Branch `fase2a-verticale`. Spec: `../specs/2026-10-22-fase2a-formati-design.md`. Piano: `2026-10-22-fase2a-formati.md`.

- Formati: `landscape` 1920×1080, `vertical` 1080×1920 (reel e storie), `feed` 1080×1350 (post Instagram 4:5).
  Composti per il loro formato, mai ritagliati dal 16:9.
- Il formato si sceglie all'inizio di ogni video, prima di generarlo (scelta di Andrea): `PROJECT.format` in
  `config.js`, forzabile con `--format=` / `?format=`.
- Zone sicure social (Andrea): in 1080×1920 evitare ~220 px in alto, ~420 px in basso, ~140 px a destra. La fascia
  sottotitoli sta tra ~1150 e ~1500 px, non nel quinto basso (lì c'è la didascalia del social). Opzione per
  disegnare le zone sugli sheet di controllo, mai nel video finale.

### 2b. Audio: musica e voce

- Più tracce unite al video da `render.mjs` con ffmpeg (oggi ce n'è una sola: `--audio` / `PROJECT.audio`).
- Volume per traccia e abbassamento automatico della musica sotto la voce.
- Funziona con `--clip`, `--encode` e con il draft a 12 fps.

### 2c. Testi e sottotitoli

- Livello opzionale sopra il video, separato dalla scena dipinta, spento per default. La regola "No text"
  dell'ANIMATION_GUIDE resta valida per la scena.
- Posizione secondo il formato (nel 9:16, il quinto basso) e tempi allineati alla voce di 2b.
- Da decidere nel design: sottotitoli impressi da ffmpeg a partire da un `.srt`, oppure un livello di composizione
  sopra la grana.

## Fase 3 — Stili · **da fare**

**Si parte dai riferimenti di Andrea in `reference/styles/`** (mood board, palette e codici colore): il design di
ogni stile li legge prima di proporre valori.

Due stili nuovi, ciascuno con uno sheet di confronto (stessi istanti della demo, accanto a `classic`) da approvare
prima di chiuderlo. Se uno stile chiede un modo di disegnare diverso dall'acquerello, si aggiunge una tecnica in
`src/techniques/`, come previsto dalla Fase 1.

- **`cozy`:** palette calda e morbida, luce soffusa, forme tonde.
- **`anime`:** tratto pulito, ombra netta, colori vivi. Riferimento: le regole cel di html-anime (colore piatto,
  una sola ombra dura, linea esterna più spessa di quelle interne).

Da fissare nel design: quanto ciascuno può cambiare oltre a palette, pennelli e carta (per esempio forme più tonde
in `cozy` passano dalla tecnica, non dalle scene) e i tempi di render in finale e in draft.

## Fase 4 — Creatore di personaggi · **da fare**

Una libreria di personaggi riusabile in tutti e quattro gli stili e in entrambi i formati.

**Si parte dai riferimenti di Andrea in `reference/characters/`** (model sheet, viste, espressioni, colori): la scheda
JSON e i tipi di corpo si progettano su quei personaggi.

- **Scheda JSON** per personaggio:
  - colori per ruolo (pelle o pelliccia, capelli, vestiti, linea, ombra…), che ogni stile traduce nella sua palette;
  - tipo di corpo: bipede, quadrupede, blob, volante, strisciante;
  - parti aggiungibili: coda, corna, ali, orecchie;
  - espressioni e viste (fronte, 3/4, profilo, retro, come il model sheet di Clawd).
- Deve coprire persone, animali, dinosauri e mostriciattoli.
- **Model sheet automatico** per ogni personaggio, in ogni stile, per controllare che resti "on model".
- **Pagina web** per creare e modificare i personaggi e vedere l'anteprima dal vivo.
- **Libreria** in una cartella del repo, usabile dalle scene con una funzione generica sul modello di `clawd()`.
- Le proporzioni del personaggio stanno nella scheda, mai in `STYLE`.

Nota di Andrea (2026-10-22): il draghetto in `reference/characters/draghetto/` dimostra che "volante" può essere un
corpo quadrupede con le ali come parte aggiuntiva, invece di un tipo di corpo a sé. Da valutare nel design.

Da fissare nel design: come Clawd diventa una scheda della libreria, quanta animazione (camminata, emozioni) è
condivisa tra tipi di corpo diversi, e il formato dei file della libreria.
