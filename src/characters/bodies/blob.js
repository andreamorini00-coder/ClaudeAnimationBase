// blob.js: a limbless body (the little monster). Pure: layout() as in quadruped.js (units, origin on the ground, y down,
// facing screen-right, flip mirrors).
//
// Proportions (spec.proportions): height, width (at rest, antennae excluded), antenna (stalk length), eyeH.
// The body keeps its VOLUME: squash s makes it s times wider and 1/s times taller (width × height constant), clamped
// to [0.6, 1.6]. lean shears it and roll turns it, both of which keep the area too.
// Pose params: squash, lean (-1..1), roll (radians), hop (units off the ground), cycle (1 = rolling with t).
// Expression params: eye (FACES kind), lid 0..1 (upper lid down), lidTilt -1 (sad) .. 1 (angry), mouth (FACES kind),
//   shiver 0..1 (a trembling outline), squash (multiplies the pose's). act() adds squint and look.
// The antennae trail a change: state.since (s since the pose changed) and state.kick (how big it was, + = upwards).
BODIES.blob = {
  roles: ['body', 'belly', 'tip', 'cheek', 'line', 'shadow'],
  parts: ['body', 'belly', 'eye', 'lid', 'teeth', 'mouth', 'cheeks', 'antennae', 'antennaTips', 'shadow'],
  poseParams: ['squash', 'lean', 'roll', 'hop', 'cycle'],
  exprParams: ['eye', 'lid', 'lidTilt', 'mouth', 'shiver', 'squash'],
  views: ['front', 'q', 'side', 'back'],
  SHEET: { views: ['front', 'q', 'side', 'back'], poseView: 'q', exprView: 'front' },   // as in the monster's base.png / pose.png
  POSE0: { squash: 1, lean: 0, roll: 0, hop: 0, cycle: 0 },
  EXPR0: { eye: 'oval', lid: 0, lidTilt: 0, mouth: 'smile', shiver: 0, squash: 1, squint: 0, look: 0 },
  // per view: face centre (share of the width, + = towards the heading), how wide the face reads, which side shows
  VIEW: { front: { fx: 0, fw: 1 }, q: { fx: .14, fw: .82 }, side: { fx: .3, fw: .5 }, back: null },

  layout(spec, state) {
    const B = BODIES.blob;
    if (!B.views.includes(state.view)) throw new Error(`Vista "${state.view}" inesistente. Disponibili: ${B.views.join(', ')}`);
    const V = B.VIEW[state.view], P = { ...B.POSE0, ...(state.pose || {}) }, E = { ...B.EXPR0, ...(state.expression || {}) };
    const t = state.t || 0, pr = spec.proportions, parts = [];
    const add = (id, role, depth, pts, more = {}) => parts.push({ id, role, depth, pts, line: 1, ...more });

    const s = CG.clamp(P.squash * E.squash, .6, 1.6), w = pr.width * s, h = pr.height / s, hop = P.hop;
    const cx = 0, cy = -h / 2, roll = P.cycle ? Math.PI * 2 * .7 * t : P.roll;
    // body frame → world: shear by lean (bottom stays put), turn by roll about the centre, lift by hop
    const place = pts => CG.translate(CG.rotate(pts.map(([x, y]) => [x + P.lean * .3 * w * (-y / h), y]), roll, cx, cy), 0, -hop);

    add('shadow', 'shadow', -10, CG.ellipse(0, .12, w * .52 * (1 - Math.min(.5, hop * .15)), .38, 28), { line: 0, shade: 1 });
    let body = CG.drop(cx, 0, w, h, 64);
    if (E.shiver) {                                           // a trembling outline: radial ripples that barely change the area
      body = body.map(([x, y], i) => { const k = 1 + .022 * E.shiver * Math.sin(i / body.length * Math.PI * 2 * 9 + t * 40); return [cx + (x - cx) * k, cy + (y - cy) * k]; });
    }
    add('body', 'body', 0, place(body));

    // antennae: two thin stalks from the top, swaying with t and trailing the last change (closed form in t)
    const lag = (state.kick || 0) * CG.spring(state.since ?? 99, 0, 5, 14);
    const side = V ? V.fx : 0;
    [-1, 1].forEach((k, i) => {
      const bx = cx + (k * .14 + side * .25) * w, by = -h + .12 * h / 6;
      const sway = .07 * Math.sin(Math.PI * 2 * .6 * t + i * 1.7) + lag * .55 * k;
      const path = CG.chain([bx, by], -Math.PI / 2 + k * .42, [pr.antenna * .4, pr.antenna * .35, pr.antenna * .25], [0, -k * .18 + sway, -k * .12 + sway]);
      const far = state.view === 'side' && k < 0;
      add('antenna' + i, 'body', far ? -.5 : .5, place(CG.tube(path, .22, .2, 4)), { feature: 'antennae', line: .7 });
      const tip = path[path.length - 1];
      add('antennaTip' + i, 'tip', far ? -.49 : .51, place(CG.ellipse(tip[0], tip[1], .46, .46, 18)), { line: .7 });
    });

    if (V) {
      const fx = cx + V.fx * w, fw = V.fw;
      // belly: a cream half moon on the ground, kept inside the body
      // belly: a cream half moon whose flat side sits just above the base, well inside the body
      const base = -h * .045, belly = CG.clipY(CG.ellipse(fx + V.fx * w * .2, base, w * .33 * fw, h * .31, 40), base, -1);
      add('belly', 'belly', .2, place(CG.clipConvex(belly, body)), { feature: 'belly', line: 0 });
      // cheeks
      const cheeks = state.view === 'side' ? [fx - w * .26] : [fx - w * .29 * fw, fx + w * .29 * fw];
      cheeks.forEach((x, i) => add('cheek' + i, 'cheek', .3, place(CG.ellipse(x, -h * .42, .42 * fw ** .3, .3, 16)), { feature: 'cheeks', line: 0 }));
      // the one eye, its lid, the mouth and the two teeth
      const ex = fx, ey = -h * .62, r = pr.eyeH / 2 / s ** .5, xs = state.view === 'side' ? .6 : fw;
      const squeeze = pts => CG.scale(pts, xs, 1, ex, ey);
      if (E.eye === 'happy') add('eyeeyeWhite', 'belly', .39, place(squeeze(CG.ellipse(ex, ey, r * .75, r, 28))), { line: .5, feature: 'eye' });
      FACES.eye(E.eye, ex, ey, r, { look: E.look, squint: CG.clamp(E.squint), roles: { white: 'belly', ink: 'line' } }).parts
        .forEach(p => add('eye' + p.id, p.role, .4, place(squeeze(p.pts)), { line: p.line, stroke: p.stroke, feature: 'eye' }));
      if (E.lid > .01 && E.eye === 'oval') {                  // the upper lid: body colour over the top of the eye, tilted
        const top = ey - r, cut = top + 2 * r * CG.clamp(E.lid, 0, .9);
        const lid = CG.rotate(CG.clipY(CG.ellipse(ex, ey, r * .82, r * 1.04, 28), cut, -1), E.lidTilt * .35, ex, cut);
        add('lid', 'body', .45, place(squeeze(lid)), { line: .6 });
      }
      const my = -h * .38, mw = w * .2 * fw;
      FACES.mouth(E.mouth, fx, my, mw).parts.forEach(p => add('mouth', p.role, .5, place(p.pts), { line: p.line, stroke: p.stroke }));
      const tw = .36 * fw ** .4, th = .44;
      [-1, 1].forEach((k, i) => {
        const tx = fx + k * tw * .55 * (state.view === 'side' ? .6 : 1), ty = my + .08;
        add('tooth' + i, 'belly', .55, place([[tx - tw / 2, ty], [tx + tw / 2, ty], [tx + tw / 2, ty + th], [tx - tw / 2, ty + th]]), { feature: 'teeth', line: .6 });
      });
    }

    parts.sort((a, b) => a.depth - b.depth);
    if (state.flip) for (const p of parts) p.pts = p.pts.map(([x, y]) => [-x, y]);
    const all = parts.flatMap(p => p.pts), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    return { parts, bounds: { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) } };
  },
};
