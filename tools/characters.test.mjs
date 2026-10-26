// characters.test.mjs: checks on the character library (src/characters/), run with `npm test`. The library's pure files
// are loaded exactly as the page loads them (tools/pagecode.mjs), so these tests read the same bytes the film draws.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPageScripts, CHAR_SCRIPTS } from './pagecode.mjs';

const lib = () => loadPageScripts(CHAR_SCRIPTS);

// ---------- registry and validation ----------
const withTestBody = () => {
  const ctx = lib();
  ctx.run(`BODIES.test = { roles: ['line'], parts: ['body'], poseParams: ['a'], exprParams: ['b'], views: ['front'], layout() { return { parts: [] }; } };`);
  return ctx;
};
const minimal = () => ({
  id: 'prova', version: 1, body: 'test', proportions: { h: 1 }, parts: { body: {} }, roles: { line: '#112233' },
  features: [{ id: 'pancia', part: 'body', views: ['front'] }], expressions: { felice: { b: 1 } }, poses: { fermo: { a: 0 } },
});
const errorsOf = (spec, ctx = withTestBody()) => ctx.call('validateCharacter', spec);

test('valid spec has no errors', () => { assert.deepEqual(errorsOf(minimal()), []); });
test('unknown body', () => {
  const e = errorsOf({ ...minimal(), body: 'drago' }).join(' ');
  assert.match(e, /drago/); assert.match(e, /test/);
});
test('missing role', () => { assert.match(errorsOf({ ...minimal(), roles: {} }).join(' '), /line/); });
test('feature on unknown part', () => {
  assert.match(errorsOf({ ...minimal(), features: [{ id: 'ali', part: 'wings', views: ['front'] }] }).join(' '), /wings/);
});
test('feature in unknown view', () => {
  assert.match(errorsOf({ ...minimal(), features: [{ id: 'pancia', part: 'body', views: ['top'] }] }).join(' '), /top/);
});
test('unknown pose param', () => { assert.match(errorsOf({ ...minimal(), poses: { fermo: { zz: 1 } } }).join(' '), /zz/); });
test('unknown expression param', () => { assert.match(errorsOf({ ...minimal(), expressions: { felice: { qq: 1 } } }).join(' '), /qq/); });
test('function in spec is refused', () => {
  const spec = minimal(); spec.parts.body.f = () => 1;
  assert.match(errorsOf(spec).join(' '), /solo dati/);
});
test('bad hex', () => { assert.match(errorsOf({ ...minimal(), roles: { line: '#12345' } }).join(' '), /line/); });
test('missing field', () => { const s = minimal(); delete s.poses; assert.match(errorsOf(s).join(' '), /poses/); });

// ---------- geometry and faces ----------
const finite = pts => pts.every(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
const box = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), y1: Math.max(...ys) }; };
const near = (a, b, rel) => Math.abs(a - b) <= rel * Math.abs(b);

