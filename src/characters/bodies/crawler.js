// crawler.js: a body of round segments behind a head (the caterpillar). Pure: layout() as in quadruped.js (units, origin
// on the ground under the body, y down, facing screen-right; flip mirrors).
//
// Every segment is a circle hooked to the one before at a fixed distance (1.6 × its radius): the body bends by moving
// the centres, never by deforming the circles. Heights come first (raise, arch, the travelling wave), then each centre
// is placed that fixed distance behind the one in front of it.
// Proportions (spec.proportions): segments (how many behind the head), segR (a segment's radius), headK (head radius
// / segR), antenna (stalk length).
// Pose params: raise 0..1+ (the front lifts, head highest), wave (height of the travelling arch), arch (the whole body
//   bows up, for a jump), lift (units off the ground), curl 0..1 (the body coils behind the head), cycle (1 = the arch
//   travels from tail to head with t, one stride every WAVE.period seconds), phase (seconds added to t for the wave,
//   to choose where the arch is at t = 0).
// Expression params: eyes, mouth (FACES kinds), headTilt (radians). act() adds squint and look.
BODIES.crawler = {
  roles: ['body', 'spot', 'cheek', 'antenna', 'cream', 'line', 'shadow'],
  proportions: ['segments', 'segR', 'headK', 'antenna'],
  parts: ['head', 'segments', 'spots', 'feet', 'antennae', 'eyes', 'mouth', 'cheeks', 'shadow'],
  poseParams: ['raise', 'wave', 'arch', 'lift', 'curl', 'cycle', 'phase'],
  exprParams: ['eyes', 'mouth', 'headTilt'],
  views: ['front', 'q', 'side', 'back'],
  SHEET: { views: ['side', 'q', 'front', 'back'], poseView: 'side', exprView: 'q' },   // as in the caterpillar's base.png
  WAVE: { period: 1.25, width: .45 },     // seconds per stride; the share of the cycle a segment spends lifted
  POSE0: { raise: 0, wave: 0, arch: 0, lift: 0, curl: 0, cycle: 0, phase: 0 },
  EXPR0: { eyes: 'open', mouth: 'smile', headTilt: 0, squint: 0, look: 0 },

  // Side-view centres: [head, segment 1 … segment N], each [x, y].
  spine(spec, P, t) {
    const B = BODIES.crawler, pr = spec.proportions, N = pr.segments, R = pr.segR, Rh = R * pr.headK;
    const d = R * 1.6, dh = (Rh + R) * .72, L0 = dh + (N - 1) * d, base = i => i ? -(R + .3) : -(Rh + .3);
    const h = new Array(N + 1).fill(0);
    h[0] += P.raise * 2.6 * R; h[1] += P.raise * 1.5 * R; h[2] += P.raise * .6 * R;
    for (let i = 1; i <= N; i++) h[i] += P.arch * 1.2 * R * Math.sin(Math.PI * i / N);
    h[0] += P.arch * .9 * R;
    if (P.cycle) {                                   // a bump of height `wave` that every segment repeats Δ = period / N later
      const { period, width } = B.WAVE;
      for (let i = 0; i <= N; i++) {
        const p = ((t + P.phase + i * period / N) / period) % 1, q = p < 0 ? p + 1 : p;
        h[i] += P.wave * 1.6 * R * (q < width ? Math.sin(Math.PI * q / width) ** 2 : 0);
      }
    }
    const pts = [[L0 / 2, base(0) - h[0]]];
    for (let i = 1; i <= N; i++) {
      const D = i === 1 ? dh : d, y = base(i) - h[i], dy = CG.clamp(y - pts[i - 1][1], -D * .95, D * .95);
      pts.push([pts[i - 1][0] - Math.sqrt(D * D - dy * dy), pts[i - 1][1] + dy]);
    }
    if (P.curl > 0) {                                // coiled: the segments on a circle behind the head, same spacing
      const rho = (N + 1) * d / (2 * Math.PI) * 1.05, step = 2 * Math.asin(d / (2 * rho));
      const c = [pts[0][0] - dh, base(1) - rho];
      for (let i = 1; i <= N; i++) {
        const a = Math.PI / 2 + (i - 1) * step, q = [c[0] + rho * Math.cos(a), c[1] + rho * Math.sin(a)];
        pts[i] = [CG.lerp(pts[i][0], q[0], P.curl), CG.lerp(pts[i][1], q[1], P.curl)];
      }
    }
    return pts.map(([x, y]) => [x, y - P.lift]);
  },

  layout(spec, state) {
    const B = BODIES.crawler, view = state.view;
    if (!B.views.includes(view)) throw new Error(`Vista "${view}" inesistente. Disponibili: ${B.views.join(', ')}`);
    const P = { ...B.POSE0, ...(state.pose || {}) }, E = { ...B.EXPR0, ...(state.expression || {}) }, t = state.t || 0;
    const pr = spec.proportions, N = pr.segments, R = pr.segR, Rh = R * pr.headK, parts = [];
    const add = (id, role, depth, pts, more = {}) => parts.push({ id, role, depth, pts, line: 1, ...more });
    const S = B.spine(spec, P, t);

    // the side-view spine seen from each key view: [x, y, scale, depth] per centre (index 0 = head)
    const hx = S[0][0], at = S.map(([x, y], i) => {
      if (view === 'side') return [x, y, 1, N - i];
      if (view === 'q') return [hx + (x - hx) * .62, y - (hx - x) * .12, 1 - .025 * i, N - i];
      if (view === 'front') return [i * .5 * R, y - i * .1 * R, Math.pow(.95, i), N - i];
      return [-(N - i) * .62 * R, y - (N - i) * .06 * R, Math.pow(.96, N - i), i];   // back: the tail nearest
    });

    const xs = at.map(a => a[0]);
    add('shadow', 'shadow', -100, CG.ellipse((Math.min(...xs) + Math.max(...xs)) / 2, .15, (Math.max(...xs) - Math.min(...xs)) / 2 + R * 1.2, .4, 28), { line: 0, shade: 1 });

    for (let i = 1; i <= N; i++) {
      const [x, y, k, dep] = at[i], r = R * k;
      add('seg' + i, 'body', dep, CG.ellipse(x, y, r, r, 32), { feature: 'segments' });
      if (view !== 'front') add('spot' + i, 'spot', dep + .01, CG.ellipse(x + (view === 'back' ? 0 : .12 * r), y - .52 * r, .42 * r, .26 * r, 18), { line: 0, feature: 'spots' });
      if (view === 'side' || view === 'q') [-1, 1].forEach((s, j) =>
        add('foot' + i + '_' + j, 'cream', dep - .5 + j * .01, CG.ellipse(x + s * .34 * r, y + .98 * r, .22 * r, .17 * r, 12), { line: .6, feature: 'feet' }));
    }

    // the head group: head, antennae, face; turned by headTilt
    const [x0, y0, k0, dep0] = at[0], rh = Rh * k0, tilt = E.headTilt;
    const head = pts => CG.rotate(pts, tilt, x0, y0);
    const hd = view === 'back' ? -1 : dep0;                       // from the back the head is the farthest thing
    add('head', 'body', hd, head(CG.ellipse(x0, y0, rh, rh, 40)));
    [-1, 1].forEach((s, i) => {
      const off = view === 'side' ? (i ? .3 : -.2) : s * .32, sway = .1 * Math.sin(Math.PI * 2 * .6 * t + i * 1.4) + .08 * P.cycle * Math.sin(Math.PI * 2 * t / B.WAVE.period - .6);
      const root = [x0 + off * rh, y0 - .85 * rh], L = pr.antenna;
      const path = CG.chain(root, -Math.PI / 2 + (view === 'side' ? (i ? .45 : .05) : s * .32), [L * .55, L * .45], [0, sway + (view === 'side' ? .15 : s * .1)]);
      const dep = hd + (view === 'side' && !i ? -.2 : .2), tip = path[path.length - 1];
      add('antenna' + i, 'antenna', dep, head(CG.tube(path, .16 * R, .14 * R, 4)), { line: .6, feature: 'antennae' });
      add('antennaTip' + i, 'antenna', dep + .01, head(CG.ellipse(tip[0], tip[1], .28 * R, .28 * R, 14)), { line: .6 });
    });
    if (view !== 'back') {
      const fx = view === 'front' ? x0 : view === 'q' ? x0 + .2 * rh : x0 + .38 * rh;
      const eyes = view === 'front' ? [[fx - .34 * rh, 1], [fx + .34 * rh, 1]] : view === 'q' ? [[fx - .3 * rh, .88], [fx + .26 * rh, 1]] : [[fx - .16 * rh, .82], [fx + .3 * rh, 1]];
      const eo = { look: E.look, squint: E.squint, dark: true, roles: { white: 'cream', ink: 'line' } };
      eyes.forEach(([ex, k], j) => FACES.eye(E.eyes, ex, y0 - .05 * rh, .3 * rh * k, eo).parts
        .forEach(p => add('eye' + j + p.id, p.role, hd + .3, head(p.pts), { line: p.line, stroke: p.stroke, feature: 'eyes' })));
      const cheeks = view === 'front' ? [fx - .6 * rh, fx + .6 * rh] : view === 'q' ? [fx - .58 * rh, fx + .55 * rh] : [fx - .2 * rh];
      cheeks.forEach((cx, j) => add('cheek' + j, 'cheek', hd + .2, head(CG.ellipse(cx, y0 + .3 * rh, .2 * rh, .14 * rh, 16)), { line: 0 }));
      FACES.mouth(E.mouth, fx + (view === 'side' ? .12 * rh : 0), y0 + .34 * rh, .3 * rh).parts
        .forEach(p => add('mouth', p.role, hd + .31, head(p.pts), { line: p.stroke ? .45 : p.line, stroke: p.stroke }));
    }

    parts.sort((a, b) => a.depth - b.depth);
    if (state.flip) for (const p of parts) p.pts = p.pts.map(([x, y]) => [-x, y]);
    const all = parts.flatMap(p => p.pts), px = all.map(p => p[0]), py = all.map(p => p[1]);
    return { parts, bounds: { x0: Math.min(...px), x1: Math.max(...px), y0: Math.min(...py), y1: Math.max(...py) } };
  },
};
