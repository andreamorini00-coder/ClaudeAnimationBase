// modelsheets.js: every registered character gets two model sheets, as loops (landscape, 4 s), to compare with its
// reference and to approve (tools/approve.mjs):
//   LOOPS.sheet_<id>: the key views, the expressions, the silhouette and the colour roles (like base.png);
//   LOOPS.pose_<id>:  the poses, in rows of three at one shared scale, so each drawing is big enough to judge;
//   LOOPS.face_<id>:  with spec.faceSheet, the face parts of viso.png: eyes, mouths, brows, one row each;
//   and the same three for each outfit, as sheet_<id>.<outfit> (approved on their own).
// Frame 0 is the image to approve; the loop shows the character alive (tail, antennae, run cycles).
//   node render.mjs --loop=sheet_gatto --stills=0 --style=classic --out=out/sheets/gatto-classic
// Model sheets are reference, so they are the one place labels are fine (as in src/sheets.js).
(() => {
  const VIEW_NAME = { front: 'fronte', q: '3/4', side: 'profilo', back: 'retro' };
  const label = (txt, x, y, size) => letter(txt, x, y, size, PAL.ink, { ink: false, alpha: .8 });
  const layoutOf = (spec, o) => BODIES[spec.body].layout(spec, resolveState(spec, o));
  const specOf = (id, o) => outfitSpec(CHARACTERS[id], o && o.outfit);

  // A row of drawings scaled together to fit between x0 and x1 and maxH tall, feet on `base`; widths from frame 0, so
  // the row doesn't shift as tails move. fitU() is the scale a row would take; pass u to share one scale across rows.
  const GAP = .8;
  // spec.poseCellW: a tall, narrow character's cells are at least this share of its height wide, so labels don't touch
  const widen = (spec, b) => {
    const w = (spec.poseCellW || 0) * (b.y1 - b.y0), extra = Math.max(0, w - (b.x1 - b.x0)) / 2;
    return extra ? { ...b, x0: b.x0 - extra, x1: b.x1 + extra } : b;
  };
  function fitU(id, cells, x0, x1, maxH) {
    const spec = specOf(id, cells[0].o), bs = cells.map(c => layoutOf(spec, { ...c.o, t: 0 }).bounds).map(b => widen(spec, b));
    const totalW = bs.reduce((s, b) => s + b.x1 - b.x0, 0) + GAP * (cells.length - 1);
    return Math.min((x1 - x0) / totalW, maxH / Math.max(...bs.map(b => -b.y0)));
  }
  function row(id, cells, x0, x1, base, maxH, t, size, uFixed) {
    const spec = specOf(id, cells[0].o), bs = cells.map(c => layoutOf(spec, { ...c.o, t: 0 }).bounds).map(b => widen(spec, b)), gap = GAP;
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
  function silhouette(id, cx, base, h, outfit) {
    const spec = specOf(id, { outfit }), L = layoutOf(spec, { view: BODIES[spec.body].SHEET.views[0] }), ink = roleColor(spec, 'line');
    const u = h / -L.bounds.y0, ox = cx - (L.bounds.x0 + L.bounds.x1) / 2 * u;
    boilSeed('silhouette ' + id);
    for (const p of L.parts) {
      if (p.id === 'shadow' || p.shade) continue;
      const pts = p.pts.map(([a, b]) => [ox + a * u, base + b * u]);
      if (p.stroke) inkLine(pts, .6, ink, 'ink', .5); else paint(pts, { wash: ink, washOp: 255, ink: null });
    }
  }
  function swatches(id, x0, cy, outfit) {
    // 150 apart, closer when there are more roles than fit (the adults have up to 15)
    const spec = specOf(id, { outfit }), roles = Object.keys(spec.roles), step = Math.min(150, (W - 60 - x0) / Math.max(1, roles.length - 1));
    roles.forEach((role, i) => {
      const x = x0 + i * step;
      boilSeed('swatch ' + id + role);
      paint(ellPts(x, cy, 44, 44, 28), { wash: roleColor(spec, role), washOp: 255, ink: roleColor(spec, 'line'), sw: .8 });
      label(role, x, cy + 70, step < 150 ? 16 : 20);
    });
  }

  // viso.png: three rows, one part changing at a time over a neutral face
  const FACE_ROWS = [
    [['open', 'occhi aperti'], ['sleepy', 'socchiusi'], ['closed', 'chiusi'], ['happy', 'chiusi sorridenti']].map(([eyes, label]) => ({ e: { eyes, mouth: 'flat', brows: 'neutral' }, label })),
    [['flat', 'bocca chiusa'], ['ajar', 'socchiusa'], ['open', 'aperta "a"'], ['o', 'aperta "o"'], ['grin', 'sorriso con denti']].map(([mouth, label]) => ({ e: { eyes: 'open', mouth, brows: 'neutral' }, label })),
    [['neutral', 'sopracciglia neutre'], ['raised', 'alzate'], ['frown', 'aggrottate'], ['sad', 'tristi']].map(([brows, label]) => ({ e: { eyes: 'open', mouth: 'flat', brows }, label })),
  ];
  for (const id of Object.keys(CHARACTERS)) for (const outfit of [null, ...Object.keys(CHARACTERS[id].outfits || {})]) {
    const spec = outfitSpec(CHARACTERS[id], outfit), S = BODIES[spec.body].SHEET, inferred = spec.inferred || [], key = outfit ? `${id}.${outfit}` : id;
    const O = o => outfit ? { ...o, outfit } : o;
    LOOPS['sheet_' + key] = t => {
      row(id, S.views.map(v => ({ o: O({ view: v }), label: VIEW_NAME[v] + (inferred.includes(v) ? ' (dedotta)' : '') })), 60, W - 60, 470, 380, t, 24);
      row(id, Object.keys(spec.expressions).map(e => ({ o: O({ view: S.exprView, expression: e, bust: S.exprBust }), label: e })), 40, W - 40, 830, 260, t, 22);
      silhouette(id, 190, 1040, 140, outfit);
      swatches(id, 470, 975, outfit);
    };
    LOOPS['pose_' + key] = t => {
      const cells = Object.keys(spec.poses).map(p => ({ o: O({ view: (spec.poseViews || {})[p] || S.poseView, pose: p }), label: p }));
      const rows = []; for (let i = 0; i < cells.length; i += 3) rows.push(cells.slice(i, i + 3));
      const h = (H - 140) / rows.length, u = Math.min(...rows.map(r => fitU(id, r, 80, W - 80, h - 90)));
      rows.forEach((r, i) => row(id, r, 80, W - 80, 40 + h * (i + 1) - 50, h - 90, t, 26, u));
    };
    const kinds = ['sheet_', 'pose_'];
    if (spec.faceSheet) {
      LOOPS['face_' + key] = t => {
        const rows = FACE_ROWS.map(r => r.map(c => ({ o: O({ view: 'front', expression: c.e, bust: 'face' }), label: c.label })));
        const u = Math.min(...rows.map(r => fitU(id, r, 80, W - 80, 250)));
        rows.forEach((r, i) => row(id, r, 80, W - 80, 300 + i * 350, 250, t, 22, u));
      };
      kinds.push('face_');
    }
    for (const k of kinds) { LOOPS[k + key].len = 4; LOOPS[k + key].format = 'landscape'; }
  }
})();
