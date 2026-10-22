// acquerello-leggero.js: light watercolour. The classic palette mixed 30% toward a paler paper, flat colour instead of
// most watercolour fills (half as opaque, so the paper shows through, and much faster to render), a slightly lighter
// ink line that still reads on a phone, and softer paper and vignette. The night colours are a diluted indigo-blue
// rather than the 30% mix, which turned grey. Same names as classic: scenes don't change.
STYLES['acquerello-leggero'] = {
  technique: 'watercolor',
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
};
