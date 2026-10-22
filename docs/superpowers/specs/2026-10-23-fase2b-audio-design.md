# Fase 2b — Audio: effetti, ambienti, musica

Data: 2026-10-23 · Branch: `fase2b-audio` · Stato: design approvato da Andrea (approccio A, con livelli per categoria e
`--mix`)

## Obiettivo

Dare ai video un audio da social: effetti sonori agganciati agli eventi della scena, ambienti in sottofondo, una
musica opzionale che si abbassa sotto gli effetti importanti, il tutto normalizzato. Niente voce per ora: solo un
aggancio per il futuro.

Criteri di successo:

1. Una scena (o un loop) dichiara i suoi suoni con gli stessi tempi dell'animazione; il render produce un mp4 con
   audio AAC 48 kHz a −14 LUFS (±1), picco ≤ −1 dBTP, lungo quanto il video.
2. Le variazioni `_01`, `_02`, `_03` si alternano da sole, sempre nello stesso modo.
3. `--mix` produce solo l'audio, senza disegnare, in pochi secondi.
4. I video escono `yuv420p` a gamma TV.
5. `npm run check` resta `OK 9/9 identici`.

Fuori scope: voce (solo il campo riservato), sottotitoli (2c), musica inclusa nel repo, editing audio interattivo.

## Materiale

`assets/sfx/` (Andrea, generati su Magnific / ElevenLabs, licenza in `assets/sfx/licenze.md`): 24 suoni, quasi tutti
con 2–3 variazioni `nome_01…03`, più 4 ambienti `amb_*_loop` da 10 s. mp3 44,1 kHz stereo. Livelli misurati molto
diversi (es. `caduta_tonfo_01` −13,9 LUFS, `atterraggio_morbido_02` −29,1, `amb_notte_grilli_loop` −48,2): per
questo ogni file viene portato a un livello di partenza prima del mix.

## Come una scena dichiara i suoni

I fotogrammi si disegnano in parallelo e fuori ordine, quindi i suoni non partono "mentre si disegna": la scena
dichiara un elenco, che `render.mjs` legge una volta.

```js
sounds({
  sfx: [[tLand, 'caduta_tonfo'], [tJump, 'salto_boing', { vol: -3, duck: false }], [4.2, 'pop_02']],
  ambience: [{ name: 'amb_notte_grilli_loop', from: 0, to: 11, fadeIn: .5, fadeOut: .8, vol: 0 }],
  music: { file: 'assets/music/tema.mp3', vol: 0 },
});
```

- Scene: `sounds({...})` in `src/audio.js` (pagina), una o più chiamate, unite. Loop: `LOOPS.nome.sounds = {...}`.
- Tempi in secondi del video (per i loop, del loop), gli stessi della scena: per esempio `tLand` serve sia a `jump()`
  sia al tonfo.
- `sfx`: `[t, nome, { vol, duck }]`. `nome` senza numero = variazioni automatiche; con numero (`pop_02`) = quella.
  `vol` in dB rispetto al livello di partenza (default 0). `duck` (default `true`): la musica si abbassa sotto
  questo effetto.
- `ambience`: `{ name, from, to, fadeIn = .5, fadeOut = .8, vol = 0 }`; il file si ripete per tutto l'intervallo.
- `music`: `{ file, vol = 0 }`. Default del progetto in `PROJECT.music` (`src/config.js`); `--music=file` (o il
  vecchio `--audio=file`) ha la precedenza. Senza musica né suoni, il video resta muto come oggi.
- `voice`: campo riservato. Se presente, il render si ferma con "voce non ancora supportata". Quando arriverà, userà
  lo stesso ducking della musica.
