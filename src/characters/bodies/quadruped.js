// quadruped.js: a four-legged body (the cat; the little dragon, with wings). Pure: layout() returns the parts of
// one drawing, in units (u = 1), origin on the ground under the body, y down, facing screen-right; flip mirrors it.
//
// Proportions (spec.proportions): length (nose to rump), head (head width), bodyHeight, legLength, legWidth, tail.
// Pose params: crouch 0..1 (body lowered, legs bent), pitch (radians, + = nose up), lift (units off the ground),
//   stretch (body length factor), legSwing (how far legs swing), legPhase, pawRaise 0..1 (near front paw up),
//   headDrop (units the head sinks, e.g. stalking), cycle (1 = the legs run with t: a bounding gallop, front legs
//   reaching forward while the back legs push back, about 2 strides a second), wingOpen 0 (folded along the flank)
//   .. 1 (spread), flap (1 = open wings beat with t, about 2 beats a second).
// Parts the spec may declare (anything not declared is not drawn): ears { size }, blaze (cream muzzle and bib),
//   whiskers, collar, bell, tail { width, base, angle, hook, tip }, eyes { dark: true } (big dark eyes with a highlight)
//   or { iris: true } (a coloured iris with a round pupil, role iris), eyes.size (scales them), horns { size } (two
//   short cream horns bent back), crests { head, tail } (coral spikes, role crest), belly (a cream stripe from the
//   neck to the tail), wings { span, sections } (bat wings, role membrane; span = open width in body widths, front).
// tail: base = width at the root (a thick, tapering tail), angle { view: direction at rest, a share of π } and
//   y { view: root height, a share of half the body height } override the view's defaults, hook = how much the
//   default hook bends (1 = the cat's), tip: false = no cream tip.
// Expression params: eyes, mouth (FACES kinds), ears -1 (down) .. 0 .. 1 (flat back), tail -1 (drooping) .. 0 (hook)
//   .. 1 (straight up), tailCurl 0..1 (wrapped round the body), headTilt (radians). act() adds squint and look.
BODIES.quadruped = {
  roles: ['fur', 'cream', 'line', 'shadow'],
  proportions: ['length', 'head', 'bodyHeight', 'legLength', 'legWidth', 'tail'],
  partRoles: { ears: 'earInner', collar: 'collar', bell: 'bell', crests: 'crest', wings: 'membrane' },   // optional parts and the colour role each needs
  parts: ['body', 'head', 'muzzle', 'blaze', 'ears', 'legs', 'tail', 'tailTip', 'collar', 'bell', 'whiskers', 'eyes', 'mouth', 'shadow',
    'horns', 'crests', 'belly', 'wings'],
  poseParams: ['crouch', 'pitch', 'lift', 'stretch', 'legSwing', 'legPhase', 'pawRaise', 'headDrop', 'cycle', 'wingOpen', 'flap'],
  exprParams: ['eyes', 'mouth', 'ears', 'tail', 'tailCurl', 'headTilt'],
  views: ['front', 'q', 'side', 'back'],
  SHEET: { views: ['side', 'front', 'q', 'back'], poseView: 'side', exprView: 'q' },   // as in the cat's base.png / pose.png
  POSE0: { crouch: 0, pitch: 0, lift: 0, stretch: 1, legSwing: 0, legPhase: 0, pawRaise: 0, headDrop: 0, cycle: 0, wingOpen: 0, flap: 0 },
  EXPR0: { eyes: 'open', mouth: 'catSmile', ears: 0, tail: 0, tailCurl: 0, headTilt: 0, squint: 0, look: 0 },
  // Per view: body shape and width factor, where the head sits (x as a share of the length), the legs
  // ([x as a share of the body length, far?, front?]; seen end-on only the near pair shows, the body hides the other),
  // where the tail starts (y as a share of half the body height), how it points and bends (hook: per link; from the
  // back it rises straight up the middle and hooks only at the end), which face shows.
  VIEW: {
    side:  { body: 'bean', lenK: 1, headX: .5, legs: [[-.34, 1, 0], [.3, 1, 1], [-.4, 0, 0], [.24, 0, 1]], tail: { x: -.5, y: -.6, a: -.62, flipBend: 1, behind: 1 }, face: 'side' },
    q:     { body: 'bean', lenK: .7, headX: .55, legs: [[-.3, 1, 0], [.34, 1, 1], [-.38, 0, 0], [.22, 0, 1]], tail: { x: -.5, y: -.7, a: -.6, flipBend: 1, behind: 1 }, face: 'q' },
    front: { body: 'round', lenK: .6, headX: 0, legs: [[-.2, 0, 1], [.2, 0, 1]], tail: { x: .42, y: -.33, a: -.4, flipBend: -1, behind: 1 }, face: 'front' },
    back:  { body: 'round', lenK: .6, headX: 0, legs: [[-.2, 0, 0], [.2, 0, 0]], tail: { x: 0, y: .6, a: -.5, flipBend: 1, behind: 0, hook: [0, 0, 0, .12, .5, .7] }, face: null },
  },
  // A wing's joints, in wing lengths from the shoulder: shoulder S, elbow E, wrist W, three finger tips F1..F3 and the
  // root R where the membrane meets the body. OPEN is drawn flat (u outwards, v down) and placed per view by WING_MAP;
  // FOLDED is drawn as seen from the side (x forward, y down), along the flank, and squeezed per view.
  WING: {
    OPEN:   { S: [0, 0], E: [.24, -.36], W: [.48, -.6], F1: [1, -.62], F2: [.95, .02], F3: [.66, .34], R: [.14, .4] },
    FOLDED: { S: [0, 0], E: [.06, .1], W: [.04, -.16], F1: [-.72, -.06], F2: [-.62, .1], F3: [-.42, .2], R: [-.14, .22] },
  },
  // per view and wing (N near, F far): where u and v point on screen, the folded wing's squeeze ([x, y] factors, or
  // fold: 'side' = it hangs along the flank seen end-on), the shoulder offset (in body heights) and the depth.
  WING_MAP: {
    side:  { N: { u: [-1.15, -.65], v: [-.65, 1.15], fold: [1, 1], at: [0, 0], depth: 1 },
             F: { u: [-.9, -1], v: [-1, .9], fold: [1, 1], at: [.09, -.07], depth: -.8, dim: .3 } },
    q:     { N: { u: [-1.05, -.7], v: [-.7, 1.05], fold: [.75, 1], at: [0, 0], depth: 1 },
             F: { u: [.55, -1], v: [1, .55], fold: [.75, 1], at: [.28, -.04], depth: -.8, dim: .3 } },
    front: { N: { u: [1, 0], v: [0, 1], fold: 'side', at: [.6, 0], depth: -.8 },
             F: { u: [-1, 0], v: [0, 1], fold: 'side', at: [-.6, 0], depth: -.8 } },
    back:  { N: { u: [1, 0], v: [0, 1], fold: 'side', at: [.6, 0], depth: 1.5 },
             F: { u: [-1, 0], v: [0, 1], fold: 'side', at: [-.6, 0], depth: 1.5 } },
  },

  // A rounded spike on a surface at p (outward normal n), leaning along d: its base sunk `sink` into the surface (hidden
  // by it), bw half its base width, h its height above the surface.
  crest(p, d, n, sink, bw, h) {
    const at = (a, b) => [p[0] + n[0] * b + d[0] * a, p[1] + n[1] * b + d[1] * a];
    return [at(-bw, -sink), at(-bw * .9, h * .35), at(-bw * .35, h * .85), at(bw * .25, h), at(bw * .55, h * .75), at(bw * .9, h * .2), at(bw, -sink)];
  },

  layout(spec, state) {
    const B = BODIES.quadruped, V = B.VIEW[state.view];
    if (!V) throw new Error(`Vista "${state.view}" inesistente. Disponibili: ${B.views.join(', ')}`);
    const P = { ...B.POSE0, ...(state.pose || {}) }, E = { ...B.EXPR0, ...(state.expression || {}) }, t = state.t || 0;
    const pr = spec.proportions, sp = spec.parts || {}, parts = [];
    const add = (id, role, depth, pts, more = {}) => parts.push({ id, role, depth, pts, line: 1, ...more });

    // ---- body ----
    const headW = pr.head, headH = pr.head * .9, legL = pr.legLength * (1 - .55 * P.crouch), bodyH = pr.bodyHeight;
    const bodyLen = (pr.length - headW * .55) * V.lenK * P.stretch, cx = V.body === 'bean' ? -headW * .3 * V.lenK : 0;
    const cy = -(legL + bodyH / 2 - .45), lift = -P.lift;
    const bodyPts = V.body === 'bean' ? CG.bean(cx, cy, bodyLen, bodyH, .45) : CG.ellipse(0, cy, bodyH * .72, bodyH / 2, 40);   // a round, full-bellied bean
    const halfW = V.body === 'bean' ? bodyLen / 2 : bodyH * .72;
    const pivot = [cx, cy], pitch = -P.pitch;
    const pose = pts => CG.translate(CG.rotate(pts, pitch, pivot[0], pivot[1]), 0, lift);   // body frame → world

    add('shadow', 'shadow', -10, CG.ellipse(0, .15, (halfW + .6) * (1 - Math.min(.5, P.lift * .12)), .45, 28), { line: 0, shade: 1 });
    add('body', 'fur', 0, pose(bodyPts));
    add('bodyShade', 'shadow', .1, pose(CG.clipY(bodyPts, cy + bodyH * .3, 1)), { line: 0, shade: 1 });
    if (V.face && sp.blaze) {                                      // the cream chest: the lower end of the blaze
      const chest = V.body === 'bean' ? CG.clipConvex(CG.ellipse(cx + bodyLen * .43, cy + bodyH * .08, bodyLen * .15, bodyH * .36, 32), bodyPts)
        : CG.drop(V.face === 'front' ? 0 : .3, cy + bodyH * .42, bodyH * .5, bodyH * .78);
      add('chest', 'cream', .2, pose(chest), { line: 0, feature: 'blaze' });
    }
    if (V.face && sp.belly) {                                      // a cream stripe along the underside, neck to tail
      const belly = V.body === 'bean' ? CG.clipConvex(CG.ellipse(cx + bodyLen * .1, cy + bodyH * .32, bodyLen * .46, bodyH * .3, 36), bodyPts)
        : CG.clipConvex(CG.drop(V.face === 'front' ? 0 : .3, cy + bodyH * .46, bodyH * .82, bodyH * .82), bodyPts);
      add('belly', 'cream', .2, pose(belly), { line: 0, feature: 'belly' });
    }

    // ---- legs: hips on the body's underside, feet on the ground (or dangling when lifted) ----
    const hipY = cy + bodyH * .32, legV = -hipY;                   // a straight leg from the hip just reaches the ground
    V.legs.forEach(([lx, far, front], i) => {
      const hip = pose([[cx + lx * (V.body === 'bean' ? bodyLen : halfW * 2), hipY]])[0];
      let a, footUp = 0;
      if (P.cycle) {                                                // bounding: front pair reaches forward as the back pair pushes back
        const ph = (t * 2 + P.legPhase + (far ? .06 : 0)) * Math.PI * 2;
        a = (front ? 1 : -1) * P.legSwing * .75 * Math.sin(ph); footUp = Math.max(0, -Math.sin(ph)) * .45 * P.legSwing;
      } else a = (front ? 1 : -1) * P.legSwing * .7;                // a leap: front legs reach forward, back legs push back
      if (front && !far && P.pawRaise) { a += P.pawRaise * 1.75; footUp += P.pawRaise * .9; }
      if (!V.face || V.face === 'front') { footUp += Math.abs(a) * .3; a *= .15; }   // seen end-on, a swing only lifts the foot
      const w = pr.legWidth * (far ? .92 : 1), pawR = w * .45;
      const reach = legV * (front && !far ? 1 + .9 * P.pawRaise : 1);   // a paw swipe stretches the leg forward
      const foot = [hip[0] + Math.sin(a) * reach, hip[1] + Math.cos(a) * reach - footUp - pawR];
      if (!P.lift) foot[1] = Math.min(foot[1], -pawR);              // standing paws sit on the ground, never through it
      const depth = far ? -1 + i * .01 : (front ? .5 : .4) + i * .01;
      add('leg' + i, 'fur', depth, CG.tube([hip, foot], w, w * .95), far ? { dim: .3 } : {});
      // one round cream paw; the leg's end is hidden inside it
      add('paw' + i, 'cream', depth + .005, CG.ellipse(foot[0], foot[1], w * .56, pawR, 18), far ? { dim: .3, line: .8 } : { line: .8 });
    });

    // ---- tail: a soft chain from the rump; hooked by default, alive with t ----
    {
      const T = V.tail, segs = 6, L = pr.tail / segs * (V.face === 'side' || !V.face ? 1 : .78), dir = T.flipBend;
      const up = CG.clamp(E.tail, -1, 1), curl = CG.clamp(E.tailCurl);
      const ts = sp.tail || {}, hk = ts.hook != null ? ts.hook : 1;
      const vk = state.view, a0v = ts.angle && ts.angle[vk] != null ? ts.angle[vk] : T.a, y0v = ts.y && ts.y[vk] != null ? ts.y[vk] : T.y;
      let a0 = a0v * Math.PI;
      if (up > 0) a0 = CG.lerp(a0, -Math.PI / 2, up); else a0 = CG.lerp(a0, (V.face === 'front' ? .1 : .85) * Math.PI * (dir < 0 ? 0 : 1) + (dir < 0 ? .15 : 0), -up);
      a0 = CG.lerp(a0, dir < 0 ? .05 : Math.PI * .97, curl);
      const hook = (T.hook || [0, .16, .26, .36, .46, .5]).map(b => b * hk * (1 - Math.max(0, up)) * (1 + Math.min(0, up) * .8));
      const bends = hook.map((b, i) => dir * (b * (1 - curl) + curl * -.32) + .09 * Math.sin(Math.PI * 2 * (.45 * t) - i * .7) * (1 + P.cycle));
      const root = [cx + T.x * (V.body === 'bean' ? bodyLen : halfW * 2), cy + y0v * bodyH / 2];
      const path = pose(CG.chain(root, a0, new Array(segs).fill(L), bends));
      const depth = T.behind ? -.5 : 2.5, w = sp.tail && sp.tail.width || .8;
      add('tail', 'fur', depth, ts.base ? CG.tube(path, ts.base, w) : CG.tube(path, w, w * .85));
      const n = path.length, tipFrom = [CG.lerp(path[n - 2][0], path[n - 3][0], .35), CG.lerp(path[n - 2][1], path[n - 3][1], .35)];
      if (ts.tip !== false) add('tailTip', 'cream', depth + .01, CG.tube([tipFrom, path[n - 2], path[n - 1]], w * .86, w * .85), { feature: 'tailTip' });
      // crests along the tail's top, smaller towards the tip; from the back, small diamonds along its middle
      const nc = sp.crests && sp.crests.tail || 0;
      for (let k = 0; k < nc; k++) {
        const i = 1 + k * (n - 3) / Math.max(1, nc - 1), i0 = Math.floor(i), f = i - i0, j = Math.min(n - 1, i0 + 1);
        const p = [CG.lerp(path[i0][0], path[j][0], f), CG.lerp(path[i0][1], path[j][1], f)];
        const dx = path[j][0] - path[i0][0], dy = path[j][1] - path[i0][1], dl = Math.hypot(dx, dy) || 1, d = [dx / dl, dy / dl];
        const half = CG.lerp(ts.base || w, w, i / (n - 1)) / 2, s = 1 - k * .17;
        if (!V.face) add('crestT' + k, 'crest', depth + .02, CG.rotate(CG.ellipse(p[0], p[1], .42 * s, .26 * s, 16), Math.atan2(d[1], d[0]), p[0], p[1]), { line: .6, feature: 'crestsTail' });
        else {
          const up = d[0] <= 0 ? [-d[1], d[0]] : [d[1], -d[0]];   // the side of the tail facing up and out
          add('crestT' + k, 'crest', depth - .02, BODIES.quadruped.crest([p[0] + up[0] * half, p[1] + up[1] * half], d, up, .3, .55 * s, .75 * s), { line: .6, feature: 'crestsTail' });
        }
      }
    }

    // ---- head group: head, ears, face, collar, bell (rotated together by headTilt) ----
    const hx = (V.face === 'side' ? cx + bodyLen / 2 - headW * .15 : V.face === 'q' ? cx + bodyLen * V.headX : 0) + P.headDrop * .35 * (V.face === 'side' || V.face === 'q' ? 1 : 0);
    const hy = cy - bodyH * .32 - headH * (V.face === 'side' ? .32 : .42) + P.headDrop, tilt = E.headTilt;
    const head = pts => pose(CG.rotate(pts, tilt, hx, hy));
    const headPts = CG.ellipse(hx, hy, headW / 2, headH / 2, 40), D = V.face ? 3 : -3;   // head depth band; behind the body from the back

    // ---- wings: one per side, three membranes each, folded along the flank or spread; they beat with t ----
    if (sp.wings) {
      const M = B.WING_MAP[state.view], span = sp.wings.span || 2.5, open = CG.clamp(P.wingOpen);
      // the wing's length: spread flat (front view) the tips reach span/2 body widths from the middle
      const bodyW = bodyH * 1.44, Lw = span * bodyW / 2 - .6 * bodyW / 2;
      const sh0 = V.face === 'side' || V.face === 'q' ? [hx - headW * .5 - .8, cy - bodyH * .3] : [0, cy - bodyH * .25];
      const flap = P.flap * .5 * Math.cos(Math.PI * 2 * 2 * t);
      ['N', 'F'].forEach((wn, wi) => {
        const m = M[wn], S = [sh0[0] + m.at[0] * (V.face === 'side' || V.face === 'q' ? bodyH : bodyW / 2), sh0[1] + m.at[1] * bodyH];
        const J = {};
        for (const k of Object.keys(B.WING.OPEN)) {
          const [ou, ov] = CG.rotate([B.WING.OPEN[k]], flap, 0, 0)[0], [fx, fy] = B.WING.FOLDED[k];
          const o = [ou * m.u[0] + ov * m.v[0], ou * m.u[1] + ov * m.v[1]];
          const c = m.fold === 'side' ? [Math.sign(m.u[0]) * (.04 - fx * .26), fy] : [fx * m.fold[0], fy * m.fold[1]];
          J[k] = [S[0] + Lw * CG.lerp(c[0], o[0], open), S[1] + Lw * CG.lerp(c[1], o[1], open)];
        }
        const sc = (a, b, k = .28) => [CG.lerp((a[0] + b[0]) / 2, J.W[0], k), CG.lerp((a[1] + b[1]) / 2, J.W[1], k)];
        const more = m.dim ? { dim: m.dim } : {}, dep = m.depth + wi * .001;
        add('membrane' + wn + '0', 'membrane', dep, pose([J.W, J.F1, sc(J.F1, J.F2), J.F2]), more);
        add('membrane' + wn + '1', 'membrane', dep, pose([J.W, J.F2, sc(J.F2, J.F3), J.F3]), more);
        add('membrane' + wn + '2', 'membrane', dep, pose([J.W, J.F3, sc(J.F3, J.R, .12), J.R, J.S, J.E]), more);
        add('wingBone' + wn + '0', 'fur', dep + .01, pose(CG.tube([J.S, J.E, J.W, J.F1], .42, .14)), { ...more, feature: 'wings' });
        add('wingBone' + wn + '1', 'fur', dep + .01, pose(CG.tube([J.W, J.F2], .22, .12)), more);
        add('wingBone' + wn + '2', 'fur', dep + .01, pose(CG.tube([J.W, J.F3], .22, .12)), more);
      });
    }

    // ---- horns (two short cream horns bent back) and the head crests (coral spikes over the skull) ----
    if (sp.horns) {
      const hs = (sp.horns.size || 1), hl = headW * .3 * hs, hw = headW * .22 * hs;
      const defs = V.face === 'side' ? [[hx - headW * .14, hy - headH * .3, -Math.PI / 2 - .55, -.45, D + .2, 0], [hx + headW * .02, hy - headH * .36, -Math.PI / 2 - .45, -.45, D - .25, .3]]
        : V.face === 'q' ? [[hx - headW * .26, hy - headH * .3, -Math.PI / 2 - .5, -.35, D - .15, 0], [hx + headW * .24, hy - headH * .34, -Math.PI / 2 + .2, -.3, D - .15, 0]]
        : [[hx - headW * .3, hy - headH * .3, -Math.PI / 2 - .45, -.3, D - .15, 0], [hx + headW * .3, hy - headH * .3, -Math.PI / 2 + .45, .3, D - .15, 0]];
      defs.forEach(([x, y, a, b, dep, dim], i) =>
        add('horn' + i, 'cream', dep, head(CG.tube(CG.chain([x, y], a, [hl * .55, hl * .45], [0, b]), hw, hw * .4)), { feature: 'horns', line: .8, ...(dim ? { dim } : {}) }));
    }
    if (sp.crests && sp.crests.head) {
      const nh = sp.crests.head, rx = headW / 2, ry = headH / 2;
      for (let k = 0; k < nh; k++) {
        // along the skull, front to back; seen end-on the first stands in the middle and the others peek beside it
        const th = V.face === 'side' || V.face === 'q' ? -Math.PI / 2 - .3 - k * .48 : -Math.PI / 2 + (k ? (k % 2 ? -1 : 1) * .3 * Math.ceil(k / 2) : 0);
        const s = V.face === 'side' || V.face === 'q' ? 1 - k * .14 : (k ? .68 : 1);
        const p = [hx + rx * Math.cos(th), hy + ry * Math.sin(th)], nl = Math.hypot(Math.cos(th) / rx, Math.sin(th) / ry);
        const nrm = [Math.cos(th) / rx / nl, Math.sin(th) / ry / nl], d = [-nrm[1], nrm[0]];   // d: along the skull, backwards
        const back = V.face === 'side' || V.face === 'q' ? (d[0] < 0 ? d : [-d[0], -d[1]]) : d;
        add('crestH' + k, 'crest', D - .2 - k * .01, head(B.crest(p, back, nrm, .25, headW * .1 * s, headW * .27 * s)), { line: .6, feature: 'crestsHead' });
      }
    }

    // collar on the neck, under the head; the bell at its front
    // the ends tuck behind the head (inside its outline), so only the band under it shows
    const collarPath = V.face === 'side' ? [[hx - headW * .4, hy + headH * .2], [hx - headW * .25, hy + headH * .52], [hx + headW * .02, hy + headH * .6]]
      : V.face === 'q' ? [[hx - headW * .38, hy + headH * .3], [hx - headW * .05, hy + headH * .6], [hx + headW * .33, hy + headH * .36]]
      : V.face === 'front' ? [[-headW * .36, hy + headH * .32], [0, hy + headH * .6], [headW * .36, hy + headH * .32]]
      : [[-headW * .4, cy - bodyH * .43], [0, cy - bodyH * .37], [headW * .4, cy - bodyH * .43]];
    if (sp.collar) add('collar', 'collar', V.face ? D - .05 : .3, (V.face ? head : pose)(CG.tube(collarPath, .3, .3, 3)), { feature: 'collar', line: .7 });
    if (V.face && sp.bell) {
      const bi = V.face === 'side' ? 2 : 1, bx = collarPath[bi][0] + (V.face === 'q' ? headW * .1 : 0), by = collarPath[bi][1] + .3;
      add('bell', 'bell', D + 2, head(CG.ellipse(bx, by, .34, .34, 18)), { feature: 'bell', line: .7 });
      add('bellSlit', 'line', D + 2.01, head([[bx - .15, by + .08], [bx + .15, by + .08]]), { feature: 'bell', stroke: 1, line: .4 });
    }

    // ears: rounded triangles on the head's top, turned by the expression
    const earDefs = V.face === 'side' ? [[hx - headW * .12, 1, 0], [hx + headW * .18, 0, 1]]
      : V.face === 'q' ? [[hx - headW * .18, 0, -1], [hx + headW * .3, 1, 1]] : [[hx - headW * .3, 0, -1], [hx + headW * .3, 0, 1]];
    const es = (sp.ears && sp.ears.size || 1), droop = Math.max(0, -E.ears), back = Math.max(0, E.ears);
    if (sp.ears) earDefs.forEach(([ex, far, side], i) => {
      const s = side || 1, w = .62 * es, h = 1.05 * es * (1 - .45 * back), by0 = hy - headH * .38 + Math.abs(ex - hx) * .2;
      let tri = [[ex - w, by0 + .1], [ex - w * .25, by0 - h * .9], [ex + w * .1 * s, by0 - h], [ex + w * .35, by0 - h * .75], [ex + w, by0 + .1]];
      tri = CG.rotate(tri, s * (droop * 1.25 + back * .55), ex, by0);
      if (droop) tri = CG.translate(tri, s * droop * .3, droop * .35);
      add('ear' + i, 'fur', D + (far ? -.6 : .3), head(tri), far ? { dim: .25 } : {});
      if (V.face && !far) {
        const c = tri.reduce((a, p) => [a[0] + p[0] / tri.length, a[1] + p[1] / tri.length], [0, 0]);
        add('earInner' + i, 'earInner', D + .31, head(CG.translate(CG.scale(tri, .55, .55, c[0], c[1]), 0, .12)), { feature: 'earInner', line: 0 });
      } else if (V.face && far && V.face !== 'side') {
        const c = tri.reduce((a, p) => [a[0] + p[0] / tri.length, a[1] + p[1] / tri.length], [0, 0]);
        add('earInner' + i, 'earInner', D - .59, head(CG.translate(CG.scale(tri, .5, .5, c[0], c[1]), 0, .12)), { feature: 'earInner', line: 0, dim: .25 });
      }
    });
    add('head', 'fur', D, head(headPts));

    // the face
    if (V.face) {
      const fx = V.face === 'front' ? hx : V.face === 'q' ? hx + headW * .14 : hx + headW * .2;
      if (sp.blaze) {
      const muzzle = V.face === 'side' ? CG.clipX(CG.ellipse(hx + headW * .3, hy + headH * .24, headW * .24, headH * .22, 24), hx + headW * .47, -1)
        : CG.drop(fx, hy + headH * .42, headW * (V.face === 'q' ? .38 : .44), headH * .62);
      add('muzzle', 'cream', D + .1, head(muzzle), { line: 0, feature: 'blaze' });
      }
      const r = headW * .13 * (sp.eyes && sp.eyes.size || 1), eyeY = hy + headH * .02, eo = { look: E.look, squint: E.squint, dark: !!(sp.eyes && sp.eyes.dark), iris: !!(sp.eyes && sp.eyes.iris),
        roles: { white: spec.roles.eyeWhite ? 'eyeWhite' : 'cream' } };
      const eyeAt = V.face === 'front' ? [[fx - headW * .2, 1], [fx + headW * .2, 1]] : V.face === 'q' ? [[fx - headW * .2, .85], [fx + headW * .2, 1]] : [[fx + headW * .1, .9]];
      eyeAt.forEach(([ex, k], i) => FACES.eye(E.eyes, ex, eyeY, r * k, eo).parts.forEach(p => add('eye' + i + p.id, p.role, D + .5, head(p.pts), { line: p.line, stroke: p.stroke })));
      const ny = hy + headH * .24, nx = fx + (V.face === 'side' ? headW * .22 : 0);
      const nz = headW * .036;
      add('nose', 'line', D + .52, head([[nx - nz * 1.4, ny - nz * .7], [nx + nz * 1.4, ny - nz * .7], [nx, ny + nz]]), { line: 0 });
      // the mouth: a thin line (a :3 at rest); open mouths stay filled shapes
      FACES.mouth(E.mouth, nx, ny + headW * .05, headW * .17).parts.forEach(p => add('mouth', p.role, D + .51, head(p.pts), { line: p.stroke ? .45 : p.line, stroke: p.stroke }));
      const wh = (sx, x0) => [0, 1, 2].forEach(k => add('whisker', 'line', D + .53, head([[x0, ny + .02 + k * .13], [x0 + sx * .95, ny - .18 + k * .2]]), { stroke: 1, line: .35, feature: 'whiskers' }));
      if (sp.whiskers && V.face !== 'side') wh(-1, fx - headW * .3);
      if (sp.whiskers) wh(1, V.face === 'side' ? hx + headW * .5 : fx + headW * .3);
    }

    // order by depth, then mirror for flip
    parts.sort((a, b) => a.depth - b.depth);
    if (state.flip) for (const p of parts) p.pts = p.pts.map(([x, y]) => [-x, y]);
    const all = parts.flatMap(p => p.pts), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    return { parts, bounds: { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) } };
  },
};
