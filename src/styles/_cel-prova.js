// _cel-prova.js: prototype style of Task 1 (the palette of acquerello-leggero on the cel technique); removed in Task 4.
STYLES['_cel-prova'] = {
  technique: 'cel',
  cel: { line: 1, lineInner: .6, wobble: .25, light: [-1, -1], shadow: '#8C8074', shadeK: .45, shadeSize: .22, tones: 1, outline: 'constant' },
  palette: {
    paper: '#FBF6EC', ink: '#4A4152', clay: '#E39D84', clayDk: '#C1806B', clayLt: '#F5BBA3',
    night: '#3F4B85', indigo: '#5F6EA2', rose: '#EA9FAD', ochre: '#EEC16E', sap: '#98B984',
    teal: '#74B7B1', violet: '#9183B3', cream: '#FEF5E5', sky: '#AFD2E8'
  },
  // classic's paper with 60% of the stain and fiber strength
  paper: { seed: 11, stains: 70, stainR: [120, 380], stainAlpha: .027, stainRGB: '160,125,80',
           fibers: 1400, fiberLen: [6, 26], fiberAlpha: [.021, .036], fiberRGB: '110,88,60' },
  grain: { seed: 5, density: .55, depth: 26, vignette: .2, vignetteRGB: '120,95,70', vignetteR: [.45, 1.05] },
  brushes: {
    ink: { type: 'default', weight: 4.8, scatter: .25, sharpness: .8, grain: 40, opacity: 235, spacing: .2, pressure: [1.15, .75], rotate: 'natural', noise: .15 },
    inkfine: { type: 'default', weight: 2.6, scatter: .15, sharpness: .85, grain: 40, opacity: 230, spacing: .2, pressure: [1.1, .8], rotate: 'natural', noise: .1 },
    dry: { type: 'default', weight: 14, scatter: 3, sharpness: .3, grain: 6, opacity: 90, spacing: .6, pressure: [1, .6], rotate: 'natural', noise: .4 },
  },
  brushScale: 5,
  boil: 12,
  paint: { fillOp: .5, bleed: .7, tex: .6, washOp: 1, sw: .9, fillAs: 'wash' },
  // characters' colours, lightened towards the paper like the rest of this palette
  character: { toPaper: .3 },
};
