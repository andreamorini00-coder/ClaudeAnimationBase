// reel_gatto_mostro.js: a 12-second vertical reel (1080×1920, acquerello-leggero). STORYBOARD.md has the plan.
// The cat sees the bouncing monster, stalks it, leaps, squashes it, is thrown into the air by it, and lies there confused
// while the monster bounces off. Everything is a pure function of t; the sounds sit on the same times as the animation.
//   A 0–2.6 sees it · B 2.6–4.4 stalks · C 4.4–6.2 leaps · D 6.2–7.8 squish · E 7.8–10 thrown, thud, escape · F 10–12 confused
(() => {
  const LEN = 12, G = 1120, U = 40;                       // ground line (world y), size unit of both characters
  const GATTO = CHARACTERS.gatto, MOSTRO = CHARACTERS.mostro;
  const camY = z => G - 150 / z;                          // the camera centre that keeps the ground at screen y 1110
  const fullPose = n => ({ ...BODIES.quadruped.POSE0, ...GATTO.poses[n] });
  const IN = fullPose('inPiedi'), PRONE = fullPose('agguato'), LEAP = fullPose('salto');

  // ---------- the monster: hops in place every .8 s, freezes at 5.4, is squashed at 6.2, springs away at 7.8 ----------
  const STAY = .13;                                       // seconds on the ground after a landing
  const LANDS = [[-1.0, 1180], [-.2, 960], [.6, 900], [1.4, 840], [2.2, 780], [3.0, 720], [3.8, 700], [4.6, 700], [5.4, 700]];
  const SEGS = [];
  LANDS.forEach((l, i) => { if (i) SEGS.push({ t0: LANDS[i - 1][0] + STAY, t1: l[0], a: [LANDS[i - 1][1], G, U], b: [l[1], G, U], H: i === LANDS.length - 1 ? 2.5 : 5 }); });
  const FLEE = [[7.8, 700, G, U], [8.25, 870, G, U], [9.1, 920, G - 70, 32], [9.7, 955, G - 150, 25], [10.5, 930, G - 250, 16], [11.3, 900, G - 340, 10]];
  FLEE.forEach((l, i) => { if (i) SEGS.push({ t0: i === 1 ? FLEE[0][0] : FLEE[i - 1][0] + STAY, t1: l[0], a: FLEE[i - 1].slice(1), b: l.slice(1), H: i === 1 ? 7 : 5, launch: i === 1 }); });
  const T_SQUASH = 6.2, T_POP = 7.8, MH = MOSTRO.proportions.height;

  // where the monster is at t: { x, y, u, hop (units), squash, since, kick }
  function monsterAt(t) {
    for (const s of SEGS) if (t >= s.t0 && t < s.t1) {
      const k = (t - s.t0) / (s.t1 - s.t0);
      return { x: lerp(s.a[0], s.b[0], k), y: lerp(s.a[1], s.b[1], k), u: lerp(s.a[2], s.b[2], k), hop: s.H * 4 * k * (1 - k),
        squash: s.launch ? lerp(.62, .95, ease(k * 2.5)) : 1 - .15 * Math.abs(1 - 2 * k), since: t - s.t0, kick: 1 };
    }
    let at = SEGS[0]; for (const s of SEGS) if (t >= s.t1) at = s;
    const a = t - at.t1, m = { x: at.b[0], y: at.b[1], u: at.b[2], hop: 0, squash: 1 + .3 * Math.exp(-a * 16), since: a, kick: -1 };
    if (t >= T_SQUASH && t < T_POP) {                     // the cat lands on it: squashed flat, trembling, then coiling
      const d = t - T_SQUASH;
      m.squash = 1.4 + .13 * Math.exp(-d * 9) * Math.cos(d * 26) + .2 * ease(seg(t, T_POP - .25, T_POP));
      m.since = d; m.kick = -1;
    }
    return m;
  }
  const topOf = m => m.hop + MH / clamp(m.squash, .6, 1.6);   // the top of the monster, in units

  // ---------- the cat ----------
  const catX0 = 250, catLand = 700 - 10, CAT_END = 600;
  function catAt(t, m) {
    let x = catX0, pose = IN, view = 'q';
    if (t < 2.6) pose = { ...IN, pitch: .02 * Math.sin(t * 2.2) };
    else if (t < 4.5) {                                   // B: sinks into the stalk, the rump wiggles, then coils
      const k = ease(seg(t, 3.3, 4.1)), coil = ease(seg(t, 4.15, 4.5));
      pose = blendPose(IN, PRONE, k);
      pose.pitch += .07 * Math.sin(t * 28) * k * (1 - coil) - .12 * coil;
      pose.stretch = lerp(pose.stretch, .95, coil);
    } else if (t < T_SQUASH) {                            // C: the leap: up fast, down slowly, onto the monster
      const k = seg(t, 4.5, T_SQUASH), up = easeOut(seg(t, 4.5, 5.0)), down = easeIn(seg(t, 5.0, T_SQUASH));
      x = lerp(catX0, catLand, k);
      pose = { ...LEAP, lift: 9 * up * (1 - down) + MH * easeIn(seg(t, 5.0, T_SQUASH)), pitch: lerp(.45, -.35, ease(k)), legSwing: lerp(.9, .3, k), stretch: lerp(1.2, 1, k) };
      view = 'side';
    } else if (t < T_POP) {                               // D: on top of the monster, which squashes under her
      const d = t - T_SQUASH;
      x = catLand; pose = { ...IN, crouch: .35 + .3 * Math.exp(-d * 8), lift: topOf(m) };
    } else if (t < 8.55) {                                // E: thrown up by the monster's spring, tumbling down
      const k = seg(t, T_POP, 8.55);
      x = lerp(catLand, CAT_END, k);
      pose = { ...LEAP, lift: lerp(MH / 1.6, 0, k) + 9 * 4 * k * (1 - k), pitch: lerp(.1, -.5, ease(k)), legSwing: 1, stretch: 1.05 };
      view = 'side';
    } else {                                              // the thud, then up on her haunches, dazed
      const a = t - 8.55, up = ease(seg(t, 10.1, 10.9));
      x = CAT_END; pose = blendPose(PRONE, IN, up);
      pose.lift = Math.max(0, .35 * Math.exp(-a * 7) * Math.cos(a * 22));
    }
    return { x, pose, view };
  }
  const FOCUS = { eyes: 'open', mouth: 'flat', ears: .7, tail: .6 };
  const CAT_FACES = [[0, 'curioso'], [1.6, 'sorpreso'], [2.8, FOCUS], [6.3, 'felice'], [7.8, 'sorpreso'], [8.7, 'triste'], [10.0, 'curioso']];
  const MON_FACES = [[0, 'felice'], [5.1, { eye: 'wide', mouth: 'o' }], [T_SQUASH, { eye: 'wide', mouth: 'o', shiver: 1 }], [T_POP, 'felice']];

  // the top centre of a part of a character at (x, y), for the emotes
  function anchor(spec, o, x, y, u, part) {
    const p = BODIES[spec.body].layout(spec, resolveState(spec, o)).parts.find(q => q.id === part), xs = p.pts.map(q => q[0]), ys = p.pts.map(q => q[1]);
    return [x + (Math.min(...xs) + Math.max(...xs)) / 2 * u, y + Math.min(...ys) * u];
  }

  // ---------- the world: sky, hills, meadow; warms from morning blue to peach ----------
  function world(t) {
    const warm = seg(t, 6, 12);
    boilSeed('sky');
    paint(rectPts(-800, -1200, W + 1600, G + 1200 - 40), { wash: mixCol(PAL.sky, PAL.cream, .3 + .1 * warm), ink: null });
    boilSeed('glow');                                      // the horizon warms to peach: opaque washes, so nothing mixes grey
    paint(ellPts(560, G - 330, 1100, 330, 36, 8), { wash: mixCol(mixCol(PAL.sky, PAL.cream, .45), '#F7D3B4', .18 + warm * .7), ink: null });
    paint(ellPts(560, G - 250, 900, 190, 36, 8), { wash: mixCol(mixCol(PAL.sky, PAL.cream, .6), '#F9DDBE', .25 + warm * .65), ink: null });
    for (let i = 0; i < 3; i++) {
      boilSeed('cloud' + i);
      paint(ellPts(200 + i * 420 + 10 * t, 330 + i * 120, 170 - i * 20, 46, 24, 5), { wash: PAL.cream, washOp: 170, ink: null });
    }
    boilSeed('hillFar'); paint(ellPts(160, G - 130, 760, 300, 40, 6), { wash: mixCol(PAL.sap, PAL.sky, .6), ink: null });
    boilSeed('hillFar2'); paint(ellPts(1250, G - 80, 640, 250, 40, 6), { wash: mixCol(PAL.sap, PAL.sky, .5), ink: null });
    boilSeed('hillMid'); paint(ellPts(900, G - 100, 760, 255, 44, 5), { wash: mixCol(PAL.sap, PAL.sky, .28), ink: null });
    boilSeed('meadow'); paint(rectPts(-800, G - 4, W + 1600, 1100, 4), { wash: mixCol(PAL.sap, PAL.cream, .12), ink: null });
    for (let i = 0; i < 4; i++) {
      boilSeed('band' + i);
      paint(ellPts(-100 + i * 420, G + 170 + i * 170, 760, 60 + 30 * i, 30, 6), { wash: mixCol(PAL.sap, i % 2 ? PAL.cream : PAL.teal, .16), washOp: 170, ink: null });
    }
    boilSeed('line'); inkLine([[-700, G + 2], [200, G - 5], [900, G + 3], [1800, G - 4]], .7, mixCol(PAL.ink, PAL.sap, .45), 'ink', .5);
    for (let i = 0; i < 70; i++) {                          // grass tufts (still, swaying) and a few flowers
      const k = hash(i * 3.1 + 1), x = -300 + 1900 * hash(i), y = G + 14 + 760 * k * k, s = 16 + 60 * (y - G) / 760, sw = 5 * Math.sin(t * 1.4 + i);
      boilSeed('tuft' + i);
      for (let j = -1; j <= 1; j++) inkLine([[x + j * s * .25, y], [x + j * s * .3 + sw * (1 + Math.abs(j)) * s / 40, y - s * (1.1 - .25 * Math.abs(j))]], .7, mixCol(PAL.sap, PAL.ink, .4), 'ink', .4);
      if (i % 4 === 0) {
        boilSeed('flower' + i);
        const fx = x + 30 + 60 * hash(i + 90), fy = y - s * .5;
        paint(ellPts(fx, fy, s * .28, s * .28, 10, 1), { wash: i % 8 ? PAL.cream : PAL.rose, ink: null });
        paint(ellPts(fx, fy, s * .1, s * .1, 8), { wash: PAL.ochre, ink: null });
      }
    }
  }

  // ---------- one frame, through a camera ----------
  function frame(t, cx, z, shake) {
    const [sx, sy] = shake ? shakeXY(t, shake) : [0, 0];
    camBegin(cx + sx, camY(z) + sy, z);
    world(t);
    const m = monsterAt(t), cs = { view: 'q', t };
    // the monster, then the cat in front of it
    const mf = act(t, MON_FACES, MOSTRO); mf.expression.look = t < 7.8 ? -1 : .6;
    character('mostro', m.x, m.y, m.u, { view: 'q', flip: t < T_POP, pose: { squash: m.squash, hop: m.hop }, expression: mf, t, since: m.since, kick: m.kick, key: 'mostro' });
    const c = catAt(t, m), cf = act(t, CAT_FACES, GATTO);
    cf.expression.look = clamp((m.x - c.x) / 350, -1, 1);
    if (t > 3.1 && t < 4.5) { cf.expression.squint = .3 * ease(seg(t, 3.0, 3.5)); cf.expression.tail = .6 + .4 * wob(t, 3); }
    character('gatto', c.x, G, U, { view: c.view, pose: c.pose, expression: cf, t, key: 'gatto' });
    const co = { view: c.view, pose: c.pose, expression: cf, t };
    // reactions, painted: "!" when she notices, "?" when she is lost
    const head = () => anchor(GATTO, co, c.x, G, U, 'head');
    if (t > 1.7 && t < 2.6) { const [hx, hy] = head(); emote('!', hx + 20, hy - 10, U * .7, seg(t, 1.7, 1.95) * (1 - seg(t, 2.35, 2.6)), t - 1.7); }
    if (t > 10.6) { const [hx, hy] = head(); emote('?', hx + 10, hy - 10, U * .75, seg(t, 10.6, 10.9), t - 10.6); }
    // dust where she lands
    if (t > 8.55 && t < 9.3) {
      const a = (t - 8.55) / .75;
      for (let i = 0; i < 7; i++) {
        const dir = i < 4 ? 1 : -1, d = (30 + 70 * hash(i + 4)) * easeOut(a) * dir, r = (16 + 26 * hash(i + 14)) * (.5 + a);
        boilSeed('dust' + i);
        paint(ellPts(CAT_END + d, G - 14 - 40 * a * hash(i + 24), r, r * .8, 14, 2), { wash: PAL.cream, washOp: 200 * (1 - a), ink: null });
      }
    }
    const at = toScreen(m.x, m.y - 3 * m.u);
    camEnd();
    return at;
  }

  // ---------- the shots ----------
  function shotA(t, lt) {
    const z = 1 + .025 * lt, at = frame(t, 540 + 14 * Math.sin(lt * .8), z);
    boilSeed('transition'); if (lt < .45) iris(...at, lerp(0, Math.hypot(W, H), easeIn(lt / .45)), PAL.cream);
  }
  function shotB(t, lt) { frame(t, lerp(500, 440, ease(lt / 1.8)), lerp(1.3, 1.5, ease(lt / 1.8))); }
  function shotC(t, lt) { frame(t, lerp(430, 650, ease(seg(lt, 0, 1.8))), 1.15); }
  function shotD(t, lt) { frame(t, 690, 1.8, 16 * Math.exp(-lt * 9)); }
  function shotE(t, lt) {
    const k = ease(seg(lt, 0, .5)), tonfo = t - 8.55;
    frame(t, lerp(690, 640, k), lerp(1.25, 1.0, k), tonfo > 0 ? 12 * Math.exp(-tonfo * 9) : 0);
  }
  function shotF(t, lt, dur) {
    frame(t, 700 + 8 * Math.sin(lt * .6), 1.6 + .02 * lt);
    boilSeed('transition'); if (lt > dur - .5) brushWipe((lt - (dur - .5)) / 1.0, [PAL.sky, PAL.sap]);
  }
  shots([[0, shotA], [2.6, shotB], [4.4, shotC], [6.2, shotD], [7.8, shotE], [10, shotF]], { format: 'vertical' });

  // ---------- sound: one effect per event, on the animation's own times ----------
  sounds({
    sfx: [
      [.6, 'rimbalzo'], [1.4, 'rimbalzo'], [2.2, 'rimbalzo'], [3.0, 'rimbalzo', { vol: -6 }], [3.8, 'rimbalzo', { vol: -6 }],
      [1.7, 'oh_sorpresa'], [4.45, 'salto_boing'], [4.6, 'rimbalzo', { vol: -10 }], [5.4, 'rimbalzo', { vol: -10 }],
      [T_SQUASH + .02, 'squish'],
      [8.25, 'rimbalzo'], [8.55, 'caduta_tonfo'], [9.1, 'rimbalzo', { vol: -4 }], [9.7, 'rimbalzo', { vol: -8 }],
      [10.5, 'rimbalzo', { vol: -11 }], [11.3, 'rimbalzo', { vol: -14 }],
    ],
    ambience: [{ name: 'amb_uccellini_loop', from: 0, to: LEN, fadeIn: .6, fadeOut: .8 }],
  });
})();
