// prova-testi: the cat crosses a meadow looking for the monster, which peeks out from behind a bush. No lettering is painted
// in the scene: the title and the two subtitles come from testi() (the texts layer), over the finished frame.
(() => {
  const G = 1120;                                             // ground line; the subtitle band (1150–1500) is under it, on the grass
  function shot(t) {
    boilSeed('sky'); paint(rectPts(-50, -50, W + 100, G + 50), { wash: PAL.sky, ink: null });
    boilSeed('hill'); paint(ellPts(540, G + 140, 900, 300, 40, 3), { wash: PAL.sap, ink: PAL.ink, sw: 1 });
    boilSeed('ground'); paint(rectPts(-50, G, W + 100, H), { wash: PAL.sap, ink: null });
    const peek = ease(seg(t, 4.2, 5.2));
    character('mostro', 850, G + 70 + (1 - peek) * 150, 36, { view: 'q', pose: 'fermo', expression: 'felice', t, key: 'mostro' });
    boilSeed('bush'); paint(ellPts(850, G + 40, 130, 90, 30, 4), { wash: PAL.clayLt, ink: PAL.ink, sw: 1 });
    character('gatto', lerp(230, 560, ease(seg(t, 0, 4.2))), G + 40, 40, { view: 'side', pose: t < 4.2 ? 'corsa' : 'inPiedi', expression: t < 4.2 ? 'curioso' : 'sorpreso', t, key: 'gatto' });
  }
  shots([[0, shot]], { format: 'vertical' });
  testi([
    { da: .3, a: 4.3, testo: 'Il gatto e il mostro', tipo: 'titolo' },
    { da: 1.2, a: 4.2, testo: 'Ma dov\'è finito?', battuta: 1.9 },
    { da: 4.4, a: 8, testo: 'Eccolo! È dietro la siepe.' },
  ]);
})();
