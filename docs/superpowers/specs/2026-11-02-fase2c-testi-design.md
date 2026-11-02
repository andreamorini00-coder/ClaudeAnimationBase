# Fase 2c — Testi, sottotitoli e controllo del tempo di lettura

Spec della 2c (roadmap: «Testi e sottotitoli»). Le Fasi 2a (formati e zone sicure), 2b (audio) e 3a (stili) sono chiuse;
la 3b (marker-comic) è abbandonata (tag `archivio/marker-comic`). Qui si aggiunge un livello di testi opzionale e un
controllo automatico del tempo di lettura. La voce non esiste ancora (in 2b è solo un campo riservato): i tempi dei testi
li decide la scena, non un audio.

## Obiettivo

- Un **livello di testi** (sottotitoli e titoli) disegnato dalla pagina **sopra il fotogramma finito, sopra la grana**,
  separato dalla scena dipinta; **spento per default**: senza testi dichiarati il video è identico al byte a oggi. La regola
  «No text» dell'ANIMATION_GUIDE resta valida per la scena dipinta.
- I testi si **dichiarano nel codice della scena**, con i tempi dell'animazione, come `sounds()` per l'audio.
- **Posizione secondo il formato:** nel 9:16 la fascia sottotitoli 1150–1500 px, nel feed 940–1170 px (già in `FORMATS`),
  dentro le zone sicure; nel 16:9 una fascia in basso.
- Un **controllo automatico del tempo di lettura** (idea da lemo-opuscar, MIT, solo idee) segnala i testi troppo brevi, che
  non entrano nella fascia o che si sovrappongono.
- Funziona in anteprima, negli sheet, nelle immagini singole e nel video, in tutti e quattro gli stili.

## Decisioni di Andrea (2026-11-02)

- **Il carattere è locale, mai di sistema** (un carattere di sistema non è deterministico tra macchine e romperebbe il
  controllo byte-identico): **Atkinson Hyperlegible** (SIL OFL 1.1) in `assets/fonts/`, con la licenza accanto come per
  Permanent Marker.
- **Ritocchi dopo il reel di prova (2026-11-02):** sottotitoli più grandi (circa 1,5 volte) e in **Atkinson Hyperlegible Bold**
  (stessa licenza OFL, anche il peso Bold in `assets/fonts/`); targa **centrata sul fotogramma** (la zona sicura è solo un limite: si
  sposta la targa solo se uscirebbe); **titolo con a capo bilanciato** (righe di lunghezza simile, mai un articolo o una
  preposizione corta a fine riga) oppure, se è corto, ridotto finché sta su una riga; più margine orizzontale nella targa.
- **La velocità di lettura è un parametro:** 15 lettere al secondo di base, `--lettura=bambini` a 13; vale anche per
  `--controlla-testi`.

- I testi e i loro tempi stanno **nel codice della scena** (non da un `.srt` esterno).
- Si disegnano come **livello nella pagina** (non impressi da ffmpeg).
- Flusso solito: brainstorming, spec, piano, esecuzione, revisione; mi fermo dopo la spec per l'approvazione.
- Valgono le regole di sempre: nessun `git push`; `package-lock.json` mai nei commit; controlli uno alla volta; gli stili
  esistenti e i personaggi non cambiano (`npm run check` OK 9/9, `check-characters` `ok`).

## Scelte mie da confermare (nella lettura della spec)

1. **Due tipi di testo, non di più:** `sottotitolo` (nella fascia del formato) e `titolo` (in alto, più grande). Una
   didascalia o altro si aggiunge quando serve (YAGNI).
2. **Carattere** (deciso da Andrea, vedi sopra): i titoli in Permanent Marker, i sottotitoli in Atkinson Hyperlegible Bold
   (sottoinsieme latin in woff2, `AtkinsonHyperlegible-Bold-latin.woff2` e il Regular, + `LICENSE-AtkinsonHyperlegible.txt`,
   caricati da `studio.html` e attesi da `core.js` come Permanent Marker, così la pagina non dipende dalla rete).
3. **Aspetto neutro che prende i colori dello stile:** testo `PAL.paper` su una targa arrotondata `PAL.ink` al 72%; così ogni
   stile ha il suo sapore senza parametri nuovi. Nessuno stile cambia.
