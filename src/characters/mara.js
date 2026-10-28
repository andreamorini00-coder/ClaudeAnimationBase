// mara.js: Mara, an adult for the visual novel (reference/characters/mara/). Data only: the biped body draws her.
// Measured on base.png (one head = 80 px there): about 7.5 heads, the figure as in the model sheet. Almost all dark:
// the lights on her hair (hairLight) and on the edges of her clothes (clothLight) keep her readable.
CHARACTERS.mara = {
  id: 'mara', version: 1, body: 'biped', faceSheet: true, poseCellW: .6,
  // foot .1 + heel .3 + leg 3.05 + torso 2.55 + neck .35 + head 1 + hair .09 = 7.44
  proportions: { heads: 7.5, shoulders: 1.8, hips: 2, torso: 2.55, arm: 2.6, leg: 3.05, headW: .78 },
  parts: {
    head: { chin: .3 },
    hair: { style: 'long', locks: 5, ears: false },
    eyes: { adult: true, size: .9 },
    mouth: { size: 1, lip: true },
    brows: { kind: 'thick' },
    figure: { bust: 2.05, waist: 1.15, hips: 2.4, thigh: 1.18, bustDepth: 1, rumpDepth: .9, neck: .35, hem: .25 },
    build: { arm: .44, leg: .64, taper: .4, forearm: .31, calf: .6 },
    neckline: { shape: 'wide' },
    sleeves: { length: 'short' },
    top: { rim: true },
    legwear: { kind: 'leggings', insert: true, shine: 1 },
    shoes: { heel: .3 },
  },
  roles: {
    skin: '#F5C6A5', skinShadow: '#E0A88A', hair: '#263450', hairLight: '#3E4F78', top: '#24242C', legs: '#24242C',
    shoes: '#24242C', clothLight: '#44444F', insert: '#777985', iris: '#66515B', eyeWhite: '#F7F2E8', lip: '#D99A8E',
    line: '#1C2440', shadow: '#8D86AA',
    cheek: '#E0A88A',                 // note.md gives no pink for the blush: the skin's shadow
  },
  features: [
    { id: 'locks', part: 'hair', views: ['front', 'q', 'back'], count: 5 },
    { id: 'hairLight', part: 'hair', views: ['front', 'q', 'back'], count: 5 },
    { id: 'insert', part: 'legs', views: ['front', 'q', 'side', 'back'] },             // the grey side insert
    { id: 'shine', part: 'legs', views: ['front', 'q', 'side', 'back'] },
    { id: 'rim', part: 'torso', views: ['front', 'q', 'side', 'back'] },
    { id: 'neckline', part: 'torso', views: ['front', 'q'] },
    { id: 'heels', part: 'shoes', views: ['side', 'q'] },
  ],
  // the same gestures as Vale's (base.png, second row, has the same gestures)
  gestures: {
    maniGiunte: { reachL: 1, reachR: 1, handXL: -.62, handYL: .8, handXR: -.62, handYR: .8 },
    manoDietroTesta: { reachL: 1, handXL: -.4, handYL: -1.6 },
    manoSulPetto: { reachR: 1, handXR: -.55, handYR: .75 },
    bracciaIncrociate: { reachL: 1, reachR: 1, handXL: -1, handYL: 1.15, handXR: -1, handYR: 1.05 },
    maniAlzate: { reachL: 1, reachR: 1, handXL: .35, handYL: -.35, handXR: .35, handYR: -.35, handOpenL: 1, handOpenR: 1 },
    manoSulCollo: { reachR: 1, handXR: -.45, handYR: .05, handFrontR: 1 },
    manoAlMento: { reachR: 1, handXR: -.6, handYR: -.12, handFrontR: 1 },
  },
  // base.png, second row (her faces a little softer than Vale's: the lip, warmer eyes)
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
  // pose.png, the standing ones (sitting, lying and leaning poses come with their props)
  poses: {
    inPiedi: { breath: 1 },
    manoSulFianco: { reachR: 1, handXR: -.25, handYR: 2.2, hipR: .08, hipL: -.04, breath: 1 },
    voltataIndietro: { headTurn: 1, shoulderL: .1, shoulderR: .1, breath: 1 },
    camminata: { cycle: .5 },
    manoTraICapelli: { reachL: 1, handXL: -.15, handYL: -1.3, hipL: .06, breath: 1 },
    saluto: { reachL: 1, handXL: .25, handYL: -1.5, handOpenL: 1, breath: 1 },
  },
  poseViews: { voltataIndietro: 'back' },
};
