// vale.js: Vale, an adult for the visual novel (reference/characters/vale/). Data only: the biped body draws her.
// Measured on base.png (one head = 80 px there): about 7.5 heads, the figure as in the model sheet.
CHARACTERS.vale = {
  id: 'vale', version: 1, body: 'biped', faceSheet: true,
  // foot .1 + heel .3 + leg 3.05 + torso 2.55 + neck .35 + head 1 + hair .09 = 7.44
  proportions: { heads: 7.5, shoulders: 1.75, hips: 2, torso: 2.55, arm: 2.6, leg: 3.05, headW: .78 },
  parts: {
    head: { chin: .32 },
    hair: { style: 'bob', part: 'side', ears: false },
    eyes: { adult: true, size: .9 },
    mouth: { size: .8 },
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
  expressions: {
    neutra: { eyes: 'open', mouth: 'flat', brows: 'neutral' },
  },
  poses: {
    inPiedi: {},
  },
};