4. **Entrata e uscita:** dissolvenza di 0,2 s (nessun movimento, per non disturbare l'animazione).
5. **Esportazione `.srt`** (confermata) dello stesso elenco di sottotitoli (`--srt`), perché i social lo accettano come sottotitoli
   caricati a parte. Piccola e a costo basso; la tolgo se non la vuoi.
6. **Il controllo avvisa all'inizio di ogni render** che ha testi (senza bloccarlo), e un comando a parte lo lancia da solo
   con codice di uscita 1 se trova problemi.

## Design

### 1. Dichiarare i testi (`src/testi.js`)

```js
testi([
  { da: 1.2, a: 3.6, testo: 'Ma dov\'è finito?', battuta: 1.9 },                       // sottotitolo (predefinito)
  { da: 0.3, a: 4.3, testo: 'Il gatto e il mostro', tipo: 'titolo' },
]);
```

Campi: `da`, `a` (secondi sulla linea del tempo della scena), `testo` (stringa non vuota; `\n` va a capo), `tipo`
(`'sottotitolo'` predefinito, o `'titolo'`), `battuta` (secondi di battuta parlata, opzionale: il campo riservato per la
voce). Un loop dichiara i suoi con `LOOPS.nome.testi = [...]`, come `LOOPS.nome.sounds`. `testi()` si può chiamare più
volte: gli elenchi si sommano. Senza chiamate non cambia nulla.

### 2. Parte pura (`TESTI`, in `src/testi.js`, testabile con `node:vm`)

- `TESTI.problems(lista, durata)` → errori di forma, uno per riga e con l'indice: campo mancante, `a <= da`, `da < 0`,
  `a` oltre `durata`, `testo` vuoto o non stringa, `tipo` sconosciuto, `battuta` non numerica o negativa.
- `TESTI.at(lista, t)` → i testi visibili a `t`: `[{ ...testo, alpha }]` con `alpha` 0..1 (dissolvenza di 0,2 s in
  entrata e in uscita; a `t` esattamente `da` è 0, `a` è 0).
- `TESTI.wrap(testo, larghezza, misura)` → righe (`misura(riga)` dà la larghezza in px: nei test una misura finta
  a larghezza fissa per lettera); va a capo sulle parole e su `\n`; una parola più larga della riga si spezza.
  `TESTI.balance(testo, larghezza, misura)` → le stesse righe ma **bilanciate** (la riga più larga la più stretta possibile, a parità
  di numero di righe) e senza parola funzionale a fine riga (`TESTI.FUNC`: articoli, preposizioni, congiunzioni); oltre 24 parole
  o 4 righe è il `wrap` semplice.
- `TESTI.layout(voce, formato, misura)` → `{ righe, size, x, y, w, h, padX, padY, fuori }`: il corpo che sta nella fascia del formato
  (corpo scelto dal formato e ridotto fino a un minimo se non entra); `fuori` vero se anche al minimo non sta (più di
  due righe nel sottotitolo, o fuori dalle zone sicure).
- `TESTI.LETTURA = { base: 15, bambini: 13 }` (lettere al secondo) e `TESTI.leggi(lista, durata, lettura = 'base')` → i
  **problemi di lettura**, uno per voce, con tempo e frase (vedi sotto); un profilo sconosciuto è un errore che elenca i
  disponibili.
- `TESTI.srt(lista)` → il testo di un `.srt` (solo i sottotitoli, in ordine, tempi `hh:mm:ss,mmm`).

### 3. Il controllo del tempo di lettura

Per ogni testo (`lettere` = caratteri senza spazi, `visibile` = `a − da`, `entrata` = 0,2 s):

- `visibile ≥ 1,8 s` (mai meno);
- `visibile ≥ battuta + 0,6 s` se c'è `battuta`;
- `visibile − entrata ≥ lettere ÷ velocità + 1,5 s`, con `velocità` = 15 lettere/s di base e 13 con `--lettura=bambini`;
- un `titolo`: `visibile ≥ 4 s`.

Ogni problema è una riga come «1,2–2,0 s «Ma dov'è finito?»: resta 0,8 s, ne servono 3,3 (lettere ÷ 15 + 1,5)» (con la velocità
in uso). In più il
controllo segnala: **due sottotitoli sovrapposti** nello stesso istante (la fascia è una), **testo che non entra** (`fuori`
del layout nel formato scelto), **testo dichiarato oltre la durata**. Un testo senza problemi non produce niente.

Dove gira: `render.mjs` legge l'elenco dalla pagina (come per il piano audio: `window.testiPlan()`), lo controlla all'inizio
di ogni render che lo ha e **avvisa**; `node render.mjs --controlla-testi [--progetto=… --loop=…]` lo fa da solo, senza
disegnare, ed esce con codice 1 se trova problemi. `--srt` scrive `out/<nome>.srt` (o `--out=`).

**La velocità di lettura** si sceglie con `--lettura=base|bambini` (o `PROJECT.lettura` in `config.js`; il flag vince):
vale per l'avviso del render e per `--controlla-testi`. Un valore sbagliato ferma il render con un messaggio che elenca i
profili.

