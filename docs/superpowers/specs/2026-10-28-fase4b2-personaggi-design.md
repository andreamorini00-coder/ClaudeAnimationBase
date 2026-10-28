# Fase 4b2 — Bipede adulto per il visual novel: vale e mara

Spec della 4b2. I principi comuni (schede di soli dati, layout puro, disegno nello stile attivo, controlli sul layout,
model sheet da approvare) sono quelli della 4a (`2026-10-27-fase4a-personaggi-design.md`); il bipede è quello della
4b1 (`2026-10-27-fase4b1-personaggi-design.md`, `src/characters/bodies/biped.js`).

## Obiettivo

- Il bipede arriva agli **adulti a 7–7,5 teste**: vale e mara (`reference/characters/vale/`, `mara/`), fedeli ai
  loro `base.png`, con model sheet approvati negli stili `classic` e `acquerello-leggero`.
- **Viso a parti separate** (occhi, bocca, sopracciglia) da combinare nelle espressioni, come in `viso.png`, più i
  cicli di battito di ciglia e di bocca che parla.
- **Secondo abito di vale** ("ufficio", `pose-abito-ufficio.png`), con il suo sheet.
- **Note della roadmap sui bipedi** (Andrea, 2026-10-27): arti morbidi e affusolati; guanti e stivali più snelli;
  frangia della ragazza a 3 ciocche vere e testa dal retro meno "a fungo"; capelli del supereroe da davanti a ciuffo.

## Decisioni di Andrea (2026-10-28)

- **Un solo bipede con più parametri**, niente tipo di corpo "adulto" separato: gli arti nuovi migliorano tutti i
  bipedi.
- **Corporatura di vale e mara come nei loro `base.png`** (fedele ai model sheet), espressa come parametri della scheda
  così resta regolabile. Il foglio ufficio di vale usa la corporatura un po' meno accentuata di
  `pose-abito-ufficio.png`.
- **Pose sedute, sdraiate e appoggiate al muro: fuori dalla 4b2**, in roadmap insieme agli oggetti di scena (sgabello,
  divano, muro).
- Stile `visual-novel` non ancora disponibile (Fase 3): gli sheet si approvano in `classic` e `acquerello-leggero`.

## Design

### 1. Arti morbidi (`CG.limb`), per tutti i bipedi

- `CG.limb(joints, widths)`: un contorno unico e liscio attraverso i giunti (spalla-gomito-polso o anca-ginocchio-
  caviglia), con un profilo di larghezze lungo l'arto (per la gamba: coscia, sopra il ginocchio, ginocchio, polpaccio,
  caviglia; per il braccio: spalla, bicipite, gomito, avambraccio, polso). Le larghezze si interpolano in modo morbido;
  nel gomito e nel ginocchio piegati il contorno esterno gira con un arco, quello interno con una piega, senza
  giunture tonde.
- Le larghezze vengono da `parts.build` (`arm`, `leg`, `taper` come oggi) più, se la scheda li dà, `thigh`, `calf`,
  `forearm` (in teste). Senza, il profilo si ricava da `arm`, `leg`, `taper` (la ragazza e il supereroe non cambiano
  scheda, cambia la forma).
- **Guanti e stivali più snelli**: il risvolto del guanto 1,15 × il braccio (oggi 1,4), lo stivale segue il polpaccio
  con un bordo di 1,1 × (oggi 1,4); il piede dello stivale meno lungo (punta 1,4 × invece di 1,8).
- La ragazza e il supereroe passano a `version: 2` (cambia il disegno: vanno riapprovati).

### 2. Capelli dei bipedi esistenti

- **Frangia della ragazza**: 3 ciocche vere, a punta morbida e di lunghezze diverse (centrale la più lunga), che si
  sovrappongono un po' e si piegano verso l'esterno, invece della fila di gocce uguali.
- **Testa dal retro**: la massa del caschetto scende dritta dai lati della testa invece di allargarsi in una cupola più
  larga del cranio (la sagoma "a fungo").
- **Supereroe da davanti**: un ciuffo (2–3 punte grandi spazzate da un lato, sopra la fronte) invece del ventaglio di
  punte a corona; dal 3/4, dal profilo e dal retro restano le punte all'indietro.

### 3. Viso a parti (`faces.js`)

