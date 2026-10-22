# Fase 1 — STYLE selezionabile, anteprima veloce, stile "acquerello leggero"

Data: 2026-10-21 · Branch: `fase1-style-draft` · Stato: design approvato, spec in revisione

## Obiettivo

ClaudeAnimationBase diventa il motore unico del progetto anime. Da html-anime si prendono solo le regole di regia
(shot sheet, timing, camera, palette a ruoli), non GSAP né HyperFrames. Questa fase prepara il motore a più stili e
rende il lavoro sostenibile su questo PC, dove il render è lento.

Criteri di successo:

1. Tutti i valori di stile oggi scritti in `src/core.js` stanno in un oggetto `STYLE`, scelto da `src/config.js`.
   Con lo stile `classic` i fotogrammi sono **identici byte per byte** a quelli di prima del refactor.
2. `node render.mjs --clip --draft` renderizza la demo (11 s) in **meno di 120 s** su questo PC, misurati dal lancio
   del comando alla scrittura dell'mp4.
3. Esiste lo stile `acquerello-leggero`: più chiaro, più trasparente e più economico da renderizzare. La demo è
   renderizzata con questo stile sia in anteprima sia in qualità finale, e il tempo del render finale è scritto
   in questa spec (sezione "Misure").

Fuori scope: le proporzioni dei personaggi (chibi, bean, rubber hose…), che andranno nella scheda personaggio della
Fase 3; tecniche diverse dall'acquerello (l'interfaccia le prevede, ma non se ne implementa nessuna); il porting delle
regole di regia di html-anime.

## Contesto misurato

- Hardware: Acer Aspire AG15-71P, i5-1334U, **solo GPU integrata Intel UHD** (nessuna GPU dedicata, neanche
  disattivata). Chrome headless usa ANGLE/D3D11 sulla Intel UHD.
- Render via CPU (`--soft-gl`, SwiftShader): ~60 s per fotogramma contro ~1,5 s della Intel UHD. Escluso.
- Demo attuale, `--clip` completo: 264 fotogrammi in **826 s** (13 min 47 s).
- Lo stesso fotogramma costava ~1,5 s in una pagina appena aperta e ~3 s dopo 100+ fotogrammi nella stessa pagina.
  **Smentito dalle misure del Task 2** (2026-10-22): `--clip --range=0:6` (144 fotogrammi) senza riapertura resta
  stabile a ~1,4 s per fotogramma, 210 s in tutto; con riapertura ogni 24 o 48 fotogrammi ci mette 245 s e 241 s.
  La riapertura resta disponibile (`--recycle=N`) ma è spenta per default. Il primo render probabilmente pagava il
  PC usato in parallelo per altro. I run di misura del 21/10 interrotti erano dovuti allo standby del PC.
- Il render è deterministico: due render dello stesso fotogramma producono PNG identici byte per byte (verificato a
  t = 2,0 e 6,5). Questo rende possibile la verifica esatta del punto 1.

## Design

### 1. Stili: `src/styles/*.js` e `STYLE`

Ogni stile è un file in `src/styles/` caricato da `studio.html` prima di `core.js`, che si registra in un registro
globale:

```js
// src/styles/classic.js
STYLES.classic = {
  technique: 'watercolor',
  palette: { paper: '#F3EBDC', ink: '#2B2233', … },        // gli stessi nomi di oggi: le scene non cambiano
  paper:   { stains: 70, stainAlpha: .045, stainRGB: [160, 125, 80], fibers: 1400, fiberAlpha: [.035, .06], … },
  grain:   { density: .55, depth: 34, vignette: .35, vignetteRGB: [120, 95, 70] },
  brushes: { ink: {…}, inkfine: {…}, dry: {…} },          // le definizioni passate a brush.add
  brushScale: 5,
  boil: 12,
  paint: { fillOp: 1, bleed: 1, tex: 1, sw: 1, washOp: 1, fillAs: 'fill' },
};
```

- `src/config.js` aggiunge `style: 'classic'` a `PROJECT`. Il parametro URL `?style=nome` (passato da
  `render.mjs --style=nome`) ha la precedenza, così si confrontano gli stili senza modificare file.
