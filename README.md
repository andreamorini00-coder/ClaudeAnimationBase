# Claude Animation Base

Un kit per fare animazioni dipinte a mano con [p5.js](https://p5js.org) e [p5.brush](https://github.com/acamposuribe/p5.brush), pensato per lavorare insieme a Claude Code (o a un altro agente di programmazione). Dentro ci sono il motore di disegno e di rendering, la guida con le regole di regia, quattro stili, una libreria di personaggi, il sistema audio, i formati per i social e un livello di testi e sottotitoli con il controllo del tempo di lettura.

Il punto di partenza è il kit Claude Animation Base, ricavato dal codice del video musicale «I'm Upping My P(doom)» ([repository originale](https://github.com/JohnHeibel/PDoomVideo)) e da un'analisi di che cosa il modello fa bene e male. Questa versione lo estende: gli stili `cozy` e `anime`, una libreria di personaggi, i formati verticale e feed, l'audio, i testi e i sottotitoli. Il personaggio originale, Clawd, c'è ancora.

![Le emozioni di Clawd, animate](docs/emotions.webp)

## Indice

1. [Installazione](#installazione)
2. [Fare un video](#fare-un-video)
3. [I comandi di render](#i-comandi-di-render)
4. [Gli stili](#gli-stili)
5. [I personaggi](#i-personaggi)
6. [I formati](#i-formati)
7. [L'audio](#laudio)
8. [Testi e sottotitoli](#testi-e-sottotitoli)
9. [I progetti](#i-progetti)
10. [Controlli e test](#controlli-e-test)
11. [Che cosa c'è dove](#che-cosa-cè-dove)
12. [Licenze](#licenze)

## Installazione

Servono tre cose installate sul computer:

- **Node.js** (provato con la versione 24);
- **Google Chrome** (il rendering usa Chrome senza finestra);
- **ffmpeg**, nel `PATH`, per montare video e audio.

Poi, dalla cartella del progetto:

```bash
npm install
```

Se Chrome non è in un posto standard, passa `--chrome=<percorso>` a ogni comando oppure imposta la variabile `CHROME_PATH`. Su Linux `render.mjs` avvia Chrome con `--no-sandbox` (Ubuntu 23.10 e successivi bloccano la sandbox in modalità senza finestra) e trova anche un Chromium installato da Playwright. Senza scheda video, `--soft-gl` fa il rendering WebGL in software: lento sugli acquerelli, ma funziona. Su una macchina Linux senza schermo con una GPU NVIDIA (un nodo cloud) usa `--gpu-angle=gl-egl` (o `vulkan`); `node gpu_probe.mjs <percorso di Chrome>` mostra quale scheda ottiene ogni combinazione.

**Tempi.** Senza una scheda video dedicata gli acquerelli di p5.brush sono lenti, secondi per fotogramma. Gli stili `cozy` e `anime` (tecnica `cel`, colore piatto) costano circa un terzo di `acquerello-leggero`. Per un'anteprima veloce c'è `--draft` (vedi sotto).

## Fare un video

Apri la cartella in Claude Code e chiedi quello che vuoi:

> Leggi ANIMATION_GUIDE.md, poi fai un video di 15 secondi di Clawd che cerca di prendere una farfalla.

Il modello prima fa lo storyboard, poi costruisce una scena alla volta, controlla il proprio lavoro con fogli di contatto e scrive `out/video.mp4`. [ANIMATION_GUIDE.md](ANIMATION_GUIDE.md) (in inglese) contiene le regole che segue: fatto a mano, vivo, un solo pezzo, niente testo dipinto, transizioni sempre, in ogni scena succede qualcosa, un mezzo solido di pennellate, 2D piatto e linee che «bollono». Spiega anche il tempo per lo spettatore e i principi base dell'animazione dei personaggi, e descrive tutta l'API.

Per vedere subito qualcosa: `node render.mjs --clip --draft --out=out/draft.mp4` rende la demo di 11 secondi in [src/scenes/demo.js](src/scenes/demo.js). Apri [studio.html](studio.html) in Chrome per scorrere il video con il cursore; con `?loop=emotions` o `?loop=views` si vedono i fogli di modello di Clawd, con `?t=2.5` si salta a un istante.

## I comandi di render

Tutto passa da `render.mjs`. I comandi più usati:

| cosa vuoi | comando |
|---|---|
| il video finito (MP4) | `node render.mjs --clip --out=out/video.mp4` |
| un'anteprima veloce (12 fps, riempimenti piatti) | `node render.mjs --clip --draft --out=out/draft.mp4` |
| un foglio di contatto di certi istanti | `node render.mjs --sheet=0.5,1,1.5,2 --cols=4 --out=out/check/a.jpg` |
| ogni fotogramma di un tratto (il movimento) | `node render.mjs --strip=2.0:2.5 --out=out/check/strip.jpg` |
| ritagli a piena risoluzione (facce, mani, contatti) | `node render.mjs --sheet=2.1,2.2 --crop=760,300,400,400 --w=600 --out=out/check/faccia.jpg` |
| immagini singole a piena risoluzione | `node render.mjs --stills=1.2,3.4 --out=out/stills` |
| solo un tratto del video | aggiungi `--range=2:6` (per `--clip`, `--frames`, `--mix`) |
| fotogrammi JPEG in parallelo, poi MP4 | `node render.mjs --frames --workers=4` poi `node render.mjs --encode --out=out/video.mp4` |
| un ciclo come PNG (per le GIF) | `node render.mjs --loop=emotions --png --out=out/loop_emotions` |
| solo l'audio, senza disegnare | `node render.mjs --mix --out=out/mix.wav` |

Opzioni che valgono quasi ovunque:

- `--style=<nome>`: lo stile (`classic`, `acquerello-leggero`, `cozy`, `anime`); altrimenti quello di `src/config.js`.
- `--format=landscape|vertical|feed`: il formato (vedi [I formati](#i-formati)); `--safe` disegna le zone sicure dei social su fogli, strisce e immagini (mai in un video).
- `--loop=<nome>`: mostra un ciclo autonomo (fogli di modello, prove) al posto del video.
- `--progetto=<nome>`: usa un progetto della cartella `progetti/` (vedi [I progetti](#i-progetti)); i risultati vanno in `out/<nome>/`.
- `--draft` (12 fps, colore piatto; `--draft=flat,half` anche a metà risoluzione): mai per il video finale. Sulla demo con acquerelli, su grafica integrata, passa da circa 14 minuti a circa 25 secondi.
- `--music=assets/music/brano.mp3`: una musica che si abbassa sotto gli effetti.
- `--fps=24`, `--recycle=N` (riapre la pagina ogni N fotogrammi), `--chrome=<percorso>`, `--soft-gl`, `--gpu-angle=...`.

L'elenco completo, con esempi, è nell'intestazione di [render.mjs](render.mjs).

## Gli stili

Uno stile decide come appare il film, non che cosa succede: i colori dietro `PAL`, la carta, la grana, i pennelli e il ritmo del «boil» (la linea che respira). Ogni stile è un file in [src/styles/](src/styles/). Si sceglie con `style` in [src/config.js](src/config.js) o con `--style=`, e `studio.html?style=nome` permette di confrontarli senza modificare file.

| stile | com'è | tecnica |
|---|---|---|
| `classic` | l'originale: carta, acquerelli e inchiostro a pennello, il riferimento che deve restare identico al byte | `watercolor` |
| `acquerello-leggero` | un acquerello chiaro: la palette di `classic` stemperata verso una carta più pallida, colore piatto al posto di quasi tutti i riempimenti (più rapido), inchiostro più leggero che si legge ancora sul telefono | `watercolor` |
| `cozy` | caldo e morbido: carta leggera, un'ombra color tortora, contorno più tondo; sempre di giorno | `cel` |
| `anime` | vivace, senza texture di carta, contorno esterno più spesso di quelli interni, un'unica ombra netta viola ardesia (pesca sulla pelle) | `cel` |

- **La tecnica `cel`** (cozy, anime) dipinge colore piatto con **una sola ombra dura** a mezzaluna sul lato lontano dalla luce e un **contorno pulito di spessore costante**. Una forma senza contorno (un cielo, un prato) non ha ombra; `shade: false` la spegne, `shade: true` la forza.
- **Le luci dell'anime.** `luce('giorno' | 'notte' | 'controluce')` all'inizio di un'inquadratura mette tutto il fotogramma in quella luce: riscrive `PAL`, i colori dei personaggi (ogni ruolo mescolato verso il tono della luce; la pelle prende il suo colore, così sotto le luci colorate non diventa rosa; contorno e bianchi degli occhi non cambiano) e, nel controluce, un **bordo di luce** calda. `luce('giorno', 'notte', k)` mescola due luci (un tramonto).
- **Per fare uno stile nuovo:** copia `classic.js` (documenta ogni campo), cambia i valori, aggiungi il tag `<script>` in `studio.html`. I nomi di `PAL` restano gli stessi: le scene li usano.
- Le proporzioni dei personaggi non fanno parte dello stile; i colori sì, tradotti dai ruoli (`STYLE.character`).
- `classic` resta identico al byte: `npm run check` lo verifica ad ogni modifica.

## I personaggi

Oltre a Clawd, `src/characters/` contiene una libreria di personaggi costruita sui fogli di modello in `reference/characters/`. Ogni personaggio è un file di dati (proporzioni, parti, ruoli di colore, tratti distintivi, espressioni e pose); il suo tipo di corpo lo disegna.

| personaggio | corpo | stato |
|---|---|---|
| `gatto` | quadrupede | approvato in tutti e quattro gli stili |
| `mostro` | blob | approvato |
| `bruco` | strisciante | approvato |
| `draghetto` | quadrupede con ali | approvato |
| `ragazza` | bipede (3 teste) | approvata |
| `supereroe` | bipede (5,5 teste) | approvato |
| `vale`, `mara` | bipede adulto (7,5 teste) con volto a parti | bozze, non ancora approvate |

```js
character('gatto', x, y, u, { view: 'q', pose: 'corsa', expression: 'felice', t: lt });
character('mostro', x, y, u, { view: 'front', expression: act(lt, [[0, 'felice'], [1.2, 'sorpreso']], CHARACTERS.mostro) });
```

`(x, y)` è il punto a terra sotto il personaggio, `u` la sua unità di misura; `view` è `front`, `q` (tre quarti), `side` o `back` (`flip: true` guarda a sinistra). Passa sempre `t`: code, antenne e cicli di corsa si muovono con il tempo. Le espressioni cambiano con `act()`, che socchiude gli occhi nel passaggio e dà al corpo un piccolo scatto.

**Fogli di modello.** Ogni personaggio ha `LOOPS.sheet_<id>` (viste, espressioni, sagoma, colori) e `LOOPS.pose_<id>` (pose); gli adulti anche `LOOPS.face_<id>`. Si rendono così:

```bash
node render.mjs --loop=sheet_gatto --stills=0 --style=cozy --out=out/sheets/gatto
```

**Approvazioni.** Ogni personaggio si approva una volta per stile e poi si tiene d'occhio che non «derivi»:

```bash
node tools/approve.mjs gatto cozy     # rende e conserva i fogli approvati in reference/characters/gatto/approvati/
npm run check-characters               # per ogni personaggio e stile: ok, da approvare, deriva, altra GPU, bozza
```

I colori dei personaggi non cambiano mai da soli: li traduce lo stile. Le schede dei personaggi (quindi la loro `version`) non si toccano per cambiare uno stile.

## I formati

Il formato si sceglie prima di disegnare e la scena si compone per quel formato; **mai ritagliare un 16:9 in un fotogramma verticale**.

| formato | dimensioni | per | margini coperti dall'app (sopra / sotto / sinistra / destra) | fascia sottotitoli (y) |
|---|---|---|---|---|
| `landscape` | 1920×1080 | YouTube | nessuno | 76%–94% dell'altezza |
| `vertical` | 1080×1920 | reel, storie, TikTok, Shorts | 220 / 420 / 0 / 140 | 1150–1500 |
| `feed` | 1080×1350 | post Instagram (4:5) | 60 / 60 / 100 / 100 | 940–1170 |

Si sceglie con `format` in `src/config.js` o con `--format=`. Una scena dichiara per quali formati è composta (`shots([...], { format: 'vertical' })`, o `LOOPS.nome.format`); renderla in un altro formato si ferma con un errore invece di produrre un video inquadrato male. Le zone sicure si leggono da `SAFE` (non a mano). Per controllare l'inquadratura:

```bash
node render.mjs --loop=tall --format=vertical --sheet=1,2,3 --safe --out=out/check/safe.jpg
```

Rosso = margini coperti dall'app, giallo = fascia sottotitoli, linea rossa = centro sicuro.

## L'audio

I fotogrammi si disegnano in parallelo e fuori ordine, quindi un suono non può partire «mentre si disegna»: la scena elenca i suoi suoni una volta, **sugli stessi tempi dell'animazione**, e `render.mjs` li mixa in `--clip` e `--encode`:

```js
sounds({
  sfx: [[tLand, 'caduta_tonfo'], [tJump, 'salto_boing', { vol: -3 }], [4.7, 'transizione_whoosh', { duck: false }]],
  ambience: [{ name: 'amb_notte_grilli_loop', from: 0, to: 11, fadeIn: .5, fadeOut: .8 }],
  music: { file: 'assets/music/brano.mp3', vol: 0 },
});
```

- Gli effetti vengono da [assets/sfx/](assets/sfx/) (59 file; le licenze sono in `assets/sfx/licenze.md`): il nome si scrive **senza** numero e le ripetizioni prendono `_01`, `_02`, `_03` a turno.
- Gli ambienti girano in anello tra `from` e `to` con dissolvenze; la musica si abbassa di 6 dB sotto ogni effetto (salvo `duck: false`).
- Livelli: ogni file è portato al livello della sua categoria (effetti −18, ambienti −30, musica −20 LUFS); il mix finale è normalizzato a **−14 LUFS, −1 dBTP, AAC 48 kHz**; il video esce in `yuv420p` a gamma TV, come lo vogliono i social.
- Per ascoltare senza disegnare: `node render.mjs --mix --loop=tall --format=vertical --out=out/check/tall.wav`.
- La **voce** è un campo riservato per una versione futura e per ora ferma il render.

Per usare una musica: imposta `bpm` (e `offset`, il primo tempo forte in secondi) in `src/config.js`, così idle, balli e `pulse()` si agganciano al brano; mettilo in `assets/` e indicalo con `PROJECT.music` o `--music=`.

## Testi e sottotitoli

Un livello **opzionale**, disegnato dalla pagina **sopra il fotogramma finito e sopra la grana**, separato dalla scena dipinta e **spento di default** (senza `testi()` il video non cambia di un byte). La regola «niente testo» della guida resta valida per la scena; questo livello serve per sottotitoli e titoli, mai per spiegare ciò che l'immagine già mostra.

```js
testi([
  { da: 0.3, a: 4.3, testo: 'Il gatto e il mostro', tipo: 'titolo' },
  { da: 1.2, a: 4.2, testo: 'Ma dov\'è finito?', battuta: 1.9 },     // tipo 'sottotitolo' è il predefinito
]);
```

- Campi: `da` e `a` (secondi), `testo`, `tipo` (`sottotitolo` o `titolo`), `battuta` (secondi di battuta parlata, opzionale). Un ciclo li dichiara come `LOOPS.nome.testi`.
- **Aspetto.** Sottotitoli in Atkinson Hyperlegible Bold (66 / 81 / 75 px in 16:9 / verticale / feed) nella fascia sottotitoli del formato, al massimo su due righe; titoli in Permanent Marker (88 / 108 / 100 px) in alto, al massimo su tre righe. Targa dell'inchiostro dello stile al 72% con testo del colore della carta, **centrata sul fotogramma**; le righe sono **bilanciate** (di lunghezza simile, senza articoli o preposizioni a fine riga); un titolo non scende sotto l'85% del suo corpo. Dissolvenza di 0,2 s. Solo caratteri locali (in `assets/fonts/`, con le licenze): un carattere che il font non ha viene segnalato dal controllo.
- **Controllo del tempo di lettura.** Ogni testo resta a schermo almeno 1,8 s; mai meno della battuta + 0,6 s; dopo la dissolvenza almeno lettere ÷ velocità + 1,5 s; un titolo almeno 4 s. La velocità è di **15 lettere al secondo** (`--lettura=base`, predefinita) o **13** per i bambini (`--lettura=bambini`, oppure `lettura: 'bambini'` nella scheda del progetto). Il controllo segnala anche sottotitoli sovrapposti, testi oltre la fine del video e testi che non entrano.
- Ogni render con testi **avvisa** all'inizio dei problemi trovati, senza fermarsi. Per controllare senza disegnare:

```bash
node render.mjs --progetto=prova-testi --controlla-testi                    # esce con codice 1 se trova problemi
node render.mjs --progetto=prova-testi --controlla-testi --lettura=bambini
node render.mjs --progetto=prova-testi --srt                                 # scrive out/prova-testi/sottotitoli.srt
```

- `--srt` scrive i soli sottotitoli (non i titoli) in `.srt`, che Instagram, TikTok e YouTube accettano come sottotitoli caricati a parte.
- `progetti/prova-testi/` è un reel verticale di prova con un titolo e due sottotitoli.

## I progetti

Un video per cartella in `progetti/`, così un secondo video non tocca mai `studio.html` né `src/config.js`:

```
progetti/mio-video/
  progetto.js      window.PROGETTO = { duration, bpm, offset, style, format, music, lettura, scene: ['scena.js'] }
  scena.js         la scena (e i suoi sounds() e testi())
```

```bash
node render.mjs --progetto=mio-video --clip --draft
```

I progetti già presenti: `reel-gatto-mostro` (un reel verticale di 12 secondi), `prova-stili` (gli stessi secondi in qualunque stile, per confrontare aspetto e tempi, più cicli di prova per contorni, luci e testi) e `prova-testi`.

## Controlli e test

```bash
npm test                  # i test (Node): stili, luci, personaggi, audio, testi, progetti
npm run check             # 9 immagini di riferimento di classic: devono restare identiche al byte
npm run check-characters  # i fogli dei personaggi approvati: ok, deriva, da approvare, bozza
```

Lanciali **uno alla volta**: aprono tutti Chrome e in parallelo si rallentano fino al timeout. `npm run ref` rigenera le immagini di riferimento di `check` quando un cambiamento di `classic` è voluto. I byte delle immagini dipendono dalla scheda video e dal driver: le approvazioni registrano la GPU con cui sono state fatte.

## Che cosa c'è dove

| percorso | che cos'è |
|---|---|
| [ANIMATION_GUIDE.md](ANIMATION_GUIDE.md) | Le regole, il metodo di lavoro e tutta l'API (in inglese). Si legge per prima. |
| [render.mjs](render.mjs) | Il renderer senza finestra: fogli di contatto, strisce, ritagli, immagini, MP4, controllo dei testi |
| [studio.html](studio.html) | Si apre in Chrome per scorrere il video |
| [src/core.js](src/core.js) | Disegno, tempo, movimento, camera, luce, carta |
| [src/clawd.js](src/clawd.js) | Clawd: viste, emozioni, occhi, bocche, cappelli, balli |
| [src/timeline.js](src/timeline.js) | Inquadrature, cicli e transizione a pennellata |
| [src/config.js](src/config.js) | Durata, tempo, stile, formato, velocità di lettura |
| [src/styles/](src/styles/) e [src/techniques/](src/techniques/) | Gli stili e le tecniche (`watercolor`, `cel`) |
| [src/lighting.js](src/lighting.js) | Le luci (giorno, notte, controluce) |
| [src/characters/](src/characters/) | La libreria dei personaggi, i corpi e i fogli di modello |
| [src/audio.js](src/audio.js), [tools/audio.mjs](tools/audio.mjs) | I suoni di una scena e il mix |
| [src/testi.js](src/testi.js), [tools/testi.mjs](tools/testi.mjs) | I testi e il controllo del tempo di lettura |
| [src/scenes/](src/scenes/) | Le scene di esempio (la demo non va copiata) |
| [progetti/](progetti/) | I video, uno per cartella |
| [assets/](assets/) | Effetti sonori e caratteri, con le licenze |
| [reference/](reference/) | Mood board e note degli stili, fogli di modello e approvazioni dei personaggi |
| [docs/](docs/) | Fogli di modello di Clawd e il materiale di progettazione (specifiche e piani di ogni fase, roadmap) |

## Licenze

Il codice è sotto licenza MIT ([LICENSE](LICENSE)). I caratteri hanno la loro licenza accanto ai file in [assets/fonts/](assets/fonts/): Permanent Marker (Apache 2.0) e Atkinson Hyperlegible (SIL OFL 1.1). Gli effetti sonori hanno le loro in `assets/sfx/licenze.md`.