- Parti di `viso.png`, con i nomi di `FACES`:
  - **occhi**: `open` (aperti), `sleepy` (socchiusi), `closed` (chiusi), `happy` (chiusi sorridenti);
  - **bocca**: `flat` (chiusa), `ajar` (socchiusa, nuova), `open` ("a"), `o`, `grin` (sorriso con denti, nuova: i
    denti nel ruolo `eyeWhite`);
  - **sopracciglia**: per nome `neutral`, `raised`, `frown`, `sad` (nuovi, `FACES.BROWS`) oltre al numero -1..1 di
    oggi, che resta valido.
- **Occhio adulto** (`parts.eyes: { adult: true }`): a mandorla, con la linea spessa delle ciglia sopra che si allunga
  all'esterno, iride grande nel ruolo `iris`, pupilla, punto di luce nel ruolo `eyeWhite`; socchiuso = la palpebra
  copre la metà alta dell'iride; chiuso = arco delle ciglia verso il basso; sorridente = arco verso l'alto.
- **Labbro** (`parts.mouth: { lip: true }`, ruolo `lip`): una piccola forma sotto la bocca chiusa o socchiusa.
- La validazione (`validateCharacter`) controlla anche i nomi delle sopracciglia.
- **Cicli** in `act.js`, puri e deterministici:
  - `blink(t, seed)` → nome degli occhi a `t`: `open` → `sleepy` → `closed` → `sleepy` → `open` (in tutto 0,2 s), un
    battito ogni 3–5 s con l'intervallo deciso dal seme;
  - `talk(t, rate = 8)` → nome della bocca: alternanza `flat`, `ajar`, `open`, `o`, non periodica in modo evidente
    (sequenza fissa che dipende da `floor(t × rate)`).

### 4. Corpo adulto (`biped.js`)

- **Figura** (`parts.figure`, in teste; facoltativa — senza, il busto resta il blocco di oggi): `bust` (larghezza al
  petto), `waist` (vita), `hips` (fianchi, il punto più largo del bacino), `bustDepth` e `rumpDepth` (quanto petto e
  glutei sporgono di profilo), `thigh` (larghezza della coscia). Il busto diventa un contorno liscio spalla → petto →
  vita → fianchi per vista (fronte e retro dalle larghezze, profilo dalle profondità, 3/4 come misto); le cosce partono
  dalla larghezza dei fianchi. I valori di vale e mara si misurano su `base.png`; quelli dell'abito ufficio di vale su
  `pose-abito-ufficio.png`.
- **Scollo** (`parts.neckline: { shape: 'round' | 'wide', depth }`): pelle dentro il busto; `wide` = scollo largo
  sulle spalle (mara). **Clavicole**: due tratti brevi nello scollo.
- **Maniche** (`parts.sleeves: { length: 'long' | 'short' }`): lunghe = braccio nel ruolo `top` fino al polso; corte =
  `top` fino a metà braccio, poi pelle.
- **Gambe vestite** (`parts.legwear`): `{ kind: 'leggings', shine: 2 }` = 1–2 strisce di luce piatte nel ruolo
  `clothLight` lungo il bordo delle gambe, **visibili in ogni vista** (il colore è vicino al contorno);
  `{ kind: 'leggings', insert: true }` = inserto laterale dall'anca alla caviglia nel ruolo `insert` (mara);
  `{ kind: 'trousers', crease: true }` = pantaloni dritti, un po' più larghi della gamba, con la linea della piega.
- **Tacchi** (`parts.shoes: { heel }`, in teste): décolleté; il tallone si alza di `heel`, di profilo e 3/4 si vede
  il tacco sottile; il piede appoggia comunque a terra (punta e tacco sulla linea `y = 0`).
- **Ombra della pelle** (ruolo `skinShadow`, usato se la scheda lo ha): ombra sotto il mento sul collo (chiude anche la
  piccolezza del supereroe, che ha già il ruolo).
- **Gesti**: la scheda ha una tabella `gestures` (stessi parametri delle pose, solo braccia e mani) e un'espressione
  può nominarne uno (`gesture: 'maniGiunte'`). `resolveState` mette il gesto sopra la posa: è "che cosa fanno le
  mani" mentre la faccia cambia. Per i gesti servono, nuovi in `poseParams`:
  - `crossL/R` (radianti): nelle viste di fronte e dal retro l'avambraccio si piega verso il centro del corpo (le
    braccia incrociate, le mani giunte, la mano sul petto);
  - `handFrontL/R` 0/1: la mano passa davanti alla faccia (mano al mento, sul collo);
  - `headTurn` 0/1: dal retro la testa si gira e si vede il profilo (posa "voltata che guarda indietro");
  - `breath` 0..1: il respiro, spalle e petto si alzano di poco con `t` (circa 4 s per respiro).