test('ellipse area', () => {
  const c = lib(); assert.ok(near(c.call('CG.area', c.call('CG.ellipse', 0, 0, 3, 2, 64)), Math.PI * 6, .01));
});
test('drop keeps its box', () => {
  const c = lib(), b = box(c.call('CG.drop', 0, 10, 4.5, 6));
  assert.ok(near(b.w, 4.5, .01)); assert.ok(near(b.h, 6, .01)); assert.ok(near(b.y1, 10, .001));
});
test('drop area scales with w*h', () => {
  const c = lib(), a = (w, h) => c.call('CG.area', c.call('CG.drop', 0, 0, w, h));
  assert.ok(near(a(4.5 * 1.4, 6 / 1.4), a(4.5, 6), .005)); assert.ok(near(a(4.5 * .8, 6 / .8), a(4.5, 6), .005));
});
test('mirror twice is identity', () => {
  const c = lib(), p = c.call('CG.ellipse', 1, 2, 3, 1, 12);
  assert.deepEqual(c.call('CG.mirror', c.call('CG.mirror', p)), p);
});
test('no NaN at extremes', () => {
  const c = lib();
  for (const s of [.01, 1000]) {
    assert.ok(finite(c.call('CG.ellipse', 0, 0, s, s)));
    assert.ok(finite(c.call('CG.drop', 0, 0, s, s)));
    assert.ok(finite(c.call('CG.bean', 0, 0, s, s, .3)));
    const ch = c.call('CG.chain', [0, 0], 0, [s, s, s], [.2, .2, .2]);
    assert.ok(finite(ch)); assert.ok(finite(c.call('CG.tube', ch, s / 3, s / 5)));
  }
});
test('every eye and mouth kind', () => {
  const c = lib();
  for (const k of c.get('FACES.EYES')) { const r = c.call('FACES.eye', k, 0, 0, 1); assert.ok(r.parts.length > 0, k); assert.ok(r.parts.every(p => finite(p.pts)), k); }
  for (const k of c.get('FACES.MOUTHS')) { const r = c.call('FACES.mouth', k, 0, 0, 1); assert.ok(r.parts.length > 0, k); assert.ok(r.parts.every(p => finite(p.pts)), k); }
  assert.throws(() => c.call('FACES.eye', 'stellina', 0, 0, 1), /stellina.*open/);
  assert.throws(() => c.call('FACES.mouth', 'baffo', 0, 0, 1), /baffo.*smile/);
});
test('eye roles can be renamed', () => {
  const c = lib(), r = c.call('FACES.eye', 'oval', 0, 0, 1, { roles: { white: 'belly', ink: 'line' } });
  assert.ok(r.parts.some(p => p.role === 'belly')); assert.ok(!r.parts.some(p => p.role === 'eyeWhite'));
});
test('squint closes an eye', () => {
  const c = lib(), h = sq => box(c.call('FACES.eye', 'open', 0, 0, 1, { squint: sq }).parts[0].pts).h;
  assert.ok(h(.5) < h(0) * .6);
});

// ---------- shared checks for every character ----------
// The layout of a character, with the pose and expression taken straight from its spec (resolveState comes later).
const layoutOf = (c, id, { view = 'q', pose, expression, t = 0, flip = false } = {}) => {
  const spec = c.get(`CHARACTERS[${JSON.stringify(id)}]`);
  const p = pose ?? Object.keys(spec.poses)[0], e = expression ?? Object.keys(spec.expressions)[0];
  c.run(`globalThis.__state = { view: ${JSON.stringify(view)}, flip: ${flip}, t: ${t},
    pose: CHARACTERS[${JSON.stringify(id)}].poses[${JSON.stringify(p)}], expression: CHARACTERS[${JSON.stringify(id)}].expressions[${JSON.stringify(e)}] };`);
  return c.call(`(s => BODIES[CHARACTERS[${JSON.stringify(id)}].body].layout(CHARACTERS[${JSON.stringify(id)}], s))`, c.get('__state'));
};
const everyState = (c, id, f) => {
  const spec = c.get(`CHARACTERS[${JSON.stringify(id)}]`), views = c.get(`BODIES[${JSON.stringify(spec.body)}].views`);
  for (const view of views) for (const pose of Object.keys(spec.poses)) for (const expression of Object.keys(spec.expressions))
    for (const t of [0, .37]) f({ view, pose, expression, t }, layoutOf(c, id, { view, pose, expression, t }));
};
const featureCounts = L => { const n = {}; for (const p of L.parts) if (p.feature) n[p.feature] = (n[p.feature] || 0) + 1; return n; };
const checkFeatures = (c, id) => {
  const spec = c.get(`CHARACTERS[${JSON.stringify(id)}]`);
  everyState(c, id, (s, L) => {
    const n = featureCounts(L), where = JSON.stringify(s);
    for (const f of spec.features) {
      const want = f.views.includes(s.view);
      assert.equal(!!n[f.id], want, `${id} ${f.id} ${want ? 'manca' : 'non dovrebbe esserci'} in ${where}`);
      const cnt = typeof f.count === 'number' ? f.count : f.count && f.count[s.view];
      if (want && cnt) assert.equal(n[f.id], cnt, `${id} ${f.id}: ${n[f.id]} invece di ${cnt} in ${where}`);
    }
    for (const k of Object.keys(n)) assert.ok(spec.features.some(f => f.id === k), `${id}: tratto non dichiarato ${k}`);
  });
};
const checkRoles = (c, id) => {
  const roles = Object.keys(c.get(`CHARACTERS[${JSON.stringify(id)}].roles`));
  everyState(c, id, (s, L) => { for (const p of L.parts) assert.ok(roles.includes(p.role), `${id} ${p.id}: ruolo ${p.role} in ${JSON.stringify(s)}`); });
};
const checkFinite = (c, id) => everyState(c, id, (s, L) => { for (const p of L.parts) assert.ok(finite(p.pts) && p.pts.length > 1, `${id} ${p.id} in ${JSON.stringify(s)}`); });
const partBox = (L, pred) => box(L.parts.filter(pred).flatMap(p => p.pts));
const checkFlip = (c, id) => {
  for (const view of ['front', 'q', 'side', 'back']) {
    const a = layoutOf(c, id, { view, t: .3 }), b = layoutOf(c, id, { view, t: .3, flip: true });
    assert.equal(a.parts.length, b.parts.length);
    a.parts.forEach((p, i) => p.pts.forEach(([x, y], j) => { assert.ok(Math.abs(b.parts[i].pts[j][0] + x) < 1e-9 && Math.abs(b.parts[i].pts[j][1] - y) < 1e-9, `${id} ${view} ${p.id}`); }));
  }
};