- `core.js` risolve `const STYLE = STYLES[nome]` e lancia un errore chiaro se lo stile non esiste.
  `PAL` diventa `STYLE.palette`, quindi `PAL.x` continua a funzionare ovunque.
- Ogni costante di stile oggi scritta in `core.js` (palette, carta, grana, vignettatura, pennelli,
  `scaleBrushes`, `BOIL`) viene letta da `STYLE`.
- `STYLE.paint` contiene moltiplicatori e scelte applicate dentro `paint()`/`inkLine()` a ogni chiamata:
  - `fillOp`, `bleed`, `tex`, `washOp`, `sw`: moltiplicatori (1 = invariato);
  - `fillAs`: `'fill'` (acquerello vero) oppure `'wash'` (colore piatto, più economico).
  - Il contorno non ha un'opzione a parte: le scene già passano `ink: null` agli sfondi (10 su 13 nella demo) e
    `clawd.js` passa `ink` esplicito a 58 forme. Il contorno più leggero si ottiene con `sw` e con pennelli più
    sottili nello stile.
- **Tecnica.** `paint()` e `inkLine()` delegano a `TECHNIQUES[STYLE.technique]`. Nella Fase 1 esiste solo
  `watercolor`, che è il codice attuale di `paintAt`/`inkLine` spostato senza modifiche. Una tecnica futura
  (`flat`, `papercut`, `pixel`, `comic`, `silhouette`) fornirà la sua `paintAt`/`inkLine` e potrà ignorare
  pennelli e riempimenti. Anche carta e grana passano dalla tecnica (`makePaper`, `makeGrain`), con quelle di oggi
  come implementazione `watercolor`.
- Le scene non si toccano. Le proporzioni dei personaggi non vanno in `STYLE`.

### 2. Verifica "risultato invariato"

- Prima del refactor si salva un riferimento in `out/ref/` (ignorata da git): 4 fotogrammi della demo
  (t = 0,5 · 2,0 · 6,5 · 9,9) e 1 fotogramma del loop `emotions`, come PNG con `--stills`.
- `tools/compare.mjs` riceve due cartelle e confronta i PNG byte per byte. Esce con codice 1 e indica il primo file
  diverso, oppure stampa `OK n/n identici`.
- Il confronto si rifà dopo ogni passo del refactor, non solo alla fine.

### 3. Riapertura periodica della pagina (tutti i render)

- `render.mjs` chiude e riapre la pagina ogni N fotogrammi in `--clip`, `--frames` e `--png`
  (`--recycle=N`; default `0`, cioè spenta, perché misurata più lenta: vedi Contesto misurato).
- Vale anche per il render finale. Poiché ogni fotogramma è una funzione pura di `t`, l'output non cambia:
  lo si verifica confrontando i fotogrammi con e senza riapertura.

### 4. Anteprima veloce `--draft`

`--draft` vale per `--clip`, `--frames`, `--sheet`, `--stills` e passa `?draft` alla pagina. Candidati, ciascuno
misurato da solo su uno spezzone fisso della demo prima di tenerlo:

| taglio | come | effetto atteso |
|---|---|---|
| meno fotogrammi | 12 fps invece di 24 (mp4 a 12 fps, stessa durata) | ÷2 |
| riempimenti piatti | forza `fillAs: 'wash'` sopra lo stile scelto | da misurare |
| mezza risoluzione | tela 960×540 con `scale(.5)` globale; le scene restano in coordinate 1920×1080 | da misurare |
| riapertura pagina | scartata: misurata più lenta (sezione 3) | — |
| più worker | `--frames --workers=N` + `--encode` | da misurare (una sola GPU) |

- Si tengono solo i tagli necessari per stare sotto i 120 s, privilegiando quelli che toccano meno l'aspetto.
- La mezza risoluzione va prima verificata con p5.brush: spessori e grana devono restare proporzionati. Se non
  funziona si scarta e lo si annota qui.
