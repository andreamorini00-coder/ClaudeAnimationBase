# Mara — scheda personaggio

- Stile principale: visual novel
- Tipo di corpo: bipede adulto
- Proporzioni: circa 7,5 teste
- File: `base.png` (quattro viste, otto espressioni a mezzo busto con gesti, sagoma frontale), `viso.png` (13 varianti frontali di occhi, bocca e sopracciglia), `pose.png` (6 pose a figura intera: appoggiata al muro con mano tra i capelli, seduta su sgabello a gambe accavallate, voltata guardando indietro, distesa sul divano su un gomito, in piedi con mano sul fianco, che si toglie una scarpa appoggiata al muro)
- Nota: questo model sheet è la versione ufficiale. Nella mood board dello stile visual novel Mara ha un cardigan salvia: vale solo come atmosfera.

## Colori

| Ruolo | HEX |
|---|---|
| Pelle | #F5C6A5 |
| Pelle ombra | #E0A88A |
| Capelli | #263450 |
| Capelli luce (ciocche) | #3E4F78 |
| Maglietta, leggings, tacchi | #24242C |
| Luce sui vestiti (bordi) | #44444F |
| Inserti laterali dei leggings | #777985 (striscia piatta, senza trasparenza) |
| Occhi (iride) | #66515B |
| Denti e bianco degli occhi | #F7F2E8 (mai bianco puro) |
| Labbra | #D99A8E (leggero, solo sul labbro inferiore) |
| Contorno | #1C2440 |
| Ombra generale | #8D86AA |

## Tratti distintivi
- Capelli lunghi ondulati blu notte, oltre le spalle, riga centrale.
- Maglietta nera a maniche corte con scollo largo sulle spalle.
- Leggings neri con inserto laterale grigio dall'anca alla caviglia.
- Décolleté nere col tacco.
- Occhi scuri caldi.

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
- i capelli restano fermi quando cambia il viso; si muovono solo con il respiro o un gesto.

## Note per il codice
- Personaggio quasi tutto scuro: le luci #3E4F78 sui capelli e #44444F sui bordi dei vestiti devono restare sempre visibili, altrimenti la figura diventa una macchia unica. Evitare fondali molto scuri senza una luce dietro di lei.
- Capelli come 4-6 grandi ciocche ondulate, non fili singoli.
- Mani semplificate.

Fonte: model sheet generato con ChatGPT (26/10/2026); luci, ombre e inserti definiti in revisione.
