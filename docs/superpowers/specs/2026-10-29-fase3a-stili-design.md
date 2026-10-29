# Fase 3a — Tecnica `cel` e stili `cozy` e `anime` (con le luci dell'anime)

Spec della 3a. La Fase 3 è divisa in due (scelta di Andrea, 2026-10-29): **3a** = tecnica `cel` + `cozy` + `anime` + set
di luci dell'anime; **3b** = `marker-comic` + `visual-novel` + set di luci del visual-novel. Principi comuni dalla
Fase 1 (`2026-10-21-fase1-style-draft-design.md`): uno stile è un file in `src/styles/`, una tecnica è come si mettono i
segni (`src/techniques/`), i nomi di `PAL` non cambiano, `classic` resta identico al byte.

## Obiettivo

- Una tecnica nuova, **`cel`**, per i look a colori piatti: forma piena, **una sola ombra netta**, contorno pulito di
  spessore costante, niente sfumature. Serve a tutti e quattro gli stili nuovi; la 3a la costruisce e la prova con
  due, la 3b la estende.
- Due stili: **`cozy`** (palette calda e morbida, luce soffusa, forme tonde) e **`anime`** (tratto pulito, ombra netta,
  colori vivi), dai riferimenti di Andrea in `reference/styles/cozy/` e `anime/` (note e mood board).
- **Set di colori per illuminazione** nell'anime: giorno, notte, controluce, ricavati dai ruoli e non un filtro
  sull'immagine.
- Ogni stile con il suo **blocco `character`** (come traduce i ruoli colore dei personaggi), uno **sheet di confronto**
  con `classic` e i **model sheet dei personaggi** da approvare in ciascuno.

## Decisioni di Andrea (2026-10-29)

- Fase 3 divisa in 3a e 3b come sopra.
- I progetti (`progetti/`) esistono: il confronto tra stili si fa con `--style=nome` su un progetto o sulla demo.
- Restano valide le regole della roadmap: nessun `git push`; `classic` e `acquerello-leggero` identici al byte
  (`npm run check` OK 9/9); gli stili si approvano sullo sheet di confronto prima di chiuderli.

## Scelte mie da confermare (nella lettura della spec)

1. **Una tecnica `cel` sola, parametrica**, non una per stile: i quattro stili chiedono la stessa cosa (piatto, ombra
   netta, linea pulita) e cambiano solo i valori. Il contorno che si ispessisce sul lato in ombra (marker-comic) e le
   ombre a due toni (visual-novel) sono parametri che si accendono in 3b.
2. **Ombra automatica a mezzaluna** per ogni forma con contorno, dalla direzione della luce, invece di disegnare
   un'ombra per ogni parte di ogni personaggio. Le forme senza contorno (cieli, prati) non hanno ombra.
3. **Le luci cambiano `PAL` frame per frame**: `luce('notte')` riscrive i colori di `PAL` per il resto dell'inquadratura
   (e `draw()` li ripristina a ogni frame), così le scene esistenti seguono la luce senza essere toccate.
4. I valori di colori derivati (quelli che le note non danno) li propongo con una regola scritta; si giudicano sullo
   sheet di confronto.

## Design

### 1. La tecnica `cel` (`src/techniques/cel.js`)

Interfaccia della tecnica (come `watercolor.js`): `paintAt(pts, o)`, `inkLine(P, sw, col, br, curv)`,
`makePaper(style)`, `makeGrain(style)`.

**Come disegna una forma.** La pagina è un canvas WEBGL (p5 + p5.brush) e lì non c'è un ritaglio semplice. Per ogni forma
con riempimento la tecnica disegna su un piccolo canvas 2D della grandezza della sua scatola (con il fattore di zoom
della camera, così le linee restano nitide), nell'ordine: riempimento piatto; **ombra** (la forma, ritagliata con
`clip`, meno la forma spostata verso la luce: una mezzaluna dal lato opposto alla luce); contorno costante; e poi lo
ricopia nel quadro con `image()`, sotto la matrice corrente di p5 (camera, rotazioni). Una forma ha un solo canvas, quindi
l'ordine di disegno tra forme resta quello della scena. *Rischio e prova:* è il punto più incerto (costo e nitidezza di
molti piccoli canvas sotto WEBGL); il **primo compito** del piano è una prova su tre cartoni (gatto, mostro, ragazza)
che misura i ms a fotogramma e la nitidezza a zoom 1,8. Se non regge, ripiego: la mezzaluna si calcola con una
differenza tra poligoni in `CG` (puro, con test) e si disegna con poligoni p5.

