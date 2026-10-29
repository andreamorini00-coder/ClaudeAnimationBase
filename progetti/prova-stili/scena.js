// prova-stili: the cat, the monster and the girl in a row, moving, first at scale 1 and then the camera at zoom 1.8 on the cat.
(() => {
  const G = 880;
  function shot(t) {
    const z = t < 1.5 ? 1 : lerp(1, 1.8, ease(seg(t, 1.5, 1.8)));
    camBegin(lerp(960, 430, seg(t, 1.5, 1.8)), lerp(540, G - 160, seg(t, 1.5, 1.8)), z);
    boilSeed('sky'); paint(rectPts(-600, -400, W + 1200, G + 400), { wash: PAL.sky, ink: null });
    boilSeed('hill'); paint(ellPts(900, G + 60, 1100, 330, 40, 3), { wash: PAL.sap, ink: PAL.ink, sw: 1 });
    boilSeed('ground'); paint(rectPts(-600, G, W + 1200, 700), { wash: PAL.sap, ink: null });
    character('gatto', 430, G, 36, { view: 'side', pose: 'corsa', expression: 'felice', t, key: 'gatto' });
    character('mostro', 960, G, 40, { view: 'q', pose: 'rotolamento', expression: 'felice', t, key: 'mostro' });
    character('ragazza', 1450, G, 30, { view: 'q', pose: 'corsa', expression: 'felice', t, key: 'ragazza' });
    camEnd();
  }
  shots([[0, shot]], { format: 'landscape' });
})();

// A loop of single shapes, to look at the cel technique's shadow and rim on convex, concave and open shapes.
LOOPS.forme = t => {
  boilSeed('bg'); paint(rectPts(-50, -50, W + 100, H + 100), { wash: PAL.cream, ink: null });
  const col = PAL.clay, row = (i, f) => { boilSeed('f' + i); f(260 + i * 300, 330); };
  row(0, (x, y) => paint(ellPts(x, y, 110, 90, 40), { wash: col, ink: PAL.ink, sw: 1 }));                                  // convex
  row(1, (x, y) => paint([[x - 110, y - 100], [x - 20, y - 100], [x - 20, y + 20], [x + 110, y + 20], [x + 110, y + 100], [x - 110, y + 100]], { wash: col, ink: PAL.ink, sw: 1 }));   // an L
  row(2, (x, y) => paint(through([[x - 120, y + 60], [x - 40, y - 70], [x + 60, y - 80], [x + 120, y - 10], [x + 40, y - 20], [x - 30, y + 10]], 8), { wash: col, ink: PAL.ink, sw: 1 }));   // a banana
  row(3, (x, y) => paint(ellPts(x, y, 110, 90, 40), { wash: col, ink: PAL.ink, sw: 1, rim: { colore: PAL.ochre, spessore: 8 } }));   // with a rim light
  row(4, (x, y) => paint(ellPts(x, y, 110, 90, 40), { wash: PAL.sap, ink: null }));                                           // no outline: no shadow
  boilSeed('line'); inkLine([[100, 700], [900, 700]], 1, PAL.ink);
  row(1, (x, y) => paint(ellPts(x, y + 380, 110, 90, 40), { wash: PAL.sap, ink: null, shade: true }));                         // shade without outline
  row(2, (x, y) => paint(ellPts(x, y + 380, 110, 90, 40), { wash: col, ink: PAL.ink, sw: .5, inner: true }));                  // an inner line
};
LOOPS.forme.len = 1; LOOPS.forme.format = 'landscape';

// The same view in the three lights of a style that has them (anime), one per second: giorno, notte, controluce.
LOOPS.luci = t => {
  const nome = ['giorno', 'notte', 'controluce'][Math.min(2, Math.floor(t))];
  luce(nome);
  const G = 880;
  boilSeed('sky'); paint(rectPts(-50, -50, W + 100, G + 50), { wash: PAL.sky, ink: null });
  boilSeed('hill'); paint(ellPts(900, G + 60, 1100, 330, 40, 3), { wash: PAL.sap, ink: PAL.ink, sw: 1, shade: false });
  boilSeed('ground'); paint(rectPts(-50, G, W + 100, H), { wash: PAL.sap, ink: null });
  character('gatto', 430, G, 36, { view: 'side', pose: 'inPiedi', expression: 'felice', t, key: 'gatto' });
  character('mostro', 960, G, 40, { view: 'q', pose: 'fermo', expression: 'felice', t, key: 'mostro' });
  character('ragazza', 1450, G, 30, { view: 'q', pose: 'inPiedi', expression: 'felice', t, key: 'ragazza' });
  boilSeed('lamp'); glow(1250, 520, 150, PAL.ochre, .9); paint(ellPts(1250, 520, 22, 22, 14), { wash: PAL.ochre, ink: null });
};
LOOPS.luci.len = 3; LOOPS.luci.format = 'landscape';

// Clawd's halo is the one mark drawn straight through p5.brush: a cel shape in front of it must cover it.
LOOPS.aureola = t => {
  boilSeed('bg'); paint(rectPts(-50, -50, W + 100, H + 100), { wash: PAL.cream, ink: null });
  clawd(700, 800, 40, { hat: 'halo' });
  boilSeed('tree'); paint(rectPts(560, 330, 280, 140, 4), { wash: PAL.sap, ink: PAL.ink, sw: 1 });    // in front of the halo
};
LOOPS.aureola.len = 1; LOOPS.aureola.format = 'landscape';
