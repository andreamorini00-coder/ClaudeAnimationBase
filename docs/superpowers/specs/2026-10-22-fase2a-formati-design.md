# Fase 2a — Formati verticale 9:16 e feed 4:5

Data: 2026-10-22 · Branch: `fase2a-verticale` · Stato: design approvato da Andrea con modifiche (zone sicure, feed)

## Obiettivo

Fare video per i social composti per il loro formato, non ritagliati dal 16:9. Il formato si sceglie all'inizio del
progetto, prima di generare il video (scelta di Andrea). Stili e `--draft` della Fase 1 funzionano uguali in ogni
formato.

Criteri di successo:

1. `npm run check` → `OK 5/5 identici`: l'orizzontale `classic` non cambia di un byte.
2. Un esempio composto per l'altezza si renderizza in `vertical` e in `feed`, in qualità piena e in `--draft`.
3. Chiedere a una scena (o a un loop) un formato per cui non è composta si ferma subito con un messaggio chiaro.
4. Le zone sicure dei social si possono disegnare sugli sheet di controllo e non finiscono mai in un video.

Fuori scope: audio (2b), sottotitoli veri (2c: qui si fissa solo dove andranno), una versione verticale della demo,
la doppia composizione dello stesso video.

## Formati

| nome | misure | uso |
|---|---|---|
| `landscape` | 1920×1080 (16:9) | YouTube, default |
| `vertical` | 1080×1920 (9:16) | reel, storie, TikTok, Shorts |
| `feed` | 1080×1350 (4:5) | post nel feed di Instagram |

- `PROJECT.format` in `src/config.js` (default `'landscape'`); `--format=nome` in `render.mjs` e `?format=nome` in
  `studio.html` hanno la precedenza.
- `core.js` definisce `FORMATS = { landscape: {w, h, safe}, vertical: {…}, feed: {…} }` e prende `W`/`H` dal formato
  scelto. Un nome sconosciuto imposta `window.loadError` con l'elenco dei formati (stesso percorso di stili e
  tecniche della Fase 1: render fermo in pochi secondi, codice 1).

## Zone sicure

Rettangoli in pixel del fotogramma. "Margini" = zona da evitare per l'interfaccia del social; "centro" = dove stanno
visi e azioni importanti; "sottotitoli" = la fascia dove andranno i testi della Fase 2c.

| formato | margini da evitare | fascia sottotitoli (y) | fonte |
|---|---|---|---|
| `vertical` | alto 220, basso 420, destra 140, sinistra 0 | 1150–1500 | Andrea |
| `feed` | alto 60, basso 60, sinistra 100, destra 100 | 940–1170 | proposta da approvare sullo sheet |
| `landscape` | nessuno | nessuna | — |

