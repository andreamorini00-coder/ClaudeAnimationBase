// anime.js: clean line, one hard shadow, vivid flat colours (reference/styles/anime/). The cel technique
// (src/techniques/cel.js) draws it; it has the three lights of src/lighting.js (giorno, notte, controluce).
// The palette names are the kit's (PAL). Colours given by the notes are exact; the others are derived with the rule next
// to them (a mix in RGB, as mixCol does).
STYLES.anime = {
  technique: 'cel',
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
  // no paper texture, almost no grain: the anime look is clean
  paper: { seed: 11, stains: 0, stainR: [120, 380], stainAlpha: 0, stainRGB: '160,125,80',
           fibers: 0, fiberLen: [6, 26], fiberAlpha: [0, 0], fiberRGB: '110,88,60' },
  grain: { seed: 5, density: .1, depth: 8, vignette: .06, vignetteRGB: '43,55,102', vignetteR: [.55, 1.15] },
  // the brushes the page defines (the cel technique draws its marks itself; glow() and the lettering don't use them)
  brushes: {
    ink: { type: 'default', weight: 4.8, scatter: .25, sharpness: .8, grain: 40, opacity: 235, spacing: .2, pressure: [1.15, .75], rotate: 'natural', noise: .15 },
    inkfine: { type: 'default', weight: 2.6, scatter: .15, sharpness: .85, grain: 40, opacity: 230, spacing: .2, pressure: [1.1, .8], rotate: 'natural', noise: .1 },
    dry: { type: 'default', weight: 14, scatter: 3, sharpness: .3, grain: 6, opacity: 90, spacing: .6, pressure: [1, .6], rotate: 'natural', noise: .4 },
  },
  brushScale: 5,
  boil: 12,
  paint: { fillOp: 1, bleed: 1, tex: 1, washOp: 1, sw: 1, fillAs: 'fill' },
  character: { toPaper: 0, shadow: 'hard', lineWeight: 1 },
  // cel: the outer line thicker than the inner ones, a quiet breath, one hard shadow in viola ardesia from the upper left
  cel: { line: 1, lineInner: .6, wobble: .25, light: [-1, -1], shadow: '#555B91', skinShadow: '#D99A86', shadeK: .5, shadeSize: .24, tones: 1, outline: 'constant' },
  // the lights (src/lighting.js): the skin keeps its own colour in each
  luci: {
    giorno: { tone: '#2B3766', k: 0, skin: '#F5C6A5', skinShadow: '#D99A86', shadow: '#555B91' },
    notte: {
      palette: { sky: '#2B3766', sap: '#367883', teal: '#366A8F', cream: '#9B9EAE' }, ink: '#111830',
      tone: '#2F3C85', k: .34, skin: '#C9A39C', skinShadow: '#B98A86', shadow: '#3A4275',
    },
    controluce: {
      palette: { sky: '#F3A27E', sap: '#479198', cream: '#D7D4D7' },
      tone: '#555B91', k: .55, skin: '#D99A86', skinShadow: '#A87470', shadow: '#454B80', rim: { colore: '#FFD166', spessore: 2.5 },
    },
  },
};