// ---------- the cat ----------
test('gatto spec is valid', () => { assert.deepEqual(lib().call('validateCharacter', lib().get('CHARACTERS.gatto')), []); });
test('gatto features per view', () => checkFeatures(lib(), 'gatto'));
test('gatto uses only its roles', () => checkRoles(lib(), 'gatto'));
test('gatto has no NaN', () => checkFinite(lib(), 'gatto'));
test('gatto head is about a third of the length', () => {
  const L = layoutOf(lib(), 'gatto', { view: 'side', pose: 'inPiedi' });
  const head = partBox(L, p => p.id === 'head').w, len = partBox(L, p => !/tail|whisker|shadow/.test(p.id)).w;
  assert.ok(head / len >= .30 && head / len <= .37, `testa/lunghezza = ${(head / len).toFixed(3)}`);
});
test('gatto layout is deterministic', () => {
  const c = lib(); assert.deepEqual(layoutOf(c, 'gatto', { pose: 'corsa', t: .41 }), layoutOf(c, 'gatto', { pose: 'corsa', t: .41 }));
});
test('gatto flip mirrors exactly', () => checkFlip(lib(), 'gatto'));
test('gatto tail moves at rest', () => {
  const c = lib(), pts = t => layoutOf(c, 'gatto', { view: 'side', pose: 'inPiedi', t }).parts.find(q => q.id === 'tailTip').pts;
  const d = Math.max(...pts(0).map((p, i) => Math.hypot(p[0] - pts(.5)[i][0], p[1] - pts(.5)[i][1])));
  assert.ok(d >= .1, `la punta della coda si sposta di ${d.toFixed(3)} u`);
});
test('gatto run cycle moves the legs', () => {
  const c = lib(), legs = t => JSON.stringify(layoutOf(c, 'gatto', { view: 'side', pose: 'corsa', t }).parts.filter(p => p.id.startsWith('leg')).map(p => p.pts));
  assert.notEqual(legs(0), legs(.25));
});

