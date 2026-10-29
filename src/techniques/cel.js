// cel.js: flat colour, one hard shadow, a clean constant outline (cozy and anime; marker-comic and visual-novel in 3b).
// A shape with an outline, a shadow or a rim light is drawn on a small 2D canvas: the flat fill, the shadow as a
// crescent (the shape minus itself moved towards the light, clipped to the shape), a rim light on the edge facing the
// light (backlight), then the outline; the canvas is copied into the frame under p5's current matrix (camera included).
// A shape with none of those goes straight to p5 as a flat polygon. The marks are exact, not brushed: no pigment, no
// bleed, no hatching (those options are ignored, with a single warning each).
//
// The style's STYLE.cel block (all fields required for technique 'cel', checked by CEL.problems at load):
//   line        outline weight multiplier (1 = the style's normal); lineInner  the factor for shapes marked inner
//   wobble      px the outline breathes at the boil rate (0 = still)
//   light       [dx, dy] direction towards the light; the shadow falls on the opposite side
//   shadow      hex, the tone the shadows are mixed towards; shadeK how far (0..1); shadeSize the crescent's width as a
//               share of the shape's larger side
//   tones       shadow tones (1; 2 in the visual-novel style, 3b); outline  'constant' ('shadowThick' in 3b)
// paint(pts, o) options it reads: wash / fill (colour, washOp / fillOp = opacity), ink (outline colour; null = none),
// sw (weight), inner, shade (false = no shadow, true = a shadow even without an outline), shadeCol (the shadow's own
// colour), rim ({ colore, spessore }: a light along the edge facing the light, drawn over the shadow).
const CEL = {
  UNIT: 4.5,                  // px of outline per unit of sw, at scale 1 (the ink brush of the watercolour styles is close to it)
  POOL: new Map(),
  WARNED: new Set(),
  // The problems with a style that uses this technique, one string each; [] when it is fine (and for any other technique).
  problems(style) {
    if (style.technique !== 'cel') return [];
    const c = style.cel;
    if (!c) return ['cel (il blocco STYLE.cel)'];
    const errs = [], num = (k, lo, hi) => typeof c[k] !== 'number' || !Number.isFinite(c[k]) || c[k] < lo || c[k] > hi;
    for (const k of ['line', 'lineInner', 'wobble', 'light', 'shadow', 'shadeK', 'shadeSize', 'tones', 'outline']) if (c[k] == null) errs.push('cel.' + k);
    if (c.line != null && num('line', 1e-6, 20)) errs.push('cel.line (un numero maggiore di 0)');
    if (c.lineInner != null && num('lineInner', 1e-6, 20)) errs.push('cel.lineInner (un numero maggiore di 0)');
    if (c.wobble != null && num('wobble', 0, 50)) errs.push('cel.wobble (un numero da 0 in su)');
    if (c.shadeK != null && num('shadeK', 0, 1)) errs.push('cel.shadeK (da 0 a 1)');
    if (c.shadeSize != null && num('shadeSize', 1e-6, 1)) errs.push('cel.shadeSize (maggiore di 0, al massimo 1)');
    if (c.light != null && (!Array.isArray(c.light) || c.light.length !== 2 || c.light.some(v => typeof v !== 'number') || !Math.hypot(...c.light))) errs.push('cel.light ([dx, dy], non nulla)');
    if (c.shadow != null && !/^#[0-9A-Fa-f]{6}$/.test(c.shadow)) errs.push('cel.shadow (#RRGGBB)');
    if (c.tones != null && ![1, 2].includes(c.tones)) errs.push('cel.tones (1 o 2)');
    if (c.outline != null && !['constant', 'shadowThick'].includes(c.outline)) errs.push('cel.outline (constant o shadowThick)');
    return errs;
  },
  // Where the shadow's copy of a shape goes: the shape's box { x0, y0, x1, y1 }, the light [dx, dy] and the size (share of
  // the larger side) give the shift { dx, dy } towards the light and the box that holds the shape and the shifted copy.
  crescent(box, light, size) {
    const n = Math.hypot(light[0], light[1]) || 1, d = size * Math.max(box.x1 - box.x0, box.y1 - box.y0), dx = light[0] / n * d, dy = light[1] / n * d;
    return { dx, dy, box: { x0: box.x0 + Math.min(0, dx), y0: box.y0 + Math.min(0, dy), x1: box.x1 + Math.max(0, dx), y1: box.y1 + Math.max(0, dy) } };
  },
  // a reusable canvas per power-of-two size, so textures stay small and nothing is allocated per shape
  canvas(w, h) {
    const b = n => Math.max(32, 2 ** Math.ceil(Math.log2(n))), bw = b(w), bh = b(h), key = bw + 'x' + bh;
    if (!CEL.POOL.has(key)) { const g = createGraphics(bw, bh); g.pixelDensity(1); CEL.POOL.set(key, g); }
    return CEL.POOL.get(key);
  },
  rgba(col, a = 255) { const c = color(col); return `rgba(${red(c)},${green(c)},${blue(c)},${a / 255})`; },
  warn(what) { if (!CEL.WARNED.has(what)) { CEL.WARNED.add(what); console.warn(`cel: "${what}" non esiste in questa tecnica (ignorato)`); } },
};
TECHNIQUES.cel = {
  paintAt(pts, o) {
    const C = STYLE.cel;
    for (const k of ['hatch', 'bleed', 'tex', 'border', 'br']) if (o[k] != null && (k !== 'hatch' || o.hatch)) CEL.warn(k);
    const col = o.wash || o.fill, alpha = o.wash ? (o.washOp ?? 255) : (o.fillOp ?? 170);
    const outlined = o.ink !== null, shade = o.shade === true || (o.shade !== false && outlined), rim = o.rim && o.rim.spessore > 0 ? o.rim : null;
    if (!col && !outlined) return;
    if (!outlined && !shade && !rim) {                  // a flat polygon straight into the frame
      flushBrush();
      const c = color(col); noStroke(); fill(red(c), green(c), blue(c), alpha); beginShape(); for (const [x, y] of pts) vertex(x, y); endShape(CLOSE);
      return;
    }
    const sw = (o.sw ?? 1) * CEL.UNIT * C.line * (o.inner ? C.lineInner : 1), wob = outlined ? C.wobble : 0;
    const P = wob ? pts.map(([x, y]) => [x + jit(wob), y + jit(wob)]) : pts;
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]), box = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
    const light = (window.LUCE_NOW && window.LUCE_NOW.light) || C.light;
    const cr = CEL.crescent(box, light, shade || rim ? C.shadeSize : 0), rimW = rim ? rim.spessore : 0;
    const m = Math.ceil(sw + rimW + 3), x0 = cr.box.x0 - m, y0 = cr.box.y0 - m, w = cr.box.x1 - cr.box.x0 + 2 * m, h = cr.box.y1 - cr.box.y0 + 2 * m;
    const zoom = clamp((CAM ? CAM.zoom : 1) * DRAFT.scale, .5, 3), pw = Math.ceil(w * zoom), ph = Math.ceil(h * zoom);
    const g = CEL.canvas(pw, ph), c = g.drawingContext;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, g.width, g.height); c.setTransform(zoom, 0, 0, zoom, -x0 * zoom, -y0 * zoom);
    const path = (dx = 0, dy = 0) => { c.moveTo(P[0][0] + dx, P[0][1] + dy); for (let i = 1; i < P.length; i++) c.lineTo(P[i][0] + dx, P[i][1] + dy); c.closePath(); };
    // the shape minus a copy of itself moved by (dx, dy), clipped to the shape: a crescent on the side the copy leaves
    const crescent = (dx, dy, style) => {
      c.save(); c.beginPath(); path(); c.clip();
      c.beginPath(); c.rect(x0 - 5, y0 - 5, w + 10, h + 10); path(dx, dy); c.fillStyle = style; c.fill('evenodd'); c.restore();
    };
    if (col) { c.beginPath(); path(); c.fillStyle = CEL.rgba(col, alpha); c.fill(); }
    if (shade && col) crescent(cr.dx, cr.dy, CEL.rgba(o.shadeCol || mixCol(col, C.shadow, C.shadeK), alpha));
    if (rim) { const n = Math.hypot(light[0], light[1]) || 1; crescent(-light[0] / n * rimW, -light[1] / n * rimW, CEL.rgba(rim.colore)); }
    if (outlined) { c.beginPath(); path(); c.lineWidth = sw; c.lineJoin = 'round'; c.strokeStyle = CEL.rgba(o.ink || PAL.ink); c.stroke(); }
    flushBrush();
    push(); noStroke(); image(g, x0, y0, w, h, 0, 0, pw, ph); pop();
  },
  inkLine(P, sw, col, br, curv) {
    flushBrush(); noFill(); const c = color(col); stroke(red(c), green(c), blue(c)); strokeWeight(Math.max(1, sw * CEL.UNIT * STYLE.cel.line));
    beginShape(); for (const [x, y] of P) vertex(x, y); endShape(); noStroke();
  },
  // flat paper (the texture of the watercolour paper only if the style asks for stains); the grain is the same speckle
  // and vignette as the other techniques, from the style's own numbers
  makePaper(style) {
    if (style.paper.stains > 0) return TECHNIQUES.watercolor.makePaper(style);
    const g = createGraphics(W, H); g.pixelDensity(1); g.drawingContext.fillStyle = style.palette.paper; g.drawingContext.fillRect(0, 0, W, H); return g;
  },
  makeGrain(style) { return TECHNIQUES.watercolor.makeGrain(style); },
};