- **Mezzo busto** (`state.bust`): il taglio scende sotto il petto per le figure con `figure`; tiene anche braccia e
  mani tagliate al bordo, per i gesti.
- **Capelli adulti**:
  - `hair: { style: 'bob', part: 'side' }` (vale): caschetto al mento con riga laterale; al posto delle 3 ciocche una
    frangia lunga spazzata da un lato che lascia scoperta la fronte dall'altro; ombra dei capelli (ruolo
    `hairShadow`) sotto la massa, ai lati del viso;
  - `hair: { style: 'long', locks: 5 }` (mara): riga centrale, massa oltre le spalle fatta di 4–6 grandi ciocche
    ondulate (davanti alle spalle da fronte e 3/4, sulla schiena dal retro), con una striscia di luce nel ruolo
    `hairLight` su ogni ciocca; i capelli non cambiano con il viso, si muovono solo con `breath`.
- **Ruoli delle opzioni**: alcune parti vogliono un ruolo solo con certe opzioni (`legwear.shine` e `top.rim` →
  `clothLight`, `legwear.insert` → `insert`, `mouth.lip` → `lip`, `eyes.adult` → `iris`, `hair.part` → `hairShadow`,
  `hair.style: 'long'` → `hairLight`). Il corpo li dice con `BODIES.biped.optionRoles(parts)` (lista di
  `[parte, ruolo]`); `validateCharacter` lo usa, se il corpo lo ha, come fa con `partRoles`.
- **Mani semplificate**: come oggi (ovale + pollice, pugno), più `open` aperta a ventaglio (mani alzate).

### 5. Abiti

- `spec.outfits = { <nome>: { parts, roles, features } }`: ogni abito sostituisce solo le chiavi che dà (`parts` e
  `roles` chiave per chiave, `features` per id). `outfitSpec(spec, name)` (in `act.js`) dà la scheda completa
  dell'abito; senza nome, quella principale. `character(id, …, { outfit })` e `resolveState` accettano `outfit`.
- Vale `ufficio`: `legwear: { kind: 'trousers', crease: true }`, `legs: '#292A34'`, figura meno accentuata.
- La validazione controlla ogni abito come scheda completa.

### 6. Le schede

- **Vale** (`version: 1`): 7,5 teste. Colori di `note.md`: `skin #F4C3AA`, `skinShadow #E0A88A`, `hair #C6C4C2`,
  `hairShadow #A3A1A6`, `top #C995A7`, `legs #292A34`, `shoes #292A34`, `clothLight #4A4B5A`, `iris #527D9C`,
  `eyeWhite #F7F2E8`, `line #1C2440`, `shadow #8D86AA`; `cheek #E0A88A` (la nota non dà un rosa per il rossore: si
  usa la pelle ombra). Tratti: caschetto con riga laterale, maglia a maniche lunghe con scollo tondo, strisce di luce
  sui leggings in tutte le viste, tacchi.
- **Mara** (`version: 1`): 7,5 teste. `skin #F5C6A5`, `skinShadow #E0A88A`, `hair #263450`, `hairLight #3E4F78`,
  `top #24242C`, `legs #24242C`, `shoes #24242C`, `clothLight #44444F` (luce sui bordi dei vestiti), `insert #777985`,
  `iris #66515B`, `eyeWhite #F7F2E8`, `lip #D99A8E`, `line #1C2440`, `shadow #8D86AA`, `cheek #E0A88A`. Tratti:
  5 ciocche, maglietta a maniche corte con scollo largo, inserto laterale in tutte le viste,
  tacchi. Con `parts.top: { rim: true }` anche la maglietta ha la luce sui bordi (`clothLight`), così la figura scura non diventa una macchia.
- **Espressioni** (8, di `base.png`, con il gesto): `neutra`, `sorriso` (mani giunte), `risata` (mano dietro la
  testa), `triste` (mano sul petto), `arrabbiata` (braccia incrociate), `sorpresa` (mani alzate), `imbarazzata` (mano
  sul collo, rossore), `pensierosa` (mano al mento). Le facce sono combinazioni delle parti del §3.