**Cosa fanno le opzioni di `paint()`:**
- `wash` / `fill` → riempimento piatto (con `washOp`/`fillOp` come trasparenza reale); niente sfumature né texture di
  pigmento. `bleed`, `tex`, `border`, `hatch`: ignorati (con `hatch` una volta sola nel log, non un errore).
- `ink`, `sw`, `curv` → contorno di spessore costante `sw × STYLE.cel.line`, giunzioni tonde, sempre un colore pieno.
  Un tratto di `inkLine()` è una linea piena dello stesso spessore; `br` (pennello) è ignorato.
- **Ombra:** automatica se la forma ha contorno (`ink !== null`), con colore `shade` o, se manca, il colore della forma
  mescolato con `STYLE.cel.shadow` (k = `STYLE.cel.shadeK`). Si spegne con `shade: false`, si accende per una forma
  senza contorno con `shade: true`. Dimensione della mezzaluna: `STYLE.cel.shadeSize` × la scatola della forma.
- **Luce:** `STYLE.cel.light = [dx, dy]` (verso la luce, di default in alto a sinistra: ombra in basso a destra). Un
  frame può cambiarla con `luce(nome)` (vedi §3).
- **Boil:** il contorno oscilla poco: `STYLE.cel.wobble` (px a 12 fps) con `jit()`, quindi resta "disegnato a mano" ma
  pulito; a 0 le linee non respirano.