- Errori immediati (codice 1, prima del mix): nome di suono inesistente (con l'elenco dei nomi), file di musica
  inesistente, `voice` presente.

## Variazioni automatiche

`render.mjs` cerca su disco `nome_NN.mp3`. Le occorrenze di uno stesso nome, ordinate per tempo, usano `_01`, `_02`,
`_03`, `_01`… (ricomincia dopo l'ultima esistente). Un nome senza variazioni (`amb_*_loop`) usa il file così com'è.
La scelta dipende solo dall'elenco, quindi è uguale a ogni render, anche con `--range`: le variazioni si scelgono
sull'elenco intero, prima di tagliare.

## Livelli di partenza per categoria

Ogni file viene misurato una volta (loudness integrata, ffmpeg `ebur128`) e portato a:

| categoria | livello di partenza |
|---|---|
| effetti (`sfx`) | −18 LUFS |
| ambienti (`ambience`) | −30 LUFS |
| musica | −20 LUFS |

Le misure stanno in `out/audio-cache.json` (chiave: percorso, dimensione, data di modifica), così i render successivi
non le rifanno. `vol` di ogni suono si somma al guadagno calcolato.

## Ducking della musica

Una curva di volume calcolata dai tempi, non un compressore: deterministica e testabile.

- Per ogni effetto con `duck`: la musica scende di 6 dB (×0,5) a partire da 0,05 s prima, in 0,1 s; resta giù per la
  durata del file più 0,2 s; risale in 0,4 s.
- Effetti sovrapposti: vale l'abbassamento maggiore (nessuna somma).
- La curva diventa un'espressione `volume=…:eval=frame` di ffmpeg; la stessa funzione esiste in JS per i test.

## Mix finale

Un solo grafo `filter_complex` di ffmpeg:

- effetti: guadagno + `adelay` al tempo dell'evento;
- ambienti: `aloop` + `atrim` sull'intervallo, `afade` in entrata e in uscita, `adelay` a `from`;
- musica: guadagno + curva di ducking, tagliata alla durata;
- tutto ricampionato a 48 kHz stereo e sommato (`amix` senza normalizzazione automatica), poi `apad`/`atrim` alla
  durata esatta del video;
- normalizzazione in due passaggi (`loudnorm`): misura, poi applicazione lineare a −14 LUFS integrati, −1 dBTP;
- uscita: wav 48 kHz per `--mix`; nel video, AAC 48 kHz 192 kbps.

Dove si usa:

- `--clip` (anche con `--range=a:b`: tempi spostati di −a, suoni fuori intervallo esclusi, ambienti e musica tagliati);
- `--encode` (il piano si legge dalla pagina; il timbro dei fotogrammi registra anche il loop, così `--encode` sa
  quale piano usare);
- `--draft` (stesso audio: costa poco);
- `--mix --out=file.wav`: solo l'audio, senza disegnare. Accetta `--loop`, `--range`, `--music`.

## Colore del video

Oggi tutti gli mp4 escono `yuvj420p` a gamma piena, perché i fotogrammi sono JPEG. In `--clip` ed `--encode` si
aggiunge la conversione `scale=in_range=pc:out_range=tv,format=yuv420p`: video `yuv420p` a gamma TV, come vogliono
Instagram e TikTok. I PNG di `npm run check` non passano da ffmpeg, quindi restano identici.

## Esempio

`LOOPS.tall.sounds` (loop verticale e feed della Fase 2a):

- `oh_sorpresa` quando Clawd nota la lucciola (1,3 s);
- `salto_boing` allo stacco (2,8 s), `atterraggio_morbido` all'atterraggio (3,3 s);
- `transizione_whoosh` sulla pennellata finale (4,7 s), con `duck: false`;
- `amb_notte_grilli_loop` per tutto il loop, dissolvenze 0,5 s / 0,6 s.

Per provare il ducking si usa una musica di prova generata da ffmpeg (non va nel repo).

## Codice

| file | cosa |
|---|---|
| `src/audio.js` (nuovo, pagina) | `sounds()`, raccolta del piano della scena, `window.audioPlan()` |
| `tools/audio.mjs` (nuovo, Node) | funzioni pure: variazioni, risoluzione del piano, curva di ducking, argomenti ffmpeg; misura con cache |
| `tools/audio.test.mjs` (nuovo) | test `node:test` delle funzioni pure |
| `render.mjs` | `--mix`, `--music`, mix in `--clip`/`--encode`, `yuv420p`, `loop` nel timbro |
| `tools/stamp.mjs` | `loop` nel timbro (default `''` per i timbri vecchi) |
| `src/scenes/tall_example.js` | `LOOPS.tall.sounds` |
| `src/config.js` | `music: ''` in `PROJECT` |
| `ANIMATION_GUIDE.md`, `README.md` | sezione "Sound", comandi CMD |

## Verifiche

| cosa | come |
|---|---|
| funzioni pure | `npm test`: variazioni (3, 2, forzata), nome inesistente, `voice`, curva di ducking in punti noti, `--range`, argomenti ffmpeg attesi |
| livello finale | `--mix --loop=tall` → `ebur128`: −14 ±1 LUFS, picco ≤ −1 dBTP, 48000 Hz |
| ducking | `--mix` con musica di prova: livello della musica più basso di ~6 dB intorno a 2,8 s rispetto a 0,8 s |
| mp4 | `--clip --draft --loop=tall --format=vertical`: AAC 48 kHz, durata audio = video, video `yuv420p`/`tv` |
| `--encode` | dopo `--frames --loop=tall`: stesso audio, loop letto dal timbro |
| orizzontale | `npm run check` → `OK 9/9 identici` |
| ascolto di Andrea | `out/tall-vertical-audio.mp4` |

## Rischi

- `loudnorm` su clip brevi e con molti silenzi può alzare troppo gli ambienti: si controlla all'ascolto e, se serve,
  si alza la soglia di gating o si abbassa il livello di partenza degli ambienti.
- Il ritardo iniziale degli mp3 (encoder delay, ~25 ms) sposta leggermente gli effetti: trascurabile a 24 fps (un
  fotogramma = 42 ms); si annota se si sente.
- Molti effetti in un video lungo = grafo ffmpeg lungo: si costruisce con un input per file distinto e `asplit`
  per le ripetizioni.

## Regole operative

Comandi per Andrea in CMD. Nessun `git push`. `package-lock.json` mai nei commit.