### 4. Il disegno (`composite()` in `src/core.js`)

Dopo la grana e prima delle zone sicure: `drawTesti(c, T)` disegna sul compositor 2D, in pixel del fotogramma (quindi
uguale in bozza `--draft`, che compone a piena risoluzione). Nessuna camera, nessun boil: i testi non si muovono con la
scena. Senza testi dichiarati la funzione esce subito: **stessi byte di oggi**.

- **Centratura:** la targa è centrata sul **fotogramma**; le zone sicure sono solo un limite (se la targa uscirebbe a destra o a
  sinistra si sposta del minimo, per esempio nel 9:16, dove la zona utile è larga 940 px e non 1080, una targa larga più di 800 px
  scivola a sinistra). La targa lascia 40 px dal limite e ha più margine ai lati (45% del corpo) che sopra e sotto (20%).
- **Sottotitolo:** nella fascia `SAFE.subs` del formato (nel 16:9, dove non c'è, una fascia in basso da `H × 0,76` a `H × 0,94`);
  Atkinson Hyperlegible **Bold**; massimo due righe, **bilanciate** (come il titolo); corpo **66 px (16:9), 81 px (9:16), 75 px (feed)**,
  1,5 volte la prima versione, ridotto fino a un minimo di 70% se non entra; targa arrotondata `PAL.ink` al 72%; testo `PAL.paper`.
- **Titolo:** in alto, sotto `SAFE.top`, Permanent Marker, corpo 88 px (16:9), 108 px (9:16), 100 px (feed). **Se è corto** si riduce
  (fino al 70%) finché sta **su una riga**; altrimenti va a capo **bilanciato** su al massimo tre righe, di lunghezza simile e **senza
  articolo, preposizione o congiunzione corta a fine riga** («Il gatto e il / mostro» diventa «Il gatto / e il mostro»; se serve
  una riga in più per evitarlo, la usa). Stessa targa.
- **Più voci contemporanee** di tipo diverso stanno nelle loro posizioni; due dello stesso tipo si segnalano nel controllo.
- Il `?safe` (zone sicure sugli sheet) resta sopra ai testi, così si vede se la fascia è rispettata.

### 5. Documentazione

`ANIMATION_GUIDE.md`: una sezione «Testi e sottotitoli» (`testi()`, i campi, il controllo, i comandi, `--srt`) e una nota
nella regola «No text»: il livello testi è separato e non dipinto nella scena. La roadmap segna la 2c in corso, poi chiusa.

## Controlli (`npm test` e a mano)

- **Puri** (`tools/testi.test.mjs`, con `TESTI_SCRIPTS` in `pagecode.mjs`): `problems` (ogni errore di forma ha il suo test),
  `at` (dissolvenze, estremi), `wrap` (parole, `\n`, parola lunga, testo con accenti, vuoto), `layout` (il corpo per formato,
  ridotto, `fuori`), `leggi` (le quattro regole con i numeri della roadmap, una voce che le rispetta → niente, una che non
  le rispetta → il messaggio giusto), sovrapposizioni, `srt` (formato dei tempi, ordine, i titoli esclusi).
- **Senza testi nulla cambia:** `npm run check` OK 9/9; `check-characters` `ok` per tutti.
- **A mano:** un loop `testi` nel progetto `prova-stili` in `landscape`, `vertical` e `feed` con `--safe`: il sottotitolo sta
  nella fascia e i titoli sotto la zona sicura; testi lunghi, a capo, accenti, dissolvenza.

## Rischi

- **Misurare il testo** (a capo e corpo) dipende dal carattere: con i caratteri locali le righe sono le stesse su ogni
  macchina. Il layout aspetta che i caratteri siano caricati prima del primo fotogramma (come Permanent Marker).
- **Troppi controlli** stancano: il controllo è un avviso, non un blocco, e dice sempre il numero che manca.
- **Un testo sopra un'inquadratura chiara** si legge per la targa, non per il colore: la targa è sempre opaca al 72%.
- **I tempi sono quelli della scena**, non di una voce: quando la voce arriverà, `battuta` si potrà riempire da lì (fuori
  da questa fase).

## Fuori dalla 2c

Voce e allineamento automatico ai tempi della voce; importare un `.srt` esterno; didascalie e altri tipi; testi animati
(entrate con movimento); impressione con ffmpeg.

## Regole operative

Come nelle fasi precedenti: comandi per Andrea in CMD; nessun `git push` (nemmeno dei tag, finché non lo dici); `package-lock.json`
mai nei commit; file aggiunti uno per uno; script Python di modifica in file nello scratchpad; controlli uno alla volta;
`npm run check` OK 9/9; branch `fase2c-testi`, merge in `main` solo dopo la revisione.