- **Carta e grana:** `makePaper` = fondo piatto del colore `paper`, più una texture leggera se lo stile la chiede
  (`cozy`: sì, tenue; `anime`: nessuna). `makeGrain` = grana e vignetta come nelle altre tecniche, con valori molto più
  bassi (l'anime è quasi pulito).
- **`glow()`** resta com'è: è già luce additiva, indipendente dalla tecnica.
- **Modo `--draft`:** `cel` è già piatta, quindi il draft la disegna alla stessa qualità a 12 fps (a meno di `half`).

**Parametri dello stile** (nuovo blocco `STYLE.cel`, validato come gli altri campi obbligatori della tecnica):
`line` (moltiplicatore del contorno), `lineInner` (rapporto delle linee interne, es. .6), `wobble`, `light [dx, dy]`,
`shadow` (colore di tono d'ombra), `shadeK`, `shadeSize`, `tones` (1 qui; 2 in 3b), `outline` ('constant' qui;
'shadowThick' in 3b). I valori fuori dai quattro stili non cambiano nulla.

### 2. Gli stili `cozy` e `anime`

I nomi di `PAL` restano (`paper, ink, clay, clayDk, clayLt, night, indigo, rose, ochre, sap, teal, violet, cream, sky`):
le scene non cambiano. Colori **dati** dalle note; i **derivati** con la regola scritta accanto (mescolando con
`mixCol`).

| nome | `cozy` | `anime` |
|---|---|---|
| paper | #F6EBD8 crema | #F7F2E8 avorio |
| ink | #59463B marrone scuro | #1C2440 inchiostro |
| clay | #D9956C arancio morbido | #FF5D73 corallo |
| clayDk | #B8674F terracotta | corallo 25% verso inchiostro |
| clayLt | clay 35% verso crema | corallo 35% verso avorio |
| night | #7E8C9A blu crepuscolo | #2B3766 notte |
| indigo | night 25% verso ink | #555B91 viola ardesia |
| rose | #C99595 rosa antico | corallo 30% verso lavanda |
| ochre | #E8BF78 oro tenue | #FFD166 giallo dorato |
| sap | #A6B39A verde salvia | #3FAE9B verde acqua |
| teal | night 40% verso sap | verde acqua 35% verso blu |
| violet | #8C8074 tortora | #ADA2E8 lavanda |
| cream | crema 40% verso bianco | #F7F2E8 avorio |
| sky | night 55% verso crema | #427BEF blu intenso |

- **`cozy`**: `cel.line` morbido (1,0), `wobble` .6, ombra unica `#8C8074` (tortora), forme tonde (le forme sono delle
  scene e dei personaggi: la tecnica le arrotonda solo con `curv` più alto per default), texture di carta leggera.
  Cieli e luci con 2-3 fasce di colore più `glow()`; niente gradienti.
- **`anime`**: `cel.line` 1,0 con `lineInner` .6 (contorno esterno più spesso delle linee interne), `wobble` .25, ombra
  unica `#555B91` (viola ardesia; sulla pelle `#D99A86`), nessuna texture di carta. Contorno e fondale notturno sempre
  diversi: il contorno si legge anche di notte (controllo nei test, §6).
- Entrambi: `technique: 'cel'`, `boil` 12, `brushes`/`brushScale` quelli minimi che la tecnica usa per `inkLine` se serve
  (la tecnica li dichiara), i campi obbligatori compilati come in `classic.js`.

### 3. Set di colori per illuminazione (anime)

Nuovo file puro `src/lighting.js` (testabile con `node:vm`), caricato prima di `core.js`.

- **Set:** `STYLE.luci = { giorno, notte, controluce }`, ognuno con: `palette` (override dei nomi di `PAL`), `tone` e `k`
  (verso quale colore si mescolano i ruoli dei personaggi e quanto), `skin` e `skinShadow` (la pelle ha il **suo**
  colore in ogni set, così sotto le luci colorate non diventa rosa), `shadow` (tono dell'ombra), `rim`
  (`{ colore, spessore }`, solo nel controluce).
- **API:** `luce(nome)` e `luce(da, a, k)` (mescola due set, per un tramonto). Si chiama a inizio inquadratura, prima di
  disegnare: riscrive i valori di `PAL`, la direzione della luce e quello che usa `character()`. `draw()` rimette il
  set `giorno` all'inizio di ogni frame, quindi i fotogrammi restano funzioni pure del tempo.
- **Ricavati dai ruoli:** il colore di un ruolo di un personaggio in una luce è `mixCol(ruolo, set.tone, set.k)`
  (con un'eventuale deroga nella scheda del personaggio, `spec.styles.anime.luci.notte.<ruolo>`), tranne `line`
  (il contorno non cambia), `skin` e `skinShadow` (dal set) e `eyeWhite` (resta). Nessun filtro sull'immagine.
- **Controluce:** il tono delle ombre sale (il corpo diventa quasi tutto in ombra, ruoli mescolati al 55% verso il tono),
  e le forme dei personaggi hanno un **bordo di luce calda** (`rim`) sul lato verso la luce, una striscia sottile ritagliata
  dalla forma (come la mezzaluna, ma dal lato opposto) e sempre sopra l'ombra.
- **Valori iniziali (da giudicare sullo sheet):**
  - *giorno*: `PAL` dell'anime; pelle `#F5C6A5`/`#D99A86`; `tone` nessuno.
  - *notte*: `sky` → #2B3766; `ink` → #111830 (il contorno si legge anche di notte); `sap`, `teal` e `cream` mescolati
    40-55% con `night`; `ochre` invariato (le lampade restano gialle); `tone` #2B3766, `k` .42; pelle `#C9A39C`/`#B98A86`;
    ombra `#3A4275`.
  - *controluce*: `sky` → mix di `ochre` e `rose`; `tone` #555B91, `k` .55; pelle `#D99A86`/`#A87470`; `rim`
    #FFD166 spesso 2,5 px (alla scala 1).
- Il `cozy` non ha set di luci: usa il solo `giorno`; `luce('notte')` in `cozy` non fa nulla e lo dice una volta nel log.

### 4. I personaggi negli stili nuovi

- `STYLE.character` (`draw.js`) diventa, per `cel`: `{ toPaper, shadow: 'hard', lineWeight }` più `shade: true`
  (usa la mezzaluna della tecnica sulle parti col contorno), invece del vetro d'acqua.
- `draw.js` passa a `paint()` il colore d'ombra di un ruolo quando la scheda ha il suo (`skinShadow` per `skin`, e in
  generale `<ruolo>Shadow`), altrimenti il colore del ruolo con `shadeK` verso `STYLE.cel.shadow`.
- Le parti `dim` (le zampe e le orecchie lontane) restano un gradino più scure con lo stesso meccanismo di oggi.
- Il disegno dei personaggi (layout) non cambia: nessuna scheda cambia versione; `check-characters` mostra le nuove
  righe `cozy` e `anime` come `da approvare` finché non le approvi, e le righe di `classic` e `acquerello-leggero`
  restano `ok` (stessi byte).
- **Approvazioni:** gatto, mostro, bruco, draghetto, ragazza e supereroe in `cozy` e `anime` (12 approvazioni). Vale e
  mara restano bozza.

### 5. Sheet di confronto

- Per ogni stile nuovo, uno sheet **della demo** agli stessi istanti di `classic` (`--sheet` con gli istanti della demo,
  uno accanto all'altro: `classic`, `acquerello-leggero`, `cozy`, `anime`), e uno sheet delle tre luci dell'anime (la
  stessa inquadratura in giorno, notte e controluce).
- Un piccolo progetto di prova, `progetti/prova-stili/` (3 s, un'inquadratura con gatto, mostro e ragazza), serve a
  rendere gli stessi istanti in tutti gli stili senza toccare la demo.

### 6. Controlli (`npm test`, e a mano)

- **Stili completi:** `cozy` e `anime` hanno tutti i nomi di `PAL`, la tecnica esiste, `STYLE.cel` ha tutti i campi, nessun
  nero puro (#000000) né bianco puro (#FFFFFF).
- **Contorno e notte:** i colori delle note danno un contrasto basso (`ink` #1C2440 su `night` #2B3766: circa 1,34), che
  è quello della mood board. Il test fissa: `ink` ≠ `night` e ≥ 1,3 in `giorno`; nel set `notte` l'`ink` si scurisce
  (#111830) e il contrasto contro `sky` e `night` di quel set è ≥ 1,5; in nessun set `ink` coincide con uno sfondo.
- **Pelle fissa:** in ogni set la pelle resta nella stessa famiglia di tinta (distanza di tinta ≤ 25°) e non diventa rosa
  (`skin.r - skin.b` oltre una soglia).
- **Luce come funzione pura:** stesso `t` e stesso set → stessi colori; `luce('notte')` a due chiamate = a una; il frame
  dopo ripristina `giorno`.
- **`mixCol` dei set:** `luce(a, b, 0)` = `a` e `luce(a, b, 1)` = `b`.
- **Classic invariato:** `npm run check` OK 9/9; `check-characters`: le righe di `classic` e `acquerello-leggero` `ok`.
- **Render a mano:** gli sheet di §5, controllati con le regole della guida (contorno che si legge, mezzaluna dal lato
  giusto, nessuna sfumatura, nessuna linea spezzata sotto la camera).

### 7. Tempi

`cel` è piatta: attesa più veloce di `classic` (a occhio 3-5 volte, da misurare nella prova del primo compito). Si
scrivono nella spec finale i ms a fotogramma di `classic`, `acquerello-leggero`, `cozy` e `anime` sulla demo e sul
reel (finale e draft).

## Rischi

- **Prestazioni e nitidezza dei piccoli canvas** sotto WEBGL (§1): prova al primo compito, piano B con la differenza di
  poligoni.
- **Riscrivere `PAL` ogni frame:** qualunque codice che tenga una copia dei colori (cache di colori in `core.js`,
  `glow`) deve leggerli dopo `luce()`: i test controllano `glow` e le emote; se una cache c'è, la si fa dipendere dal set.
- **Carattere e lettere:** `letter()` usa "Permanent Marker": resta (non è parte dello stile in 3a).
- **GPU:** i byte degli sheet dipendono dalla scheda (vale già per le approvazioni: `approvati.json` la registra).
- **`hatch`** nelle scene o in Clawd: ignorato in `cel`; se una scena vi si appoggia per un'ombra lo si vede dallo sheet.

## Fuori dalla 3a (in 3b)

`marker-comic` (contorno che si ispessisce sul lato in ombra, neri pieni, linee di velocità), `visual-novel` (ombre a due
toni, fondali a tre piani, proporzioni adulte), i set di luci del visual-novel, e la ripresa di vale e mara nello stile
visual-novel (restano bozza fino a 3b).

## Regole operative

Come nelle fasi precedenti: comandi per Andrea in CMD; nessun `git push`; `package-lock.json` mai nei commit; file
aggiunti uno per uno; script Python di modifica in file nello scratchpad; `npm run check` sempre OK 9/9; branch
`fase3a-stili`, merge in `main` solo dopo le approvazioni.
