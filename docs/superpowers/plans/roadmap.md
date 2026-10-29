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
| `cozy` | in design | 3a |
| `anime` | in design | 3a |
| `marker-comic` | da fare | 3b |
| `visual-novel` | da fare | 3b |

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
- **Tempo di lettura dei testi, con un controllo automatico** (idea da lemo-opuscar, MIT, solo idee): ogni testo resta
  a schermo almeno 1,8 s e mai meno della battuta parlata + 0,6 s; dopo l'animazione di entrata resta circa
  lettere ÷ 15 + 1,5 s; un titolo almeno 4 s. Un controllo legge i testi visibili a ogni istante e segnala quelli
  troppo brevi, come fa il loro `readcheck`.

## Fase 3 — Stili · **in design** (divisa in 3a e 3b, scelta di Andrea 2026-10-29)

- **3a** (branch `fase3a-stili`, spec `../specs/2026-10-29-fase3a-stili-design.md`): tecnica `cel` (colori piatti, ombra
  netta a mezzaluna, contorno costante), stili `cozy` e `anime`, set di luci dell'anime (giorno, notte, controluce).
- **Piccolezze dalla revisione finale della 3a** (2026-10-29), da fare quando servono:
  - `cel` ignora `curv` senza avviso: le bocche e la lente di Clawd escono come poligoni (appiattirle con `through()`);
  - la copia del canvas usa `ceil(w*zoom)` in sorgente e `w` in destinazione: fino a un pixel di scarto tra parti;
  - la risoluzione del canvas segue solo `CAM.zoom * DRAFT.scale` (un `scale()` della scena o uno zoom sopra 3 la ammorbidiscono);
  - i colori di un personaggio per una luce (`spec.styles.<stile>.luci.<luce>`) si saltano durante una miscela;
  - l'ombra calda della pelle ignora il colore di pelle dello stile (`spec.styles.<stile>.skin`);
  - le forme semitrasparenti con solo `fill` hanno l'ombra più opaca, e il bordo di luce è sempre opaco;
  - la larghezza della mezzaluna è proporzionale al lato maggiore: code e arti lunghi e sottili sono quasi tutta ombra;
  - alcuni test controllano solo dati di stile.
- **3b**: `marker-comic` (contorno che si ispessisce sul lato in ombra) e `visual-novel` (ombre a due toni), con i set di
  luci del visual-novel; vale e mara restano bozza fino a lì.

Descrizione generale della fase:

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
- **Set di colori per illuminazione** in `anime` e `visual-novel` (idea da lemo-opuscar, MIT, solo idee): ogni
  personaggio ha i suoi colori di giorno, di notte e in controluce (con un bordo di luce calda), ricavati dai ruoli e
  non un filtro sull'immagine; la pelle ha il suo colore in ogni set, così sotto le luci colorate non diventa rosa.

Da fissare nel design: quanto ciascuno può cambiare oltre a palette, pennelli e carta (per esempio forme più tonde
in `cozy` passano dalla tecnica, non dalle scene), il blocco `character` con cui ogni stile traduce i ruoli colore
dei personaggi, e i tempi di render in finale e in draft.

## Fase 4 — Creatore di personaggi · **4a, 4b1 e 4b2 chiuse**

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
  (`reference/characters/<id>/approvati/`, `npm run check-characters`). Unita in `main` (5833562), push fatto da
  Andrea.

### 4b. Bipede, strisciante e ali · divisa in due (scelta di Andrea, 2026-10-27)

#### 4b1. Bipede bambino, ali, strisciante · **chiusa** (2026-10-27, merge in main)

- Corpo **bipede** per bambini e ragazzi: ragazza (circa 3 teste, chibi morbido) e supereroe (circa 5,5 teste).
- **Ali** come parte aggiuntiva del quadrupede (draghetto: cammina a quattro zampe, vola con le ali).
- Corpo **strisciante** a segmenti (bruco: testa + 8 segmenti, avanzamento a onda).
- Supereroe, ragazza, draghetto e bruco, con model sheet approvati.
- Fatto (gatto v2): dalla vista dal retro la coda parte in basso al centro e fa l'uncino sopra la schiena.
- Approvati (2026-10-27): bruco, gatto v2, draghetto, ragazza, supereroe. Nota di Andrea sul draghetto: ali aperte più a pipistrello,
  con il bordo della membrana a festoni (archi tra le dita) invece che piatto.
