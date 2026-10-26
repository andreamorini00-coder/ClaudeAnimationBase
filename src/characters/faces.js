// faces.js: eyes and mouths as shapes, for any body. Pure (uses CG only).
// A part is { id, role, pts, line, stroke }: a closed shape filled with its role colour and outlined `line` thick
// (0 = no outline), or, with stroke: true, an open line `line` thick in its role colour.
// Roles default to eyeWhite (whites, highlights), line (pupils, strokes) and line again for a mouth's inside; a body
// whose whites are another role passes o.roles = { white, ink, inside }.
const FACES = {
  EYES: ['open', 'wide', 'oval', 'happy', 'closed', 'sad', 'angry', 'sleepy'],
  MOUTHS: ['smile', 'open', 'frown', 'o', 'flat', 'pout', 'catSmile'],
  arc(cx, cy, rx, ry, a0, a1, n = 10) { const p = []; for (let i = 0; i <= n; i++) { const a = CG.lerp(a0, a1, i / n); p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; },

  // kind: one of EYES. r: eye size. o.look: -1..1, where the pupil looks sideways. o.squint: 0..1 closes it.
  // o.dark: open, wide, sad and angry eyes drawn as one big dark iris with two highlights, no white (the cat).
  eye(kind, cx, cy, r, o = {}) {
    if (!FACES.EYES.includes(kind)) throw new Error(`Occhio "${kind}" inesistente. Disponibili: ${FACES.EYES.join(', ')}`);
    const R = { white: 'eyeWhite', ink: 'line', ...(o.roles || {}) }, look = CG.clamp(o.look || 0, -1, 1) * r * .25;
    const open = 1 - CG.clamp(o.squint || 0), P = Math.PI, parts = [];
    const stroke = (id, pts, w = .5) => parts.push({ id, role: R.ink, pts, line: w, stroke: true });
    if (kind === 'happy') { stroke('lid', FACES.arc(cx, cy + r * .2, r * .75, r * .6, P, 2 * P)); return { parts }; }
    if (kind === 'closed' || open < .15) { stroke('lid', FACES.arc(cx, cy, r * .75, r * .35, 0, P)); return { parts }; }
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

  // kind: one of MOUTHS. w: mouth width.
  mouth(kind, cx, cy, w, o = {}) {
    if (!FACES.MOUTHS.includes(kind)) throw new Error(`Bocca "${kind}" inesistente. Disponibili: ${FACES.MOUTHS.join(', ')}`);
    const R = { ink: 'line', inside: 'line', ...(o.roles || {}) }, h = w / 2, P = Math.PI;
    const stroke = pts => ({ parts: [{ id: 'mouth', role: R.ink, pts, line: .5, stroke: true }] });
    switch (kind) {
      case 'smile': return stroke(FACES.arc(cx, cy - h * .3, h, h * .55, .15 * P, .85 * P));
      case 'frown': return stroke(FACES.arc(cx, cy + h * .3, h * .8, h * .45, 1.15 * P, 1.85 * P));
      case 'flat': return stroke([[cx - h * .6, cy], [cx + h * .6, cy]]);
      case 'pout': return stroke([[cx - h * .6, cy + h * .1], [cx - h * .2, cy - h * .12], [cx + h * .2, cy + h * .05], [cx + h * .6, cy - h * .08]]);
      case 'catSmile': return stroke([...FACES.arc(cx - h * .35, cy, h * .35, h * .3, P, 0, 6).reverse(), ...FACES.arc(cx + h * .35, cy, h * .35, h * .3, P, 0, 6).reverse()].reverse());
      case 'o': return { parts: [{ id: 'mouth', role: R.inside, pts: CG.ellipse(cx, cy, h * .38, h * .5, 16), line: .5 }] };
      case 'open': return { parts: [{ id: 'mouth', role: R.inside, pts: FACES.arc(cx, cy - h * .15, h * .8, h * .9, 0, P, 14), line: .5 }] };
    }
  },
};