- `vertical`: il quinto basso **non** è per i sottotitoli (c'è la didascalia del social); la fascia sottotitoli sta
  sopra, tra 1150 e 1500. Il centro sicuro è quindi x 0–940, y 220–1500.
- `feed`: nel feed l'interfaccia di Instagram sta fuori dall'immagine; la griglia del profilo però mostra un ritaglio
  3:4 centrato (circa 34 px tagliati per lato). I margini proposti sommano quel ritaglio e un margine di respiro.
  La fascia sottotitoli proposta sta nel terzo basso, sopra il margine. Valori da confermare guardando lo sheet.
- Le zone sono dati del formato (`FORMATS[nome].safe = { top, bottom, left, right, subs: [y0, y1] }`), leggibili dalle
  scene con `SAFE`, così una scena può piazzare le cose dentro il centro sicuro senza numeri scritti a mano.

### Sovrapposizione di verifica

- `--safe` (in `render.mjs`) / `?safe` (in `studio.html`) disegna sopra il fotogramma composito: i margini in rosso
  trasparente, la fascia sottotitoli in giallo trasparente, il bordo del centro sicuro con una linea.
- Si disegna in `composite()`, dopo la grana, quindi non tocca la scena né il determinismo.
- **Mai nel video finale:** `render.mjs` accetta `--safe` solo con `--sheet`, `--strip` e `--stills`; con `--clip`,
  `--frames`, `--png` ed `--encode` si ferma con un errore.

## Cosa cambia nel motore

Dalla lettura del codice, queste parti usano già `W`/`H` e si adattano da sole: tela e mezza risoluzione del draft,
carta, grana, livello lettere, composizione, camera (`camBegin`, `toScreen`), `flash`, `iris`, crop e sheet di
controllo.

Da cambiare:

- **`studio.html`**: la tela `#out` (oggi 1920×1080 fissa) e il CSS `aspect-ratio: 16/9` prendono le misure del
  formato all'avvio.
- **Vignettatura** (`watercolor.makeGrain`): i raggi sono `H * vignetteR`. In verticale verrebbe troppo larga; si usa
  `Math.min(W, H)`, che in orizzontale vale `H` (output identico).
- **`brushWipe`**: 5 bande alte `(H + 420) / 5`. In 1920 di altezza diventano ~510 px: si verifica con uno strip; se
  la copertura o l'aspetto non vanno, il numero di bande cresce con l'altezza **solo fuori dall'orizzontale**.
- **Timbro** dei fotogrammi (`tools/stamp.mjs`): aggiunge `format`, così `--frames` non mescola formati.
- **Commenti** che dicono "1920×1080" fisso (`core.js`, `render.mjs`).

## Le scene e i loop dichiarano il formato

- `shots([...], { format: 'landscape' })` oppure `{ format: ['vertical', 'feed'] }`. Una scena senza dichiarazione vale
  `'landscape'`, così le scene esistenti continuano a funzionare. La demo si dichiara `'landscape'`.
- Loop: `LOOPS.nome.format`, stessa regola. Gli sheet dei modelli (`emotions`, `views`) restano `'landscape'`.
- Se il formato del progetto non è tra quelli dichiarati: `loadError` con formato della scena e formato chiesto.
  Per i loop, il controllo avviene quando `render.mjs` sceglie il loop.

## Esempio per l'altezza

`src/scenes/tall_example.js` registra `LOOPS.tall` (~5 s), dichiarato per `['vertical', 'feed']`. Serve a provare e
verificare i formati; non è una seconda demo da copiare.

- Composto in altezza con `SAFE`: cielo in alto, orizzonte basso, Clawd nel centro sicuro (in `vertical` nella metà
  alta, sopra la fascia sottotitoli), a taglia adatta (`u` ~28–34).
- Un piccolo evento con anticipazione e reazione, secondo le regole della guida.
- La fascia sottotitoli resta libera da azioni importanti; nel margine basso solo sfondo.
- Transizione in entrata e in uscita (`iris` e `brushWipe`), così copre la verifica delle transizioni.

## Guida e documentazione

- ANIMATION_GUIDE: lo storyboard comincia con `Format: landscape | vertical | feed`. Nuova sezione "Social formats":
  comporre per il formato e mai ritagliare il 16:9; zone sicure e fascia sottotitoli (tabella sopra); visi e azioni
  nel centro sicuro; `SAFE` nelle scene; `--safe` sugli sheet; taglie di Clawd per verticale e feed.
- README e commento d'uso di `render.mjs`: `--format`, `--safe`, con i comandi CMD.

## Verifiche

| cosa | come |
|---|---|
| orizzontale invariato | `npm run check` → `OK 5/5 identici` |
| riferimento nuovi formati | `npm run ref`/`check` aggiungono fotogrammi di `LOOPS.tall` in `vertical` e in `feed` |
| formato sbagliato | demo con `--format=vertical` → codice 1 in pochi secondi, col messaggio |
| formato inesistente | `--format=quadrato` → codice 1, elenco dei formati |
| `--safe` mai nel video | `--clip --safe` → codice 1 |
| transizioni coprono | strip di `brushWipe` e `iris` in `vertical` e `feed` |
| draft | `--clip --draft --loop=tall` in entrambi i formati, tempo misurato |
| timbro | `--frames` in un formato dopo fotogrammi di un altro → rifiutato (test unitario + prova reale) |
| ok di Andrea | sheet di `LOOPS.tall` con `--safe`, in `vertical` e `feed`, in `classic` e `acquerello-leggero` |

## Misure (2026-10-22)

| render | tempo | note |
|---|---|---|
| `LOOPS.tall`, `vertical`, `--clip --draft` | 11,4 s | 60 fotogrammi a 12 fps, 1080×1920 |
| `LOOPS.tall`, `feed`, `--clip --draft` | 9,4 s | 60 fotogrammi a 12 fps, 1080×1350 |
| `--frames --draft` + `--encode`, `vertical` | — | 1080×1920, 12 fps, 5,0 s; timbro con `format` |

- `brushWipe` copre tutta la tela in `vertical` e `feed` (strip 4,7–5 s): bande più alte ma nessuna area scoperta,
  quindi resta invariato.
- Osservazione (non legata ai formati): tutti gli mp4, anche quelli della Fase 1 e del codice originale, escono
  `yuvj420p` a gamma piena, perché i fotogrammi sono JPEG. Da valutare a parte.

## Rischi

- Il problema noto di p5.brush con i contorni lunghi potrebbe comparire su forme molto alte: si vede negli sheet.
- Altri calcoli che danno per scontato il 16:9 possono emergere negli sheet; si correggono solo se si vedono e
  sempre senza cambiare l'orizzontale (`npm run check`).
- I valori di `feed` sono una proposta: si fissano con lo sheet.

## Regole operative

Comandi per Andrea in CMD. Nessun `git push`. `package-lock.json` non va nei commit.
