// faces.js: eyes and mouths as shapes, for any body. Pure (uses CG only).
// A part is { id, role, pts, line, stroke }: a closed shape filled with its role colour and outlined `line` thick
// (0 = no outline), or, with stroke: true, an open line `line` thick in its role colour.
// Roles default to eyeWhite (whites, highlights), line (pupils, strokes) and line again for a mouth's inside; a body
// whose whites are another role passes o.roles = { white, ink, inside }.
const FACES = {
  EYES: ['open', 'wide', 'oval', 'happy', 'closed', 'sad', 'angry', 'sleepy'],
  MOUTHS: ['smile', 'open', 'frown', 'o', 'flat', 'pout', 'catSmile', 'ajar', 'grin'],
  // named eyebrows: [k (FACES.brows' tilt), lift (how far they rise)]
  BROWS: { neutral: [0, 0], raised: [-.15, 1], frown: [1, -.2], sad: [-1, .3] },
  arc(cx, cy, rx, ry, a0, a1, n = 10) { const p = []; for (let i = 0; i <= n; i++) { const a = CG.lerp(a0, a1, i / n); p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; },

  // kind: one of EYES. r: eye size. o.look: -1..1, where the pupil looks sideways. o.squint: 0..1 closes it.
  // o.dark: open, wide, sad and angry eyes drawn as one big dark iris with two highlights, no white (the cat).
  // o.iris: the same eyes as a coloured iris (role o.roles.iris, default iris) round a dark pupil.
  // o.adult: an adult's almond eye (open; sleepy = the lid over the iris's upper half; closed and happy = a lash arc
  // down or up); o.outer (-1 | 1) is the side of its outer corner, where the lash line flicks out.
  eye(kind, cx, cy, r, o = {}) {
    if (!FACES.EYES.includes(kind)) throw new Error(`Occhio "${kind}" inesistente. Disponibili: ${FACES.EYES.join(', ')}`);
    const R = { white: 'eyeWhite', ink: 'line', iris: 'iris', ...(o.roles || {}) }, look = CG.clamp(o.look || 0, -1, 1) * r * .25;
    const open = 1 - CG.clamp(o.squint || 0), P = Math.PI, parts = [];
    const stroke = (id, pts, w = .5) => parts.push({ id, role: R.ink, pts, line: w, stroke: true });
    if (o.adult) return FACES.adultEye(kind, cx, cy, r, o, R, open, look);
    if (kind === 'happy') { stroke('lid', FACES.arc(cx, cy + r * .2, r * .75, r * .6, P, 2 * P)); return { parts }; }
    if (kind === 'closed' || open < .15) { stroke('lid', FACES.arc(cx, cy, r * .75, r * .35, 0, P)); return { parts }; }
    if (o.iris && ['open', 'wide', 'sad', 'angry'].includes(kind)) {
      const k = kind === 'wide' ? 1.15 : 1, ry = r * .8 * k * open, lx = cx + look * .5;
      parts.push({ id: 'iris', role: R.iris, pts: CG.ellipse(lx, cy, r * .68 * k, ry, 28), line: .45 });
      parts.push({ id: 'pupil', role: R.ink, pts: CG.ellipse(lx + r * .05, cy + ry * .05, r * .34 * k, r * .42 * k * open, 20), line: 0 });
      parts.push({ id: 'highlight', role: R.white, pts: CG.ellipse(lx - r * .2 * k, cy - ry * .35, r * .14 * k, r * .14 * k * open, 12), line: 0 });
      if (kind === 'sad') stroke('brow', [[cx - r * .8, cy - ry - r * .05], [cx + r * .8, cy - ry - r * .4]]);
      if (kind === 'angry') stroke('brow', [[cx - r * .85, cy - ry - r * .45], [cx + r * .85, cy - ry + r * .12]], .7);
      return { parts };
    }
    if (o.dark && ['open', 'wide', 'sad', 'angry'].includes(kind)) {
      const k = kind === 'wide' ? 1.18 : 1, ry = r * .78 * k * open, lx = cx + look * .5;
      parts.push({ id: 'pupil', role: R.ink, pts: CG.ellipse(lx, cy, r * .66 * k, ry, 28), line: .4 });
      parts.push({ id: 'highlight', role: R.white, pts: CG.ellipse(lx - r * .22 * k, cy - ry * .38, r * .2 * k, r * .2 * k * open, 12), line: 0 });
      parts.push({ id: 'highlight2', role: R.white, pts: CG.ellipse(lx + r * .2 * k, cy + ry * .35, r * .09 * k, r * .09 * k * open, 8), line: 0 });
      if (kind === 'sad') stroke('brow', [[cx - r * .8, cy - ry - r * .05], [cx + r * .8, cy - ry - r * .4]]);
      if (kind === 'angry') stroke('brow', [[cx - r * .85, cy - ry - r * .45], [cx + r * .85, cy - ry + r * .12]], .7);
      return { parts };
    }
    const shape = { open: [.72, .9, .6], wide: [.9, 1.15, .36], oval: [.75, 1, .3], sad: [.8, .95, .55], angry: [.8, .9, .55], sleepy: [.8, 1, .55] }[kind];
    const [wx, wy, pr] = shape, ry = r * wy * open;
    if (kind === 'sleepy') {                                   // the upper lid down to the middle: only the lower half shows
      parts.push({ id: 'eyeWhite', role: R.white, pts: FACES.arc(cx, cy, r * wx, ry, 0, P, 14), line: .5 });
      parts.push({ id: 'pupil', role: R.ink, pts: FACES.arc(cx + look, cy, r * pr * .9, r * pr * .8 * open, 0, P, 10), line: 0 });
      stroke('lid', [[cx - r * wx, cy], [cx + r * wx, cy]], .6);
      return { parts };
    }
    parts.push({ id: 'eyeWhite', role: R.white, pts: CG.ellipse(cx, cy, r * wx, ry, 28), line: .5 });
    if (kind === 'oval') parts.push({ id: 'pupil', role: R.ink, pts: CG.ellipse(cx + look, cy + r * .08, r * pr, r * .52 * open, 20), line: 0 });
    else parts.push({ id: 'pupil', role: R.ink, pts: CG.ellipse(cx + look, cy + r * .1, r * pr, r * pr * Math.min(1, open * 1.1), 20), line: 0 });
    parts.push({ id: 'highlight', role: R.white, pts: CG.ellipse(cx + look - r * pr * .35, cy - r * pr * .2, r * pr * .3, r * pr * .3 * open, 10), line: 0 });
    if (kind === 'sad') stroke('brow', [[cx - r * .8, cy - ry - r * .15], [cx + r * .8, cy - ry - r * .45]]);
    if (kind === 'angry') stroke('brow', [[cx - r * .85, cy - ry - r * .5], [cx + r * .85, cy - ry + r * .05]], .7);
    return { parts };
  },

  adultEye(kind, cx, cy, r, o, R, open, look) {
    const parts = [], out = o.outer || 1, rx = r * 1.05, n = 16, P = Math.PI;
    const lash = (pts, w = 1) => parts.push({ id: 'lash', role: R.ink, pts, line: w, stroke: true });
    const xs = [...Array(n + 1)].map((_, i) => cx - rx + 2 * rx * i / n), bump = x => Math.max(0, Math.sin(P * (x - cx + rx) / (2 * rx)));
    if (kind === 'closed' || open < .15) { lash(xs.map(x => [x, cy + r * .1 + r * .22 * bump(x)])); return { parts }; }
    if (kind === 'happy') { lash(xs.map(x => [x, cy + r * .2 - r * .32 * bump(x)])); return { parts }; }
    // the almond: a high upper lid, a flatter lower one; the outer corner a little higher than the inner
    const ry = r * .8 * open, tilt = x => -out * (x - cx) / rx * r * .08;
    const upper = xs.map(x => [x, cy + tilt(x) - ry * Math.pow(bump(x), .7)]), lower = xs.map(x => [x, cy + tilt(x) + r * .42 * Math.pow(bump(x), .9)]);
    let almond = [...upper, ...lower.slice(1, -1).reverse()];
    const lidY = cy - r * .1;                                       // a sleepy lid: down to just above the middle
    if (kind === 'sleepy') almond = CG.clipY(almond, lidY, 1);
    parts.push({ id: 'eyeWhite', role: R.white, pts: almond, line: 0 });
    const ix = cx + look, iy = cy + r * .05;
    parts.push({ id: 'iris', role: R.iris, pts: CG.clipConvex(CG.ellipse(ix, iy, r * .55, r * .6, 28), almond), line: .35 });
    parts.push({ id: 'pupil', role: R.ink, pts: CG.clipConvex(CG.ellipse(ix, iy + r * .05, r * .26, r * .32, 18), almond), line: 0 });
    const hl = CG.clipConvex(CG.ellipse(ix - out * r * .18, iy - r * .22, r * .13, r * .13, 12), almond);
    if (hl.length > 2) parts.push({ id: 'highlight', role: R.white, pts: hl, line: 0 });
    // the lash line along the upper lid (or the lowered lid), flicking out past the outer corner
    const top = kind === 'sleepy' ? upper.map(([x, y]) => [x, Math.max(lidY, y)]) : upper;
    const end = out > 0 ? top[n] : top[0], flick = [end[0] + out * r * .25, end[1] - r * .12];
    lash(out > 0 ? [...top, flick] : [flick, ...top], 1);
    lash(lower.slice(Math.round(n * .2), Math.round(n * .8)), .35);
    return { parts };
  },

  // One eyebrow: a soft arc w wide centred on (cx, cy). The sign of w says which end is the inner one (w > 0: the right
  // end, as for the eye on screen-left). k: -1 (sad, the inner end up) .. 0 .. 1 (angry, the inner end down).
  // kind: 'line' (thin) or 'thick'. lift: raises the whole brow (1 = a third of its width).
  brows(kind, cx, cy, w, k = 0, lift = 0) {
    const s = Math.sign(w) || 1, h = Math.abs(w) / 2, tilt = CG.clamp(k, -1, 1) * h * .55, n = 8, pts = [];
    cy -= lift * Math.abs(w) * .35;
    for (let i = 0; i <= n; i++) {
      const u = i / n * 2 - 1;                                           // -1 outer end .. 1 inner end
      pts.push([cx + s * u * h, cy - h * .28 * (1 - u * u) + tilt * (u + 1) / 2 - tilt / 2]);
    }
    return { parts: [{ id: 'brow', role: 'line', pts, line: kind === 'thick' ? .9 : .55, stroke: true }] };
  },

  // A pink cheek of radius r at (cx, cy). blush 0..1: embarrassment makes it bigger and deeper, with three little strokes.
  cheek(cx, cy, r, blush = 0) {
    const b = CG.clamp(blush), k = 1 + .55 * b, parts = [{ id: 'cheek', role: 'cheek', pts: CG.ellipse(cx, cy, r * k, r * .7 * k, 20), line: 0, ...(b ? { dim: .22 * b } : {}) }];
    if (b) for (let i = -1; i <= 1; i++)
      parts.push({ id: 'blush', role: 'line', pts: [[cx + i * r * .55 - r * .12, cy + r * .28], [cx + i * r * .55 + r * .12, cy - r * .28]], line: .3, stroke: true });
    return { parts };
  },

  // kind: one of MOUTHS. w: mouth width.
  mouth(kind, cx, cy, w, o = {}) {
    if (!FACES.MOUTHS.includes(kind)) throw new Error(`Bocca "${kind}" inesistente. Disponibili: ${FACES.MOUTHS.join(', ')}`);
    const R = { ink: 'line', inside: 'line', teeth: 'eyeWhite', ...(o.roles || {}) }, h = w / 2, P = Math.PI;
    const stroke = pts => ({ parts: [{ id: 'mouth', role: R.ink, pts, line: .5, stroke: true }] });
    switch (kind) {
      case 'smile': return stroke(FACES.arc(cx, cy - h * .3, h, h * .55, .15 * P, .85 * P));
      case 'frown': return stroke(FACES.arc(cx, cy + h * .3, h * .8, h * .45, 1.15 * P, 1.85 * P));
      case 'flat': return stroke([[cx - h * .6, cy], [cx + h * .6, cy]]);
      case 'pout': return stroke([[cx - h * .6, cy + h * .1], [cx - h * .2, cy - h * .12], [cx + h * .2, cy + h * .05], [cx + h * .6, cy - h * .08]]);
      // a thin "w" (as in :3): two little cups meeting under the nose, the middle higher than either cup
      case 'catSmile': return stroke([...FACES.arc(cx - h * .38, cy, h * .38, h * .42, P, 0, 7), ...FACES.arc(cx + h * .38, cy, h * .38, h * .42, P, 0, 7).slice(1)]);
      case 'o': return { parts: [{ id: 'mouth', role: R.inside, pts: CG.ellipse(cx, cy, h * .38, h * .5, 16), line: .5 }] };
      case 'open': return { parts: [{ id: 'mouth', role: R.inside, pts: FACES.arc(cx, cy - h * .15, h * .8, h * .9, 0, P, 14), line: .5 }] };
      case 'ajar': return { parts: [{ id: 'mouth', role: R.inside, pts: CG.ellipse(cx, cy, h * .5, h * .18, 16), line: .5 }] };
      // a wide smile showing the upper teeth: the open smile, its top band in the teeth colour
      case 'grin': {
        const shape = FACES.arc(cx, cy - h * .25, h * .85, h * .7, 0, P, 16);
        return { parts: [{ id: 'mouth', role: R.inside, pts: shape, line: .5 }, { id: 'mouthTeeth', role: R.teeth, pts: CG.clipY(shape, cy, -1), line: .35 }] };
      }
    }
  },
};
