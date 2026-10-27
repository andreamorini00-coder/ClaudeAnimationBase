# Progetto anime — roadmap

Aggiornata il 2026-10-27. È il piano d'insieme: ogni fase, quando parte, ha il suo brainstorming, la sua spec in
`docs/superpowers/specs/` e il suo piano eseguibile in `docs/superpowers/plans/`.

Motore unico: ClaudeAnimationBase (p5.js + p5.brush). Da html-anime si prendono solo le regole di regia (shot sheet,
timing, camera, palette a ruoli), non GSAP né HyperFrames.

Regole che valgono per tutte le fasi:

- Comandi per Andrea in CMD. Nessun `git push`: i push li fa Andrea con GitHub Desktop.
- Ogni fase lavora in un branch suo e mostra il piano prima di scrivere codice.
- Lo stile `classic` resta identico al byte (`npm run check`) salvo decisione esplicita.
- Gli stili e i formati nuovi si approvano su sheet di confronto prima di chiuderli.

**Ordine delle prossime fasi** (scelta di Andrea, 2026-10-27): prima la **Fase 4** (creatore di personaggi), poi
la **Fase 3** (stili `cozy` e `anime`), poi la **2c** (testi e sottotitoli).

## Stili previsti

Sei, e nessun altro (i quattro nuovi decisi da Andrea il 2026-10-27):

| stile | stato | fase |
|---|---|---|
| `classic` | fatto | 1 |
| `acquerello-leggero` | fatto | 1 |
| `cozy` | da fare | 3 |
| `anime` | da fare | 3 |
| `marker-comic` | da fare | 3 |
| `visual-novel` | da fare | 3 |

## Fase 1 — STYLE, anteprima, acquerello leggero · **chiusa**

Piano: `2026-10-21-fase1-style-draft.md` · Spec: `../specs/2026-10-21-fase1-style-draft-design.md`

- Stili selezionabili da `src/config.js` o `--style=`, tecnica di disegno separata (`src/techniques/`).
- `--draft`: demo da 13 min 47 s a 25 s. Acquerello leggero: render finale in 67 s.
- Confronto byte per byte (`npm run check`), timbro della cartella fotogrammi, errori immediati per stili sbagliati.
- Unita in `main` (9ac23cf), push fatto da Andrea.

## Fase 2 — Social · **2a e 2b chiuse, 2c dopo le Fasi 4 e 3**

Tre sotto-progetti, ognuno con spec e piano suoi.

### 2a. Formati verticale 9:16 e feed 4:5 · **chiusa**

Branch `fase2a-verticale`. Spec: `../specs/2026-10-22-fase2a-formati-design.md`. Piano: `2026-10-22-fase2a-formati.md`.

- Formati: `landscape` 1920×1080, `vertical` 1080×1920 (reel e storie), `feed` 1080×1350 (post Instagram 4:5).
  Composti per il loro formato, mai ritagliati dal 16:9.
- Il formato si sceglie all'inizio di ogni video, prima di generarlo (scelta di Andrea): `PROJECT.format` in
  `config.js`, forzabile con `--format=` / `?format=`.
