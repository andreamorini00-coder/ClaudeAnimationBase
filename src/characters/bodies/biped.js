// biped.js: a body on two legs, measured in heads (the girl at 3, the hero at 5.5; the adults of 4b2 later). Pure:
// layout() as in quadruped.js (units, origin on the ground under the body, y down, facing screen-right; flip mirrors),
// plus `joints` (shoulder, elbow, wrist, hip, knee, ankle per side, L and R) for checks and props.
//
// One head is HU units tall; every proportion but `heads` is in heads: heads (total height, hair included),
// shoulders and hips (widths), torso (shoulder line to hips), arm (shoulder to wrist), leg (hip to ankle), headW
// (the head's width). The height adds up as foot + leg + torso + neck + head + hair, so the spec's numbers are chosen
// to make that sum `heads` (the test checks it).
// Limbs are two equal segments of fixed length. Angles in radians, 0 = hanging straight down, + = swung forward (in
// the front and back views, outwards). Elbows bend only forward and knees only backward, 0..2.6.
// Pose params: shoulderL/R, elbowL/R, hipL/R, kneeL/R, fistL/R 0..1 (a round fist), lean (the upper body tips
//   forward), lift (units off the ground), crouch 0..1 (legs fold, the body lowers), flight 0..1 (the body turns
//   horizontal, head first), capeFlow (how far the cape streams back), cycle (1 = run with t: arms and legs swing in
//   opposition, about 2 strides a second).
// Parts the spec may declare: hair { style: 'bob' | 'spiky', locks }, skirt (role skirt), shoes (role shoes),
//   sleeves { wide } (puffy sleeves with a cuff), gloves, boots, cape (role accent), mask (role hair), star (role
//   emblem), eyes { dark } (big dark eyes with highlights), cheeks (always pink; without, they show only when
//   blushing), brows { kind: 'thick' }, build { arm, leg } (limb thickness in heads; .21 and .24 by default, the
//   chibi's).
// Expression params: eyes, mouth (FACES kinds), brows -1 (sad) .. 1 (angry), blush 0..1 (embarrassed), headTilt.
BODIES.biped = {
  HU: 3,
  roles: ['skin', 'hair', 'top', 'legs', 'line', 'shadow', 'eyeWhite', 'cheek'],
  proportions: ['heads', 'shoulders', 'hips', 'torso', 'arm', 'leg', 'headW'],
  partRoles: { skirt: 'skirt', shoes: 'shoes', gloves: 'accent', cape: 'accent', boots: 'accent', mask: 'hair', star: 'emblem' },
  parts: ['head', 'hair', 'fringe', 'ears', 'eyes', 'brows', 'mouth', 'cheeks', 'neck', 'torso', 'arms', 'hands', 'legs', 'shoes',
    'skirt', 'sleeves', 'gloves', 'boots', 'mask', 'star', 'cape', 'shadow', 'build'],
  poseParams: ['shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'fistL', 'fistR', 'lean', 'lift', 'crouch',
    'flight', 'capeFlow', 'cycle'],
  exprParams: ['eyes', 'mouth', 'brows', 'blush', 'headTilt'],
  views: ['front', 'q', 'side', 'back'],
  SHEET: { views: ['front', 'q', 'side', 'back'], poseView: 'q', exprView: 'front' },
  POSE0: { shoulderL: .03, shoulderR: .03, elbowL: .12, elbowR: .12, hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, fistL: 0, fistR: 0,
    lean: 0, lift: 0, crouch: 0, flight: 0, capeFlow: 0, cycle: 0 },
  EXPR0: { eyes: 'open', mouth: 'smile', brows: 0, blush: 0, headTilt: 0, squint: 0, look: 0 },
  // Per view: the body's width factor, where the face is, and per side (L, R) the limb's x (in half shoulder or hip
  // widths), which way "forward" turns it on screen (dir), whether it is the near one, plus the outward splay of
  // arms and legs at rest. Facing right, the girl's right side is the near one in profile and 3/4.
  VIEW: {
    front: { w: 1, face: 'front', out: .3, legOut: .04, limbs: { L: { x: 1, dir: 1, near: 1 }, R: { x: -1, dir: -1, near: 1 } } },
    q:     { w: .82, face: 'q', out: .08, legOut: 0, limbs: { R: { x: -.95, dir: 1, near: 1 }, L: { x: .9, dir: 1, near: 0 } } },
    side:  { w: .6, face: 'side', out: 0, legOut: 0, limbs: { R: { x: -.06, dir: 1, near: 1 }, L: { x: .1, dir: 1, near: 0 } } },
    back:  { w: 1, face: null, out: .3, legOut: .04, limbs: { L: { x: -1, dir: -1, near: 1 }, R: { x: 1, dir: 1, near: 1 } } },
  },

  layout(spec, state) {
    const B = BODIES.biped, V = B.VIEW[state.view];
    if (!V) throw new Error(`Vista "${state.view}" inesistente. Disponibili: ${B.views.join(', ')}`);
    const P = { ...B.POSE0, ...(state.pose || {}) }, E = { ...B.EXPR0, ...(state.expression || {}) }, t = state.t || 0;
    const pr = spec.proportions, sp = spec.parts || {}, HU = B.HU, parts = [], joints = {};
    const add = (id, role, depth, pts, more = {}) => parts.push({ id, role, depth, pts, line: 1, ...more });
    const dirOf = a => [Math.cos(a), Math.sin(a)], at = (p, a, l) => [p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l];

    // ---- the angles: the pose, plus the run cycle and the crouch ----
    const run = P.cycle * Math.cos(Math.PI * 2 * 2 * t), runB = -run;   // a full stride at t = 0
    const A = {
      shoulderL: P.shoulderL - run * .9, shoulderR: P.shoulderR + run * .9,
      elbowL: P.elbowL + P.cycle * 1.1, elbowR: P.elbowR + P.cycle * 1.1,
      hipL: P.hipL + run * .75 + P.crouch * 1.3, hipR: P.hipR + runB * .75 + P.crouch * 1.3,
      kneeL: P.kneeL + P.crouch * 2.3 + P.cycle * (.35 + .9 * Math.max(0, -run)), kneeR: P.kneeR + P.crouch * 2.3 + P.cycle * (.35 + .9 * Math.max(0, -runB)),
    };
    for (const k of ['elbowL', 'elbowR', 'kneeL', 'kneeR']) A[k] = CG.clamp(A[k], 0, 2.6);

    // ---- the vertical stack: the lower ankle stays a foot above the ground ----
    const footH = .1 * HU, legL = pr.leg * HU, armL = pr.arm * HU, legW = (sp.build && sp.build.leg || .24) * HU, armW = (sp.build && sp.build.arm || .21) * HU;
    const legChain = (s, hip) => {
      const L = V.limbs[s], a1 = Math.PI / 2 - L.dir * (A['hip' + s] + V.legOut), a2 = a1 + L.dir * A['knee' + s];
      const knee = at(hip, a1, legL / 2); return [hip, knee, at(knee, a2, legL / 2), a2];
    };
    const drop = Math.max(...['L', 'R'].map(s => legChain(s, [0, 0])[2][1]));
    const hipY = -(footH + drop) - P.lift, shY = hipY - pr.torso * HU, neckH = .07 * HU, hcy = shY - neckH - HU / 2;
    const hipHalf = pr.hips * HU / 2 * V.w, shHalf = pr.shoulders * HU / 2 * V.w;

    // whole body: flight turns it round the hips, head first; lean tips the upper body forward
    const flightA = P.flight * Math.PI / 2 * .9, leanA = P.lean * .35;
    const whole = pts => CG.rotate(pts, flightA, 0, hipY), upper = pts => whole(CG.rotate(pts, leanA, 0, hipY));

    add('shadow', 'shadow', -10, CG.ellipse(0, .15, Math.max(shHalf, hipHalf) * 1.25 + P.flight * legL * .6, .13 * HU * (1 - Math.min(.5, P.lift * .05)), 28), { line: 0, shade: 1 });

    // ---- legs and feet ----
    for (const s of ['L', 'R']) {
      const L = V.limbs[s], [hip, knee, ankle, a2] = legChain(s, [L.x * (hipHalf - legW * .55), hipY]);
      const dep = L.near ? .5 + (s === 'R' ? .01 : 0) : -1, dim = L.near ? {} : { dim: .25 };
      add('leg' + s, 'legs', dep, whole(CG.tube([hip, knee, ankle], legW, legW * .9)), dim);
      Object.assign(joints, { ['hip' + s]: hip, ['knee' + s]: knee, ['ankle' + s]: ankle });
      // the foot: along the shin, its sole a foot below the ankle; in profile the toe points forward
      const toe = V.face === 'side' || V.face === 'q' ? .1 * HU : 0, fw = V.face === 'side' ? .4 * HU : .3 * HU;
      const footAt = (y0, h, w, round) => whole(CG.rotate(CG.block(ankle[0] + toe, ankle[1] + y0, ankle[1] + footH, w, w * 1.05, round), a2 - Math.PI / 2, ankle[0], ankle[1]));
      if (sp.boots) add('boot' + s, 'accent', dep + .02, whole(CG.tube([[CG.lerp(knee[0], ankle[0], .25), CG.lerp(knee[1], ankle[1], .25)], ankle], legW * 1.2, legW * 1.15)), { ...dim, feature: 'boots' });
      if (sp.shoes || sp.boots) add('shoe' + s, sp.boots ? 'accent' : 'shoes', dep + .03, footAt(-.16 * HU, 0, fw, .45), { ...dim, ...(sp.boots ? { feature: 'boots' } : {}) });
      else add('foot' + s, 'legs', dep + .03, footAt(-.04 * HU, 0, fw * .85, .7), dim);
    }

    // ---- torso, neck, skirt ----
    const top = CG.block(0, shY - .03 * HU, hipY + .06 * HU, shHalf * 2, pr.hips * HU * 1.06 * V.w, .32);
    add('neck', 'skin', 2.3, upper(CG.block(0, shY - neckH - .06 * HU, shY + .06 * HU, .25 * HU * Math.max(.8, V.w), .27 * HU * Math.max(.8, V.w), .6)));
    add('torso', 'top', 2.5, upper(top));
    if (sp.star && V.face) {                                       // a five-pointed star on the chest (not from the back)
      const sx = V.face === 'side' ? shHalf * .7 : V.face === 'q' ? shHalf * .12 : 0, sk = V.face === 'side' ? .4 : V.face === 'q' ? .85 : 1, sr = .3 * HU;
      const star = [...Array(10)].map((_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? sr * .45 : sr; return [sx + Math.cos(a) * rr * sk, shY + .5 * HU + Math.sin(a) * rr]; });
      add('star', 'emblem', 2.6, upper(star), { line: .7, feature: 'star' });
    }
    if (sp.cape) {
      // one shape from the shoulders to the waist; capeFlow swings it back (less so in flight, where "back" is along
      // the body), and its hem ripples with t
      const len = (hipY - shY) * .92, flow = P.capeFlow, wave = k => .06 * HU * (1 + flow) * Math.sin(Math.PI * 2 * 1.6 * t + k * 1.3);
      let cape, dep;
      if (V.face === 'side' || V.face === 'q') {
        const a0 = V.face === 'side' ? [-shHalf * .2, shY] : [shHalf * .1, shY], b0 = [-shHalf * (V.face === 'side' ? 1.12 : 1.2), shY + .05 * HU];
        const hem = [0, 1, 2, 3].map(k => { const f = k / 3; return [CG.lerp(a0[0] - .1 * HU, b0[0] - .3 * HU, f), shY + len * (1 + .04 * f) + wave(k)]; });
        cape = CG.rotate([a0, ...hem.reverse(), b0], flow * 1.25 * (1 - .8 * P.flight), (a0[0] + b0[0]) / 2, shY);
        dep = V.face === 'side' ? 1.2 : 1;
      } else {
        const k = 1 - .5 * flow, hw = shHalf * .95;
        const hem = [-1, -.33, .33, 1].map((u, i) => [u * hw * 1.55, shY + len * k + wave(i)]);
        cape = [[-hw, shY], [hw, shY], ...hem.reverse()];
        dep = V.face ? 1 : 3;                                       // behind the body from the front, over the back from behind
      }
      add('cape', 'accent', dep, upper(cape), { feature: 'cape' });
    }
    if (sp.skirt) {
      const flare = 1.5 + .25 * P.cycle * Math.abs(run) + .2 * P.crouch;
      add('skirt', 'skirt', 2, whole(CG.block(0, hipY - .12 * HU, hipY + .36 * HU, pr.hips * HU * V.w, pr.hips * HU * flare * V.w, .22)), { feature: 'skirt' });
    }

    // ---- arms and hands ----
    for (const s of ['L', 'R']) {
      const L = V.limbs[s], sh = [L.x * (shHalf - armW * .5), shY + armW * .45];
      const a1 = Math.PI / 2 - L.dir * (A['shoulder' + s] + V.out), a2 = a1 - L.dir * A['elbow' + s];
      const elbow = at(sh, a1, armL / 2), wrist = at(elbow, a2, armL / 2);
      Object.assign(joints, { ['shoulder' + s]: sh, ['elbow' + s]: elbow, ['wrist' + s]: wrist });
      const dep = L.near ? 3.5 + (s === 'R' ? .02 : 0) : 1, dim = L.near ? {} : { dim: .25 };
      const wide = sp.sleeves && sp.sleeves.wide, cuffAt = at(wrist, a2, -.1 * HU);
      add('arm' + s, 'top', dep, upper(CG.tube([sh, elbow, wide ? cuffAt : wrist], armW * (wide ? 1.25 : 1), armW * (wide ? 1.55 : .85))), dim);
      if (sp.sleeves) add('cuff' + s, 'top', dep + .01, upper(CG.tube([cuffAt, at(wrist, a2, -.02 * HU)], armW * 1.2, armW * 1.2, 3)), { ...dim, line: .8 });
      if (sp.gloves) add('glove' + s, 'accent', dep + .01, upper(CG.tube([at(elbow, a2, armL * .22), wrist], armW * 1.05, armW * 1.1)), { ...dim, feature: 'gloves' });
      // the hand: an oval with a thumb, or a round fist
      const hr = .12 * HU, hc = at(wrist, a2, hr * .7), role = sp.gloves ? 'accent' : 'skin';
      if (P['fist' + s] > .5) add('hand' + s, role, dep + .02, upper(CG.ellipse(hc[0], hc[1], hr * 1.05, hr * 1.05, 18)), dim);
      else {
        add('thumb' + s, role, dep + .015, upper(CG.ellipse(...at(at(wrist, a2, hr * .5), a2 + L.dir * Math.PI / 2, -hr * .55), hr * .32, hr * .5, 12, a2)), dim);
        add('hand' + s, role, dep + .02, upper(CG.ellipse(hc[0], hc[1], hr * 1.05, hr * .78, 18, a2)), dim);
      }
    }

    // ---- head group: hair behind, head, ears, face, hair in front (turned by headTilt) ----
    const headW = pr.headW * HU * (V.face === 'side' ? .92 : 1), hcx = V.face === 'side' ? .12 * HU : V.face === 'q' ? .06 * HU : 0;
    const tilt = E.headTilt - flightA * .8, head = pts => upper(CG.rotate(pts, tilt, hcx, hcy + HU / 2));   // in flight it looks ahead
    add('head', 'skin', 4, head(CG.ellipse(hcx, hcy, headW / 2, HU / 2, 44)));
    // ears: both from the front, the near one from 3/4 and in profile, none from the back
    const ears = V.face === 'front' ? [hcx - headW * .48, hcx + headW * .48] : V.face === 'q' ? [hcx - headW * .44] : V.face === 'side' ? [hcx - headW * .1] : [];
    ears.forEach((ex, i) => add('ear' + i, 'skin', 4.9, head(CG.ellipse(ex, hcy + .06 * HU, .085 * HU, .13 * HU, 16)), { feature: 'ears', line: .8 }));
    if (V.face) {
      const F = V.face === 'front' ? { eyes: [[-.21, 1], [.21, 1]], mouth: 0, cheeks: [-.33, .33] }
        : V.face === 'q' ? { eyes: [[-.04, .88], [.27, 1]], mouth: .13, cheeks: [-.17, .4] } : { eyes: [[.3, .85]], mouth: .38, cheeks: [.2] };
      const ey = hcy + .16 * HU, r = .135 * HU, eo = { look: E.look, squint: E.squint, dark: !!(sp.eyes && sp.eyes.dark) };
      if (sp.mask) {                                              // a band across the eyes, cut to the head's outline
        const mx0 = hcx + F.eyes[0][0] * HU - .2 * HU, mx1 = hcx + F.eyes[F.eyes.length - 1][0] * HU + .2 * HU;
        const band = CG.block((mx0 + mx1) / 2 + (V.face === 'side' ? -.1 * HU : 0), ey - .13 * HU, ey + .12 * HU, mx1 - mx0 + (V.face === 'side' ? .3 * HU : 0), mx1 - mx0 - .06 * HU, .55);
        add('mask', 'hair', 4.78, head(CG.clipConvex(band, CG.ellipse(hcx, hcy, headW / 2 + .01, HU / 2 + .01, 44))), { feature: 'mask' });
      }
      F.eyes.forEach(([x, k], i) => {
        const ex = hcx + x * HU;
        FACES.eye(E.eyes, ex, ey, r * k, eo).parts.forEach(p => add('eye' + i + p.id, p.role, 4.8, head(p.pts), { line: p.line, stroke: p.stroke }));
        // the brow's inner end is the one towards the middle of the face
        const inward = F.eyes.length > 1 ? (i ? -1 : 1) : 1;
        FACES.brows(sp.brows && sp.brows.kind || 'line', ex, ey - .19 * HU, .2 * HU * k * inward, E.brows).parts
          .forEach(p => add('brow' + i, p.role, 5.05, head(p.pts), { line: p.line, stroke: true }));
      });
      if (sp.cheeks || E.blush > 0) F.cheeks.forEach((x, i) => FACES.cheek(hcx + x * HU, hcy + .31 * HU, .09 * HU, E.blush).parts
        .forEach(p => add(p.id === 'cheek' ? 'cheek' + i : 'blush' + i, p.role, 4.75, head(p.pts), { line: p.line, stroke: p.stroke, ...(p.dim ? { dim: p.dim } : {}), ...(p.id === 'cheek' && sp.cheeks ? { feature: 'cheeks' } : {}) })));
      FACES.mouth(E.mouth, hcx + F.mouth * HU, hcy + .36 * HU, .15 * HU).parts
        .forEach(p => add('mouth', p.role, 4.8, head(p.pts), { line: p.stroke ? .5 : p.line, stroke: p.stroke }));
    }
    B.hair(spec, V, { hcx, hcy, headW, HU, t, add, head });

    // ---- order by depth, then mirror for flip ----
    for (const k of Object.keys(joints)) joints[k] = (/^(hip|knee|ankle)/.test(k) ? whole : upper)([joints[k]])[0];
    parts.sort((a, b) => a.depth - b.depth);
    if (state.flip) { for (const p of parts) p.pts = p.pts.map(([x, y]) => [-x, y]); for (const k of Object.keys(joints)) joints[k] = [-joints[k][0], joints[k][1]]; }
    const all = parts.flatMap(p => p.pts), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    return { parts, joints, bounds: { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) } };
  },

  // The hair: one mass drawn over the head, then the face as a window cut out of it (the head inside straight lines,
  // so its own outline draws the hairline and the hair's edges), then the style's locks over the hairline.
  hair(spec, V, { hcx, hcy, headW, HU, add, head }) {
    const h = spec.parts.hair || {}, style = h.style || 'bob', hairline = hcy - .2 * HU, jaw = hcy + .53 * HU;
    const mx = hcx + (V.face === 'side' ? -.16 : V.face === 'q' ? -.07 : 0) * HU, mw = headW * (V.face === 'side' ? 1.24 : 1.36);
    const spiky = style === 'spiky';
    // the bob: a long mass down to the jaw; spiky: a short cap over the skull, the spikes standing out of it
    const cap = CG.ellipse(mx, hcy - .06 * HU, headW * .55, .56 * HU, 44);
    const mass = !spiky ? CG.drop(mx, jaw, mw, jaw - (hcy - HU / 2 - .09 * HU))
      : V.face === 'side' || V.face === 'q' ? CG.clipLine(CG.clipY(cap, hcy + .22 * HU, -1), [hcx + (V.face === 'side' ? -.12 : -.3) * HU, hcy + .3 * HU], [hcx + (V.face === 'side' ? .32 : .2) * HU, hcy - .3 * HU])
      : CG.clipY(cap, V.face ? hairline + .04 * HU : hcy + .3 * HU, -1);
    add('hair', 'hair', 4.6, head(mass));
    function drawSpikes() {
      const n = h.locks || 5, side = V.face === 'side' || V.face === 'q';
      for (let i = 0; i < n; i++) {
        // fanned over the top; in profile and 3/4 they sweep back
        const u = n > 1 ? i / (n - 1) * 2 - 1 : 0, a = -Math.PI / 2 + u * .95 + (side ? -.4 : 0);
        const base = [mx + Math.cos(a) * headW * .5, hcy - .06 * HU + Math.sin(a) * .54 * HU], len = (.5 - .16 * Math.abs(u) + (i === 2 ? .06 : 0)) * HU, w = .27 * HU;
        const tipA = a + (side ? -.6 : .45), tip = [base[0] + Math.cos(tipA) * len, base[1] + Math.sin(tipA) * len];
        const nx = -Math.sin(a) * w, ny = Math.cos(a) * w, bx = Math.cos(a) * .1 * HU, by = Math.sin(a) * .1 * HU;
        add('spike' + i, 'hair', 4.55, head([[base[0] - nx - bx, base[1] - ny - by], tip, [base[0] + nx - bx, base[1] + ny - by]]), { feature: 'spikes' });
      }
    }
    if (!V.face || spiky) {
      if (spiky) drawSpikes();
      return;
    }
    const headPts = CG.ellipse(hcx, hcy, headW / 2, HU / 2, 44), fw = headW * .37;
    let face = CG.clipY(headPts, hairline, 1);
    // from the front the hair frames the face with soft curves; in profile and 3/4 its edge runs from the forehead
    // down in front of the ear
    if (V.face === 'front') face = CG.clipConvex(face, CG.ellipse(hcx, hcy + .3 * HU, fw * 1.12, .72 * HU, 36));
    else {
      const [top, bot] = V.face === 'side' ? [.08, -.2] : [-.24, -.34];
      face = CG.clipLine(face, [hcx + top * HU, hairline], [hcx + bot * HU, jaw]);
    }
    add('face', 'skin', 4.7, head(face));
    if (style === 'bob') {
      // three locks over the forehead, the middle one longest
      const x0 = V.face === 'front' ? hcx - fw : V.face === 'q' ? hcx - .2 * HU : hcx + .05 * HU, x1 = V.face === 'front' ? hcx + fw : hcx + headW * .5;
      const lw = (x1 - x0) / 3 * 1.18, lean = V.face === 'front' ? 0 : .05 * HU;
      [0, 1, 2].forEach(i => {
        const x = CG.lerp(x0, x1, (i + .5) / 3), y0 = hairline - .1 * HU, lh = (i === 1 ? .23 : .19) * HU;
        add('lock' + i, 'hair', 5, head([[x - lw / 2, y0], [x + lw / 2, y0], [x + lw * .42 + lean, y0 + lh * .55], [x + lw * .08 + lean * 1.4, y0 + lh],
          [x - lw * .2 + lean, y0 + lh * .8], [x - lw * .45 + lean * .5, y0 + lh * .5]]), { line: .8, feature: 'fringe' });
      });
    }
  },
};
