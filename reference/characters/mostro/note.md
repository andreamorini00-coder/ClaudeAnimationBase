# Mostriciattolo — scheda personaggio

- Stile principale: anime
- Tipo di corpo: blob (senza arti)
- Proporzioni: goccia arrotondata, larghezza circa 3/4 dell'altezza (antenne escluse)
- File: `base.png` (viste, schiacciato/allungato, espressioni), `pose.png` (fermo, rotolamento, salto, slancio, broncio, schiacciato)

## Colori

| Ruolo | HEX |
|---|---|
| Corpo e antenne | #ADA2E8 |
| Pancia, occhio, dentini | #F7F2E8 |
| Punte antenne | #FFD166 |
| Guance | #FF5D73 |
| Contorno, pupilla, bocca | #1C2440 |
| Ombra | #555B91 |

## Tratti distintivi
- Un solo occhio grande e ovale, pupilla verticale.
- Due dentini sporgenti (sempre due, in tutte le pose).
- Due antenne sottili con pallina gialla.
- Pancia a mezzaluna crema, guance corallo tonde.

## Deformazione
- Schiacciato: largo circa 1,4 volte, alto circa 0,6 volte.
- Allungato: largo circa 0,8 volte, alto circa 1,3 volte.
- Il volume resta uguale: se si allarga si abbassa.
- Le antenne seguono il movimento con un leggero ritardo.

## Note per il codice
- Il corpo lavanda coincide con l'ombra delle nuvole dello stile anime: evitare di metterlo davanti a nuvole, preferire cielo blu o fondali scuri. Il contorno inchiostro deve restare sempre visibile.
- Le emozioni passano da occhio (palpebra), bocca e forma del corpo.

Fonte: model sheet generati con ChatGPT (22/10/2026); numero dei dentini fissato a due in revisione.
