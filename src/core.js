// core.js: constants, helpers, paper, paint wrapper, compositing and render hooks.
// Length and rhythm come from PROJECT in config.js; the look comes from STYLE (src/styles/).
const STYLE_NAME = new URLSearchParams(location.search).get('style') || PROJECT.style || 'classic';
const STYLE = STYLES[STYLE_NAME];
if (!STYLE) {
  window.loadError = `Stile "${STYLE_NAME}" inesistente. Disponibili: ${Object.keys(STYLES).join(', ')}`;
  throw new Error(window.loadError);
}
// A style copied from classic.js with a field left out fails here, by name, instead of somewhere deep in setup().
const STYLE_MISSING = ['technique', 'palette', 'paper', 'grain', 'brushes', 'brushScale', 'boil', 'paint'].filter(k => STYLE[k] == null)
  .concat(STYLE.paint ? ['fillOp', 'bleed', 'tex', 'washOp', 'sw', 'fillAs'].filter(k => STYLE.paint[k] == null).map(k => 'paint.' + k) : [])
  .concat(typeof CEL === 'undefined' ? [] : CEL.problems(STYLE));     // a cel style's own block (src/techniques/cel.js)
if (STYLE_MISSING.length) {
  window.loadError = `Stile "${STYLE_NAME}" incompleto: mancano ${STYLE_MISSING.join(', ')} (confronta con src/styles/classic.js e, per la tecnica cel, src/techniques/cel.js)`;
  throw new Error(window.loadError);
}
// Draft preview: studio.html?draft=flat,half or render.mjs --draft (plain ?draft means DRAFT_DEFAULT).
//   flat: watercolour fills are painted as flat colour (the big saving); half: the frame is painted at half
//   resolution and scaled up to full size. Scenes keep drawing in full-size (W × H) coordinates either way.
const DRAFT_DEFAULT = 'flat';
const DRAFT_ARG = new URLSearchParams(location.search).get('draft');
const DRAFT_OPTS = DRAFT_ARG === '' ? DRAFT_DEFAULT : DRAFT_ARG || '';
const DRAFT = { on: DRAFT_ARG !== null, flatFills: /\bflat\b/.test(DRAFT_OPTS), scale: /\bhalf\b/.test(DRAFT_OPTS) ? .5 : 1 };
// Formats: the frame size and the social apps' safe zones, in frame pixels. safe = margins the app's interface covers
// (keep faces and actions out of them) and subs = the band [y0, y1] where subtitles will go (keep it clear of anything
// important). The vertical numbers are Instagram/TikTok's; feed's leave room for the profile grid's 3:4 crop.
const FORMATS = {
  landscape: { w: 1920, h: 1080, safe: { top: 0, bottom: 0, left: 0, right: 0, subs: null } },
  vertical: { w: 1080, h: 1920, safe: { top: 220, bottom: 420, left: 0, right: 140, subs: [1150, 1500] } },
  feed: { w: 1080, h: 1350, safe: { top: 60, bottom: 60, left: 100, right: 100, subs: [940, 1170] } },
};
const FORMAT_NAME = new URLSearchParams(location.search).get('format') || PROJECT.format || 'landscape';
if (!FORMATS[FORMAT_NAME]) {
  window.loadError = `Formato "${FORMAT_NAME}" inesistente. Disponibili: ${Object.keys(FORMATS).join(', ')}`;
  throw new Error(window.loadError);
}
const W = FORMATS[FORMAT_NAME].w, H = FORMATS[FORMAT_NAME].h, SAFE = FORMATS[FORMAT_NAME].safe;
const BPM = PROJECT.bpm, BEAT = 60 / BPM, OFF = PROJECT.offset || 0, BOIL = STYLE.boil, DUR = PROJECT.duration;
const TAU = Math.PI * 2;
const PAL = STYLE.palette;
// PAL is the style's own palette object and luce() writes a light onto it, so the base is kept apart: every frame starts
// from it (draw), and luce() always mixes from it. window.LUCE_NOW is the light in force for the frame (or null).
const PAL_BASE = { ...STYLE.palette };
window.LUCE_NOW = null;
let LUCE_WARNED = false;
// luce(nome) or luce(da, a, k): the light of the rest of this frame (see src/lighting.js, ANIMATION_GUIDE.md). Call it at
// the start of a shot, before painting; it changes PAL and the colours characters take from their roles. A style without
// lights ignores it (one warning); an unknown name stops with the right ones.
function luce(a, b, k) {
  const set = LIGHT.apply(PAL, { ...STYLE, palette: PAL_BASE }, a, b, k);
  if (!set) { if (!LUCE_WARNED) { LUCE_WARNED = true; console.warn(`luce(): lo stile "${STYLE_NAME}" non ha set di luce (ignorato)`); } return null; }
  window.LUCE_NOW = set; return set;
}
const TECH = TECHNIQUES[STYLE.technique];
if (!TECH) {
  window.loadError = `Tecnica "${STYLE.technique}" (stile "${STYLE_NAME}") inesistente. Disponibili: ${Object.keys(TECHNIQUES).join(', ')}`;
  throw new Error(window.loadError);
}

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, x) => a + (b - a) * x;
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const backOut = x => { x = clamp(x); const s = 1.9; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const bpOf = t => (t - OFF) / BEAT;
// Seeded by the boil frame, so linework "boils" at BOIL fps like hand-drawn animation.
const jit = a => (random() * 2 - 1) * a;
// Each boil drawing holds for several frames, so whatever isn't moving must draw the same until the next one. But a moving
// thing uses a different amount of randomness each frame, which shifts the stream for everything drawn after it and makes
// that re-boil every frame (jitter). boilSeed(key) restarts the stream from the boil frame and a key (any string or
// number) that's the same every frame: call it before each separate element. clawd() does this for itself and its parts.
let BOILN = 0, CLAWD_N = 0;
const boilSeed = key => { let h = 2166136261; for (const c of key + '|' + BOILN) h = Math.imul(h ^ c.charCodeAt(0), 16777619); randomSeed(h >>> 0); };

// ---------- timing helpers (everything is a pure function of t; no state survives between frames) ----------
const seg = (t, a, b) => clamp((t - a) / (b - a));                 // 0..1 progress of t through [a, b]
const frac = x => x - Math.floor(x);
const beatN = t => Math.floor(bpOf(t));                            // integer beat index
const pulse = (t, k = 6) => Math.exp(-frac(bpOf(t)) * k);          // 1 exactly on each beat, decays after
const pulse2 = (t, k = 6) => Math.exp(-frac(bpOf(t) * 2) * k);     // same on eighth notes
const wob = (t, f = 1, ph = 0) => Math.sin((t * f + ph) * TAU);
const easeIn = x => Math.pow(clamp(x), 3);
const elasticOut = x => { x = clamp(x); return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * (TAU / 3)) + 1; };
// keyframes: kf(t, [[t0, v0], [t1, v1], ...], easeFn). Values may be numbers or arrays of numbers.
function kf(t, keys, e = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i], k = e((t - a) / (b - a));
      return Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], k)) : lerp(va, vb, k);
    }
  }
  return keys[keys.length - 1][1];
}
// hex color mix
function mixCol(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), c = i => Math.round(lerp((pa >> i) & 255, (pb >> i) & 255, clamp(k)));
  return '#' + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1);
}
// small deterministic camera shake, changes at 24 fps
const shakeXY = (t, amt) => { const f = Math.floor(t * 24); return [(hash(f * 1.7) - .5) * 2 * amt, (hash(f * 2.3 + 9) - .5) * 2 * amt]; };

