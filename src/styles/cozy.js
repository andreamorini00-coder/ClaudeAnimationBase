// cozy.js: warm and soft, flat colour with one hard shadow, round and quiet (reference/styles/cozy/). The cel technique
// (src/techniques/cel.js) draws it. The palette names are the kit's (PAL). Colours given by the notes are exact; the
// others are derived with the rule next to them (a mix in RGB, as mixCol does). No set of lights: it is always day.
STYLES.cozy = {
  technique: 'cel',
  palette: {
    paper: '#F6EBD8',                  // crema
    ink: '#59463B',                    // marrone scuro (contorni, mai nero puro)
    clay: '#D9956C',                   // arancio morbido
    clayDk: '#B8674F',                 // terracotta
    clayLt: '#E3B392',                 // arancio morbido 35% verso crema
    night: '#7E8C9A',                  // blu crepuscolo (cielo coperto, pioggia, notte)
    indigo: '#757B82',                 // blu crepuscolo 25% verso marrone scuro
    rose: '#C99595',                   // rosa antico
    ochre: '#E8BF78',                  // oro tenue (luce, lampade)
    sap: '#A6B39A',                    // verde salvia
    teal: '#8E9C9A',                   // blu crepuscolo 40% verso salvia
    violet: '#8C8074',                 // tortora (l'ombra unica)
    cream: '#FAF3E8',                  // crema 40% verso bianco
    sky: '#EED3A3',                    // oro tenue 45% verso crema (la luce calda del pomeriggio della mood board)
  },
  // a light paper, a soft grain, a gentle vignette
  paper: { seed: 11, stains: 40, stainR: [120, 380], stainAlpha: .02, stainRGB: '160,125,80',
           fibers: 600, fiberLen: [6, 26], fiberAlpha: [.012, .022], fiberRGB: '110,88,60' },
  grain: { seed: 5, density: .35, depth: 14, vignette: .12, vignetteRGB: '120,95,70', vignetteR: [.5, 1.1] },
  // the brushes the page defines (the cel technique draws its marks itself; glow() and the lettering don't use them)
  brushes: {
    ink: { type: 'default', weight: 4.8, scatter: .25, sharpness: .8, grain: 40, opacity: 235, spacing: .2, pressure: [1.15, .75], rotate: 'natural', noise: .15 },
    inkfine: { type: 'default', weight: 2.6, scatter: .15, sharpness: .85, grain: 40, opacity: 230, spacing: .2, pressure: [1.1, .8], rotate: 'natural', noise: .1 },
    dry: { type: 'default', weight: 14, scatter: 3, sharpness: .3, grain: 6, opacity: 90, spacing: .6, pressure: [1, .6], rotate: 'natural', noise: .4 },
  },
  brushScale: 5,
  boil: 12,
  paint: { fillOp: 1, bleed: 1, tex: 1, washOp: 1, sw: 1, fillAs: 'fill' },
  // characters keep their own colours (the cat's are this palette's); the shadow is the cel technique's crescent
  character: { toPaper: 0, shadow: 'hard', lineWeight: 1 },
  // cel: a soft, constant outline, a little breath in it, one shadow in tortora from the upper left
  cel: { line: 1, lineInner: .8, wobble: .6, light: [-1, -1], shadow: '#8C8074', skinShadow: '#C99595', shadeK: .5, shadeSize: .2, tones: 1, outline: 'constant' },
};