- **Pose** (6, figura intera): `inPiedi`, `manoSulFianco`, `voltataIndietro`, `camminata`, `manoTraICapelli` (la
  posa "appoggiata al muro" senza il muro), `saluto`.

### 7. Model sheet e approvazione

- Per ogni personaggio con `faceSheet: true` un terzo sheet `face_<id>`: le 13 varianti di `viso.png` a mezzo busto
  frontale, su 3 righe (4 occhi, 5 bocche, 4 sopracciglia), come il riferimento. Le 13 facce in una riga dello sheet
  principale sarebbero troppo piccole per giudicarle.
- Per ogni abito, gli stessi sheet con suffisso: `sheet_vale.ufficio`, `pose_vale.ufficio`, `face_vale.ufficio`.
- `tools/approve.mjs`: gli id approvabili sono i personaggi più `<id>.<abito>`; l'abito si salva in
  `reference/characters/<id>/approvati/<abito>/`; i tipi di sheet sono `sheet`, `pose` e, se c'è, `face`.

### 8. Controlli (`npm test`)

- Vale e mara: scheda valida, tratti per vista, solo i loro ruoli, niente NaN, flip esatto, deterministico, altezza
  in teste (7,5 ± 5%), arti di lunghezza costante e gomiti/ginocchia nel verso giusto; anche per l'abito ufficio.
- **Arti morbidi**: il contorno di ogni arto è un poligono semplice (non si incrocia) in ogni posa di ogni bipede;
  la larghezza alla caviglia e al polso è minore di quella alla coscia e alla spalla.
- **Viso**: ogni combinazione di occhi, bocca e sopracciglia del §3 si disegna senza errori e senza NaN; un nome di
  sopracciglia inesistente è un errore di validazione; `blink` e `talk` sono deterministici, `blink` chiude gli occhi
  almeno una volta in 5 s e mai per più di 0,25 s di fila.
- **Piedi a terra con il tacco**: in ogni posa senza `lift`, il punto più basso di gambe e scarpe è a `y = 0`.
- **Luce sui leggings** (vale, mara): in ogni vista e posa c'è almeno una parte `clothLight` per gamba visibile.
- **Abito**: `outfitSpec(vale, 'ufficio')` è una scheda valida senza `clothLight` sulle gambe e con la piega; la
  figura dell'abito è meno larga ai fianchi di quella principale.
- **Gesti**: in `arrabbiata` vista di fronte i polsi stanno dentro la larghezza delle spalle (braccia incrociate); in
  `pensierosa` la mano è sopra la faccia (profondità).
- I test dei bipedi esistenti restano (frangia della ragazza ancora 3 ciocche; punte del supereroe).

### 9. Fuori dalla 4b2 (in roadmap)

- Pose sedute, sdraiate, appoggiate al muro, con gli oggetti di scena (sgabello, divano, muro).
- Stile `visual-novel` (Fase 3): contorno #1C2440, ombre a due toni.

## Rischi

- **Arti nuovi su ragazza e supereroe**: cambiano gli sheet approvati. Si passa a `version: 2` subito e si
  riapprovano alla fine; le pose della 4b1 vanno ricontrollate (gomiti e ginocchia piegati, volo).
- **Corporatura dai riferimenti**: forme molto marcate in pochi parametri; il profilo è la vista più difficile.
  Si misura su `base.png` e si confronta con lo script di anteprima SVG prima del render.
- **Gesti nelle viste di fronte**: le braccia incrociate sono una proiezione che il modello a due segmenti non ha;
  `crossL/R` le approssima. Se non regge, i gesti si mostrano in 3/4 nel mezzo busto.
- **Figure scure** (mara): le luci (`hairLight`, `clothLight`) devono reggere anche in `acquerello-leggero`, dove i
  colori vanno verso la carta.

## Regole operative

Come nella 4b1: comandi per Andrea in CMD; nessun `git push`; `package-lock.json` mai nei commit; file aggiunti uno per
uno; script Python di modifica in file nello scratchpad; `npm run check` sempre `OK 9/9 identici`; branch
`fase4b2-personaggi`, merge in `main` solo dopo le approvazioni.