// ---------- motion principles, as pure functions of t ----------
// Damped spring kicked at t0: 0 before, then a wobble that dies away. Use it for secondary motion and settles: a body
// after landing, a hat that jiggles, a stack that sways, a tail that drags. k = damping, w = wobble speed (rad/s).
const spring = (t, t0, k = 6, w = 18) => t < t0 ? 0 : Math.exp(-k * (t - t0)) * Math.sin(w * (t - t0));
const ring = (t, evs, k = 6, w = 18) => evs.reduce((s, e) => s + spring(t, e, k, w), 0);    // one kick per event time
// Hold each drawing for two frames (12 drawings a second), like hand-drawn animation "on twos". Wrap a shot's t in it.
const onTwos = t => Math.floor(t * 12 + 1e-6) / 12;
// Point on a thrown or jumping arc from p0 to p1, peaking h px above the straight line; k = 0..1 along the flight.
const arcPt = (p0, p1, h, k) => [lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k) - h * 4 * k * (1 - k)];
// A hop that takes off at t0 and lands at t1, h body units high: crouch (anticipation), stretch on takeoff,
// round at the top, squash on landing and spring back. Returns { dy, sq } to spread into clawd().
function jump(t, t0, t1, h = 3) {
  if (t < t0 - .12) return { dy: 0, sq: 0 };
  if (t < t0) return { dy: 0, sq: .18 * ease(seg(t, t0 - .12, t0)) };
  if (t < t1) { const k = (t - t0) / (t1 - t0); return { dy: -h * 4 * k * (1 - k), sq: -.16 * Math.abs(1 - 2 * k) }; }
  const a = t - t1; return { dy: 0, sq: .22 * Math.exp(-8 * a) * Math.cos(20 * a) };
}
// A surprise "take" peaking at t0: a quick squash, then a big stretch up that springs back. amt scales it.
function take(t, t0, amt = 1) {
  if (t < t0 - .1) return { sq: 0, dy: 0 };
  if (t < t0) return { sq: .12 * amt * ease(seg(t, t0 - .1, t0)), dy: 0 };
  const a = t - t0; return { sq: -.26 * amt * Math.exp(-6 * a) * Math.cos(16 * a), dy: -1.2 * amt * Math.exp(-7 * a) * Math.max(0, Math.cos(9 * a)) };
}
// Walk from x0 to x1 (px) between t0 and t1, for a character of unit u: eases in and out, faces the way it's
// going in 3/4 view, and faces front when it stops. Returns { x, walk, view, flip, dy } for clawd().
function stroll(t, t0, t1, x0, x1, u) {
  const x = lerp(x0, x1, ease(seg(t, t0, t1))), d = Math.abs(x - x0) / (4 * u), moving = t > t0 && t < t1;
  return { x, walk: d, view: moving ? 'q' : 'front', flip: x1 < x0, dy: moving ? -Math.abs(Math.sin(d * Math.PI)) * .5 : 0 };
}