- Piccolezze dalla revisione finale (2026-10-27), da fare quando servono:
  - ali del draghetto: con `wingOpen` intermedio e `flap`, di profilo la punta dell'ala vicina passa per un istante
    dietro la testa (la testa la copre: si vede la punta sparire);
  - `proportions.heads` del bipede è solo una misura dichiarata (l'altezza nasce dalla somma delle parti): validarla
    nella scheda, o ricavarne una parte;
  - `wings.sections` documentato ma fisso a 3; `span` sotto 0,6 rovescia l'ala: validare;
  - `skinShadow` del supereroe è nella tavolozza ma nessuna parte lo usa (ombra di collo e mento);
  - impronta del gatto v1 nel test: aggiungere ruolo, spessore, `dim` e `stroke` alla stringa;
  - "bipede senza extra" provato solo sulla ragazza: aggiungere il supereroe senza mantello, maschera, stella, guanti,
    stivali;
  - `fist` scatta a 0,5 (con `blendPose` la mano passa di colpo da aperta a pugno); `CG.block` con altezza 0 dà NaN.

#### 4b2. Bipede adulto per il visual novel · **chiusa** (2026-10-29, merge in main; vale e mara restano bozza)

Spec: `../specs/2026-10-28-fase4b2-personaggi-design.md`. Piano: `2026-10-28-fase4b2-personaggi.md`.


- Bipede adulto a **7–7,5 teste**, con le parti del viso separate (occhi, bocca, sopracciglia) da combinare nelle
  espressioni, come in `viso.png`.
- Vale e Mara (`reference/characters/vale/`, `mara/`), con model sheet approvati.
- Insieme al bipede adulto, perché migliora tutti i bipedi (note di Andrea, 2026-10-27):
  - arti morbidi e affusolati invece di tubi con giunture tonde; guanti e stivali più snelli e proporzionati;
  - frangia della ragazza: 3 ciocche vere invece della fila di smerli; la testa dal retro meno "a fungo";
  - capelli del supereroe da davanti più simili a un ciuffo che a una corona.
- Piccolezze dalla revisione finale della 4b2 (2026-10-29), da fare quando servono:
  - manica a sbuffo della ragazza: con il gomito tra 2,35 e 2,6 il contorno si incrocia (nessuna posa supera 2,2);
  - il filo della riga di mara manca nei mezzi busti (aggiungere `parting` al filtro del busto); la luce `clothLight`
    nello sheet del viso di mara è una striscia sottilissima;
  - `blink(NaN)` non termina: aggiungere un controllo `isFinite`;
  - validazione degli abiti: chiavi sconosciute e `remove` di un tratto inesistente passano in silenzio, gli errori della
    scheda base si ripetono con il prefisso `abito`;
  - `approve --check` dice "deriva" invece di "da approvare" se una scheda aggiunge `faceSheet` senza alzare la versione;
  - abito ufficio: la piega (#1C2440 su #292A34) è quasi invisibile e le gambe non hanno luce: guardare lo sheet.
- **Esito (Andrea, 2026-10-29):** ragazza v2 e supereroe v2 approvati (arti affusolati, frangia a 3 ciocche, ciuffo).
  **Vale e mara: bozza, non approvate**: la resa disegnata in codice è troppo lontana dai riferimenti del visual novel,
  e non si fanno altri giri di correzioni. Restano (`draft: true` nella scheda, `check-characters` stampa `bozza`):
  il codice del viso a parti (occhio adulto, bocche, sopracciglia), `blink` e `talk`, i gesti con `reachL/R`, l'abito
  `ufficio`, lo sheet `face_`, la figura adulta, i capelli lunghi. Differenze dai riferimenti (dalla autocritica):
  - viso: manca il naso, il contorno del viso sotto i capelli fa effetto "maschera", gli occhi sono più piccoli e più
    marcati (ciglia) che nei riferimenti: è il punto più lontano;
  - figura: bacino da 3/4 un po' a bulbo, spalle squadrate dove parte il braccio, mani semplici e dita aperte piccole;
  - capelli: la ciocca di vale è un'unica forma piena; mara ha ciocche ondulate con la luce ma un piccolo spigolo dove
    esce la massa dietro.
  Per portarle all'approvazione servirebbe un altro tipo di disegno (per esempio pannelli dipinti o immagini sulle
  parti del viso e del corpo) più che altri ritocchi alla geometria: da decidere con la Fase 3 (`visual-novel`).
- Corporatura di vale e mara come nei loro `base.png`, in parametri della scheda; l'abito ufficio di vale con la sua
  corporatura meno accentuata (Andrea, 2026-10-28).
- **Dopo la 4b2:** pose sedute, sdraiate e appoggiate al muro, insieme agli oggetti di scena (sgabello, divano, muro).

### Progetti · **fatta** (2026-10-29)

Una cartella `progetti/` con un video per sottocartella (`progetto.js` con durata, bpm, formato, stile, musica e file di scena; scene; storyboard), lanciabile con `node render.mjs --progetto=<nome>` o `studio.html?progetto=<nome>`, senza toccare `studio.html` né `src/config.js` per ogni video. Uscite in `out/<nome>/`. Il primo progetto è il reel di prova (`progetti/reel-gatto-mostro/`); il demo landscape resta com'è. Design approvato da Andrea il 2026-10-29.

### 4c. Pagina web dei personaggi · **da fare**

- Una pagina per creare e modificare le schede e vedere l'anteprima dal vivo, che salva lo stesso formato di scheda
  della libreria.

## Idee per la regia (ANIMATION_GUIDE) · **da fare, quando si tocca la guida**

Da lemo-opuscar (https://github.com/lemomo-ai/lemo-opuscar, MIT), solo idee, niente codice:

- **Trattamento scritto prima di disegnare**, oltre allo storyboard: shot list con il *perché* di ogni inquadratura,
  mappa del suono per sezione (ambiente, rumori, stato della musica), e un **riferimento** da cui imparare (ritmo,
  composizione, colori, camera) con scritto che cosa *non* prendere.
- **Silenzi** (veri o quasi) prima del momento chiave: il primo suono dopo il silenzio è uno dei più importanti.
- **Il suono come transizione**, almeno due volte: il suono della scena dopo entra prima del taglio (J-cut) o quello
  della scena prima continua oltre il taglio (L-cut).

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
