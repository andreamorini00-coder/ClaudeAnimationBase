// anime.js: clean line, one hard shadow, vivid flat colours (reference/styles/anime/). Task 2 gives its palette and its
// lights; the rest of the style (technique, paper, grain, brushes, the cel parameters) comes in Task 4.
// The palette names are the kit's (PAL). Colours given by the notes are exact; the others are derived with the rule next
// to them (a mix in RGB, as mixCol does).
STYLES.anime = {
  palette: {
    paper: '#F7F2E8',                  // avorio
    ink: '#1C2440',                    // inchiostro (contorni, mai nero puro)
    clay: '#FF5D73',                   // corallo
    clayDk: '#C64F66',                 // corallo 25% verso inchiostro
    clayLt: '#FC919C',                 // corallo 35% verso avorio
    night: '#2B3766',                  // notte
    indigo: '#555B91',                 // viola ardesia (l'ombra unica)
    rose: '#E67296',                   // corallo 30% verso lavanda
    ochre: '#FFD166',                  // giallo dorato
    sap: '#3FAE9B',                    // verde acqua
    teal: '#409CB8',                   // verde acqua 35% verso blu
    violet: '#ADA2E8',                 // lavanda
    cream: '#F7F2E8',                  // avorio
    sky: '#427BEF',                    // blu intenso
  },
  // the lights (src/lighting.js): the skin keeps its own colour in each
  luci: {
    giorno: { tone: '#2B3766', k: 0, skin: '#F5C6A5', skinShadow: '#D99A86', shadow: '#555B91' },
    notte: {
      palette: { sky: '#2B3766', sap: '#367883', teal: '#366A8F', cream: '#9B9EAE' }, ink: '#111830',
      tone: '#2B3766', k: .42, skin: '#C9A39C', skinShadow: '#B98A86', shadow: '#3A4275',
    },
    controluce: {
      palette: { sky: '#F2A27E', sap: '#479198', cream: '#D7D4D7' },
      tone: '#555B91', k: .55, skin: '#D99A86', skinShadow: '#A87470', shadow: '#454B80', rim: { colore: '#FFD166', spessore: 2.5 },
    },
  },
};
