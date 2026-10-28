// ragazza.js: the girl (reference/characters/ragazza/). Data only: the biped body draws her (bodies/biped.js).
CHARACTERS.ragazza = {
  id: 'ragazza', version: 2, body: 'biped',
  // about 3 heads (soft chibi): foot .1 + leg .95 + torso .8 + neck .07 + head 1 + hair .09
  proportions: { heads: 3, shoulders: .8, hips: .76, torso: .8, arm: .88, leg: .95, headW: 1.12 },
  parts: { hair: { style: 'bob' }, skirt: {}, shoes: {}, sleeves: { wide: true }, eyes: { dark: true }, cheeks: {} },
  roles: {
    skin: '#F2D6BC', hair: '#A47C61', top: '#A6B39A', skirt: '#C99595', cheek: '#C99595', shoes: '#7A5C49',
    legs: '#F2D6BC', line: '#59463B', shadow: '#8C8074', eyeWhite: '#F6EBD8',
  },
  features: [
    { id: 'fringe', part: 'fringe', views: ['front', 'q', 'side'], count: 3 },        // three locks on the forehead
    { id: 'cheeks', part: 'cheeks', views: ['front', 'q', 'side'], count: { front: 2, q: 2, side: 1 } },
    { id: 'skirt', part: 'skirt', views: ['front', 'q', 'side', 'back'] },
    { id: 'ears', part: 'ears', views: ['front', 'q', 'side'] },
  ],
  // reference/characters/ragazza/base.png, second row
  expressions: {
    felice: { eyes: 'open', mouth: 'smile' },
    triste: { eyes: 'open', mouth: 'frown', brows: -1 },
    arrabbiata: { eyes: 'open', mouth: 'frown', brows: 1 },
    sorpresa: { eyes: 'wide', mouth: 'o', brows: -.4 },
    assonnata: { eyes: 'sleepy', mouth: 'flat', brows: -.2 },
    imbarazzata: { eyes: 'open', mouth: 'smile', brows: -.6, blush: 1, headTilt: -.08 },
  },
  // reference/characters/ragazza/pose.png, left to right
  poses: {
    inPiedi: {},
    corsa: { cycle: 1, lean: .5, shoulderL: .1, shoulderR: .1, elbowL: .4, elbowR: .4, fistL: 1, fistR: 1 },
    salto: { lift: 1.6, shoulderL: 2.5, shoulderR: 2.5, elbowL: .5, elbowR: .5, fistL: 1, fistR: 1, hipL: .5, hipR: .2, kneeL: 1.9, kneeR: 1.6,
      expression: { eyes: 'happy', mouth: 'open' } },
    volo: { flight: 1, lift: 2.2, shoulderR: 2.9, elbowR: 0, fistR: 1, shoulderL: .3, elbowL: 1.2, fistL: 1, hipL: -.15, kneeL: .5, kneeR: .3 },
    pugno: { shoulderR: 1.55, elbowR: 0, fistR: 1, shoulderL: .5, elbowL: 2.2, fistL: 1, hipR: .45, hipL: -.4, kneeR: .3, crouch: .15, lean: .2,
      expression: { brows: 1 } },
    accovacciata: { crouch: 1, lean: .6, shoulderR: .5, elbowR: .1, shoulderL: .3, elbowL: .2 },
  },
};
