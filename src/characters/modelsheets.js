// modelsheets.js: every registered character gets two model sheets, as loops (landscape, 4 s), to compare with its
// reference and to approve (tools/approve.mjs):
//   LOOPS.sheet_<id>: the key views, the expressions, the silhouette and the colour roles (like base.png);
//   LOOPS.pose_<id>:  the poses, in rows of three at one shared scale, so each drawing is big enough to judge.
// Frame 0 is the image to approve; the loop shows the character alive (tail, antennae, run cycles).
//   node render.mjs --loop=sheet_gatto --stills=0 --style=classic --out=out/sheets/gatto-classic
// Model sheets are reference, so they are the one place labels are fine (as in src/sheets.js).
(() => {
  const VIEW_NAME = { front: 'fronte', q: '3/4', side: 'profilo', back: 'retro' };
  const label = (txt, x, y, size) => letter(txt, x, y, size, PAL.ink, { ink: false, alpha: .8 });
  const layoutOf = (spec, o) => BODIES[spec.body].layout(spec, resolveState(spec, o));

  // A row of drawings scaled together to fit between x0 and x1 and maxH tall, feet on `base`; widths from frame 0, so
  // the row doesn't shift as tails move. fitU() is the scale a row would take; pass u to share one scale across rows.
  const GAP = .8;
  function fitU(id, cells, x0, x1, maxH) {
    const spec = CHARACTERS[id], bs = cells.map(c => layoutOf(spec, { ...c.o, t: 0 }).bounds);
    const totalW = bs.reduce((s, b) => s + b.x1 - b.x0, 0) + GAP * (cells.length - 1);
    return Math.min((x1 - x0) / totalW, maxH / Math.max(...bs.map(b => -b.y0)));
  }
  function row(id, cells, x0, x1, base, maxH, t, size, uFixed) {
    const spec = CHARACTERS[id], bs = cells.map(c => layoutOf(spec, { ...c.o, t: 0 }).bounds), gap = GAP;
    const totalW = bs.reduce((s, b) => s + b.x1 - b.x0, 0) + gap * (cells.length - 1);
    const u = uFixed ?? fitU(id, cells, x0, x1, maxH);
    let x = x0 + ((x1 - x0) - totalW * u) / 2;
    cells.forEach((c, i) => {
      const b = bs[i];
      character(id, x - b.x0 * u, base, u, { ...c.o, t, key: `${id} ${base} ${i}` });
      label(c.label, x + (b.x1 - b.x0) * u / 2, base + 36, size);
      x += (b.x1 - b.x0 + gap) * u;
    });
  }
  // The first sheet view as one flat shape in the line colour: does it read at a glance?
  function silhouette(id, cx, base, h) {
    const spec = CHARACTERS[id], L = layoutOf(spec, { view: BODIES[spec.body].SHEET.views[0] }), ink = roleColor(spec, 'line');
    const u = h / -L.bounds.y0, ox = cx - (L.bounds.x0 + L.bounds.x1) / 2 * u;
    boilSeed('silhouette ' + id);
    for (const p of L.parts) {
      if (p.id === 'shadow' || p.shade) continue;
      const pts = p.pts.map(([a, b]) => [ox + a * u, base + b * u]);
      if (p.stroke) inkLine(pts, .6, ink, 'ink', .5); else paint(pts, { wash: ink, washOp: 255, ink: null });
    }
  }
  function swatches(id, x0, cy) {
    const spec = CHARACTERS[id];
    Object.keys(spec.roles).forEach((role, i) => {
      const x = x0 + i * 150;
      boilSeed('swatch ' + id + role);
      paint(ellPts(x, cy, 44, 44, 28), { wash: roleColor(spec, role), washOp: 255, ink: roleColor(spec, 'line'), sw: .8 });
      label(role, x, cy + 70, 20);
    });
  }

  for (const id of Object.keys(CHARACTERS)) {
    const spec = CHARACTERS[id], S = BODIES[spec.body].SHEET, inferred = spec.inferred || [];
    LOOPS['sheet_' + id] = t => {
      row(id, S.views.map(v => ({ o: { view: v }, label: VIEW_NAME[v] + (inferred.includes(v) ? ' (dedotta)' : '') })), 60, W - 60, 470, 380, t, 24);
      row(id, Object.keys(spec.expressions).map(e => ({ o: { view: S.exprView, expression: e, bust: S.exprBust }, label: e })), 40, W - 40, 830, 260, t, 22);
      silhouette(id, 190, 1040, 140);
      swatches(id, 470, 975);
    };
    LOOPS['pose_' + id] = t => {
      const cells = Object.keys(spec.poses).map(p => ({ o: { view: S.poseView, pose: p }, label: p }));
      const rows = []; for (let i = 0; i < cells.length; i += 3) rows.push(cells.slice(i, i + 3));
      const h = (H - 140) / rows.length, u = Math.min(...rows.map(r => fitU(id, r, 80, W - 80, h - 90)));
      rows.forEach((r, i) => row(id, r, 80, W - 80, 40 + h * (i + 1) - 50, h - 90, t, 26, u));
    };
    for (const k of ['sheet_', 'pose_']) { LOOPS[k + id].len = 4; LOOPS[k + id].format = 'landscape'; }
  }
})();