// ---------- camera ----------
// camBegin(cx, cy, zoom, rot): world point (cx, cy) lands at screen centre. Letters queued while a camera is
// active are placed through it automatically (pass {screen:true} to opt out). One level only: always pair with camEnd().
// LAST_CAM stays set after camEnd(), until the next frame: renderSheet's crops that follow a world point use it.
let CAM = null, LAST_CAM = null;
function camBegin(cx = W / 2, cy = H / 2, zoom = 1, rot = 0) { push(); translate(W / 2, H / 2); rotate(rot); scale(zoom); translate(-cx, -cy); CAM = LAST_CAM = { cx, cy, zoom, rot }; }
function camEnd() { pop(); CAM = null; }
function toScreen(x, y, cam = CAM) {
  if (!cam) return [x, y];
  const c = Math.cos(cam.rot), s = Math.sin(cam.rot), dx = (x - cam.cx) * cam.zoom, dy = (y - cam.cy) * cam.zoom;
  return [W / 2 + dx * c - dy * s, H / 2 + dx * s + dy * c];
}

// ---------- full-frame effects (call outside a camera, in screen space) ----------
function flash(k, col = '#FFFDF6') { if (k > .01) paint(rectPts(-60, -60, W + 120, H + 120), { wash: col, washOp: 255 * clamp(k), ink: null }); }
// Light: glow(x, y, r, col, a) ADDS a soft halo of light for anything that shines (stars, lamps, fireflies, magic).
// p5.brush mixes every colour like pigment, so yellow painted over blue turns green and light can't be painted; this
// is the one non-paint mark in the kit. It lands on what's painted so far, under anything painted after it, follows
// the camera, and boils a little. Keep a = 1 on dark grounds; on light grounds it barely shows (as light would).
function glow(x, y, r, col = '#FFC766', a = 1) {
  if (a <= 0 || r < 1) return;
  flushBrush();
  const c = color(col), rr = r * (1 + jit(.03));
  push(); blendMode(ADD); tint(red(c), green(c), blue(c), 150 * clamp(a)); image(glowTex, x - rr, y - rr, 2 * rr, 2 * rr); noTint(); blendMode(BLEND); pop();
}
function makeGlowTex() {
  const g = createGraphics(256, 256); g.pixelDensity(1); const c = g.drawingContext, gr = c.createRadialGradient(128, 128, 0, 128, 128, 128);
  [[0, 1], [.18, .8], [.45, .32], [.75, .08], [1, 0]].forEach(([s, a]) => gr.addColorStop(s, `rgba(255,255,255,${a})`));
  c.fillStyle = gr; c.fillRect(0, 0, 256, 256);
  return g;
}
// Paint everything OUTSIDE a star-shaped hole (irises, mouth-shaped reveals, keyholes).
function irisShape(pts, col = PAL.ink, far = 4000) {
  const n = pts.length; let cx = 0, cy = 0; for (const p of pts) { cx += p[0]; cy += p[1]; } cx /= n; cy /= n;
  const out = p => { const dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy) || 1; return [cx + dx / d * far, cy + dy / d * far]; };
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], ex = (b[0] - a[0]) * .06, ey = (b[1] - a[1]) * .06;
    const a2 = [a[0] - ex, a[1] - ey], b2 = [b[0] + ex, b[1] + ey];
    paint([a2, b2, out(b2), out(a2)], { wash: col, washOp: 255, ink: null });
  }
}
function iris(cx, cy, r, col = PAL.ink) { if (r < 4) paint(rectPts(-60, -60, W + 120, H + 120), { wash: col, ink: null }); else irisShape(ellPts(cx, cy, r, r, 40), col); }

