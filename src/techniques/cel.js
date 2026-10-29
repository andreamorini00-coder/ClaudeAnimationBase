// cel.js: flat colour, one hard shadow, a clean constant outline (cozy, anime; marker-comic and visual-novel in 3b).
// PROTOTYPE of Task 1 (docs/superpowers/plans/2026-10-29-fase3a-stili.md): each shape with an outline or a shadow is
// drawn on a small 2D canvas (flat fill, a crescent shadow clipped to the shape, the outline) and copied into the frame
// under p5's current matrix; a shape with neither goes straight to p5 as a flat polygon.
const CEL = {
  POOL: new Map(),
  // a reusable canvas per power-of-two size, so textures stay small and nothing is allocated per shape
  canvas(w, h) {
    const b = n => Math.max(32, 2 ** Math.ceil(Math.log2(n))), bw = b(w), bh = b(h), key = bw + 'x' + bh;
    if (!CEL.POOL.has(key)) { const g = createGraphics(bw, bh); g.pixelDensity(1); CEL.POOL.set(key, g); }
    return CEL.POOL.get(key);
  },
  rgba(col, a = 255) { const c = color(col); return `rgba(${red(c)},${green(c)},${blue(c)},${a / 255})`; },
};
TECHNIQUES.cel = {
  paintAt(pts, o) {
    const C = STYLE.cel, col = o.wash || o.fill, alpha = o.wash ? (o.washOp ?? 255) : (o.fillOp ?? 170);
    const outlined = o.ink !== null && o.ink !== undefined || (o.ink === undefined), shade = o.shade === true || (o.shade !== false && o.ink !== null);
    if (!col && !outlined) return;
    if (!outlined && !shade) {                          // a flat polygon straight into the frame
      flushBrush();
      const c = color(col); noStroke(); fill(red(c), green(c), blue(c), alpha); beginShape(); for (const [x, y] of pts) vertex(x, y); endShape(CLOSE);
      return;
    }
    const w0 = (o.inner ? C.lineInner : 1) * C.line, sw = (o.sw ?? 1) * 4.5 * w0, wob = outlined ? C.wobble : 0;
    const P = wob ? pts.map(([x, y]) => [x + jit(wob), y + jit(wob)]) : pts;
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const side = Math.max(x1 - x0, y1 - y0), d = shade ? C.shadeSize * side : 0, m = Math.ceil(sw + d + 3);
    const zoom = clamp((CAM ? CAM.zoom : 1) * DRAFT.scale, .5, 3), W2 = x1 - x0 + 2 * m, H2 = y1 - y0 + 2 * m;
    const g = CEL.canvas(Math.ceil(W2 * zoom), Math.ceil(H2 * zoom)), c = g.drawingContext, gw = g.width, gh = g.height;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, gw, gh); c.setTransform(zoom, 0, 0, zoom, (m - x0) * zoom, (m - y0) * zoom);
    const path = (dx = 0, dy = 0) => { c.moveTo(P[0][0] + dx, P[0][1] + dy); for (let i = 1; i < P.length; i++) c.lineTo(P[i][0] + dx, P[i][1] + dy); c.closePath(); };
    if (col) { c.beginPath(); path(); c.fillStyle = CEL.rgba(col, alpha); c.fill(); }
    if (shade && col) {                                 // the crescent: the shape minus itself moved towards the light, inside the shape
      const [lx, ly] = C.light, n = Math.hypot(lx, ly) || 1, sh = o.shadeCol || mixCol(col, C.shadow, C.shadeK);
      c.save(); c.beginPath(); path(); c.clip();
      c.beginPath(); c.rect(x0 - m - 5, y0 - m - 5, x1 - x0 + 2 * m + 10, y1 - y0 + 2 * m + 10); path(lx / n * d, ly / n * d);
      c.fillStyle = CEL.rgba(sh, alpha); c.fill('evenodd'); c.restore();
    }
    if (outlined) { c.beginPath(); path(); c.lineWidth = sw; c.lineJoin = 'round'; c.strokeStyle = CEL.rgba(o.ink || PAL.ink); c.stroke(); }
    flushBrush();
    push(); noStroke(); image(g, x0 - m, y0 - m, W2, H2, 0, 0, Math.ceil(W2 * zoom), Math.ceil(H2 * zoom)); pop();
  },
  inkLine(P, sw, col, br, curv) {
    flushBrush(); noFill(); const c = color(col); stroke(red(c), green(c), blue(c)); strokeWeight(Math.max(1, sw * 4.5 * STYLE.cel.line));
    beginShape(); for (const [x, y] of P) vertex(x, y); endShape(); noStroke();
  },
  makePaper(style) { return TECHNIQUES.watercolor.makePaper(style); },
  makeGrain(style) { return TECHNIQUES.watercolor.makeGrain(style); },
};
