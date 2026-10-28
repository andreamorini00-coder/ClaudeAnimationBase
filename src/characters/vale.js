// vale.js: Vale, an adult for the visual novel (reference/characters/vale/). Data only: the biped body draws her.
// Measured on base.png (one head = 80 px there): about 7.5 heads, the figure as in the model sheet.
CHARACTERS.vale = {
  id: 'vale', version: 1, body: 'biped', faceSheet: true, poseCellW: .6,
  // foot .1 + heel .3 + leg 3.05 + torso 2.55 + neck .35 + head 1 + hair .09 = 7.44
  proportions: { heads: 7.5, shoulders: 1.75, hips: 2, torso: 2.55, arm: 2.6, leg: 3.05, headW: .78 },
  parts: {
    head: { chin: .32 },
    hair: { style: 'bob', part: 'side', ears: false },
    eyes: { adult: true, size: .9 },
    mouth: { size: 1 },
    brows: { kind: 'thick' },
    figure: { bust: 1.95, waist: 1.2, hips: 2.35, thigh: 1.15, bustDepth: .95, rumpDepth: .85, neck: .35, hem: .2 },
    build: { arm: .42, leg: .62, taper: .4, forearm: .3, calf: .58 },
    neckline: { shape: 'round' },
    sleeves: { length: 'long' },
    legwear: { kind: 'leggings', shine: 2 },
    shoes: { heel: .3 },
  },
  roles: {
    skin: '#F4C3AA', skinShadow: '#E0A88A', hair: '#C6C4C2', hairShadow: '#A3A1A6', top: '#C995A7', legs: '#292A34',
    shoes: '#292A34', clothLight: '#4A4B5A', iris: '#527D9C', eyeWhite: '#F7F2E8', line: '#1C2440', shadow: '#8D86AA',
    cheek: '#E0A88A',                 // note.md gives no pink for the blush: the skin's shadow
  },
  features: [
    { id: 'fringe', part: 'fringe', views: ['front', 'q', 'side'], count: 1 },          // the side-parted lock
    { id: 'shine', part: 'legs', views: ['front', 'q', 'side', 'back'] },             // the leggings' light, always
    { id: 'neckline', part: 'torso', views: ['front', 'q'] },
    { id: 'heels', part: 'shoes', views: ['side', 'q'] },
  ],
  // what the hands do in the expressions of base.png (second row); hands in heads from the shoulder, x outwards
  gestures: {
    maniGiunte: { reachL: 1, reachR: 1, handXL: -.62, handYL: .8, handXR: -.62, handYR: .8 },
    manoDietroTesta: { reachL: 1, handXL: -.4, handYL: -1.6 },
    manoSulPetto: { reachR: 1, handXR: -.55, handYR: .75 },
    bracciaIncrociate: { reachL: 1, reachR: 1, handXL: -1, handYL: 1.15, handXR: -1, handYR: 1.05 },
    maniAlzate: { reachL: 1, reachR: 1, handXL: .35, handYL: -.35, handXR: .35, handYR: -.35, handOpenL: 1, handOpenR: 1 },
    manoSulCollo: { reachR: 1, handXR: -.45, handYR: .05, handFrontR: 1 },
    manoAlMento: { reachR: 1, handXR: -.6, handYR: -.12, handFrontR: 1 },
  },
  // base.png, second row
  expressions: {
    neutra: { eyes: 'open', mouth: 'flat', brows: 'neutral' },
    sorriso: { eyes: 'happy', mouth: 'grin', brows: 'neutral', gesture: 'maniGiunte' },
    risata: { eyes: 'happy', mouth: 'open', brows: 'raised', gesture: 'manoDietroTesta' },
    triste: { eyes: 'open', mouth: 'flat', brows: 'sad', gesture: 'manoSulPetto' },
    arrabbiata: { eyes: 'open', mouth: 'flat', brows: 'frown', squint: .3, gesture: 'bracciaIncrociate' },
    sorpresa: { eyes: 'open', mouth: 'o', brows: 'raised', gesture: 'maniAlzate' },
    imbarazzata: { eyes: 'open', mouth: 'ajar', brows: 'sad', blush: 1, look: -.6, gesture: 'manoSulCollo' },
    pensierosa: { eyes: 'open', mouth: 'flat', brows: 'raised', look: .5, gesture: 'manoAlMento' },
  },
  // pose.png and pose-abito-ufficio.png, standing ones (sitting, lying and leaning poses come with their props)
  poses: {
    inPiedi: { breath: 1 },
    manoSulFianco: { reachR: 1, handXR: -.25, handYR: 2.2, hipR: .08, hipL: -.04, breath: 1 },
    voltataIndietro: { headTurn: 1, shoulderL: .1, shoulderR: .1, breath: 1 },
    camminata: { cycle: .5 },
    manoTraICapelli: { reachL: 1, handXL: -.15, handYL: -1.3, hipL: .06, breath: 1 },
    saluto: { reachL: 1, handXL: .25, handYL: -1.5, handOpenL: 1, breath: 1 },
  },
  poseViews: { voltataIndietro: 'back' },
  // pose-abito-ufficio.png: classic black trousers with a crease instead of the shiny leggings, and a figure a little
  // less pronounced than base.png's (Andrea, 2026-10-28)
  outfits: {
    ufficio: {
      parts: {
        legwear: { kind: 'trousers', crease: true },
        figure: { bust: 1.8, waist: 1.25, hips: 2.1, thigh: 1, bustDepth: .8, rumpDepth: .7, neck: .35, hem: .2 },
      },
      roles: { legs: '#292A34' },
      features: [{ id: 'shine', remove: true }, { id: 'crease', part: 'legs', views: ['front', 'q', 'side', 'back'] }],
    },
  },
};