- Zone sicure social (Andrea): in 1080×1920 evitare ~220 px in alto, ~420 px in basso, ~140 px a destra. La fascia
  sottotitoli sta tra ~1150 e ~1500 px, non nel quinto basso (lì c'è la didascalia del social). Opzione per
  disegnare le zone sugli sheet di controllo, mai nel video finale.

### 2b. Audio: effetti, ambienti, musica · **chiusa**

Branch `fase2b-audio`. Spec: `../specs/2026-10-23-fase2b-audio-design.md`. Piano: `2026-10-23-fase2b-audio.md`.
Niente voce per ora (solo un campo riservato); effetti da `assets/sfx/`. Ascolto approvato da Andrea il 2026-10-26;
unita in `main` (21aca5c), push fatto da Andrea.

- La scena dichiara i suoni con i tempi dell'animazione: effetti con variazioni automatiche, ambienti in loop con
  dissolvenze, musica opzionale con ducking leggero sotto gli effetti importanti.
- Livelli di partenza per categoria, mix normalizzato a −14 LUFS, AAC 48 kHz; `--mix` per il solo audio.
- Video in `yuv420p` a gamma TV. Funziona con `--clip`, `--encode` e con il draft a 12 fps.

### 2c. Testi e sottotitoli · **da fare, dopo la Fase 3**

- Livello opzionale sopra il video, separato dalla scena dipinta, spento per default. La regola "No text"
  dell'ANIMATION_GUIDE resta valida per la scena.
- Posizione secondo il formato (nel 9:16, il quinto basso) e tempi allineati alla voce di 2b.
- Da decidere nel design: sottotitoli impressi da ffmpeg a partire da un `.srt`, oppure un livello di composizione
  sopra la grana.

## Fase 3 — Stili · **da fare, dopo la Fase 4**

**Si parte dai riferimenti di Andrea in `reference/styles/`** (mood board, palette e codici colore): il design di
ogni stile li legge prima di proporre valori. Per `marker-comic` e `visual-novel` i riferimenti arriveranno lì.

Quattro stili nuovi, ciascuno con uno sheet di confronto (stessi istanti della demo, accanto a `classic`) e con i
model sheet dei personaggi da approvare prima di chiuderlo. Se uno stile chiede un modo di disegnare diverso
dall'acquerello, si aggiunge una tecnica in `src/techniques/`, come previsto dalla Fase 1.

- **`cozy`:** palette calda e morbida, luce soffusa, forme tonde.
- **`anime`:** tratto pulito, ombra netta, colori vivi. Riferimento: le regole cel di html-anime (colore piatto,
  una sola ombra dura, linea esterna più spessa di quelle interne).
- **`marker-comic`:** campiture piatte, ombra netta, contorno che si ispessisce sul lato in ombra. Tecnica presa
  come idea da anidoodle (solo idee, niente codice).
- **`visual-novel`:** anime con proporzioni adulte, ombre a due toni morbide, fondali dipinti; l'animazione passa
  soprattutto dalle espressioni.

Da fissare nel design: quanto ciascuno può cambiare oltre a palette, pennelli e carta (per esempio forme più tonde
in `cozy` passano dalla tecnica, non dalle scene), il blocco `character` con cui ogni stile traduce i ruoli colore
dei personaggi, e i tempi di render in finale e in draft.

## Fase 4 — Creatore di personaggi · **4a chiusa, 4b prossima** (branch `fase4-personaggi`)

Una libreria di personaggi riusabile in tutti gli stili e in tutti i formati. Design approvato da Andrea il
2026-10-27: **viste chiave 2D parametriche** (fronte, 3/4, profilo, retro, come il model sheet di Clawd), niente
scheletro 3D proiettato. Clawd resta solo come demo: i nuovi personaggi non dipendono da lui.

**Si parte dai riferimenti di Andrea in `reference/characters/`** (model sheet, viste, espressioni, colori).

Principi comuni (dalle idee di anidoodle, solo idee, niente codice):

- **Scheda** per personaggio, solo dati: tipo di corpo, proporzioni in unità, parti con i loro parametri, colori per
  ruolo, tratti distintivi con le viste in cui compaiono, espressioni e pose dei riferimenti, versione. Le
  proporzioni stanno nella scheda, mai in `STYLE`.
- **Layout separato dal disegno:** una funzione pura dà le parti di una posa in una vista; il disegno le dipinge con
  la tecnica e lo stile attivi. I controlli automatici girano sul layout con `npm test`.
- **Palette a ruoli** che ogni stile traduce; **tratti distintivi** verificati in ogni vista, posa ed espressione;
  **model sheet automatico** da approvare una volta per personaggio e stile.

### 4a. Nucleo, quadrupede e blob: gatto e mostro · **chiusa**

Spec: `../specs/2026-10-27-fase4a-personaggi-design.md`. Piano: `2026-10-27-fase4a-personaggi.md`.

- Libreria, scheda, layout, disegno, transizioni di espressione, controlli, model sheet e approvazione.
- Corpo **quadrupede** (gatto) e **blob** (mostro: deformazione a volume costante, larghezza × altezza = 1).
- Gatto v1 e mostro v2 approvati da Andrea il 2026-10-27 in `classic` e `acquerello-leggero`
  (`reference/characters/<id>/approvati/`, `npm run check-characters`). Unita in `main` in locale, push da fare.

### 4b. Bipede, strisciante e ali · **prossima, dopo il push della 4a**

- Corpo **bipede**, con proporzioni da chibi (ragazza, circa 3 teste) fino ad adulte (circa **7 teste**, per i
  personaggi di `visual-novel`); il supereroe è a circa 5,5 teste.
- Corpo **strisciante** a segmenti (bruco: testa + 8 segmenti, avanzamento a onda).
- **Ali** come parte aggiuntiva del quadrupede (draghetto).
- Supereroe, ragazza, draghetto e bruco, più gli adulti Vale e Mara (`reference/characters/vale/`, `mara/`), con
  model sheet approvati.
- Da rivedere insieme al draghetto (nota di Andrea, 2026-10-27): nella vista dal retro del gatto la coda sale lungo
  il fianco e sembra un manico. Accettata per ora.

### 4c. Pagina web dei personaggi · **da fare**

- Una pagina per creare e modificare le schede e vedere l'anteprima dal vivo, che salva lo stesso formato di scheda
  della libreria.

## Piccolezze rimandate

Trovate nelle revisioni finali e lasciate per dopo (scelta di Andrea). Nessuna rompe un render normale; si
riprendono quando una fase tocca quel punto o in un giro di pulizia.

Dalla Fase 1:

- `--strip --draft` avanza a 12 fps, quindi mostra un fotogramma sì e uno no, anche se l'uso dice "EVERY frame".
- `--recycle` senza numero diventa 1 (riapre la pagina a ogni fotogramma); `--draft=` vuoto spegne il draft senza
  avvisare.
- In `studio.html` aperto a mano, uno `?style=` sbagliato si vede solo in console, non nella pagina.

Dalla Fase 2b:

- `out/tmp-mix.m4a` ha un nome fisso: due render lanciati insieme si pestano i piedi.
- `out/audio-cache.json` non è scritto in modo atomico: un file troncato rompe i render successivi finché non lo si
  cancella.
- I nomi di suono sbagliati vengono segnalati solo da `--encode`, non già da `--frames`.
- Un effetto subito prima dell'inizio di `--range` non abbassa la musica che prosegue dentro lo spezzone.
- Un file usato sia come effetto sia come ambiente riceve un solo livello di categoria.
- `--encode` dopo `--frames --range` mixa l'intervallo [0, fotogrammi/fps] (vale il limite già noto sulla
  numerazione dei fotogrammi).
