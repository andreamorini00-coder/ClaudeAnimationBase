// watercolor.js: the kit's original technique, p5.brush washes, watercolour fills, hatching and tapered ink, on
// stained paper with a multiplied grain. Its functions run after core.js has loaded (PAL, W, H, lcg come from there).
TECHNIQUES.watercolor = {
  // One painted shape, already centred by paint(): optional flat wash, optional watercolor fill, optional hatch,
  // optional ink outline.
  paintAt(pts, o) {
    if (o.wash || o.fill || o.hatch) {
      if (o.wash) brush.wash(o.wash, o.washOp ?? 255); else brush.noWash();
      if (o.fill) { brush.fill(o.fill, o.fillOp ?? 170); brush.fillBleed(o.bleed ?? .1); brush.fillTexture(o.tex ?? .4, o.border ?? .35); } else brush.noFill();
      if (o.hatch) { brush.hatch(o.hatch.d, o.hatch.a, o.hatch.o || { rand: .15 }); brush.hatchStyle(o.hatch.b || 'HB', o.hatch.c || PAL.ink, o.hatch.w || 1); } else brush.noHatch();
      brush.noStroke();
      if (o.curv) { brush.beginShape(o.curv); for (const p of pts) brush.vertex(p[0], p[1]); brush.endShape(true); }
      else brush.polygon(pts);
    }
    // the outline is one continuous tapered stroke, not a stroke per side
    if (o.ink !== null) {
      brush.noWash(); brush.noFill(); brush.noHatch(); brush.set(o.br || 'ink', o.ink || PAL.ink, o.sw ?? 1);
      brush.beginShape(o.curv || 0); for (const p of pts) brush.vertex(p[0], p[1]); brush.endShape(true);
    }
  },
  inkLine(P, sw, col, br, curv) { brush.noFill(); brush.noWash(); brush.noHatch(); brush.set(br, col, sw); brush.spline(P, curv); },

  makePaper(style) {
    const p = style.paper, g = createGraphics(W, H); g.pixelDensity(1); const c = g.drawingContext, rnd = lcg(p.seed);
    c.fillStyle = style.palette.paper; c.fillRect(0, 0, W, H);
    for (let i = 0; i < p.stains; i++) { const x = rnd() * W, y = rnd() * H, r = p.stainR[0] + rnd() * p.stainR[1], gr = c.createRadialGradient(x, y, 0, x, y, r), a = p.stainAlpha * rnd(); gr.addColorStop(0, `rgba(${p.stainRGB},${a})`); gr.addColorStop(1, `rgba(${p.stainRGB},0)`); c.fillStyle = gr; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
    c.lineWidth = 1;
    for (let i = 0; i < p.fibers; i++) { const x = rnd() * W, y = rnd() * H, l = p.fiberLen[0] + rnd() * p.fiberLen[1], a = rnd() * TAU; c.strokeStyle = `rgba(${p.fiberRGB},${p.fiberAlpha[0] + rnd() * p.fiberAlpha[1]})`; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + .6) * l * .5, y + Math.sin(a + .6) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
    return g;
  },
  // Static grain + vignette, multiplied over the painted frame so pigment sits "in" the paper.
  makeGrain(style) {
    const gs = style.grain, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), rnd = lcg(gs.seed);
    const id = c.createImageData(W, H), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const v = 255 - (rnd() < gs.density ? rnd() * rnd() * gs.depth : 0); d[i] = v; d[i + 1] = v - 1; d[i + 2] = v - 3; d[i + 3] = 255; }
    c.putImageData(id, 0, 0);
    const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * gs.vignetteR[0], W / 2, H / 2, Math.min(W, H) * gs.vignetteR[1]); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(${gs.vignetteRGB},${gs.vignette})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    return cv;
  },
};
