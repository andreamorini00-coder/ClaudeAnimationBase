// tall_example.js: LOOPS.tall, a 5-second check for the tall social formats (vertical 9:16 and feed 4:5). It is a test
// of the formats, not a template: every position comes from W, H and SAFE, so the same code composes for both.
//   A firefly drifts down from the top, Clawd follows it with the eyes, is surprised, then jumps for it; it flits away.
// Render it with --loop=tall --format=vertical (or feed); add --safe to a sheet to see the safe zones.
(() => {
  const LEN = 5;
  LOOPS.tall = t => {
    // Composition: Clawd stands in the safe centre, feet just above the subtitle band (if the format has one).
    const cx = (SAFE.left + W - SAFE.right) / 2, G = SAFE.subs ? SAFE.subs[0] - 30 : H * .72, u = 30, head = G - 8 * u;

    // sky, a soft band of colour, stars and a moon, all above the ground line
    boilSeed('sky');
    paint(rectPts(-100, -100, W + 200, H + 200), { wash: PAL.night, ink: null });
    paint(ellPts(W * .5, G * .55, W * .75, G * .32, 28, 10), { fill: PAL.indigo, fillOp: 90, bleed: .3, tex: .5, ink: null });
    for (let i = 0; i < 34; i++) {
      boilSeed('star' + i);
      const x = hash(i) * W, y = SAFE.top * .5 + hash(i + 50) * (G - 140 - SAFE.top * .5), tw = .6 + .4 * Math.sin(t * (2 + 2 * hash(i + 90)) + i);
      paint(starPts(x, y, (3 + 4 * hash(i + 70)) * tw, .35, 4), { wash: PAL.cream, washOp: Math.min(255, 150 + 100 * tw), ink: null });
    }
    boilSeed('moon');
    paint(ellPts(SAFE.left + W * .2, SAFE.top + 150, 62, 62, 24, 1.5), { wash: PAL.cream, fill: PAL.ochre, fillOp: 40, ink: PAL.ink, sw: .8 });

    // ground: everything below G is background only (subtitle band and the app's caption area)
    boilSeed('ground');
    paint(rectPts(-100, G, W + 200, H - G + 100, 3), { wash: mixCol(PAL.sap, PAL.night, .35), fill: mixCol(PAL.sap, PAL.night, .55), fillOp: 90, bleed: .05, tex: .6, ink: null });
    inkLine([[-40, G + 4], [W / 2, G - 6], [W + 40, G + 6]], 1, PAL.ink, 'ink', .5);

    // the firefly: down from the top right, hovers over Clawd, dodges the jump, then flits up and away
    const fly = kf(t, [[0, [W - SAFE.right - 60, SAFE.top + 40]], [.9, [W - SAFE.right - 80, SAFE.top + 60]], [2.1, [cx + 70, head - 130]],
                       [2.75, [cx + 40, head - 110]], [3.15, [cx + 150, head - 260]], [4.6, [cx - 120, SAFE.top + 120]]]);
    const [fx, fy] = [fly[0] + 10 * Math.sin(t * 7), fly[1] + 8 * Math.sin(t * 5.3)];

    // Clawd: dozing, notices the light, surprised, happy, jumps for it, then watches it go
    const look = { lookX: clamp((fx - cx) / 260, -1, 1), lookY: clamp((fy - head) / 300, -1, 1) };
    const mood = emotions(t, [[0, 'sleepy'], [1.3, 'surprised', look], [2.0, 'happy', look], [3.4, 'excited', look]]);
    const hop = jump(t, 2.8, 3.3, 2.6);
    clawd(cx, G, u, { ...mood, dy: (mood.dy || 0) + hop.dy, sq: (mood.sq || 0) + hop.sq, aL: t > 2.7 && t < 3.4 ? 1.3 : mood.aL, aR: t > 2.7 && t < 3.4 ? 1.3 : mood.aR });

    boilSeed('firefly');
    glow(fx, fy, 70, '#FFE27A', .9);
    paint(ellPts(fx, fy, 7, 7, 10), { wash: '#FFF3B0', ink: null });

    // transitions: iris in on Clawd, brush wipe out (it covers the frame by the end, so the loop restarts under it)
    boilSeed('transition');
    if (t < .45) iris(cx, head + 2 * u, lerp(0, Math.hypot(W, H), easeIn(t / .45)));
    if (t > LEN - .3) brushWipe((t - (LEN - .3)) / .6, [PAL.indigo, PAL.violet]);
  };
  LOOPS.tall.len = LEN;
  LOOPS.tall.format = ['vertical', 'feed'];
})();