- `--draft` non cambia lo stile scelto: l'anteprima di `acquerello-leggero` è l'acquerello leggero con i tagli
  del draft.

### 5. Stile `acquerello-leggero`

Più chiaro e più economico (scelta di Andrea):

- palette: gli stessi nomi di `classic`, schiariti verso la carta (circa 25–35%) e meno saturi, senza neri o bianchi
  puri;
- `paint`: `fillAs: 'wash'` per gran parte delle forme e opacità dei riempimenti rimasti circa dimezzata
  (`fillOp ~ .5`). Meno riempimenti significa anche render più veloce;
- contorno: pennello `ink` ridefinito più sottile e più trasparente (vicino a `inkfine`) e `sw ~ .7`; gli sfondi
  restano senza contorno come già oggi;
- carta più chiara, grana e vignettatura ridotte (~60%);
- `boil` e pennelli invariati, salvo correzioni dopo il primo confronto visivo.

I valori esatti si fissano guardando uno sheet di confronto `classic` / `acquerello-leggero` agli stessi istanti.

## Misure (da compilare durante l'implementazione)

| render | tempo | note |
|---|---|---|
| demo, `classic`, `--clip` (prima) | 826 s | 264 fotogrammi, senza riapertura |
| spezzone 0–6 s, `classic`, `--clip`, senza / con riapertura 24 / 48 | 210 / 245 / 241 s | riapertura spenta per default |
| demo, `classic`, `--clip --draft` | **25,4 s** | 132 fotogrammi a 12 fps, riempimenti piatti |
| demo, `acquerello-leggero`, `--clip --draft` | **35,1 s** | 132 fotogrammi a 12 fps |
| demo, `acquerello-leggero`, `--clip` (finale) | **65,3 s** | 264 fotogrammi a 24 fps; lo stile usa già colore piatto, quindi anche il finale è veloce |

### Tagli del draft misurati (2026-10-22)

Spezzone 4–7 s della demo (72 fotogrammi a 24 fps), `classic`:

| prova | tempo |
|---|---|
| base | 181,4 s |
| 12 fps | 101,0 s |
| riempimenti piatti (`--draft=flat`) | 22,0 s |
| piatti + mezza risoluzione (`--draft=flat,half`) | 15,6 s |
| piatti, `--frames` con 2 worker / 1 worker | 17,0 s / 22,1 s |

Decisione: `--draft` = 12 fps + riempimenti piatti (stima ~40 s, misurata 25,4 s sulla demo intera). Mezza risoluzione
e worker non servono per l'obiettivo e restano opzionali (`--draft=flat,half`, `--workers`). La mezza risoluzione
fa sparire i contorni lunghi (le colline): non è nel default.

Nota: `--sheet` riporta ms per fotogramma molto bassi (30–130 ms) perché la GPU lavora in modo asincrono; il tempo
reale di uno strip di 24 fotogrammi è uguale a quello di `--clip` (66,5 s contro 67,9 s).

## Rischi

- **Mezza risoluzione e p5.brush:** i pennelli hanno spessori assoluti e `scaleBrushes` globale; la grana di
  `makeGrain` è per pixel. Se il risultato non è proporzionato, il draft resta a piena risoluzione e punta su fps,
  riempimenti piatti e riapertura.
- **Ordine di caricamento:** `STYLES` deve esistere prima degli stili e `STYLE` prima di `core.js`; `sheets.js` e
  `timeline.js` usano `PAL` a livello di modulo solo dentro funzioni (verificato nel piano).
- **Byte-identico:** spostare codice non deve cambiare l'ordine delle chiamate a `random()`/`jit()` né i default
  (`?? .1`, `?? 170`…). Moltiplicare per 1 è esatto in virgola mobile, ma i moltiplicatori vanno applicati solo
  quando il valore esiste, per non trasformare un `undefined` in `NaN`. Si verifica passo per passo col confronto.

## Regole operative

- Comandi per Andrea in CMD. Nessun `git push`: i push li fa Andrea con GitHub Desktop.
- `package-lock.json` (modificato da `npm install`) non va nei commit.