let T = 0, paperG = null, grainC = null, letG = null, glowTex = null, outC = null, outX = null;
let LETTERS = [];

// ---------- geometry ----------
function rectPts(x, y, w, h, j = 0) {
  return [[x + jit(j), y + jit(j)], [x + w / 2 + jit(j), y + jit(j) * .5], [x + w + jit(j), y + jit(j)],
          [x + w + jit(j) * .5, y + h / 2], [x + w + jit(j), y + h + jit(j)], [x + w / 2 + jit(j), y + h + jit(j) * .5],
          [x + jit(j), y + h + jit(j)], [x + jit(j) * .5, y + h / 2]];
}
function ellPts(cx, cy, rx, ry, n = 28, j = 0, rot = 0) {
  const p = []; for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; p.push([cx + Math.cos(a) * rx + jit(j), cy + Math.sin(a) * ry + jit(j)]); } return p;
}
function rrPts(x, y, w, h, r, j = 0) {
  const p = [], seg = 5, corner = (cx, cy, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + i / seg * Math.PI / 2; p.push([cx + Math.cos(a) * r + jit(j), cy + Math.sin(a) * r + jit(j)]); } };
  corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI);
  return p;
}
function starPts(cx, cy, r, inner = .38, n = 4, rot = -Math.PI / 2) {
  const p = []; for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, q = i % 2 ? r * inner : r; p.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } return p;
}
// Smooth curve through the points (Catmull-Rom), n samples per span.
function through(P, n = 6) {
  if (P.length < 3) return P.slice();
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map(d => .5 * (2 * p1[d] + (p2[d] - p0[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * u3)));
    }
  }
  out.push(P[P.length - 1]);
  return out;
}
// Tapered ribbon around a path (w0 wide at the start, w1 at the end), as one closed outline for paint().
// Tails, tentacles, noodly arms, painted glyphs: one shape with one outline, so nothing looks glued on.
function ribbon(P, w0, w1 = w0) {
  const C = through(P), n = C.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, w = lerp(w0, w1, i / Math.max(1, n - 1)) / 2;
    L.push([C[i][0] - dy / d * w, C[i][1] + dx / d * w]); R.push([C[i][0] + dy / d * w, C[i][1] - dx / d * w]);
  }
  return L.concat(R.reverse());
}

