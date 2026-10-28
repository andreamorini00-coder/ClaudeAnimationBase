// shapes.js: pure geometry for the character library. Points are [x, y], y grows downwards (as on the canvas).
// Everything lives in CG, because the page already has globals called clamp, lerp, ease and spring (core.js).
const CG = {
  clamp: (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)),
  lerp: (a, b, k) => a + (b - a) * k,
  smooth: k => { k = CG.clamp(k); return k * k * (3 - 2 * k); },
  // damped wobble kicked at t0 (the same curve as core.js's spring): 0 before, then dies away
  spring: (t, t0, k = 6, w = 18) => t < t0 ? 0 : Math.exp(-k * (t - t0)) * Math.sin(w * (t - t0)),
  area(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; },
  translate: (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]),
  scale: (pts, sx, sy = sx, cx = 0, cy = 0) => pts.map(([x, y]) => [cx + (x - cx) * sx, cy + (y - cy) * sy]),
  rotate(pts, a, cx = 0, cy = 0) { const c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); },
  mirror: pts => pts.map(([x, y]) => [-x, y]).reverse(),
  // Resize a closed shape to exactly w × h, centred on cx, its bottom on y1. Because it is an affine scale, a shape's
  // area is (its unit area) × w × h: equal w·h, equal area (the blob's constant volume relies on it).
  fit(pts, cx, y1, w, h) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), yb = Math.max(...ys);
    const sx = w / ((x1 - x0) || 1), sy = h / ((yb - y0) || 1), mx = (x0 + x1) / 2;
    return pts.map(([x, y]) => [cx + (x - mx) * sx, y1 - (yb - y) * sy]);
  },
  // The part of a closed shape on one side of a line (Sutherland–Hodgman): clipX keeps x > at (keep = 1) or x < at
  // (keep = -1); clipY the same in y. Patches cut this way (a cream chest, a belly shade) stay inside their body.
  clip(pts, axis, at, keep) {
    const inside = p => keep * (p[axis] - at) >= 0, out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ia = inside(a), ib = inside(b);
      if (ia) out.push(a);
      if (ia !== ib) { const k = (at - a[axis]) / (b[axis] - a[axis]); out.push([CG.lerp(a[0], b[0], k), CG.lerp(a[1], b[1], k)]); }
    }
    return out;
  },
  // The part of a shape inside a CONVEX shape (Sutherland–Hodgman against each of its edges).
  clipConvex(pts, hull) {
    const sgn = Math.sign(hull.reduce((s, a, i) => { const b = hull[(i + 1) % hull.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0)) || 1;
    let out = pts;
    for (let i = 0; i < hull.length && out.length; i++) {
      const a = hull[i], b = hull[(i + 1) % hull.length], side = p => sgn * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) >= 0, inp = out;
      out = [];
      for (let j = 0; j < inp.length; j++) {
        const p = inp[j], q = inp[(j + 1) % inp.length], ip = side(p), iq = side(q);
        if (ip) out.push(p);
        if (ip !== iq) {
          const d1 = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]), d2 = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]), k = d1 / (d1 - d2);
          out.push([CG.lerp(p[0], q[0], k), CG.lerp(p[1], q[1], k)]);
        }
      }
    }
    return out;
  },
  // The part of a shape on the left of the line a → b (as seen walking from a to b, y down: the side x grows towards
  // when the line points down).
  clipLine(pts, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, ux = dx / d * 1e3, uy = dy / d * 1e3, nx = dy / d * 1e3, ny = -dx / d * 1e3;
    return CG.clipConvex(pts, [[a[0] - ux, a[1] - uy], [a[0] + ux, a[1] + uy], [a[0] + ux + nx, a[1] + uy + ny], [a[0] - ux + nx, a[1] - uy + ny]]);
  },
  clipX: (pts, at, keep) => CG.clip(pts, 0, at, keep),
  clipY: (pts, at, keep) => CG.clip(pts, 1, at, keep),
  ellipse(cx, cy, rx, ry, n = 32, rot = 0) {
    const p = []; for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p;
  },
  // A soft block: a box yTop..yBot whose width goes from wTop to wBot, with rounded corners (round 0..1: 1 = an
  // ellipse). Sweaters, torsos, boots.
  block(cx, yTop, yBot, wTop, wBot, round = .35, n = 48) {
    const p = [], cy = (yTop + yBot) / 2, h = (yBot - yTop) / 2, e = CG.clamp(round, .05, 1);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), y = cy + Math.sign(s) * Math.pow(Math.abs(s), e) * h;
      p.push([cx + Math.sign(c) * Math.pow(Math.abs(c), e) * CG.lerp(wTop, wBot, (y - yTop) / (yBot - yTop)) / 2, y]);
    }
    return p;
  },
  // The monster's drop: a rounded top a little narrower than the full, slightly flattened bottom.
  drop(cx, baseY, w, h, n = 48) {
    const p = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);      // a = 0 at the top, π at the bottom
      const yk = (1 - c) / 2;                                               // 0 top .. 1 bottom
      const wide = .62 + .38 * Math.pow(yk, .55);                           // narrower towards the top
      const flat = c < 0 ? -Math.pow(-c, .7) : c;                            // a fuller, flatter bottom
      p.push([s * wide, -flat]);
    }
    return CG.fit(p, cx, baseY, w, h);
  },
  // The cat's bean: a long body with a flatter back and a rounder, fuller belly. len × h, centred on (cx, cy).
  bean(cx, cy, len, h, belly = .3, n = 40) {
    const p = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const ys = s > 0 ? s * (1 + belly * (1 - Math.abs(c))) : s * (1 - .25 * (1 - Math.abs(c)));   // belly down, back flatter
      p.push([Math.sign(c) * Math.pow(Math.abs(c), .8), ys]);
    }
    const f = CG.fit(p, cx, 0, len, h), ys = f.map(q => q[1]);
    return CG.translate(f, 0, cy - (Math.min(...ys) + Math.max(...ys)) / 2);
  },
  // Points along a jointed chain: starts at p0 heading angle0 (radians, 0 = +x), each link turns by bends[i] first.
  chain(p0, angle0, lengths, bends = []) {
    const out = [p0.slice()]; let a = angle0, [x, y] = p0;
    lengths.forEach((l, i) => { a += bends[i] || 0; x += Math.cos(a) * l; y += Math.sin(a) * l; out.push([x, y]); });
    return out;
  },
  // A closed outline around a path, w0 wide at the start and w1 at the end, with round caps: tails, legs, antennae.
  tube(path, w0, w1 = w0, capN = 6) {
    const n = path.length, L = [], R = [], wAt = i => CG.lerp(w0, w1, i / Math.max(1, n - 1)) / 2;
    const dir = i => { const a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };
    for (let i = 0; i < n; i++) { const [dx, dy] = dir(i), w = wAt(i); L.push([path[i][0] - dy * w, path[i][1] + dx * w]); R.push([path[i][0] + dy * w, path[i][1] - dx * w]); }
    // a half circle from the left edge to the right one around the tip (end), or from right to left around the root
    const cap = (i, from) => { const [dx, dy] = dir(i), w = wAt(i), a0 = Math.atan2(dx, -dy) + from, out = [];
      for (let k = 1; k < capN; k++) { const a = a0 - k / capN * Math.PI; out.push([path[i][0] + Math.cos(a) * w, path[i][1] + Math.sin(a) * w]); } return out; };
    return [...L, ...cap(n - 1, 0), ...R.reverse(), ...cap(0, Math.PI)];
  },
  // A soft limb: one smooth outline through three joints [a, b, c] (shoulder, elbow, wrist or hip, knee, ankle), two
  // segments of any length. widths: five full widths at 0, .25, .5, .75, 1 of the way (w2 at b), joined by a smooth
  // curve. At b the outer side turns on an arc, the inner side folds (its two edges stop where they meet); the ends
  // are round caps, so a limb drawn over the body shows no cut.
  limb([a, b, c], widths, n = 8) {
    const half = u => {                                            // Catmull-Rom through the five widths, halved
      const x = CG.clamp(u) * 4, i = Math.min(3, Math.floor(x)), k = x - i, w = j => widths[CG.clamp(j, 0, 4)];
      const p0 = w(i - 1), p1 = w(i), p2 = w(i + 1), p3 = w(i + 2);
      return .25 * (2 * p1 + (-p0 + p2) * k + (2 * p0 - 5 * p1 + 4 * p2 - p3) * k * k + (-p0 + 3 * p1 - 3 * p2 + p3) * k * k * k);
    };
    const seg = (p, q, u0, u1) => {                               // the two offset edges of one segment, p → q
      const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, L = [], R = [];
      for (let i = 0; i <= n; i++) {
        const k = i / n, x = CG.lerp(p[0], q[0], k), y = CG.lerp(p[1], q[1], k), h = half(CG.lerp(u0, u1, k));
        L.push([x + nx * h, y + ny * h]); R.push([x - nx * h, y - ny * h]);
      }
      return { L, R, a: Math.atan2(dy, dx) };
    };
    const s1 = seg(a, b, 0, .5), s2 = seg(b, c, .5, 1);
    const turn = Math.sin(s2.a - s1.a), hb = half(.5);
    // the outer side: an arc round b from the first segment's normal to the second's
    const arc = (side, a1, a2) => {
      let da = a2 - a1; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const out = [], m = Math.max(2, Math.ceil(Math.abs(da) / .25));
      for (let i = 1; i < m; i++) { const t = a1 + da * i / m; out.push([b[0] + Math.cos(t) * hb, b[1] + Math.sin(t) * hb]); }
      return side === 'L' ? out : out.reverse();
    };
    // the inner side: both edges cut where they cross
    const fold = (e1, e2) => {
      for (let i = e1.length - 2; i >= 0; i--) for (let j = 0; j < e2.length - 1; j++) {
        const p = CG._cross(e1[i], e1[i + 1], e2[j], e2[j + 1]);
        if (p) return [...e1.slice(0, i + 1), p, ...e2.slice(j + 1)];
      }
      return [...e1, ...e2];
    };
    const nL1 = s1.a + Math.PI / 2, nL2 = s2.a + Math.PI / 2;
    // turning towards L (turn > 0, y down) makes L the inner side
    const left = turn > 1e-6 ? fold(s1.L, s2.L) : [...s1.L, ...arc('L', nL1, nL2), ...s2.L];
    const right = turn < -1e-6 ? fold(s1.R, s2.R) : [...s1.R, ...arc('L', nL1 + Math.PI, nL2 + Math.PI), ...s2.R];
    const cap = (p, ang, h, from) => { const out = []; for (let k = 1; k < 6; k++) { const t = ang + from - k / 6 * Math.PI; out.push([p[0] + Math.cos(t) * h, p[1] + Math.sin(t) * h]); } return out; };
    return [...left, ...cap(c, s2.a, half(1), Math.PI / 2), ...right.reverse(), ...cap(a, s1.a, half(0), -Math.PI / 2)];
  },
  // A smooth closed curve through pts (Catmull-Rom), n points per span: torsos and other soft outlines.
  spline(pts, n = 6) {
    const m = pts.length, out = [];
    for (let i = 0; i < m; i++) {
      const p0 = pts[(i - 1 + m) % m], p1 = pts[i], p2 = pts[(i + 1) % m], p3 = pts[(i + 2) % m];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    return out;
  },
  // Where segments p1-p2 and p3-p4 cross, or null.
  _cross(p1, p2, p3, p4) {
    const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
    if (Math.abs(d) < 1e-12) return null;
    const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d, u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])] : null;
  },
};
