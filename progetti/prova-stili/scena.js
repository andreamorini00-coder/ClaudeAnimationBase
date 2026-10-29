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