// ---------- paint wrapper ----------
// One call = one painted shape: optional flat wash, optional watercolor fill, optional hatch, optional ink outline.
// p5.brush 2.2.3 loses strokes drawn far from the origin under a zoomed camera (from zoom ~2, an outline or a line
// leaves only a dot at its first vertex), so every shape and line is drawn around its own centre.
function centred(pts, draw) {
  if (!pts.length) return;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  push(); translate(cx, cy); draw(pts.map(([x, y]) => [x - cx, y - cy])); pop();
}
// The marks themselves come from the style's technique (src/techniques/). STYLE.paint scales every call's options;
// a style whose multipliers are all 1 (classic) passes them through untouched.
const SP = STYLE.paint, FILL_AS = DRAFT.flatFills ? 'wash' : SP.fillAs;
const PAINT_AS_IS = SP.fillOp === 1 && SP.bleed === 1 && SP.tex === 1 && SP.washOp === 1 && SP.sw === 1 && FILL_AS !== 'wash';
function styled(o) {
  if (PAINT_AS_IS) return o;
  const s = { ...o };
  if (s.fill && FILL_AS === 'wash') {           // flat colour instead of a watercolour fill: much cheaper to render
    if (!s.wash) { s.wash = s.fill; s.washOp = (o.fillOp ?? 170) * SP.fillOp; }
    delete s.fill;
  } else if (s.fill) {
    s.fillOp = (o.fillOp ?? 170) * SP.fillOp; s.bleed = (o.bleed ?? .1) * SP.bleed; s.tex = (o.tex ?? .4) * SP.tex;
  }
  if (s.wash) s.washOp = Math.min(255, (s.washOp ?? 255) * SP.washOp);
  s.sw = (o.sw ?? 1) * SP.sw;
  return s;
}
function paint(pts, o = {}) { const so = styled(o); centred(pts, (P) => TECH.paintAt(P, so)); }
function inkLine(pts, sw = 1, col = PAL.ink, br = 'ink', curv = .5) {
  centred(pts, (P) => TECH.inkLine(P, sw * SP.sw, col, br, curv));
}

// ---------- lettering (drawn on the 2D compositor, under the paper grain) ----------
// Use sparingly: see "No text" in ANIMATION_GUIDE.md. Clawd's emotes are painted and never need these.
function letter(txt, x, y, size, color, o = {}) {
  if (CAM && !o.screen) { [x, y] = toScreen(x, y); size *= CAM.zoom; o = { ...o, rot: (o.rot || 0) + CAM.rot }; if (o.font) o.font = o.font.replace(/(\d+(\.\d+)?)px/, (m, v) => (v * CAM.zoom) + 'px'); }
  LETTERS.push({ txt, x, y, size, color, ...o });
}
// Comic sound effect: pops in at age 0, wobbles, fades by `life` seconds.
function sfx(txt, x, y, size, color, age, o = {}) {
  const life = o.life ?? 1.2; if (age < 0 || age > life) return;
  letter(txt, x, y, size, color, { pop: age * 5, rot: (o.rot ?? -.08) + Math.sin(age * 20) * .03 * (1 - age / life), alpha: 1 - seg(age, life - .25, life), ...o });
}
function drawLetters(c) {
  for (const L of LETTERS) {
    const k = L.pop != null ? backOut(L.pop) : 1; if (k <= .01) continue;
    c.save(); c.translate(L.x, L.y); c.rotate(L.rot || 0); c.scale(k, k); c.globalAlpha = L.alpha ?? 1;
    c.font = L.font || `${L.size}px "Permanent Marker", "Comic Sans MS", cursive`;
    c.textAlign = L.align || 'center'; c.textBaseline = 'middle';
    if (L.stroke) { c.lineJoin = 'round'; c.lineWidth = L.size * .12; c.strokeStyle = L.stroke; c.strokeText(L.txt, 0, 0); }
    if (L.ink !== false) { c.fillStyle = PAL.ink; c.fillText(L.txt, L.size * .045, L.size * .055); }
    c.fillStyle = L.color; c.fillText(L.txt, 0, 0);
    c.restore();
  }
}

