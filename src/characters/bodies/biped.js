// biped.js: a body on two legs, measured in heads (the girl at 3, the hero at 5.5; the adults of 4b2 later). Pure:
// layout() as in quadruped.js (units, origin on the ground under the body, y down, facing screen-right; flip mirrors),
// plus `joints` (shoulder, elbow, wrist, hip, knee, ankle per side, L and R) for checks and props.
//
// One head is HU units tall; every proportion but `heads` is in heads: heads (total height, hair included),
// shoulders and hips (widths), torso (shoulder line to hips), arm (shoulder to wrist), leg (hip to ankle), headW
// (the head's width). The height adds up as foot + leg + torso + neck + head + hair, so the spec's numbers are chosen
// to make that sum `heads` (the test checks it).
// Limbs are two equal segments of fixed length, drawn as one soft outline (CG.limb) that narrows to the ankle and wrist. Angles in radians, 0 = hanging straight down, + = swung forward (in
// the front and back views, outwards). Elbows bend only forward and knees only backward, 0..2.6.
// Pose params: shoulderL/R, elbowL/R, hipL/R, kneeL/R, fistL/R 0..1 (a round fist), lean (the upper body tips
//   forward), lift (units off the ground), crouch 0..1 (legs fold, the body lowers), flight 0..1 (the body turns
//   horizontal, head first), capeFlow (how far the cape streams back), cycle (1 = run with t: arms and legs swing in
//   opposition, about 2 strides a second).
// Gestures (4b2): reachL/R 1 puts that hand at (handXL/R, handYL/R), in heads from the shoulder (x outwards from the
//   front and back, forwards in 3/4 and profile; y down), the elbow found by the arm's two fixed segments (outwards
//   from the front, bending forward in profile); handFrontL/R 1 draws the hand over the face; handOpenL/R 1 opens it
//   into a fan of fingers; headTurn 1 from the back turns the head to show its profile; breath 0..1 lifts the
//   shoulders and chest with t, a breath every 4 s.
// state.bust: draw only the head and shoulders (the expression row of the model sheet); an adult figure is cut
//   below the chest and keeps its hands, for the gestures; bust 'face' cuts just under the shoulders (the face sheet).
// Parts the spec may declare (anything not declared is not drawn): hair { style: 'bob' | 'spiky', locks }, skirt (role skirt), shoes (role shoes),
//   sleeves { wide } (puffy sleeves with a cuff), gloves, boots, cape (role accent), mask (role hair), star (role
//   emblem), eyes { dark } (big dark eyes with highlights), cheeks (always pink; without, they show only when
//   blushing), brows { kind: 'thick' }, build { arm, leg, taper, round, thigh, calf, forearm } (limb thickness in
//   heads, .21 and .24 by default as the chibi's; taper = ankle / thigh width; round = how round the torso's corners
//   are; thigh, calf, forearm override those widths of the limb's profile),
//   eyes.size and mouth { size } (scale the face).
//   eyes { adult } (an adult's almond eye, role iris), mouth { lip } (the lower lip, role lip).
// The adult figure (4b2), all optional:
//   figure { bust, waist, hips, thigh, bustDepth, rumpDepth, neck, hem } (heads): the torso as one soft outline,
//     shoulders → bust → waist → hips (front and back from the widths, profile from the depths, which are measured
//     from the body's middle), down to the crotch; above the top's hem it is the top, below it the legwear. The hips
//     (the legs' joints) sit at hips / 2 - thigh / 2. neck: the neck's length; hem: the top's hem below the waist.
//   head { chin } (0..1: how much the jaw narrows to the chin), neckline { shape: 'round' | 'wide', depth },
//   sleeves { length: 'long' | 'short' }, legwear { kind: 'leggings' | 'trousers', shine: 1 | 2, insert, crease },
//   shoes { heel } (heads: a pump's heel), top { rim } (a light along the top's edge), hair { part: 'side', ears }.
//   A role skinShadow, when the spec has it, shades the neck under the chin.
// Expression params: eyes, mouth (FACES kinds), brows -1 (sad) .. 1 (angry) or a name of FACES.BROWS, blush 0..1
//   (embarrassed), headTilt.
BODIES.biped = {
  HU: 3,
  roles: ['skin', 'hair', 'top', 'legs', 'line', 'shadow', 'eyeWhite', 'cheek'],
  proportions: ['heads', 'shoulders', 'hips', 'torso', 'arm', 'leg', 'headW'],
  partRoles: { skirt: 'skirt', shoes: 'shoes', gloves: 'accent', cape: 'accent', boots: 'accent', mask: 'hair', star: 'emblem' },
  parts: ['head', 'hair', 'fringe', 'ears', 'eyes', 'brows', 'mouth', 'cheeks', 'neck', 'torso', 'arms', 'hands', 'legs', 'shoes',
    'skirt', 'sleeves', 'gloves', 'boots', 'mask', 'star', 'cape', 'shadow', 'build', 'figure', 'neckline', 'legwear', 'top'],
  poseParams: ['shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'fistL', 'fistR', 'lean', 'lift', 'crouch',
    'flight', 'capeFlow', 'cycle', 'reachL', 'reachR', 'handXL', 'handYL', 'handXR', 'handYR', 'handFrontL', 'handFrontR',
    'handOpenL', 'handOpenR', 'headTurn', 'breath'],
  exprParams: ['eyes', 'mouth', 'brows', 'blush', 'headTilt', 'squint', 'look', 'gesture'],
  views: ['front', 'q', 'side', 'back'],
  // roles that some options of a part want (validateCharacter checks them like partRoles)
  optionRoles(parts) {
    const p = parts || {}, out = [];
    if (p.eyes && p.eyes.adult) out.push(['eyes', 'iris']);
    if (p.mouth && p.mouth.lip) out.push(['mouth', 'lip']);
    if (p.legwear && p.legwear.shine) out.push(['legwear', 'clothLight']);
    if (p.legwear && p.legwear.insert) out.push(['legwear', 'insert']);
    if (p.top && p.top.rim) out.push(['top', 'clothLight']);
    if (p.hair && p.hair.part) out.push(['hair', 'hairShadow']);
    if (p.hair && p.hair.style === 'long') out.push(['hair', 'hairLight']);
    return out;
  },
  SHEET: { views: ['front', 'q', 'side', 'back'], poseView: 'q', exprView: 'front', exprBust: true },   // faces read big, as in base.png
  POSE0: { shoulderL: .03, shoulderR: .03, elbowL: .12, elbowR: .12, hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, fistL: 0, fistR: 0,
    lean: 0, lift: 0, crouch: 0, flight: 0, capeFlow: 0, cycle: 0, reachL: 0, reachR: 0, handXL: 0, handYL: 0, handXR: 0, handYR: 0,
    handFrontL: 0, handFrontR: 0, handOpenL: 0, handOpenR: 0, headTurn: 0, breath: 0 },
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
    const B = BODIES.biped;
    let V = B.VIEW[state.view];
    if (!V) throw new Error(`Vista "${state.view}" inesistente. Disponibili: ${B.views.join(', ')}`);
    const P = { ...B.POSE0, ...(state.pose || {}) }, E = { ...B.EXPR0, ...(state.expression || {}) }, t = state.t || 0;
    const pr = spec.proportions, sp = spec.parts || {}, HU = B.HU, parts = [], joints = {};
    const add = (id, role, depth, pts, more = {}) => parts.push({ id, role, depth, pts, line: 1, ...more });
    const dirOf = a => [Math.cos(a), Math.sin(a)], at = (p, a, l) => [p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l];

    // ---- the angles: the pose, plus the run cycle and the crouch ----
    const run = P.cycle * Math.cos(Math.PI * 2 * 2 * t), runB = -run;   // a full stride at t = 0
    // seen end-on (front, back) a stride can't swing sideways: the limbs stay put and each foot lifts straight up in
    // turn (the thigh turns out by half the knee's bend, so the ankle stays under the hip)
    const endOn = !V.face || V.face === 'front', sw = endOn ? 0 : 1;
    const kL = P.cycle * (.35 + .9 * Math.max(0, -run)), kR = P.cycle * (.35 + .9 * Math.max(0, -runB));
    const A = {
      shoulderL: P.shoulderL - run * .9 * sw, shoulderR: P.shoulderR + run * .9 * sw,
      elbowL: P.elbowL + P.cycle * 1.1, elbowR: P.elbowR + P.cycle * 1.1,
      hipL: P.hipL + run * .75 * sw + P.crouch * 1.3 + (endOn ? kL / 2 : 0), hipR: P.hipR + runB * .75 * sw + P.crouch * 1.3 + (endOn ? kR / 2 : 0),
      kneeL: P.kneeL + P.crouch * 2.3 + kL, kneeR: P.kneeR + P.crouch * 2.3 + kR,
    };
    for (const k of ['elbowL', 'elbowR', 'kneeL', 'kneeR']) A[k] = CG.clamp(A[k], 0, 2.6);

    // ---- legs, with the hip at height hy: joints and shapes (before the whole-body turn) ----
    const footH = .1 * HU, legL = pr.leg * HU, armL = pr.arm * HU, legW = (sp.build && sp.build.leg || .24) * HU, armW = (sp.build && sp.build.arm || .21) * HU;
    const hipHalf = pr.hips * HU / 2 * V.w, shHalf = pr.shoulders * HU / 2 * V.w, bd = sp.build || {};
    // the limbs' profiles (full widths at 0, .25, .5, .75, 1 of the way): thigh → knee → calf → ankle, shoulder → elbow → wrist
    const fig = sp.figure, lw = sp.legwear || {}, heel = (sp.shoes && sp.shoes.heel || 0) * HU;
    const thighW = fig && fig.thigh ? fig.thigh * HU : bd.thigh ? bd.thigh * HU : legW;
    let legWs = [thighW, fig ? thighW * .82 : legW * .92, legW * .8, bd.calf ? bd.calf * HU : legW * .82, legW * (bd.taper || .9) * .85];
    // trousers: a little wider than the leg and hardly narrowing
    if (lw.kind === 'trousers') legWs = [legWs[0] * 1.08, legWs[1] * 1.08, legWs[2] * 1.12, legWs[2] * 1.06, legWs[2] * .98];
    const armWs = [armW, armW * .95, armW * .78, bd.forearm ? bd.forearm * HU : armW * .8, armW * .72];
    const legOf = (s, hy) => {
      const L = V.limbs[s], hip = [L.x * (fig ? Math.max(thighW * .45, fig.hips * HU / 2 - thighW / 2) * V.w : hipHalf - legW * .55), hy];
      const a1 = Math.PI / 2 - L.dir * (A['hip' + s] + V.legOut), a2 = a1 + L.dir * A['knee' + s];
      const knee = at(hip, a1, legL / 2), ankle = at(knee, a2, legL / 2);
      // the foot: its sole a foot below the ankle, turned half as much as the shin (a bent knee doesn't stab the
      // ground with the toe); in profile the toe points forward
      const toe = (V.face === 'side' || V.face === 'q' ? .1 * HU : 0) * (sp.boots ? 1.4 : 1), fw = Math.max(V.face === 'side' ? .4 * HU : .3 * HU, sp.boots ? legW * (V.face === 'side' ? 1.6 : 1.2) : 0);
      const footAt = (y0, w, round) => CG.rotate(CG.block(ankle[0] + toe, ankle[1] + y0, ankle[1] + footH, w, w * 1.05, round), (a2 - Math.PI / 2) * .5, ankle[0], ankle[1]);
      const shapes = [['leg' + s, 'legs', 0, CG.limb([hip, knee, ankle], legWs), {}]];
      // strips along the leg: a light on its outer edge (and one on the thigh), a side insert; the trousers' crease
      const outer = V.face === 'side' ? 1 : L.x >= 0 ? 1 : -1;
      const off = (p, q, k) => { const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy) || 1; let nx = -dy / d, ny = dx / d; if (nx * outer < 0) { nx = -nx; ny = -ny; } return [nx * k, ny * k]; };
      const along = (k, side = 1) => {
        const n1 = off(hip, knee, 1), n2 = off(knee, ankle, 1), nk = [(n1[0] + n2[0]) / 2, (n1[1] + n2[1]) / 2];
        return [[hip[0] + n1[0] * legWs[0] / 2 * k * side, hip[1] + n1[1] * legWs[0] / 2 * k * side],
          [knee[0] + nk[0] * legWs[2] / 2 * k * side, knee[1] + nk[1] * legWs[2] / 2 * k * side],
          [ankle[0] + n2[0] * legWs[4] / 2 * k * side, ankle[1] + n2[1] * legWs[4] / 2 * k * side]];
      };
      if (lw.insert) shapes.push(['insert' + s, 'insert', .004, CG.tube(V.face === 'side' ? along(0) : along(.62), .2 * HU, .12 * HU, 3), { line: 0, feature: 'insert' }]);
      if (lw.shine) {
        shapes.push(['shine' + s + '0', 'clothLight', .005, CG.tube(along(.74), .07 * HU, .04 * HU, 3), { line: 0, feature: 'shine' }]);
        if (lw.shine > 1) {                                        // a second light down the front of the thigh, or the back edge in profile
          const p = V.face === 'side' ? along(.74, -1) : along(-.15).slice(0, 2).map((q, i) => i ? [CG.lerp(hip[0], q[0], .85), CG.lerp(hip[1], q[1], .85)] : [CG.lerp(q[0], knee[0], .15), CG.lerp(q[1], knee[1], .15)]);
          shapes.push(['shine' + s + '1', 'clothLight', .005, CG.tube(p, .06 * HU, .035 * HU, 3), { line: 0, feature: 'shine' }]);
        }
      }
      if (lw.crease) shapes.push(['crease' + s, 'line', .006, [knee, [CG.lerp(knee[0], ankle[0], .97), CG.lerp(knee[1], ankle[1], .97)]], { line: .35, stroke: true, feature: 'crease' }]);
      if (sp.boots) shapes.push(['boot' + s, 'accent', .02, CG.tube([[CG.lerp(knee[0], ankle[0], .15), CG.lerp(knee[1], ankle[1], .15)], ankle], legWs[2] * 1.1, legWs[4] * 1.15), { feature: 'boots' }]);
      if (heel) {
        // a pump: the heel raised by `heel`, the toe on the ground; seen from the side and 3/4 a thin heel under it
        const turn = pts => CG.rotate(pts, (a2 - Math.PI / 2) * .5, ankle[0], ankle[1]), [ax, ay] = ankle, gy = ay + footH + heel;
        if (V.face === 'side' || V.face === 'q') {
          const tl = (V.face === 'side' ? .5 : .34) * HU;
          shapes.push(['shoe' + s, 'shoes', .03, turn(CG.spline([[ax - .1 * HU, ay - .05 * HU], [ax - .13 * HU, ay + .1 * HU], [ax - .06 * HU, ay + .2 * HU],
            [ax + tl * .55, gy - .06 * HU], [ax + tl, gy - .015 * HU], [ax + tl * 1.04, gy - .07 * HU], [ax + tl * .55, gy - .2 * HU], [ax + .08 * HU, ay + .02 * HU]], 4)), {}]);
          shapes.push(['heel' + s, 'shoes', .025, turn([[ax - .12 * HU, ay + .1 * HU], [ax - .04 * HU, ay + .16 * HU], [ax - .07 * HU, gy], [ax - .11 * HU, gy]]), { feature: 'heels' }]);
        } else shapes.push(['shoe' + s, 'shoes', .03, turn(CG.block(ax, ay - .06 * HU, gy, fw * .72, fw * .5, .55)), {}]);
      } else if (sp.shoes || sp.boots) shapes.push(['shoe' + s, sp.boots ? 'accent' : 'shoes', .03, footAt(sp.boots ? -.22 * HU : -.16 * HU, fw, .5), sp.boots ? { feature: 'boots' } : {}]);
      else shapes.push(['foot' + s, 'legs', .03, footAt(-.04 * HU, fw * .85, .7), {}]);
      return { L, hip, knee, ankle, shapes };
    };

    // ---- the vertical stack: the lowest point of either leg (a sole, a boot) rests on the ground ----
    const drop = Math.max(...['L', 'R'].flatMap(s => legOf(s, 0).shapes.flatMap(sh => sh[3].map(p => p[1]))));
    const hipY = -drop - P.lift, shY = hipY - pr.torso * HU, neckH = (fig && fig.neck || .07) * HU, hcy = shY - neckH - HU / 2;

    // whole body: flight turns it round the hips, head first; lean tips the upper body forward
    const flightA = P.flight * Math.PI / 2 * .9, leanA = P.lean * .35;
    const breathY = .03 * HU * P.breath * (1 - Math.cos(Math.PI * 2 * t / 4)) / 2;
    const whole = pts => CG.rotate(pts, flightA, 0, hipY), upper = pts => whole(CG.translate(CG.rotate(pts, leanA, 0, hipY), 0, -breathY));

    add('shadow', 'shadow', -10, CG.ellipse(0, .15, Math.max(shHalf, hipHalf) * 1.25 + P.flight * legL * .6, .13 * HU * (1 - Math.min(.5, P.lift * .05)), 28), { line: 0, shade: 1 });

    // ---- legs and feet ----
    for (const s of ['L', 'R']) {
      const { L, hip, knee, ankle, shapes } = legOf(s, hipY), dep = L.near ? .5 + (s === 'R' ? .01 : 0) : -1, dim = L.near ? {} : { dim: .25 };
      Object.assign(joints, { ['hip' + s]: hip, ['knee' + s]: knee, ['ankle' + s]: ankle });
      for (const [id, role, dd, pts, more] of shapes) add(id, role, dep + dd, whole(pts), { ...dim, ...more });
    }

    // ---- torso, neck, skirt ----
    const neckW = (fig ? .44 : .25) * HU * Math.max(.8, V.w);
    add('neck', 'skin', 2.3, upper(CG.block(0, shY - neckH - .06 * HU, shY + .06 * HU, neckW, neckW * 1.08, .6)));
    if ('skinShadow' in spec.roles && V.face) add('neckShadow', 'skinShadow', 2.31, upper(CG.ellipse(V.face === 'side' ? .1 * HU : 0, shY - neckH, neckW * .52, .16 * HU, 18)), { line: 0 });
    if (!fig) add('torso', 'top', 2.5, upper(CG.block(0, shY - .03 * HU, hipY + .06 * HU, shHalf * 2, pr.hips * HU * 1.06 * V.w, sp.build && sp.build.round || .32)));
    else {
      const F = B.figure(fig, V, shY, hipY, shHalf, HU, thighW), hemY = F.waistY + (fig.hem ?? .3) * HU;
      add('torso', 'top', 2.5, upper(CG.clipY(F.outline, hemY, -1)));
      // the hips in the legwear, one piece with the thighs: filled without an outline (its bottom edge would cut
      // across them), its two sides drawn as strokes down to where the thighs' own outlines carry on
      add('pelvis', 'legs', 2.45, whole(CG.clipY(F.outline, hemY - .08 * HU, 1)), { line: 0 });
      for (const sg of [1, -1]) {
        const edge = F.outline.filter(([x, y]) => sg * x > 0 && y >= hemY - .1 * HU && y <= F.crotchY - .05 * HU).sort((a, b) => a[1] - b[1]);
        if (edge.length > 1) add('pelvisEdge' + (sg > 0 ? 'R' : 'L'), 'line', 2.46, whole(edge), { line: 1, stroke: true });
      }
      if (sp.top && sp.top.rim) add('rim', 'clothLight', 2.52, upper(CG.tube(F.rim.filter(p => p[1] < hemY), .07 * HU, .05 * HU, 3)), { line: 0, feature: 'rim' });
      if (sp.neckline) {
        const nl = sp.neckline, wide = nl.shape === 'wide', dy = (nl.depth || (wide ? .32 : .45)) * HU;
        const rx = wide ? shHalf * .82 : .42 * HU * Math.max(.6, V.w), cx = V.face === 'side' ? .3 * HU : V.face === 'q' ? .1 * HU : 0, k = V.face === 'side' ? .3 : V.face === 'q' ? .85 : 1;
        if (V.face) {
          add('neckline', 'skin', 2.55, upper(CG.clipY(CG.ellipse(cx, shY - .04 * HU, rx * k, dy, 30), shY - .05 * HU, 1)), { line: .5, ...(V.face !== 'side' ? { feature: 'neckline' } : {}) });
          if (V.face !== 'side') [-1, 1].forEach((sg, i) => add('collar' + i, 'line', 2.56, upper([[cx + sg * .1 * HU * k, shY + .12 * HU], [cx + sg * .22 * HU * k, shY + .09 * HU], [cx + sg * .34 * HU * k, shY + .1 * HU]]), { line: .35, stroke: true }));
        }
      }
    }
    if (sp.star && V.face) {                                       // a five-pointed star on the chest (not from the back)
      const sx = V.face === 'side' ? shHalf * .7 : V.face === 'q' ? shHalf * .12 : 0, sk = V.face === 'side' ? .4 : V.face === 'q' ? .85 : 1, sr = .3 * HU;
      const star = [...Array(10)].map((_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? sr * .45 : sr; return [sx + Math.cos(a) * rr * sk, shY + .5 * HU + Math.sin(a) * rr]; });
      add('star', 'emblem', 2.6, upper(star), { line: .7, feature: 'star' });
    }
    if (sp.cape) {
      // one sheet from the shoulders to the waist, a little wider at the hem, which waves softly with t. capeFlow
      // swings it back (in profile and 3/4) or shortens it (seen end-on); in flight "back" is along the body.
      const len = (hipY - shY) * .95, flow = P.capeFlow, side = V.face === 'side' || V.face === 'q';
      const [off, hw, hem] = V.face === 'side' ? [-.5, .62, 1] : V.face === 'q' ? [-.35, .9, 1.2] : [0, .92, 1.25];
      const o = off * shHalf, L = side ? len : len * (1 - .45 * flow), n = 10, edge = [];
      for (let i = 0; i <= n; i++) {
        const u = 1 - 2 * i / n;                                    // 1 right … -1 left
        edge.push([o + u * hem * shHalf, shY + L + .05 * HU * u * u + .06 * HU * (1 + flow) * Math.sin(Math.PI * 1.5 * u + Math.PI * 2 * 1.6 * t)]);
      }
      const bulge = s => [o + s * (hw + hem) / 2 * shHalf * 1.04, shY + L * .5];
      let cape = [[o - hw * shHalf, shY], [o + hw * shHalf, shY], bulge(1), ...edge, bulge(-1)];
      if (side) cape = CG.rotate(cape, flow * 1.15 * (1 - .8 * P.flight), o, shY);
      add('cape', 'accent', V.face ? (V.face === 'side' ? 1.2 : 1) : 3, upper(cape), { feature: 'cape' });
    }
    if (sp.skirt) {
      const flare = 1.5 + .25 * P.cycle * Math.abs(run) + .2 * P.crouch;
      add('skirt', 'skirt', 2, whole(CG.block(0, hipY - .12 * HU, hipY + .36 * HU, pr.hips * HU * V.w, pr.hips * HU * flare * V.w, .22)), { feature: 'skirt' });
    }

    // ---- arms and hands ----
    for (const s of ['L', 'R']) {
      const L = V.limbs[s], sh = [L.x * (shHalf - armW * .5), shY + armW * .45];
      let a1 = Math.PI / 2 - L.dir * (A['shoulder' + s] + V.out), a2 = a1 - L.dir * A['elbow' + s];
      let elbow = at(sh, a1, armL / 2), wrist = at(elbow, a2, armL / 2);
      const reach = CG.clamp(P['reach' + s]);
      if (reach > 0) {
        // the hand where the gesture puts it: two fixed segments; from the front and back the elbow hangs low (or goes
        // outwards when the hand is above the head), in 3/4 and profile it bends forward
        const fwd = V.face === 'side' || V.face === 'q', sx = fwd ? 1 : Math.sign(L.x) || 1, seg = armL / 2;
        const T = [sh[0] + sx * P['handX' + s] * HU, sh[1] + P['handY' + s] * HU], th = Math.atan2(T[1] - sh[1], T[0] - sh[0]);
        const d = CG.clamp(Math.hypot(T[0] - sh[0], T[1] - sh[1]), 2 * seg * Math.cos(1.3) + 1e-6, 2 * seg - 1e-6), al = Math.acos(d / (2 * seg));
        const w = at(sh, th, d), pick = [th + al, th - al].map(a => { const e = at(sh, a, seg); return { a, e, cross: (e[0] - sh[0]) * (w[1] - e[1]) - (e[1] - sh[1]) * (w[0] - e[0]) }; });
        const high = P['handY' + s] < -.9;
        const best = fwd ? pick.find(p => p.cross < 0) || pick[0]
          : pick.sort((p, q) => high ? Math.sign(sh[0] || 1) * (q.e[0] - p.e[0]) : q.e[1] - p.e[1])[0];
        // partly reaching (a gesture fading in): the angles are blended, so the arm keeps its length all the way
        const turn = (a, b) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * reach, b2 = Math.atan2(w[1] - best.e[1], w[0] - best.e[0]);
        a1 = turn(a1, best.a); a2 = turn(a2, b2);
        elbow = at(sh, a1, seg); wrist = at(elbow, a2, seg);
      }
      Object.assign(joints, { ['shoulder' + s]: sh, ['elbow' + s]: elbow, ['wrist' + s]: wrist });
      const dep = L.near ? 3.5 + (s === 'R' ? .02 : 0) : 1, dim = L.near ? {} : { dim: .25 };
      const wide = sp.sleeves && sp.sleeves.wide, cuffAt = at(wrist, a2, -.1 * HU);
      const short = sp.sleeves && sp.sleeves.length === 'short';
      add('arm' + s, short ? 'skin' : 'top', dep, upper(CG.limb([sh, elbow, wide ? cuffAt : wrist], wide ? [1.25, 1.3, 1.35, 1.45, 1.55].map(k => k * armW) : armWs)), dim);
      if (short) add('sleeve' + s, 'top', dep + .005, upper(CG.tube([sh, at(sh, a1, armL * .24)], armWs[0] * 1.15, armWs[1] * 1.12, 4)), dim);
      if (wide) add('cuff' + s, 'top', dep + .01, upper(CG.tube([cuffAt, at(wrist, a2, -.02 * HU)], armW * 1.2, armW * 1.2, 3)), { ...dim, line: .8 });
      if (sp.gloves) add('glove' + s, 'accent', dep + .01, upper(CG.tube([at(elbow, a2, armL * .2), wrist], armWs[3] * 1.15, armWs[4] * 1.1)), { ...dim, feature: 'gloves' });
      // the hand: an oval with a thumb, or a round fist
      const hr = Math.max(.12 * HU, armW * (fig ? .5 : .62)), hc = at(wrist, a2, hr * .7), role = sp.gloves ? 'accent' : 'skin', hd = P['handFront' + s] > .5 ? 5.2 : dep;
      if (P['fist' + s] > .5) add('hand' + s, role, hd + .02, upper(CG.ellipse(hc[0], hc[1], hr * 1.05, hr * 1.05, 18)), dim);
      else if (P['handOpen' + s] > .5) {
        // an open hand: a palm and four fingers fanned out, the thumb aside
        add('hand' + s, role, hd + .02, upper(CG.ellipse(hc[0], hc[1], hr * .8, hr * .7, 16, a2)), dim);
        for (let i = 0; i < 4; i++) {
          const fa = a2 + (i - 1.5) * .22, fc = at(hc, fa, hr * 1.15);
          add('finger' + s + i, role, hd + .021 + i * .001, upper(CG.ellipse(fc[0], fc[1], hr * .55, hr * .17, 10, fa)), { ...dim, line: .7 });
        }
        add('thumb' + s, role, hd + .025, upper(CG.ellipse(...at(hc, a2 + L.dir * 1.2, hr * .85), hr * .45, hr * .17, 10, a2 + L.dir * 1.2)), { ...dim, line: .7 });
      } else {
        add('thumb' + s, role, hd + .015, upper(CG.ellipse(...at(at(wrist, a2, hr * .5), a2 + L.dir * Math.PI / 2, -hr * .55), hr * .32, hr * .5, 12, a2)), dim);
        add('hand' + s, role, hd + .02, upper(CG.ellipse(hc[0], hc[1], hr * 1.05, hr * .78, 18, a2)), dim);
      }
    }

    // ---- head group: hair behind, head, ears, face, hair in front (turned by headTilt) ----
    // seen from the back with headTurn, the head is drawn in profile and mirrored: she looks back over her shoulder
    const turned = P.headTurn > .5 && !V.face, firstHead = parts.length;
    if (turned) V = B.VIEW.side;
    const headW = pr.headW * HU * (V.face === 'side' ? .92 : 1), hcx = V.face === 'side' ? .12 * HU : V.face === 'q' ? .06 * HU : 0;
    // a head turned back is drawn in profile and mirrored in its own frame, before the body's lean and flight turn it
    // (so it stays on its neck); in flight it looks ahead
    const tilt = E.headTilt - flightA * .8, head = pts => turned ? upper(CG.rotate(pts.map(([x, y]) => [-x, y]), -tilt, -hcx, hcy + HU / 2)) : upper(CG.rotate(pts, tilt, hcx, hcy + HU / 2));
    // the head: an ellipse, its jaw narrowing to the chin by head.chin (adults)
    const chin = sp.head && sp.head.chin || 0;
    const headShape = (cx, cy, rx, ry) => CG.ellipse(cx, cy, rx, ry, 44).map(([x, y]) => [cx + (x - cx) * (1 - chin * Math.pow(Math.max(0, (y - cy) / ry), 1.6)), y]);
    add('head', 'skin', 4, head(headShape(hcx, hcy, headW / 2, HU / 2)));
    // ears: both from the front, the near one from 3/4 and in profile, none from the back
    const ears = sp.hair && sp.hair.ears === false ? [] : V.face === 'front' ? [hcx - headW * .48, hcx + headW * .48] : V.face === 'q' ? [hcx - headW * .44] : V.face === 'side' ? [hcx - headW * .1] : [];
    ears.forEach((ex, i) => add('ear' + i, 'skin', 4.9, head(CG.ellipse(ex, hcy + .06 * HU, .085 * HU, .13 * HU, 16)), { feature: 'ears', line: .8 }));
    if (V.face) {
      const F = V.face === 'front' ? { eyes: [[-.21, 1], [.21, 1]], mouth: 0, cheeks: [-.33, .33] }
        : V.face === 'q' ? { eyes: [[-.04, .88], [.27, 1]], mouth: .13, cheeks: [-.17, .4] } : { eyes: [[.3, .85]], mouth: .38, cheeks: [.2] };
      const ey = hcy + (sp.mask ? .07 : sp.eyes && sp.eyes.adult ? .07 : .16) * HU, r = .135 * HU * (sp.eyes && sp.eyes.size || 1),   // a mask lifts the eyes, leaving room for the mouth
        eo = { look: E.look, squint: E.squint, dark: !!(sp.eyes && sp.eyes.dark), adult: !!(sp.eyes && sp.eyes.adult) };
      const [browK, browLift] = typeof E.brows === 'string' ? FACES.BROWS[E.brows] : [E.brows, 0];
      if (sp.mask) {
        // a domino mask: a lobe round each eye, thinner over the nose, cut to the head's outline
        const exs = F.eyes.map(([x, k]) => [hcx + x * HU, r * k]), m = r * .2;
        const x0 = exs[0][0] - exs[0][1] - m * (V.face === 'side' ? 3.2 : 1.6), x1 = exs[exs.length - 1][0] + exs[exs.length - 1][1] + m * 1.4, n = 24;
        const h = x => { const u = (x - x0) / (x1 - x0) * 2 - 1; return Math.sqrt(Math.max(0, 1 - u ** 8)) * Math.max(r * .45, ...exs.map(([ex, er]) => (er * .9 + m) * Math.exp(-(((x - ex) / (er * 1.2)) ** 4)))); };
        const xsM = [...Array(n + 1)].map((_, i) => CG.lerp(x0, x1, i / n));
        const domino = [...xsM.map(x => [x, ey - .05 * r - h(x)]), ...xsM.reverse().map(x => [x, ey + .05 * r + h(x) * .8])];
        add('mask', 'hair', 4.78, head(CG.clipConvex(domino, CG.ellipse(hcx, hcy, headW / 2 + .01, HU / 2 + .01, 44))), { feature: 'mask' });
      }
      F.eyes.forEach(([x, k], i) => {
        const ex = hcx + x * HU;
        FACES.eye(E.eyes, ex, ey, r * k, { ...eo, outer: F.eyes.length > 1 ? (i ? 1 : -1) : 1 }).parts.forEach(p => add('eye' + i + p.id, p.role, 4.8, head(p.pts), { line: p.line, stroke: p.stroke }));
        // the brow's inner end is the one towards the middle of the face
        const inward = F.eyes.length > 1 ? (i ? -1 : 1) : 1;
        FACES.brows(sp.brows && sp.brows.kind || 'line', ex, sp.mask ? ey - r * 1.25 - .07 * HU : ey - (eo.adult ? .16 : .19) * HU, .2 * HU * k * inward, browK, browLift).parts
          .forEach(p => add('brow' + i, p.role, 5.05, head(p.pts), { line: p.line, stroke: true }));
      });
      if (sp.cheeks || E.blush > 0) F.cheeks.forEach((x, i) => FACES.cheek(hcx + x * HU, hcy + .31 * HU, .09 * HU, E.blush).parts
        .forEach(p => add(p.id === 'cheek' ? 'cheek' + i : 'blush' + i, p.role, 4.75, head(p.pts), { line: p.line, stroke: p.stroke, ...(p.dim ? { dim: p.dim } : {}), ...(p.id === 'cheek' && sp.cheeks ? { feature: 'cheeks' } : {}) })));
      const mx = hcx + F.mouth * HU, my = sp.mask ? ey + r * 1.1 + .08 * HU : hcy + .36 * HU, mw = .15 * HU * (sp.mouth && sp.mouth.size || 1);
      FACES.mouth(E.mouth, mx, my, mw).parts
        .forEach(p => add(p.id, p.role, 4.8 + (p.id === 'mouth' ? 0 : .001), head(p.pts), { line: p.stroke ? .5 : p.line, stroke: p.stroke }));
      // the lower lip, a soft touch of colour under a closed or half-open mouth
      if (sp.mouth && sp.mouth.lip && (E.mouth === 'flat' || E.mouth === 'ajar'))
        add('lip', 'lip', 4.79, head(CG.ellipse(mx, my + mw * .22, mw * .3, mw * .08, 14)), { line: 0 });
    }
    if (sp.hair) B.hair(spec, V, { hcx, hcy, headW, HU, t, add, head, headShape, shY, turned });
    // (the features of a view describe its usual drawing: the turned head carries none)
    if (turned) { for (const p of parts.slice(firstHead)) delete p.feature; V = B.VIEW.back; }

    // ---- state.bust: only head and shoulders, cut below the chest (expression sheets, close-ups) ----
    if (state.bust) {
      const cut = shY + (state.bust === 'face' ? .45 : fig ? 1.35 : .6) * HU, keep = fig ? /^(head|hair|face|lock|spike|ear|eye|brow|cheek|blush|mouth|lip|mask|neck|torso|rim|collar|arm|hand|thumb|finger|sleeve|cuff)/
        : /^(head|hair|face|lock|spike|ear|eye|brow|cheek|blush|mouth|mask|neck|torso|star|cape)/;
      // the cut rests on the ground line (y = 0), so a sheet row lines the busts up like whole figures
      const kept = parts.filter(p => keep.test(p.id)).map(p => ({ ...p, pts: CG.translate(p.stroke ? p.pts : CG.clipY(p.pts, cut, -1), 0, -cut) }))
        .filter(p => p.pts.length > 2 || (p.stroke && p.pts.length > 1));
      parts.length = 0; parts.push(...kept);
      for (const k of Object.keys(joints)) joints[k] = [joints[k][0], joints[k][1] - cut];
    }

    // ---- order by depth, then mirror for flip ----
    for (const k of Object.keys(joints)) joints[k] = (/^(hip|knee|ankle)/.test(k) ? whole : upper)([joints[k]])[0];
    parts.sort((a, b) => a.depth - b.depth);
    if (state.flip) { for (const p of parts) p.pts = p.pts.map(([x, y]) => [-x, y]); for (const k of Object.keys(joints)) joints[k] = [-joints[k][0], joints[k][1]]; }
    const all = parts.flatMap(p => p.pts), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    return { parts, joints, bounds: { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) } };
  },

  // The adult torso's outline for a view: shoulders, armpits, bust, under the bust, waist, high hip, hips, crotch, as
  // a smooth closed curve. Returns { outline, waistY, rim } (rim: the screen-left edge, inside, for a light).
  figure(f, V, shY, hipY, shHalf, HU, thighW) {
    const wv = V.w, bu = f.bust / 2 * HU * wv, wa = f.waist / 2 * HU * wv, hi = f.hips / 2 * HU * wv, sh = shHalf;
    const yArm = shY + .4 * HU, yBust = shY + .78 * HU, yUnder = shY + 1.1 * HU, waistY = shY + (hipY - shY) * .66;
    const yHigh = (waistY + hipY) / 2, yHip = hipY + .12 * HU, yCrotch = hipY + .5 * HU;
    let right, left;
    if (V.face === 'side') {
      const bd = f.bustDepth * HU, rd = f.rumpDepth * HU, d = .38 * HU;
      right = [[d * .85, shY - .02 * HU], [d, yArm - .1 * HU], [bd, yBust], [bd * .62, yUnder], [d * .85, waistY], [d * .95, yHip], [d * .85, yCrotch]];
      left = [[-d, shY], [-d * 1.05, yArm], [-d * .95, yBust], [-d * .82, waistY], [-rd * .8, yHigh], [-rd, yHip], [-rd * .78, yCrotch]];
    } else {
      const side = sg => {
        const qb = V.face === 'q' ? (sg > 0 ? .25 * f.bustDepth * HU : 0) : 0, qr = V.face === 'q' ? (sg < 0 ? .18 * f.rumpDepth * HU : 0) : 0;
        return [[sg * .26 * HU, shY - .1 * HU], [sg * sh * .78, shY - .02 * HU], [sg * sh, shY + .2 * HU], [sg * (bu * .93 + qb * .5), yArm], [sg * (bu + qb), yBust], [sg * ((bu + wa) / 2 * 1.02 + qb * .3), yUnder],
          [sg * wa, waistY], [sg * ((wa + hi) / 2 * .98 + qr * .6), yHigh], [sg * (hi + qr), yHip], [sg * (hi * .97 + qr * .5), yCrotch]];
      };
      right = side(1); left = side(-1);
    }
    const crotch = [[0, yCrotch + .1 * HU]];
    const outline = CG.spline([...right, ...crotch, ...left.slice().reverse()], 6);
    const rim = left.slice(3, 9).map(([x, y]) => [x + .09 * HU, y]);
    return { outline, waistY, rim, crotchY: yCrotch };
  },

  // The bob: a round dome over the skull, straight sides down to the chin ending in round tips that flick a little
  // outwards; between the tips the edge rises behind the face to the jaw (inner = half the gap there; 0 = from the
  // back, a straight hem).
  bob(cx, hcy, W, HU, inner) {
    const top = .59 * HU, tipY = hcy + .56 * HU, rr = .13 * HU, flick = .04 * HU, pts = [];
    for (let i = 0; i <= 20; i++) { const a = Math.PI + i / 20 * Math.PI; pts.push([cx + W * Math.cos(a), hcy + top * Math.sin(a)]); }
    const tip = s => {                                            // s = 1 right, -1 left: down the side, round the end
      const ox = cx + s * (W + flick - rr), out = [];
      for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI; out.push([ox + s * rr * Math.cos(a), tipY - rr + rr * Math.sin(a)]); }
      return out;
    };
    const right = tip(1), left = tip(-1).reverse();
    if (inner) return [...pts, ...right, [cx + inner, hcy + .4 * HU], [cx - inner, hcy + .4 * HU], ...left];
    return [...pts, ...right, ...left];
  },

  // The hair: one mass drawn over the head, then the face as a window cut out of it (the head inside straight lines,
  // so its own outline draws the hairline and the hair's edges), then the style's locks over the hairline.
  hair(spec, V, { hcx, hcy, headW, HU, add, head, headShape, shY, turned }) {
    const h = spec.parts.hair || {}, style = h.style || 'bob', hairline = hcy - .2 * HU, jaw = hcy + .53 * HU;
    const mx = hcx + (V.face === 'side' ? -.16 : V.face === 'q' ? -.07 : 0) * HU, mw = headW * (V.face === 'side' ? 1.24 : 1.36);
    const spiky = style === 'spiky';
    // the bob: a long mass down to the jaw; spiky: a short cap over the skull, the spikes standing out of it
    const cap = CG.ellipse(mx, hcy - .06 * HU, headW * .55, .56 * HU, 44);
    const mass = !spiky ? BODIES.biped.bob(mx, hcy, headW * (V.face === 'side' ? .6 : V.face ? .66 : .53), HU, V.face ? headW * .34 : 0)
      : V.face === 'side' || V.face === 'q' ? CG.clipLine(CG.clipY(cap, hcy + .22 * HU, -1), [hcx + (V.face === 'side' ? -.12 : -.3) * HU, hcy + .3 * HU], [hcx + (V.face === 'side' ? .32 : .2) * HU, hcy - .3 * HU])
      : CG.clipY(cap, V.face ? hairline - .05 * HU : hcy + .3 * HU, -1);
    add('hair', 'hair', 4.6, head(mass));
    if (style === 'long') {
      // long wavy hair: a mass behind (behind the body from the front and in profile, over the back from behind),
      // then `locks` big wavy locks, each with a light down it; the face never moves them, only the body (breath)
      // (a head turned back over the shoulder: drawn in profile, but the hair hangs over the back)
      const n = h.locks || 5, back = !V.face, side = V.face === 'side', W = headW * (side ? .62 : .7), bottom = shY + 1.5 * HU, over = back || turned;
      const dome = [...Array(21)].map((_, i) => { const a = Math.PI + i / 20 * Math.PI; return [mx + W * Math.cos(a), hcy - .02 * HU + .6 * HU * Math.sin(a)]; });
      // down from the skull, widening softly to a wavy hem
      const hemPts = [...Array(9)].map((_, i) => { const u = i / 8; return [mx + W * 1.2 - u * W * 2.4, bottom + .08 * HU * Math.sin(u * Math.PI * 4)]; });
      const sides = sg => [[mx + sg * W * 1.04, hcy + .35 * HU], [mx + sg * W * 1.1, shY + .3 * HU]];
      add('hairBack', 'hair', over ? 4.62 : 2, head(CG.spline([...dome.filter((_, i) => i % 2 === 0), ...sides(1), ...hemPts, ...sides(-1).reverse()], 4)));
      for (let i = 0; i < n; i++) {
        const sd = side ? -1 : i % 2 ? 1 : -1, k = Math.floor(i / 2), u = n > 1 ? i / (n - 1) * 2 - 1 : 0;
        const [x0, y0, dep] = back ? [mx + u * W * .95, hcy, 4.7] : side ? [mx - W * (.35 + .25 * i / n), hcy + .25 * HU, over ? 4.7 : 2.1]
          : [mx + sd * W * (.6 + .12 * k), hcy + .05 * HU, 3.6];                 // the tops hidden under the hair over the head
        const len = bottom + (back ? .1 * HU : 0) - y0, m = 14, amp = .09 * HU, ph = i * 1.3;
        const c = [...Array(m + 1)].map((_, j) => { const tt = j / m; return [x0 + amp * Math.sin(Math.PI * 2 * 1.2 * tt + ph) + (back || side ? .05 : .2 + .1 * k) * sd * HU * Math.sqrt(tt), y0 + tt * len]; });
        // each lock narrow where it leaves the head, widest a third of the way down, then thinner to its round tip
        const w = tt => .34 * HU * (.5 + .5 * Math.sin(Math.min(1, tt * 3) * Math.PI / 2)) * (1 - .35 * tt) / 2, L = c.map(([x, y], j) => [x - w(j / m), y]), R = c.map(([x, y], j) => [x + w(j / m), y]);
        const tip = FACES.arc(c[m][0], c[m][1], w(1), w(1) * 1.2, 0, Math.PI, 8).reverse();
        const tag = side ? {} : { feature: 'locks' }, light = side ? {} : { feature: 'hairLight' };
        add('lock' + i, 'hair', dep + i * .002, head([...L, ...tip, ...R.reverse()]), { line: .8, ...tag });
        const sl = c.slice(Math.round(m * .12), Math.round(m * .75)).map(([x, y], j) => [x + w(j / m) * .3, y]);
        add('lockLight' + i, 'hairLight', dep + i * .002 + .001, head(CG.tube(sl, .07 * HU, .04 * HU, 3)), { line: 0, ...light });
      }
      // the parting, down the middle of the crown
      if (V.face && !side) add('parting', 'line', 4.61, head([[hcx, hcy - .58 * HU], [hcx + (V.face === 'q' ? .03 * HU : 0), hcy - .22 * HU]]), { line: .5, stroke: true });
    }
    function drawSpikes() {
      if (V.face === 'front') {
        // from the front a quiff: three big spikes over the forehead swept to the right, the middle one tallest
        [-.45, 0, .45].forEach((u, i) => {
          const a = -Math.PI / 2 + u * .9, base = [mx + Math.cos(a) * headW * .42, hcy - .06 * HU + Math.sin(a) * .5 * HU];
          const len = (i === 1 ? .62 : .46) * HU, w = .3 * HU, tipA = a + .85, tip = [base[0] + Math.cos(tipA) * len, base[1] + Math.sin(tipA) * len];
          const nx = -Math.sin(a) * w, ny = Math.cos(a) * w, bx = Math.cos(a) * .1 * HU, by = Math.sin(a) * .1 * HU;
          add('spike' + i, 'hair', 4.55, head([[base[0] - nx - bx, base[1] - ny - by], tip, [base[0] + nx - bx, base[1] + ny - by]]), { feature: 'spikes' });
        });
        return;
      }
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
    const headPts = headShape(hcx, hcy, headW / 2, HU / 2), fw = headW * .37;
    let face = CG.clipY(headPts, hairline, 1);
    // from the front the hair frames the face with soft curves; in profile and 3/4 its edge runs from the forehead
    // down in front of the ear
    if (V.face === 'front') face = CG.clipConvex(face, CG.ellipse(hcx, hcy + .3 * HU, fw * 1.12, .72 * HU, 36));
    else {
      const [top, bot] = V.face === 'side' ? [.08, -.2] : [-.24, -.34];
      face = CG.clipLine(face, [hcx + top * HU, hairline], [hcx + bot * HU, jaw]);
    }
    add('face', 'skin', 4.7, head(face));
    if (h.part === 'side') {
      // a side part: one long lock swept from the parting across the forehead to the far temple, the other side of the
      // forehead bare; under the mass, its shadow round the face
      const W = headW / 2, pts = V.face === 'side'
        ? [[hcx - .1 * HU, hairline - .22 * HU], [hcx + W * .7, hairline - .12 * HU], [hcx + W * 1.02, hairline + .1 * HU], [hcx + W * .85, hairline + .3 * HU], [hcx + W * .35, hairline + .08 * HU], [hcx - .05 * HU, hairline - .02 * HU]]
        : [[hcx - W * .3, hairline - .2 * HU], [hcx + W * .5, hairline - .16 * HU], [hcx + W * 1.04, hairline + .02 * HU], [hcx + W * .98, hcy - .02 * HU],
           [hcx + W * .7, hairline + .13 * HU], [hcx + W * .2, hairline + .06 * HU], [hcx - W * .32, hairline - .02 * HU]].map(([x, y]) => [V.face === 'q' ? hcx + (x - hcx) * .9 + .04 * HU : x, y]);
      add('lock0', 'hair', 5, head(CG.spline(pts, 5)), { line: .8, feature: 'fringe' });
      add('hairShadow', 'hairShadow', 4.65, head(CG.clipY(BODIES.biped.bob(mx, hcy, headW * (V.face === 'side' ? .5 : .56), HU, 0), hcy - .05 * HU, 1)), { line: 0 });
    } else if (style === 'bob') {
      // three real locks over the forehead: soft points of different lengths (the middle one longest), a little
      // overlapping, the tips bending outwards (seen from 3/4 and in profile, all towards the nape)
      const x0 = V.face === 'front' ? hcx - fw : V.face === 'q' ? hcx - .2 * HU : hcx + .05 * HU, x1 = V.face === 'front' ? hcx + fw : hcx + headW * .5;
      const lw = (x1 - x0) / 3 * 1.2, y0 = hairline - .1 * HU;
      [0, 1, 2].forEach(i => {
        const x = CG.lerp(x0, x1, (i + .5) / 3), lh = [.24, .34, .28][i] * HU;
        const bend = (V.face === 'front' ? [-1, .15, 1][i] : -1) * lw * .35, tip = [x + bend, y0 + lh];
        const curve = (p, q, c, n = 8) => [...Array(n + 1)].map((_, k) => { const t = k / n; return [(1 - t) ** 2 * p[0] + 2 * t * (1 - t) * c[0] + t * t * q[0], (1 - t) ** 2 * p[1] + 2 * t * (1 - t) * c[1] + t * t * q[1]]; });
        const left = curve([x - lw / 2, y0], tip, [x - lw * .42 + bend * .3, y0 + lh * .62]);
        const right = curve(tip, [x + lw / 2, y0], [x + lw * .42 + bend * .5, y0 + lh * .58]).slice(1);
        // filled without an outline (its top edge would cut across the hair), its two sides drawn as one stroke
        add('lock' + i, 'hair', 5 + i * .002, head([...left, ...right]), { line: 0, feature: 'fringe' });
        add('lockEdge' + i, 'line', 5.001 + i * .002, head([...left, ...right]), { line: .8, stroke: true });
      });
    }
  },
};