// ---------- the monster ----------
// A blob layout from explicit pose/expression params (not a named pose), for the shape checks.
const blobOf = (c, pose = {}, expression = {}, more = {}) =>
  c.call('(s => BODIES.blob.layout(CHARACTERS.mostro, s))', { view: 'front', flip: false, t: 0, pose, expression, ...more });
const bodyArea = L => { const c = lib(); return c.call('CG.area', L.parts.find(p => p.id === 'body').pts); };

test('mostro spec is valid', () => { assert.deepEqual(lib().call('validateCharacter', lib().get('CHARACTERS.mostro')), []); });
test('mostro features per view and counts', () => checkFeatures(lib(), 'mostro'));
test('mostro uses only its roles', () => checkRoles(lib(), 'mostro'));
test('mostro has no NaN', () => checkFinite(lib(), 'mostro'));
test('mostro layout is deterministic', () => {
  const c = lib(); assert.deepEqual(layoutOf(c, 'mostro', { pose: 'rotolamento', t: .41 }), layoutOf(c, 'mostro', { pose: 'rotolamento', t: .41 }));
});
test('mostro flip mirrors exactly', () => checkFlip(lib(), 'mostro'));
test('blob volume is constant', () => {
  const c = lib(), a0 = bodyArea(blobOf(c));
  for (const s of [.6, .8, 1, 1.4, 1.6]) assert.ok(near(bodyArea(blobOf(c, { squash: s })), a0, .01), `squash ${s}`);
  assert.ok(near(bodyArea(blobOf(c, {}, { shiver: 1 }, { t: .3 })), a0, .01), 'shiver');
  assert.ok(near(bodyArea(blobOf(c, { squash: 1.2, lean: .4 })), a0, .01), 'lean');
});
test('squash limits match the note', () => {
  // the squash alone: slancio also leans, which widens its box but not its area (checked above)
  const c = lib(), poses = c.get('CHARACTERS.mostro.poses');
  const b = name => partBox(blobOf(c, { ...poses[name], lean: 0 }), p => p.id === 'body'), f = b('fermo');
  const s = b('schiacciato'), l = b('slancio');
  assert.ok(near(s.w / f.w, 1.4, .01) && near(s.h / f.h, 1 / 1.4, .01), `schiacciato ${s.w / f.w} × ${s.h / f.h}`);
  assert.ok(near(l.w / f.w, .8, .01) && near(l.h / f.h, 1.25, .01), `slancio ${l.w / f.w} × ${l.h / f.h}`);
});
test('squash is clamped', () => {
  const c = lib();
  assert.deepEqual(blobOf(c, { squash: 5 }), blobOf(c, { squash: 1.6 }));
  assert.deepEqual(blobOf(c, { squash: .05 }), blobOf(c, { squash: .6 }));
});
test('antennae lag after a jump', () => {
  const c = lib(), tips = more => blobOf(c, { hop: 1.5 }, {}, more).parts.filter(p => p.id.startsWith('antennaTip')).flatMap(p => p.pts);
  const rest = tips({ t: 2 }), d = more => Math.max(...tips(more).map((p, i) => Math.hypot(p[0] - rest[i][0], p[1] - rest[i][1])));
  assert.ok(d({ t: 2, since: .06, kick: 1 }) > .05, 'subito dopo il salto le antenne restano indietro');
  assert.ok(d({ t: 2, since: 1, kick: 1 }) < .05, 'dopo un secondo sono a posto');
});
test('clipConvex keeps a shape inside a convex one', () => {
  const c = lib(), sq = [[0, 0], [2, 0], [2, 2], [0, 2]], r = c.call('CG.clipConvex', c.call('CG.ellipse', 2, 1, 1, 1, 32), sq);
  assert.ok(r.every(([x, y]) => x <= 2 + 1e-9 && x >= 0 && y >= -1e-9 && y <= 2 + 1e-9));
  assert.ok(near(c.call('CG.area', r), Math.PI / 2, .02));
});