// p5.brush defers washes and strokes into a mask layer; a (tiny, off-screen) watercolor fill forces it to composite
// now, so everything painted before this call really lands under whatever p5 draws next (letters, glow).
// Screen space: origin top-left, in full-size (W × H) units whatever the canvas size (half in a draft).
function screenSpace() { resetMatrix(); translate(-width / 2, -height / 2); if (DRAFT.scale !== 1) scale(DRAFT.scale); }
function flushBrush() {
  push(); screenSpace();
  brush.noStroke(); brush.noHatch(); brush.noWash(); brush.fill('#000000', 1); brush.fillBleed(0); brush.fillTexture(0, 0);
  brush.polygon([[-50, -50], [-40, -50], [-40, -40]]); brush.noFill(); pop();
}
// Paint the queued lettering into the scene itself, so later layers (wipes) cover it. drawWorld calls this after each
// frame; call it yourself before a wipe or iris if the shot has lettering, or the letters will sit on top of it.
function flushLetters() {
  if (!LETTERS.length) return;
  letG.clear(); drawLetters(letG.drawingContext); LETTERS = [];
  flushBrush();
  // Letters are already in screen space, so composite them with the base transform even inside camBegin().
  push(); screenSpace(); image(letG, 0, 0); pop();
}

// ---------- paper (drawn by the technique: TECH.makePaper / TECH.makeGrain) ----------
function lcg(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// ---------- custom brushes ----------
function defineBrushes() {
  for (const [name, def] of Object.entries(STYLE.brushes)) brush.add(name, def);
}

// ---------- frame ----------
async function setup() {
  createCanvas(W * DRAFT.scale, H * DRAFT.scale, WEBGL); pixelDensity(1); noLoop();
  brush.scaleBrushes(STYLE.brushScale); defineBrushes();
  paperG = TECH.makePaper(STYLE); grainC = TECH.makeGrain(STYLE); glowTex = makeGlowTex(); letG = createGraphics(W, H); letG.pixelDensity(1);
  outC = document.getElementById('out'); outC.width = W; outC.height = H; outC.style.aspectRatio = `${W} / ${H}`; outX = outC.getContext('2d');
  await document.fonts.load('100px "Permanent Marker"');
  const mismatch = formatMismatch();
  if (mismatch) {   // render.mjs prints loadError; studio.html opened by hand shows it in place of the time
    window.loadError = mismatch;
    if (!location.search.includes('render')) { console.error(mismatch); document.getElementById('tt').textContent = mismatch; }
    return;
  }
  window.ready = true;
  if (!location.search.includes('render')) devUI();
}
function draw() {
  if (!window.ready) return;
  LETTERS = []; CAM = LAST_CAM = null;
  LIGHT.reset(PAL, { palette: PAL_BASE }); window.LUCE_NOW = null;     // every frame starts in the style's own light
  push(); translate(-width / 2, -height / 2); if (DRAFT.scale !== 1) scale(DRAFT.scale);
  BOILN = Math.floor(T * BOIL); CLAWD_N = 0; boilSeed('frame'); noiseSeed(77);
  image(paperG, 0, 0);
  drawWorld(T);
  pop();
}
function composite(t) {
  const c = outX;
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  c.drawImage(drawingContext.canvas, 0, 0, W, H);
  drawLetters(c);
  c.globalCompositeOperation = 'multiply'; c.drawImage(grainC, 0, 0);
  c.globalCompositeOperation = 'source-over';
  if (SHOW_SAFE) drawSafeOverlay(c);
}
// ?safe (render.mjs --safe, sheets and stills only): the format's safe zones over the finished frame, to check framing.
// Red = margins the social app's interface covers, yellow = the subtitle band, red line = the safe centre.
const SHOW_SAFE = new URLSearchParams(location.search).has('safe');
function drawSafeOverlay(c) {
  const s = SAFE;
  c.save();
  c.fillStyle = 'rgba(255,0,0,.25)';
  c.fillRect(0, 0, W, s.top); c.fillRect(0, H - s.bottom, W, s.bottom);
  c.fillRect(0, s.top, s.left, H - s.top - s.bottom); c.fillRect(W - s.right, s.top, s.right, H - s.top - s.bottom);
  if (s.subs) { c.fillStyle = 'rgba(255,210,0,.3)'; c.fillRect(s.left, s.subs[0], W - s.left - s.right, s.subs[1] - s.subs[0]); }
  if (s.top || s.bottom || s.left || s.right) { c.strokeStyle = 'rgba(255,0,0,.8)'; c.lineWidth = 3; c.strokeRect(s.left, s.top, W - s.left - s.right, H - s.top - s.bottom); }
  c.restore();
}
window.renderAt = async (t, type = 'image/png', q = .92) => { T = t; await redraw(); composite(t); return outC.toDataURL(type, q); };
// Contact sheet of several times, for visual checks: returns { url, ms[] }. crop = [x, y, w, h] fills each cell with just
// that region of the frame, at full resolution (for checking faces, hands and contacts up close). at = [x, y, w, h]
// instead crops w × h around the WORLD point (x, y), wherever each frame's camera put it (a foot, a splash, a prop on
// a moving shot); x and y may be expressions evaluated in the page.
window.renderSheet = async (times, cols = 3, w = 640, crop = null, at = null) => {
  if (at) at = at.map((v) => typeof v === 'string' ? (0, eval)(v) : v);
  const [, , cw, ch] = at || crop || [0, 0, W, H], h = Math.round(w * ch / cw), rows = Math.ceil(times.length / cols), sc = document.createElement('canvas');
  sc.width = cols * w; sc.height = rows * h; const c = sc.getContext('2d'), ms = [];
  for (let i = 0; i < times.length; i++) {
    const t0 = performance.now(); T = times[i]; await redraw(); composite(times[i]); ms.push(Math.round(performance.now() - t0));
    const x = (i % cols) * w, y = Math.floor(i / cols) * h;
    const [cx, cy] = at ? toScreen(at[0], at[1], LAST_CAM).map((v, j) => v - (j ? ch : cw) / 2) : crop || [0, 0];
    c.drawImage(outC, cx, cy, cw, ch, x, y, w, h); c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(x, y, 84, 24); c.fillStyle = '#fff'; c.font = '15px sans-serif'; c.fillText(times[i].toFixed(2) + 's', x + 6, y + 17);
  }
  return { url: sc.toDataURL('image/jpeg', .9), ms };
};
window.gpuInfo = () => { const gl = drawingContext, e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); };

function devUI() {
  const s = document.getElementById('scrub'), lab = document.getElementById('tt'); s.max = window.LOOP ? window.LOOP.len : DUR;
  let busy = false, want = null;
  const go = async () => { if (busy) return; busy = true; while (want != null) { const t = want; want = null; const t0 = performance.now(); await window.renderAt(t); lab.textContent = `${t.toFixed(2)}s  ·  ${Math.round(performance.now() - t0)} ms/frame`; } busy = false; };
  s.addEventListener('input', () => { want = +s.value; go(); });
  want = +(new URLSearchParams(location.search).get('t') || 0); s.value = want; go();
}
