// supereroe.js: the hero (reference/characters/supereroe/). Data only: the biped body draws him (bodies/biped.js).
CHARACTERS.supereroe = {
  id: 'supereroe', version: 2, body: 'biped',
  // about 5.3 heads with the spikes (Andrea, 2026-10-27: a bigger head): foot .1 + leg 2.15 + torso 1.5 + neck .07 + head 1
  // + spikes .45. A V torso: wide shoulders, a narrow waist.
  proportions: { heads: 5.3, shoulders: 1.6, hips: .85, torso: 1.5, arm: 1.85, leg: 2.15, headW: 1.05 },
  parts: { hair: { style: 'spiky', locks: 5 }, mask: {}, star: {}, cape: {}, gloves: {}, boots: {}, brows: { kind: 'thick' },
    build: { arm: .32, leg: .44, taper: .7, round: .6 }, eyes: { size: 1.25 }, mouth: { size: 1.4 } },
  roles: {
    top: '#427BEF', legs: '#427BEF', accent: '#FF5D73', emblem: '#FFD166', hair: '#2B3766', skin: '#F5C6A5',
    skinShadow: '#D99A86', cheek: '#FF5D73', line: '#1C2440', shadow: '#555B91', eyeWhite: '#F7F2E8',
  },
  features: [
    { id: 'spikes', part: 'hair', views: ['front', 'q', 'side', 'back'], count: 5 },
    { id: 'mask', part: 'mask', views: ['front', 'q', 'side'] },                       // from the back it does not show
    { id: 'star', part: 'star', views: ['front', 'q', 'side'], count: 1 },
    { id: 'cape', part: 'cape', views: ['front', 'q', 'side', 'back'] },
    { id: 'gloves', part: 'gloves', views: ['front', 'q', 'side', 'back'] },
    { id: 'boots', part: 'boots', views: ['front', 'q', 'side', 'back'] },
    { id: 'ears', part: 'ears', views: ['front', 'q', 'side'] },
  ],
  // reference/characters/supereroe/base.png, second row
  expressions: {
    felice: { eyes: 'open', mouth: 'open' },
    triste: { eyes: 'open', mouth: 'frown', brows: -1 },
    arrabbiato: { eyes: 'open', mouth: 'frown', brows: 1, squint: .35 },
    sorpreso: { eyes: 'wide', mouth: 'o', brows: -.3 },
    assonnato: { eyes: 'sleepy', mouth: 'flat', brows: -.2 },
    imbarazzato: { eyes: 'open', mouth: 'smile', brows: -.6, blush: 1, look: -.6 },
  },
  // reference/characters/supereroe/pose.png, left to right
  poses: {
    inPiediEroico: { shoulderL: -.1, shoulderR: -.1, elbowL: .35, elbowR: .35, fistL: 1, fistR: 1, hipL: .2, hipR: .2, capeFlow: .15 },
    corsa: { cycle: 1, lean: .5, elbowL: .5, elbowR: .5, fistL: 1, fistR: 1, capeFlow: .8 },
    salto: { lift: 2.5, shoulderL: 2.6, shoulderR: 2.6, elbowL: .6, elbowR: .6, fistL: 1, fistR: 1, hipL: .9, kneeL: 1.8, hipR: .3, kneeR: 1.2, capeFlow: .5,
      expression: { mouth: 'open' } },
    voloOrizzontale: { flight: 1, lift: 3, shoulderR: 3, elbowR: 0, fistR: 1, shoulderL: .4, elbowL: .3, fistL: 1, hipR: -.1, kneeL: .2, kneeR: .4, capeFlow: 1 },
    pugno: { shoulderR: 1.57, elbowR: 0, fistR: 1, shoulderL: .4, elbowL: 2.3, fistL: 1, hipR: .5, hipL: -.45, kneeR: .35, crouch: .1, lean: .15, capeFlow: .4,
      expression: { mouth: 'open', brows: .6 } },
    atterraggio: { crouch: 1, lean: .8, shoulderR: .9, elbowR: .3, shoulderL: -.3, elbowL: 1.2, fistL: 1, capeFlow: .6 },
  },
};
