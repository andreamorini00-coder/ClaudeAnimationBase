Format: vertical (1080×1920, 12 s). Margini dell'app: 220 sopra, 420 sotto, 140 a destra; fascia sottotitoli y 1150–1500 (solo sfondo). Stile: acquerello-leggero.
Logline: il gatto vede il mostro che rimbalza e vuole prenderlo, ma lo schiaccia soltanto: il mostro lo catapulta via, scappa rimbalzando, e il gatto resta a terra a chiedersi cos'è successo.
World: un prato di mattina. Cielo azzurro pallido, due file di colline sfumate, erba verde salvia, qualche ciuffo e fiorellino (con `hash`, fermi). Il suolo sta a y ≈ 1120, appena sopra la fascia dei sottotitoli; tutta l'azione sta sopra. Luce che si scalda piano: azzurro fresco all'inizio, pesca all'orizzonte alla fine (il gatto ci resta male, il cielo no).
Motif: il rimbalzo. Il mostro rimbalza in apertura, rimbalza per scappare, e nell'ultima inquadratura rimbalza lontano, piccolo, mentre il gatto lo guarda: la stessa immagine dell'inizio, cambiata.
Personaggi: gatto v2 e mostro v2 (approvati), nessun testo; reazioni dipinte (`!` e `?` con `emote`).
Sound: ambiente `amb_uccellini_loop` 0–12 s (dissolvenza in 0,6 s, fuori 0,8 s). Effetti sugli eventi, uno per evento, sullo stesso tempo dell'animazione:
  rimbalzo 0,6 · 1,4 · 2,2 · 3,0 (−6 dB) · 3,8 (−6 dB) — gli atterraggi del mostro
  oh_sorpresa 1,7 — il gatto lo nota
  salto_boing 4,45 — lo stacco
  squish 6,3 — il contatto
  rimbalzo 8,25 · 9,1 (−4 dB) · 9,7 (−8 dB) — la fuga, sempre più lontana
  caduta_tonfo 8,6 — il gatto a terra
  rimbalzo 11,3 (−14 dB) — il mostro lontano, quasi un'eco
Arco del gatto: curioso (0) → sorpreso (1,7) → concentrato, occhi stretti (3,3) → felice, preso! (6,5) → sorpreso, lanciato in aria (7,8) → confuso a terra (8,6–12).

Shots:
  A  0,0–2,6  [dentro: iris che si apre sul mostro]  Campo largo, il gatto a sinistra (u 36), il mostro entra da destra e rimbalza verso di lui.
     EVENTO: il gatto si accorge del mostro. Camera: deriva lenta e leggera spinta.
     reads:  0,0–0,9   il mostro rimbalza: l'occhio segue la forma che si muove (l'iris si apre proprio su di lui)
             0,9–1,6   il gatto, fermo, segue i rimbalzi con gli occhi e poi con la testa (gli occhi guidano)
             1,6–2,6   il gatto lo nota: orecchie su, coda in alto, `!` che compare; tenuta di 0,7 s
  B  2,6–4,4  [taglio sullo sguardo]  Più vicino, il gatto in primo piano a sinistra (u 62), il mostro rimbalza sulla destra, più piccolo.
     EVENTO: il gatto si mette in agguato. Camera: spinta lenta sul gatto.
     reads:  2,6–3,3   gli occhi si stringono sul mostro, la testa lo segue (cosa vuole il gatto)
             3,3–4,2   si abbassa in agguato, il sedere dondola: l'attesa del salto (0,9 s: è la preparazione, deve leggersi)
             4,2–4,4   l'ultimo istante prima dello scatto
  C  4,4–6,2  [taglio sull'azione: lo scatto comincia nell'ultimo fotogramma di B]  Campo largo, la camera segue il gatto verso destra.
     EVENTO: il salto. Il mostro è all'apice di un rimbalzo, il gatto gli arriva sopra.
     reads:  4,4–5,2   l'arco del salto, in grande (l'occhio segue la cosa che si muove più di tutte)
             5,2–6,2   il mostro alza gli occhi e vede il gatto che scende (reazione del mostro; tenuta 0,6 s)
  D  6,2–7,8  [taglio sull'azione: il contatto]  Primo piano al contatto, camera avvicinata, un piccolo scossone all'impatto.
     EVENTO: il gatto atterra sul mostro e lo schiaccia (squash 1,4, occhi sbarrati).
     reads:  6,2–6,6   il contatto e lo schiacciamento (0,4 s, con lo scossone)
             6,6–7,8   il gatto, felice, crede di aver preso il mostro; il mostro è piatto e trema (tenuta 1,2 s: è la battuta)
  E  7,8–10,0 [taglio sull'azione: il mostro scatta]  Campo largo.
     EVENTO: il mostro si ridistende di colpo, lancia in aria il gatto e scappa rimbalzando verso destra; il gatto ricade a terra.
     reads:  7,8–8,5   il mostro schizza via, il gatto vola su (l'occhio va al mostro, poi al gatto che sale)
             8,5–8,9   il gatto piomba a terra con il tonfo (sguardo sul gatto; polvere dipinta)
             8,9–10,0  il mostro rimbalza sempre più piccolo verso destra; il gatto resta sdraiato e lo segue con gli occhi
  F  10,0–12,0 [taglio sullo sguardo, poi uscita: pennellata]  Primo piano del gatto a terra (u 70), il mostro piccolo e lontano sulla collina in fondo.
     EVENTO: il gatto, stordito, inclina la testa; compare il `?`. Il mostro lontano fa ancora un rimbalzo (rima con l'inizio).
     reads:  10,0–10,6 il gatto sbatte le palpebre, la testa si inclina (confuso)
             10,6–11,4 il `?` compare sopra la testa e resta
             11,0–11,5 in fondo il mostro, minuscolo, fa un ultimo rimbalzo (secondo read, quando il primo è già atterrato)
             11,5–12,0 pennellata che copre il quadro (uscita)
  [fuori: pennellata (`brushWipe`) 11,5–12,0, colori cielo e salvia]

Controllo contro le regole:
- Un evento in ogni inquadratura: sì (A si accorge · B agguato · C salto · D schiaccia · E tonfo e fuga · F confuso).
- Ogni read ha il suo tempo e non si sovrappongono: la battuta di D (1,2 s) e quella di F (`?` 0,8 s) sono tenute apposta; il rimbalzo lontano di F arriva dopo che il `?` è già stato letto.
- Transizioni a ogni giuntura: iris in apertura, tagli sull'azione o sullo sguardo tra le inquadrature, pennellata in chiusura. Nessun taglio secco senza motivo.
- Testo: nessuno.
- La fine rima con l'inizio: gatto fermo che guarda il mostro che rimbalza, ma ora il mostro è lontano e il gatto è a terra.

Note tecniche:
- Un file di scena, `src/scenes/reel_gatto_mostro.js`; in `studio.html` sostituisce `demo.js`. `PROJECT.duration` 12, formato vertical, stile acquerello-leggero.
- `--draft` per le anteprime (12 fps, colori piatti); il render finale senza.
- Il gatto usa `character('gatto', …)` con `pose` e `expression` (`act()` per i cambi); il mostro `character('mostro', …)` con `since`/`kick` per le antenne.
