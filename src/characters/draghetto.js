// draghetto.js: the little dragon (reference/characters/draghetto/). Data only: the quadruped body draws it, wings and
// all (bodies/quadruped.js).
CHARACTERS.draghetto = {
  id: 'draghetto', version: 1, body: 'quadruped',
  // a big round head (about a third of the body without the tail), short legs, a tail as long as the body
  proportions: { length: 10.5, head: 4, bodyHeight: 3.6, legLength: 1.1, legWidth: 1.25, tail: 6.8 },
  parts: {
    horns: { size: 1 }, crests: { head: 3, tail: 4 }, belly: {}, wings: { span: 2.5, sections: 3 },
    tail: { width: .45, base: 1.9, angle: { side: -.97, q: -.96, front: -.06 }, y: { side: .05, q: .05, front: .35 }, hook: .9, tip: false }, eyes: { iris: true, size: 1.35 },
  },
  roles: {
    fur: '#3FAE9B', cream: '#F7F2E8', membrane: '#ADA2E8', iris: '#FFD166', crest: '#FF5D73',
    line: '#1C2440', shadow: '#555B91',
  },
  features: [
    { id: 'horns', part: 'horns', views: ['front', 'q', 'side', 'back'], count: 2 },
    { id: 'crestsHead', part: 'crests', views: ['front', 'q', 'side', 'back'], count: 3 },
    { id: 'crestsTail', part: 'crests', views: ['front', 'q', 'side', 'back'], count: 4 },
    { id: 'belly', part: 'belly', views: ['front', 'q', 'side'] },
    { id: 'wings', part: 'wings', views: ['front', 'q', 'side', 'back'], count: 2 },   // one per side, even when the far one hides
  ],
  // reference/characters/draghetto/base.png, second row
  expressions: {
    felice: { eyes: 'open', mouth: 'smile' },
    triste: { eyes: 'sad', mouth: 'frown', tail: -.2 },
    arrabbiato: { eyes: 'angry', mouth: 'frown' },
    sorpreso: { eyes: 'wide', mouth: 'o' },
    assonnato: { eyes: 'sleepy', mouth: 'flat' },
    curioso: { eyes: 'open', mouth: 'smile', headTilt: .22 },
  },
  // reference/characters/draghetto/pose.png, left to right
  poses: {
    fermo: {},
    corsa: { cycle: 1, legSwing: 1, legPhase: .25, stretch: 1.1, lift: .3, pitch: .03, wingOpen: .25 },
    saltoAli: { lift: 2.2, pitch: .25, legSwing: .45, wingOpen: .8, expression: { mouth: 'open' } },
    volo: { wingOpen: 1, flap: 1, lift: 3, crouch: .6, legSwing: .9, stretch: 1.12, pitch: -.05 },   // legs tucked
    zampata: { pawRaise: 1, pitch: .08, expression: { eyes: 'angry', mouth: 'smile' } },
    prontoDecollo: { wingOpen: 1, crouch: .7, pitch: -.12, headDrop: .4, expression: { mouth: 'open' } },
  },
};
