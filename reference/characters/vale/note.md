# Vale — scheda personaggio

- Stile principale: visual novel
- Tipo di corpo: bipede adulto
- Proporzioni: circa 7,5 teste
- File: `base.png` (quattro viste, otto espressioni a mezzo busto con gesti, sagoma frontale), `viso.png` (13 varianti frontali di occhi, bocca e sopracciglia), `pose-abito-ufficio.png` (6 pose con un abito diverso, vedi sotto)

## Abito alternativo "ufficio" (pose-abito-ufficio.png)
- In questo foglio Vale ha pantaloni classici neri con la piega (#292A34) al posto dei leggings lucidi, e un fisico meno accentuato rispetto a base.png.
- NON è il look principale: va trattato come secondo abito del personaggio. Il look principale resta quello di base.png.
- Le pose (appoggiata al muro, seduta su sgabello, voltata indietro, seduta sul divano con tablet, mano sul fianco, che si sistema una scarpa) valgono come riferimento di movimento anche per il look principale.

## Colori

| Ruolo | HEX |
|---|---|
| Pelle | #F4C3AA |
| Pelle ombra | #E0A88A |
| Capelli | #C6C4C2 |
| Capelli ombra | #A3A1A6 |
| Maglia | #C995A7 |
| Leggings e tacchi | #292A34 |
| Luce sui leggings (bordo e 1-2 riflessi) | #4A4B5A |
| Occhi (iride) | #527D9C |
| Denti e bianco degli occhi | #F7F2E8 (mai bianco puro) |
| Contorno | #1C2440 (contorno dello stile visual novel) |
| Ombra generale | #8D86AA |

## Tratti distintivi
- Caschetto grigio argento con riga laterale, lunghezza al mento.
- Occhi azzurro-grigi, sguardo morbido.
- Maglia rosa a maniche lunghe con scollo tondo.
- Leggings scuri lucidi e décolleté col tacco.

## Espressioni (base.png)
neutra, sorriso (mani giunte), risata (mano dietro la testa), triste (mano sul petto), arrabbiata (braccia incrociate), sorpresa (mani alzate), imbarazzata (mano sul collo, rossore), pensierosa (mano al mento).

## Parti del viso (viso.png)
Viso frontale identico in tutte le varianti: si combinano occhi, bocca e sopracciglia separatamente.
- Riga 1 — occhi: aperti, socchiusi, chiusi, chiusi sorridenti (bocca neutra).
- Riga 2 — bocca: chiusa, socchiusa, aperta "a", aperta "o", sorriso con denti (occhi aperti).
- Riga 3 — sopracciglia: neutre, alzate, aggrottate, tristi.

Uso in animazione:
- battito di ciglia: aperti → socchiusi → chiusi → socchiusi → aperti, ogni 3-5 secondi con piccola variazione;
- bocca che "parla" senza audio: alternanza chiusa / socchiusa / aperta "a" / aperta "o";
- le espressioni di base.png si ottengono combinando queste parti più il gesto delle mani.

## Note per il codice
- Leggings: colore piatto con 1-2 strisce di luce #4A4B5A, niente riflessi sfumati. La linea di luce sul bordo delle gambe deve restare sempre visibile, perché il colore dei leggings è vicino al contorno.
- Mani semplificate.
- Nel visual novel si anima soprattutto il mezzo busto: occhi, bocca, sopracciglia, gesti delle mani, respiro.

Fonte: model sheet generato con ChatGPT (26/10/2026); contorno, ombre e luce dei leggings definite in revisione.