- L'espressione del ducking cresce di ~70 caratteri per effetto: con centinaia di effetti si rischia il limite di
  lunghezza della riga di comando di Windows.

Dalla Fase 4a:

- `character()` senza `t` usa 0: coda, antenne e cicli di corsa restano fermi senza avviso (la guida dice di passare
  sempre `t`).
- Il ritardo delle antenne chiede `since` (secondi dal cambio) e `kick` a mano: un tempo assoluto o un `kick`
  dimenticato non fanno nulla; il quadrupede li ignora. `act()` conosce già i tempi e potrebbe restituirli.
- `act(t, [], …)` o `act(t, keys, 'gatto')` (l'id invece della scheda) danno un errore poco chiaro.
- Forme di occhi e bocche nella scheda (`mouth: 'smille'`) si controllano solo al disegno, non alla validazione.
- `tools/approve.mjs`: se un render fallisce resta una cartella temporanea; con `approvati.json` ma un PNG mancante
  esce con uno stack trace invece di un messaggio.
- `act` e `character` sono nomi globali generici: una scena con `const act = …` di primo livello andrebbe in errore.
- In `studio.html` aperto a mano, un errore a metà fotogramma lascia un `push()` senza `pop()` (già così prima).
- `render.mjs` aspetta la pagina con `networkidle0`, che include il font di Google: due volte il 27/10 il caricamento è
  andato in timeout (30 s) e il comando è caduto; rilanciato, passa. Un font locale o un'attesa più tollerante lo
  eviterebbero.
