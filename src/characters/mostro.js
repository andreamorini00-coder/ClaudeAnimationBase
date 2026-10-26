// mostro.js: the little monster (reference/characters/mostro/). Data only: the body draws it (bodies/blob.js).
CHARACTERS.mostro = {
  id: 'mostro', version: 2, body: 'blob',
  // in units, at rest: the drop is 3/4 as wide as it is tall (antennae excluded)
  proportions: { height: 6, width: 4.5, antenna: 1.8, eyeH: 2.3 },
  parts: {},
  inferred: ['back'],      // views the reference doesn't show: drawn by deduction, labelled on the model sheet
  roles: { body: '#ADA2E8', belly: '#F7F2E8', tip: '#FFD166', cheek: '#FF5D73', line: '#1C2440', shadow: '#555B91' },
  features: [
    { id: 'eye', part: 'eye', views: ['front', 'q', 'side'] },
    { id: 'teeth', part: 'teeth', views: ['front', 'q', 'side'], count: 2 },
    { id: 'antennae', part: 'antennae', views: ['front', 'q', 'side', 'back'], count: 2 },
    { id: 'belly', part: 'belly', views: ['front', 'q', 'side'] },
    { id: 'cheeks', part: 'cheeks', views: ['front', 'q', 'side'], count: { front: 2, q: 2, side: 1 } },
  ],
  // reference/characters/mostro/base.png, second row
  expressions: {
    felice: { eye: 'happy', mouth: 'open' },
    triste: { lid: .35, lidTilt: -.7, mouth: 'frown' },
    arrabbiato: { lid: .4, lidTilt: .9, mouth: 'flat' },
    sorpreso: { mouth: 'o', squash: .9 },
    assonnato: { lid: .55, mouth: 'smile' },
    spaventato: { shiver: 1, mouth: 'pout', squash: .95 },
  },
  // reference/characters/mostro/pose.png, left to right (squash: the note's limits, at constant volume)
  poses: {
    fermo: {},
    rotolamento: { cycle: 1, squash: 1.1 },
    salto: { hop: 1.6, squash: .85 },
    slancio: { squash: .8, lean: .35 },
    broncio: { squash: 1.15, lean: -.1, expression: { lid: .45, lidTilt: -.4, mouth: 'frown' } },   // sulking, as in pose.png
    schiacciato: { squash: 1.4 },
  },
};
