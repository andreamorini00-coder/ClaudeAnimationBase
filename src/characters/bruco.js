// bruco.js: the caterpillar (reference/characters/bruco/). Data only: the body draws it (bodies/crawler.js).
CHARACTERS.bruco = {
  id: 'bruco', version: 1, body: 'crawler',
  // a head 1.4 times a segment, then 8 equal segments
  proportions: { segments: 8, segR: 1, headK: 1.4, antenna: 1.6 },
  parts: {},
  roles: {
    body: '#A6B39A', spot: '#E8BF78', cheek: '#C99595', antenna: '#A47C61', cream: '#F6EBD8',
    line: '#59463B', shadow: '#8C8074',
  },
  features: [
    { id: 'segments', part: 'segments', views: ['front', 'q', 'side', 'back'], count: 8 },
    { id: 'spots', part: 'spots', views: ['q', 'side', 'back'], count: 8 },           // one yellow spot on top of each
    { id: 'feet', part: 'feet', views: ['q', 'side'], count: 16 },                   // a pair of little feet under each
    { id: 'antennae', part: 'antennae', views: ['front', 'q', 'side', 'back'], count: 2 },
    { id: 'eyes', part: 'eyes', views: ['front', 'q', 'side'] },
  ],
  // reference/characters/bruco/base.png, second row
  expressions: {
    felice: { eyes: 'happy', mouth: 'open' },
    triste: { eyes: 'sad', mouth: 'frown' },
    arrabbiato: { eyes: 'angry', mouth: 'frown' },
    sorpreso: { eyes: 'wide', mouth: 'o' },
    assonnato: { eyes: 'closed', mouth: 'smile' },
    curioso: { eyes: 'open', mouth: 'smile', headTilt: .22 },
  },
  // reference/characters/bruco/pose.png, left to right
  poses: {
    testaAlzata: { raise: 1 },
    onda: { cycle: 1, wave: 1, phase: -.35 },   // the arch mid-body at t = 0
    salto: { lift: 1.4, arch: .8, raise: .5 },
    disteso: {},
    testaAlta: { raise: 1.35, expression: { eyes: 'angry', mouth: 'smile' } },   // head high, determined
    arrotolato: { curl: 1 },
  },
};
