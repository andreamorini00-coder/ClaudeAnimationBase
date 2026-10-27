// gatto.js: the cat (reference/characters/gatto/). Data only: the body draws it (bodies/quadruped.js).
CHARACTERS.gatto = {
  id: 'gatto', version: 2, body: 'quadruped',
  // in units: nose to rump, head width, body height, leg length and width, tail length. Andrea (2026-10-27): the head
  // about 0.45 of the length and almost as tall as the body; a short round body; short legs. Second round: the body
  // about 20% shorter, a round bean as in base.png. v2 (4b1): from the back the tail starts low and rises up the middle.
  proportions: { length: 9.3, head: 4.5, bodyHeight: 4.3, legLength: .95, legWidth: 1.2, tail: 4.2 },
  parts: { ears: { size: 1.15 }, blaze: {}, whiskers: {}, tail: { width: .85 }, eyes: { dark: true }, collar: {}, bell: {} },
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
    corsa: { cycle: 1, legSwing: 1.1, legPhase: .25, stretch: 1.16, lift: .35, pitch: .03 },   // stretched out at t = 0
    salto: { lift: 2.4, pitch: .3, legSwing: .45 },
    balzo: { lift: 1.5, stretch: 1.18, legSwing: 1.1 },
    zampata: { pawRaise: 1, pitch: .08 },
    agguato: { crouch: 1, pitch: -.2, headDrop: 1.3, stretch: 1.08 },   // flat to the ground, head low, rump high
  },
};
