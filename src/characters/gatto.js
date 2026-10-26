// gatto.js: the cat (reference/characters/gatto/). Data only: the body draws it (bodies/quadruped.js).
CHARACTERS.gatto = {
  id: 'gatto', version: 1, body: 'quadruped',
  // in units: nose to rump, head width, body height, leg length and width, tail length
  proportions: { length: 10.4, head: 3.5, bodyHeight: 4.8, legLength: .9, legWidth: 1.1, tail: 4.4 },
  parts: { ears: { size: 1 }, tail: { width: .85 }, collar: {}, bell: {} },
  roles: {
    fur: '#D9956C', cream: '#F6EBD8', earInner: '#C99595', collar: '#B8674F', bell: '#E8BF78',
    line: '#59463B', shadow: '#8C8074', eyeWhite: '#F6EBD8',
  },
  features: [
    { id: 'blaze', part: 'blaze', views: ['front', 'q', 'side'] },           // cream drop from the muzzle to the chest
    { id: 'collar', part: 'collar', views: ['front', 'q', 'side', 'back'] },
    { id: 'bell', part: 'bell', views: ['front', 'q', 'side'] },             // from the back only the collar shows
    { id: 'tailTip', part: 'tailTip', views: ['front', 'q', 'side', 'back'] },
    { id: 'earInner', part: 'ears', views: ['front', 'q', 'side'] },
    { id: 'whiskers', part: 'whiskers', views: ['front', 'q', 'side'] },
  ],
  // reference/characters/gatto/base.png, second row
  expressions: {
    felice: { eyes: 'happy', mouth: 'open', ears: 0, tail: .2 },
    triste: { eyes: 'sad', mouth: 'frown', ears: -1, tail: -1 },
    arrabbiato: { eyes: 'angry', mouth: 'frown', ears: 1, tail: -.15 },
    sorpreso: { eyes: 'wide', mouth: 'o', ears: .1, tail: 1 },
    assonnato: { eyes: 'closed', mouth: 'flat', ears: -.3, tailCurl: 1 },
    curioso: { eyes: 'open', mouth: 'catSmile', headTilt: .22, ears: 0 },
  },
  // reference/characters/gatto/pose.png, left to right
  poses: {
    inPiedi: {},
    corsa: { cycle: 1, legSwing: .9, stretch: 1.06, pitch: .04 },
    salto: { lift: 2.4, pitch: .3, legSwing: .45 },
    balzo: { lift: 1.5, stretch: 1.18, legSwing: 1.1 },
    zampata: { pawRaise: 1, pitch: .06 },
    agguato: { crouch: 1, pitch: -.1 },
  },
};
