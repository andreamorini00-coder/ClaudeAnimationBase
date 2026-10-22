// classic.js: the kit's original look, the reference every other style is measured against.
// A style is everything that decides how the film looks but not what happens in it: colours, paper, grain, brushes,
// boil. To make a new one, copy this file, rename the entry, add a <script> tag in studio.html and pick it in config.js
// (or pass --style=name to render.mjs). Character proportions don't belong here.
STYLES.classic = {
  technique: 'watercolor',
  // PAL: the names scenes use (PAL.sky, PAL.clay…). A new style keeps the names and changes the colours.
  palette: {
    paper: '#F3EBDC', ink: '#2B2233', clay: '#D97757', clayDk: '#A84D33', clayLt: '#F2A283',
    night: '#1F2550', indigo: '#2F3C7A', rose: '#E27A92', ochre: '#E8AA38', sap: '#6E9F58',
    teal: '#3A9C98', violet: '#7B5CA8', cream: '#FFF5E2', sky: '#8EC3E6'
  },
  // makePaper: stains (soft blotches) then fibers (short curved strokes). Ranges are [min, extra]: min + random * extra.
  paper: { seed: 11, stains: 70, stainR: [120, 380], stainAlpha: .045, stainRGB: '160,125,80',
           fibers: 1400, fiberLen: [6, 26], fiberAlpha: [.035, .06], fiberRGB: '110,88,60' },
  // makeGrain: speckle multiplied over the frame, plus a vignette from radius H*vignetteR[0] to H*vignetteR[1].
  grain: { seed: 5, density: .55, depth: 34, vignette: .35, vignetteRGB: '120,95,70', vignetteR: [.45, 1.05] },
  // p5.brush definitions, passed to brush.add(name, def) in this order.
  brushes: {
    ink: { type: 'default', weight: 5, scatter: .25, sharpness: .8, grain: 40, opacity: 235, spacing: .2, pressure: [1.15, .75], rotate: 'natural', noise: .15 },
    inkfine: { type: 'default', weight: 2.6, scatter: .15, sharpness: .85, grain: 40, opacity: 230, spacing: .2, pressure: [1.1, .8], rotate: 'natural', noise: .1 },
    dry: { type: 'default', weight: 14, scatter: 3, sharpness: .3, grain: 6, opacity: 90, spacing: .6, pressure: [1, .6], rotate: 'natural', noise: .4 },
  },
  brushScale: 5,
  boil: 12,          // boil drawings per second
  // Multipliers applied to every paint() and inkLine() call (1 = unchanged). fillAs: 'fill' keeps watercolour fills,
  // 'wash' paints them as flat colour (cheaper to render).
  paint: { fillOp: 1, bleed: 1, tex: 1, washOp: 1, sw: 1, fillAs: 'fill' },
};
