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
const box = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };
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
// Andrea, 2026-10-27: the head is much bigger than the note's "1/3" (about 0.45 of the length, almost as tall as the
// body); then, in a second round, the body about 20% shorter, which brings the head to about half the length
test('gatto head is about half the length', () => {
  const L = layoutOf(lib(), 'gatto', { view: 'side', pose: 'inPiedi' });
  const head = partBox(L, p => p.id === 'head').w, len = partBox(L, p => !/tail|whisker|shadow/.test(p.id)).w;
  assert.ok(head / len >= .48 && head / len <= .58, `testa/lunghezza = ${(head / len).toFixed(3)}`);
});
test('gatto profile body is a short round bean', () => {
  const b = partBox(layoutOf(lib(), 'gatto', { view: 'side', pose: 'inPiedi' }), p => p.id === 'body');
  assert.ok(b.w / b.h >= 1.4 && b.w / b.h <= 1.7, `corpo lungo/alto = ${(b.w / b.h).toFixed(2)}`);
});
test('the cat mouth is a thin :3', () => {
  const c = lib(), m = c.call('FACES.mouth', 'catSmile', 0, 0, 1).parts;
  assert.equal(m.length, 1); assert.ok(m[0].stroke);
  const ys = m[0].pts.map(q => q[1]), mid = m[0].pts.reduce((a, q) => Math.abs(q[0]) < Math.abs(a[0]) ? q : a);
  assert.ok(mid[1] < Math.max(...ys) - .1, 'una w: il centro sta più in alto delle due curve');
  for (const view of ['front', 'q', 'side']) {
    const L = layoutOf(c, 'gatto', { view, expression: 'curioso' }), mouth = L.parts.filter(q => q.id === 'mouth');
    assert.ok(mouth.every(q => q.stroke && q.line <= .5), `${view}: bocca a linea sottile`);
    const nose = L.parts.find(q => q.id === 'nose'), head = partBox(L, q => q.id === 'head');
    assert.ok(c.call('CG.area', nose.pts) < .012 * head.w * head.w, `${view}: naso piccolo`);
  }
});
test('gatto head is almost as tall as the body', () => {
  const L = layoutOf(lib(), 'gatto', { view: 'side', pose: 'inPiedi' });
  const k = partBox(L, p => p.id === 'head').h / partBox(L, p => p.id === 'body').h;
  assert.ok(k >= .85 && k <= 1.1, `altezza testa/corpo = ${k.toFixed(3)}`);
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

// ---------- acting: expressions over time, poses, resolving a scene's options ----------
const KEYS = [[1, 'felice'], [2, 'sorpreso']];
test('act holds the first key before it', () => {
  const c = lib(), r = c.call('act', .5, KEYS, c.get('CHARACTERS.gatto'));
  assert.equal(r.expression.eyes, 'happy'); assert.equal(r.expression.squint, 0);
});
test('act swaps discrete params at the midpoint', () => {
  const c = lib(), g = c.get('CHARACTERS.gatto'), at = t => c.call('act', t, KEYS, g).expression;
  assert.equal(at(2.05).eyes, 'happy'); assert.equal(at(2.25).eyes, 'wide');
  assert.ok(Math.abs(at(2.15).squint - 1) < 1e-9, 'a metà della transizione gli occhi sono strizzati');
  assert.equal(at(3).squint, 0);
});
test('act blends numbers', () => {
  const c = lib(), e = c.call('act', 2.15, KEYS, c.get('CHARACTERS.gatto')).expression;   // tail .2 → 1
  assert.ok(Math.abs(e.tail - .6) < .01, `coda ${e.tail}`);
});
test('take settles', () => {
  const c = lib(), g = c.get('CHARACTERS.gatto');
  assert.ok(Math.abs(c.call('act', 2.3, KEYS, g).take) > .05, 'subito dopo il cambio il corpo sobbalza');
  assert.ok(Math.abs(c.call('act', 3.3, KEYS, g).take) < .02, 'dopo un secondo è fermo');
});
test('blendPose', () => {
  const c = lib(), r = c.call('blendPose', { squash: 1, eye: 'oval' }, { squash: 1.4, eye: 'happy' }, .25);
  assert.ok(Math.abs(r.squash - 1.1) < 1e-9); assert.equal(r.eye, 'oval');
  assert.equal(c.call('blendPose', { eye: 'oval' }, { eye: 'happy' }, .5).eye, 'happy');
});
test('unknown names throw with the list', () => {
  const c = lib(), g = c.get('CHARACTERS.gatto');
  assert.throws(() => c.call('resolveState', g, { view: 'left' }), /left.*front/);
  assert.throws(() => c.call('resolveState', g, { pose: 'corri' }), /corri.*inPiedi/);
  assert.throws(() => c.call('resolveState', g, { expression: 'contento' }), /contento.*felice/);
});
test('act with an unknown expression throws', () => {
  const c = lib(); assert.throws(() => c.call('act', 0, [[0, 'contento']], c.get('CHARACTERS.mostro')), /contento.*felice/);
});
test('resolveState fills in a neutral character', () => {
  const c = lib(), s = c.call('resolveState', c.get('CHARACTERS.mostro'), {});
  assert.equal(s.view, 'q'); assert.equal(s.pose.squash, 1); assert.equal(s.expression.eye, 'oval'); assert.equal(s.t, 0);
});
test('resolveState takes an act() result and passes the lag through', () => {
  const c = lib(), m = c.get('CHARACTERS.mostro');
  c.run(`globalThis.__r = resolveState(CHARACTERS.mostro, { pose: 'salto', expression: act(2.3, [[1, 'felice'], [2, 'sorpreso']], CHARACTERS.mostro), since: .1, kick: 1 });`);
  const s = c.call('(() => __r)');
  assert.equal(s.expression.mouth, 'o'); assert.equal(s.since, .1); assert.equal(s.kick, 1);
  assert.notEqual(s.pose.squash, m.poses.salto.squash, 'il sobbalzo cambia la forma');
});

// ---------- review fixes ----------
test('missing proportion is refused', () => {
  const c = lib(), g = JSON.parse(JSON.stringify(c.get('CHARACTERS.gatto')));
  delete g.proportions.tail;
  assert.match(c.call('validateCharacter', g).join(' '), /tail/);
  const m = JSON.parse(JSON.stringify(c.get('CHARACTERS.mostro'))); m.proportions.height = 'alto';
  assert.match(c.call('validateCharacter', m).join(' '), /height/);
});
test('non-numeric pose value is refused', () => {
  const c = lib(), m = JSON.parse(JSON.stringify(c.get('CHARACTERS.mostro'))); m.poses.fermo = { squash: null };
  assert.match(c.call('validateCharacter', m).join(' '), /squash/);
});
test('a quadruped without collar and bell draws neither', () => {
  const c = lib(), g = JSON.parse(JSON.stringify(c.get('CHARACTERS.gatto')));
  for (const k of ['collar', 'bell']) { delete g.parts[k]; delete g.roles[k]; }
  g.features = g.features.filter(f => f.part !== 'collar' && f.part !== 'bell');
  assert.deepEqual(c.call('validateCharacter', g), []);
  const L = c.call('(s => BODIES.quadruped.layout(s, { view: "front", t: 0 }))', g);
  assert.ok(!L.parts.some(p => /collar|bell/.test(p.id)));
});
test('a declared part needs its colour role', () => {
  const c = lib(), g = JSON.parse(JSON.stringify(c.get('CHARACTERS.gatto'))); delete g.roles.bell;
  assert.match(c.call('validateCharacter', g).join(' '), /bell/);
});

// ---------- Andrea's review of the sheets (2026-10-27) ----------
test('a pose can carry its own face', () => {
  const c = lib(), m = c.get('CHARACTERS.mostro');
  const s = c.call('resolveState', m, { pose: 'broncio' });
  assert.equal(s.expression.mouth, 'frown'); assert.ok(s.expression.lid > .3, 'palpebra abbassata');
  const own = c.call('resolveState', m, { pose: 'broncio', expression: 'felice' });
  assert.equal(own.expression.mouth, 'open', "un'espressione esplicita vince su quella della posa");
});
test('a pose face with an unknown param is refused', () => {
  const c = lib(), m = JSON.parse(JSON.stringify(c.get('CHARACTERS.mostro'))); m.poses.broncio.expression = { naso: 1 };
  assert.match(c.call('validateCharacter', m).join(' '), /naso/);
});

const legs = L => L.parts.filter(p => /^leg\d/.test(p.id)), paws = L => L.parts.filter(p => /^paw\d/.test(p.id));
const centre = p => { const b = box(p.pts), xs = p.pts.map(q => q[0]), ys = p.pts.map(q => q[1]); return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]; };
test('gatto: two legs from the front and from the back, one paw per leg', () => {
  const c = lib();
  for (const view of ['front', 'back']) { const L = layoutOf(c, 'gatto', { view }); assert.equal(legs(L).length, 2, view); }
  for (const view of ['front', 'q', 'side', 'back']) { const L = layoutOf(c, 'gatto', { view }); assert.equal(paws(L).length, legs(L).length, view); }
});
test('the back-view tail rises in the middle third', () => {
  const c = lib();
  for (const id of ['gatto', 'draghetto']) for (const t of [0, .37]) {
    const spec = c.get(`CHARACTERS.${id}`), L = c.call(`(s => BODIES.quadruped.layout(CHARACTERS.${id}, s))`, { view: 'back', t, pose: {}, expression: {} });
    const body = partBox(L, q => q.id === 'body'), tailPts = L.parts.find(q => q.id === 'tail').pts, tail = box(tailPts);
    const half = Math.max(spec.parts.tail.base || 0, spec.parts.tail.width || .8) / 2, mid = (body.x0 + body.x1) / 2;
    assert.ok(tail.y1 >= body.y0 + body.h * .7, `${id}: la coda parte a ${((tail.y1 - body.y0) / body.h * 100).toFixed(0)}% dell'altezza del corpo`);
    for (const [x, y] of tailPts) if (y > tail.y0 + tail.h * .25)
      assert.ok(Math.abs(x - mid) <= body.w / 6 + half + 1e-9, `${id} t=${t}: la coda esce dal terzo centrale (x ${(x - mid).toFixed(2)})`);
    assert.ok(tail.y0 < body.y0, `${id}: la punta della coda non supera la schiena`);
  }
});
// the cat v1, front / q / side, every pose and expression: each part's point sum (1e-6), hashed (FNV-1a). Computed with
// the v1 code before the back-view tail changed (Fase 4b1, Task 4).
const CAT_V1_PRINT = 'acf52372';
test('the cat changes only its back-view tail', () => {
  const c = lib(), spec = c.get('CHARACTERS.gatto');
  let h = 2166136261;
  for (const view of ['front', 'q', 'side']) for (const p of Object.keys(spec.poses)) for (const e of Object.keys(spec.expressions)) {
    const L = c.call('(s => BODIES.quadruped.layout(CHARACTERS.gatto, s))', { view, t: .37, pose: spec.poses[p], expression: spec.expressions[e] });
    const str = L.parts.map(q => q.id + ':' + Math.round(q.pts.reduce((a, [x, y]) => a + x + 2 * y, 0) * 1e6)).join('|');
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  }
  assert.equal(h.toString(16), CAT_V1_PRINT);
});
test('gatto: dark eyes with a highlight', () => {
  const c = lib(), r = c.call('FACES.eye', 'open', 0, 0, 1, { dark: true });
  assert.ok(!r.parts.some(p => p.id === 'eyeWhite')); assert.ok(r.parts.some(p => p.id === 'highlight'));
  const L = layoutOf(c, 'gatto', { view: 'front', expression: 'curioso' });
  assert.ok(!L.parts.some(p => p.id.endsWith('eyeWhite')), 'il gatto ha occhi scuri senza bianco');
});
test('gatto poses read strongly', () => {
  const c = lib(), side = pose => layoutOf(c, 'gatto', { view: 'side', pose, expression: 'curioso' });
  const spread = L => { const ps = paws(L).map(centre).map(p => p[0]); return Math.max(...ps) - Math.min(...ps); };
  assert.ok(spread(side('corsa')) > 1.35 * spread(side('inPiedi')), 'corsa: zampe distese avanti e indietro');
  const agg = side('agguato'), head = partBox(agg, p => p.id === 'head'), body = agg.parts.find(p => p.id === 'body').pts;
  const rearTop = Math.min(...body.filter(p => p[0] < 0).map(p => p[1]));
  assert.ok(head.y1 - head.h / 2 > rearTop, 'agguato: testa bassa, sedere alto');
  assert.ok(partBox(agg, p => p.id === 'body').y1 > partBox(side('inPiedi'), p => p.id === 'body').y1 - .1, 'agguato: schiacciato a terra');
  const raised = Math.min(...paws(side('zampata')).map(centre).map(p => p[1]));
  assert.ok(raised < -1.4, `zampata: la zampa alzata è a ${raised.toFixed(2)}`);
});

// ---------- 4b1: the caterpillar ----------
test('bruco spec is valid', () => { assert.deepEqual(lib().call('validateCharacter', lib().get('CHARACTERS.bruco')), []); });
test('bruco features per view and counts', () => checkFeatures(lib(), 'bruco'));
test('bruco uses only its roles', () => checkRoles(lib(), 'bruco'));
test('bruco has no NaN', () => checkFinite(lib(), 'bruco'));
test('bruco flip mirrors exactly', () => checkFlip(lib(), 'bruco'));
test('bruco layout is deterministic', () => {
  const c = lib(); assert.deepEqual(layoutOf(c, 'bruco', { pose: 'onda', t: .41 }), layoutOf(c, 'bruco', { pose: 'onda', t: .41 }));
});
const segCentres = L => L.parts.filter(p => /^seg\d+$/.test(p.id)).sort((a, b) => +a.id.slice(3) - +b.id.slice(3)).map(centre);
test('bruco segments keep their spacing', () => {
  const c = lib(), spec = c.get('CHARACTERS.bruco'), d = spec.proportions.segR * 1.6;
  for (const pose of Object.keys(spec.poses)) for (const t of [0, .3, .7]) {
    const cs = segCentres(layoutOf(c, 'bruco', { view: 'side', pose, t }));
    assert.equal(cs.length, spec.proportions.segments);
    for (let i = 1; i < cs.length; i++) {
      const g = Math.hypot(cs[i][0] - cs[i - 1][0], cs[i][1] - cs[i - 1][1]);
      assert.ok(Math.abs(g - d) <= .01 * d, `${pose} t=${t}: distanza ${i - 1}-${i} = ${g.toFixed(3)} invece di ${d}`);
    }
    for (let i = 0; i < cs.length; i++) for (let j = i + 2; j < cs.length; j++)
      assert.ok(Math.hypot(cs[i][0] - cs[j][0], cs[i][1] - cs[j][1]) >= spec.proportions.segR, `${pose} t=${t}: ${i} e ${j} si sovrappongono`);
  }
});
test('bruco wave travels from tail to head', () => {
  const c = lib(), N = c.get('CHARACTERS.bruco.proportions.segments'), dt = c.get('BODIES.crawler.WAVE.period') / N;
  const ys = t => segCentres(layoutOf(c, 'bruco', { view: 'side', pose: 'onda', t })).map(p => p[1]);
  for (const t of [.2, .55, 1.1]) {
    const now = ys(t), before = ys(t - dt);
    for (let i = 0; i + 1 < N; i++) assert.ok(Math.abs(now[i] - before[i + 1]) <= .02, `t=${t}: segmento ${i} ${now[i].toFixed(3)} vs ${i + 1} prima ${before[i + 1].toFixed(3)}`);
  }
  assert.notDeepEqual(ys(0), ys(.4), "l'onda si muove");
});

// ---------- 4b1: optional quadruped parts ----------
const bareQuadruped = c => ({
  id: 'nudo', version: 1, body: 'quadruped', proportions: { ...c.get('CHARACTERS.gatto.proportions') }, parts: {},
  roles: { fur: '#D9956C', cream: '#F6EBD8', line: '#59463B', shadow: '#8C8074' },
  features: [], expressions: { neutro: {} }, poses: { fermo: {} },
});
test('a quadruped declares its own extras', () => {
  const c = lib(), spec = bareQuadruped(c);
  assert.deepEqual(c.call('validateCharacter', spec), []);
  for (const view of ['front', 'q', 'side', 'back']) {
    const L = c.call('(s => BODIES.quadruped.layout(s, { view: ' + JSON.stringify(view) + ', t: 0 }))', spec);
    const extra = L.parts.filter(q => /^ear|muzzle|whisker|collar|bell|chest/.test(q.id)).map(q => q.id);
    assert.deepEqual(extra, [], `${view}: parti non dichiarate ${extra}`);
  }
});
test('a declared ear needs earInner', () => {
  const c = lib(), spec = bareQuadruped(c); spec.parts.ears = {};
  assert.match(c.call('validateCharacter', spec).join(' '), /earInner/);
});
test('iris eye', () => {
  const c = lib(), r = c.call('FACES.eye', 'open', 0, 0, 1, { iris: true }).parts;
  assert.ok(r.some(q => q.role === 'iris')); assert.ok(r.some(q => q.id === 'pupil' && q.role === 'line'));
  assert.ok(!r.some(q => q.role === 'eyeWhite' && q.id === 'eyeWhite'));
  const sad = c.call('FACES.eye', 'sad', 0, 0, 1, { iris: true }).parts;
  assert.ok(sad.some(q => q.role === 'iris') && sad.some(q => q.id === 'brow'), 'un occhio triste con iride ha anche il sopracciglio');
});

// ---------- 4b1: the little dragon ----------
test('draghetto spec is valid', () => { assert.deepEqual(lib().call('validateCharacter', lib().get('CHARACTERS.draghetto')), []); });
test('draghetto features per view and counts', () => checkFeatures(lib(), 'draghetto'));
test('draghetto uses only its roles', () => checkRoles(lib(), 'draghetto'));
test('draghetto has no NaN', () => checkFinite(lib(), 'draghetto'));
test('draghetto flip mirrors exactly', () => checkFlip(lib(), 'draghetto'));
test('draghetto layout is deterministic', () => {
  const c = lib(); assert.deepEqual(layoutOf(c, 'draghetto', { pose: 'volo', t: .41 }), layoutOf(c, 'draghetto', { pose: 'volo', t: .41 }));
});
const dragonOf = (c, view, pose, t = 0) => c.call('(s => BODIES.quadruped.layout(CHARACTERS.draghetto, s))', { view, flip: false, t, pose, expression: {} });
const hull = pts => {                           // convex hull (monotone chain)
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of P.reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
};
const inside = (pt, poly) => { let r = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) r = !r; } return r; };
test('wings closed hug the body', () => {
  const c = lib();
  for (const view of ['side', 'q']) {
    const L = dragonOf(c, view, { wingOpen: 0 }), body = hull(L.parts.find(q => q.id === 'body').pts);
    const mem = L.parts.filter(q => q.id.startsWith('membrane'));
    const all = mem.reduce((a, q) => a + c.call('CG.area', q.pts), 0), inB = mem.reduce((a, q) => a + c.call('CG.area', c.call('CG.clipConvex', q.pts, body)), 0);
    assert.ok(all - inB <= .25 * all, `${view}: ${((all - inB) / all * 100).toFixed(0)}% delle membrane fuori dal corpo`);
  }
});
test('wings open span about 2.5 bodies', () => {
  const c = lib(), L = dragonOf(c, 'front', { wingOpen: 1 });
  const w = partBox(L, q => q.id.startsWith('membrane') || q.id.startsWith('wingBone')).w, b = partBox(L, q => q.id === 'body').w;
  assert.ok(w / b >= 2.5 * .85 && w / b <= 2.5 * 1.15, `apertura ${(w / b).toFixed(2)} corpi`);
});
test('wings never cross the head in profile', () => {
  const c = lib(), poses = c.get('CHARACTERS.draghetto.poses');
  for (const name of Object.keys(poses)) for (const t of [0, .13, .3]) {
    const L = layoutOf(c, 'draghetto', { view: 'side', pose: name, t }), headPoly = L.parts.find(q => q.id === 'head').pts;
    const near = L.parts.filter(q => q.id.startsWith('membraneN'));
    for (const m of near) assert.ok(!m.pts.some(pt => inside(pt, headPoly)), `${name} t=${t}: ${m.id} dentro la testa`);
  }
});
test('wings flap', () => {
  const c = lib(), tips = t => layoutOf(c, 'draghetto', { view: 'side', pose: 'volo', t }).parts.filter(q => q.id.startsWith('wingBone')).flatMap(q => q.pts);
  const a = tips(0), b = tips(.25), d = Math.max(...a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1])));
  assert.ok(d >= .5, `le ali si muovono di ${d.toFixed(2)} u`);
});
test('each wing has three membranes', () => {
  const c = lib(), poses = c.get('CHARACTERS.draghetto.poses');
  for (const view of ['front', 'q', 'side', 'back']) for (const name of Object.keys(poses)) {
    const L = layoutOf(c, 'draghetto', { view, pose: name });
    for (const w of ['N', 'F']) assert.equal(L.parts.filter(q => q.id.startsWith('membrane' + w)).length, 3, `${view} ${name} ala ${w}`);
  }
});

// ---------- 4b1: the biped (in heads) and the girl ----------
test('ragazza spec is valid', () => { assert.deepEqual(lib().call('validateCharacter', lib().get('CHARACTERS.ragazza')), []); });
test('ragazza features per view and counts', () => checkFeatures(lib(), 'ragazza'));
test('ragazza uses only its roles', () => checkRoles(lib(), 'ragazza'));
test('ragazza has no NaN', () => checkFinite(lib(), 'ragazza'));
test('ragazza flip mirrors exactly', () => checkFlip(lib(), 'ragazza'));
test('ragazza layout is deterministic', () => {
  const c = lib(); assert.deepEqual(layoutOf(c, 'ragazza', { pose: 'corsa', t: .41 }), layoutOf(c, 'ragazza', { pose: 'corsa', t: .41 }));
});
const headsTall = (c, id) => {
  const L = layoutOf(c, id, { view: 'front', pose: Object.keys(c.get(`CHARACTERS.${id}.poses`))[0] });
  return partBox(L, q => q.id !== 'shadow').h / partBox(L, q => q.id === 'head').h;
};
test('biped is heads tall', () => {
  const c = lib(), want = c.get('CHARACTERS.ragazza.proportions.heads'), got = headsTall(c, 'ragazza');
  assert.ok(near(got, want, .05), `${got.toFixed(2)} teste invece di ${want}`);
});
const limbs = J => ['L', 'R'].flatMap(s => [['shoulder' + s, 'elbow' + s, 'wrist' + s, 'arm'], ['hip' + s, 'knee' + s, 'ankle' + s, 'leg']]);
const bend = (a, b, c) => {                 // the angle a limb turns at its middle joint, and which way
  const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
  return { angle: Math.acos(CGclamp((u[0] * v[0] + u[1] * v[1]) / Math.hypot(...u) / Math.hypot(...v))), cross: u[0] * v[1] - u[1] * v[0] };
};
const CGclamp = x => Math.max(-1, Math.min(1, x));
const checkLimbs = (c, id) => {
  const spec = c.get(`CHARACTERS.${id}`), HU = c.get('BODIES.biped.HU');
  for (const view of ['front', 'q', 'side', 'back']) for (const pose of Object.keys(spec.poses)) for (const t of [0, .37]) {
    const J = layoutOf(c, id, { view, pose, t }).joints;
    for (const [a, b, d, kind] of limbs(J)) {
      const len = Math.hypot(J[b][0] - J[a][0], J[b][1] - J[a][1]) + Math.hypot(J[d][0] - J[b][0], J[d][1] - J[b][1]);
      assert.ok(near(len, spec.proportions[kind] * HU, .01), `${id} ${view} ${pose}: ${a}→${d} lungo ${len.toFixed(3)}`);
      const { angle, cross } = bend(J[a], J[b], J[d]);
      assert.ok(angle >= -1e-9 && angle <= 2.6 + 1e-6, `${id} ${view} ${pose}: ${b} piegato di ${angle.toFixed(2)}`);
      // in profile (facing right) elbows bend forward and knees backward, never the other way
      if (view === 'side' && angle > 1e-6) assert.ok(kind === 'arm' ? cross < 0 : cross > 0, `${id} ${pose}: ${b} piegato al contrario`);
    }
  }
};
test('biped limbs keep their length', () => checkLimbs(lib(), 'ragazza'));
const bareGirl = c => {
  const spec = JSON.parse(JSON.stringify(c.get('CHARACTERS.ragazza')));
  delete spec.parts.skirt; delete spec.parts.shoes; delete spec.parts.sleeves; delete spec.roles.skirt; delete spec.roles.shoes;
  spec.features = spec.features.filter(f => f.part !== 'skirt'); spec.id = 'nuda';
  return spec;
};
test('biped without extras', () => {
  const c = lib(), spec = bareGirl(c);
  assert.deepEqual(c.call('validateCharacter', spec), []);
  for (const view of ['front', 'q', 'side', 'back']) for (const pose of Object.keys(spec.poses)) {
    const L = c.call('((sp, s) => BODIES.biped.layout(sp, s))', spec, { view, t: 0, pose: spec.poses[pose], expression: {} });
    const extra = L.parts.filter(q => /skirt|shoe|cuff/.test(q.id)).map(q => q.id);
    assert.deepEqual(extra, [], `${view} ${pose}: parti non dichiarate ${extra}`);
  }
  const s2 = bareGirl(c); s2.parts.skirt = {};
  assert.match(c.call('validateCharacter', s2).join(' '), /skirt/);
});
test('brows tilt with k', () => {
  const c = lib(), inner = k => { const p = c.call('FACES.brows', 'line', 0, 0, 1, k).parts[0].pts; return p[p.length - 1][1] - p[0][1]; };
  assert.ok(inner(1) > 0 && inner(-1) < 0, 'arrabbiate: l\'estremo interno scende; tristi: sale');
});
test('blush grows the cheek and adds three strokes', () => {
  const c = lib(), a = c.call('FACES.cheek', 0, 0, 1, 0).parts, b = c.call('FACES.cheek', 0, 0, 1, 1).parts;
  assert.equal(a.length, 1); assert.equal(b.filter(q => q.stroke).length, 3);
  assert.ok(c.call('CG.area', b[0].pts) > c.call('CG.area', a[0].pts) * 1.3);
});

// ---------- 4b1: the hero ----------
test('supereroe spec is valid', () => { assert.deepEqual(lib().call('validateCharacter', lib().get('CHARACTERS.supereroe')), []); });
test('supereroe features per view and counts', () => checkFeatures(lib(), 'supereroe'));
test('supereroe uses only its roles', () => checkRoles(lib(), 'supereroe'));
test('supereroe has no NaN', () => checkFinite(lib(), 'supereroe'));
test('supereroe flip mirrors exactly', () => checkFlip(lib(), 'supereroe'));
test('supereroe layout is deterministic', () => {
  const c = lib(); assert.deepEqual(layoutOf(c, 'supereroe', { pose: 'corsa', t: .41 }), layoutOf(c, 'supereroe', { pose: 'corsa', t: .41 }));
});
test('supereroe is heads tall', () => {
  const c = lib(), want = c.get('CHARACTERS.supereroe.proportions.heads'), got = headsTall(c, 'supereroe');
  assert.ok(near(got, want, .05), `${got.toFixed(2)} teste invece di ${want}`);
});
test('supereroe limbs keep their length', () => checkLimbs(lib(), 'supereroe'));
test('cape trails in flight', () => {
  const c = lib();
  for (const t of [0, .2, .4]) {
    const L = layoutOf(c, 'supereroe', { view: 'side', pose: 'voloOrizzontale', t }), J = L.joints;
    const cape = partBox(L, q => q.id === 'cape'), sx = (J.shoulderL[0] + J.shoulderR[0]) / 2;
    assert.ok((cape.x0 + cape.x1) / 2 < sx - .5, `t=${t}: il mantello non sta dietro le spalle`);
  }
});

// ---------- 4b1 final review: fixes ----------
test('caterpillar keeps its spacing while curling', () => {
  const c = lib(), pr = c.get('CHARACTERS.bruco.proportions'), R = pr.segR, d = 1.6 * R, dh = (R * pr.headK + R) * .72;
  for (const curl of [.25, .5, .75, 1]) for (const extra of [{}, { raise: 1 }, { arch: .8 }, { raise: 1.35, lift: 1 }]) {
    const P = { ...c.get('BODIES.crawler.POSE0'), ...extra, curl };
    const S = c.call('((p) => BODIES.crawler.spine(CHARACTERS.bruco, p, 0))', P), dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const where = JSON.stringify({ curl, ...extra });
    assert.ok(near(dist(S[0], S[1]), dh, .01), `${where}: testa-segmento 1 a ${dist(S[0], S[1]).toFixed(2)}`);
    for (let i = 2; i < S.length; i++) assert.ok(near(dist(S[i - 1], S[i]), d, .01), `${where}: passo ${i} ${dist(S[i - 1], S[i]).toFixed(2)}`);
    for (let i = 1; i < S.length; i++) for (let j = i + 2; j < S.length; j++)
      assert.ok(dist(S[i], S[j]) >= R, `${where}: segmenti ${i} e ${j} a ${dist(S[i], S[j]).toFixed(2)}`);
  }
});
test('biped runs from the front without crossing its legs', () => {
  const c = lib();
  for (const id of ['ragazza', 'supereroe']) for (const view of ['front', 'back']) {
    const at = t => layoutOf(c, id, { view, pose: 'corsa', t }).joints, side = view === 'front' ? 1 : -1, lift = [];
    for (const t of [0, .1, .2, .25, .3, .4]) {
      const J = at(t);
      assert.ok(side * J.ankleL[0] > 0 && side * J.ankleR[0] < 0, `${id} ${view} t=${t}: le caviglie si incrociano`);
      lift.push(J.ankleL[1] - J.ankleR[1]);
    }
    assert.ok(Math.min(...lift) < -.1 && Math.max(...lift) > .1, `${id} ${view}: i piedi non si alternano`);
  }
});
test('an eye or mouth kind that does not exist is a validation error', () => {
  const c = lib(), spec = JSON.parse(JSON.stringify(c.get('CHARACTERS.gatto')));
  spec.expressions.strano = { eyes: 'iris' }; spec.poses.strana = { expression: { mouth: 'ghigno' } };
  const errs = c.call('validateCharacter', spec).join(' ');
  assert.match(errs, /iris/); assert.match(errs, /ghigno/);
});
test('biped feet stand on the ground', () => {
  const c = lib();
  for (const id of ['ragazza', 'supereroe']) {
    const spec = c.get(`CHARACTERS.${id}`);
    for (const view of ['front', 'q', 'side', 'back']) for (const pose of Object.keys(spec.poses)) {
      if (spec.poses[pose].lift || spec.poses[pose].flight) continue;
      for (const t of [0, .37]) {
        const y = partBox(layoutOf(c, id, { view, pose, t }), q => /^(leg|foot|shoe|boot)/.test(q.id)).y1;
        assert.ok(Math.abs(y) < 1e-6, `${id} ${view} ${pose} t=${t}: il piede è a ${y.toFixed(2)} dal suolo`);
      }
    }
  }
});
test('a biped without hair is bald', () => {
  const c = lib(), spec = JSON.parse(JSON.stringify(c.get('CHARACTERS.ragazza')));
  delete spec.parts.hair; spec.features = spec.features.filter(f => f.part !== 'fringe');
  const L = c.call('((sp, s) => BODIES.biped.layout(sp, s))', spec, { view: 'front', t: 0, pose: {}, expression: {} });
  assert.deepEqual(L.parts.filter(q => /hair|lock|^face$/.test(q.id)).map(q => q.id), []);
});

// ---------- 4b2: soft limbs ----------
// a polygon is simple when no two non-adjacent edges cross
const crosses = (a, b, c, d) => {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
};
const simple = poly => {
  const n = poly.length;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (crosses(poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n])) return false;
  }
  return true;
};
// the horizontal width of a polygon at height y
const widthAt = (poly, y) => {
  const xs = [];
  poly.forEach((a, i) => { const b = poly[(i + 1) % poly.length]; if ((a[1] - y) * (b[1] - y) < 0) xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])); });
  return xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
};
test('CG.limb makes a simple outline', () => {
  const c = lib();
  for (const bendA of [0, .8, 1.6, 2.6]) for (const s of [1, -1]) {
    const a = [0, 0], b = [0, 1], cc = [Math.sin(s * bendA) * 1, 1 + Math.cos(s * bendA) * 1];
    const poly = c.call('CG.limb', [a, b, cc], [.4, .37, .3, .32, .25]);
    assert.ok(finite(poly) && poly.length > 8, `angolo ${bendA}`);
    assert.ok(simple(poly), `contorno che si incrocia, angolo ${bendA * s}`);
    assert.ok(c.call('CG.area', poly) > .3, `area ${bendA}`);
  }
});
test('biped limbs are simple outlines', () => {
  const c = lib();
  for (const id of ['ragazza', 'supereroe']) {
    const spec = c.get(`CHARACTERS.${id}`);
    for (const view of ['front', 'q', 'side', 'back']) for (const pose of Object.keys(spec.poses)) for (const t of [0, .37])
      for (const p of layoutOf(c, id, { view, pose, t }).parts.filter(q => /^(arm|leg)[LR]$/.test(q.id)))
        assert.ok(simple(p.pts), `${id} ${view} ${pose} t=${t}: ${p.id} si incrocia`);
  }
});
test('biped limbs taper', () => {
  const c = lib();
  for (const id of ['ragazza', 'supereroe']) {
    const L = layoutOf(c, id, { view: 'front', pose: Object.keys(c.get(`CHARACTERS.${id}.poses`))[0] }), J = L.joints;
    const leg = L.parts.find(q => q.id === 'legL').pts, arm = L.parts.find(q => q.id === 'armL').pts;
    const thigh = widthAt(leg, CG_lerp(J.hipL[1], J.kneeL[1], .3)), ankle = widthAt(leg, CG_lerp(J.kneeL[1], J.ankleL[1], .92));
    assert.ok(ankle < thigh * .9, `${id}: caviglia ${ankle.toFixed(2)} non più stretta della coscia ${thigh.toFixed(2)}`);
    const upper = widthAt(arm, CG_lerp(J.shoulderL[1], J.elbowL[1], .3)), wrist = widthAt(arm, CG_lerp(J.elbowL[1], J.wristL[1], .9));
    // a puffy sleeve (the girl's) widens at the cuff on purpose
    if (!(c.get(`CHARACTERS.${id}.parts`).sleeves || {}).wide) assert.ok(wrist < upper * .9, `${id}: polso ${wrist.toFixed(2)} non più stretto del braccio ${upper.toFixed(2)}`);
  }
});
const CG_lerp = (a, b, k) => a + (b - a) * k;
test('slim gloves and boots', () => {
  const c = lib(), L = layoutOf(c, 'supereroe', { view: 'front', pose: 'inPiediEroico' }), J = L.joints, part = id => L.parts.find(q => q.id === id).pts;
  const maxW = poly => { const b = box(poly); let m = 0; for (let k = .05; k < 1; k += .05) m = Math.max(m, widthAt(poly, CG_lerp(b.y0, b.y1, k))); return m; };
  // the glove's cuff against the forearm where the glove starts
  const cuff = widthAt(part('armL'), box(part('gloveL')).y0 + .05), knee = widthAt(part('legL'), J.kneeL[1]);
  assert.ok(maxW(part('gloveL')) <= cuff * 1.2, `guanto ${maxW(part('gloveL')).toFixed(2)} contro avambraccio ${cuff.toFixed(2)}`);
  assert.ok(maxW(part('bootL')) <= knee * 1.15, `stivale ${maxW(part('bootL')).toFixed(2)} contro ginocchio ${knee.toFixed(2)}`);
});

// ---------- 4b2: hair of the girl and the hero ----------
test('ragazza fringe locks differ', () => {
  const c = lib(), locks = layoutOf(c, 'ragazza', { view: 'front' }).parts.filter(q => /^lock\d$/.test(q.id)).map(q => box(q.pts)).sort((a, b) => a.x0 - b.x0);
  assert.equal(locks.length, 3);
  assert.ok(locks[1].h > locks[0].h && locks[1].h > locks[2].h, `la ciocca centrale non è la più lunga: ${locks.map(b => b.h.toFixed(2))}`);
  assert.ok(Math.abs(locks[0].h - locks[2].h) > .02, 'le ciocche laterali sono lunghe uguali');
  for (let i = 0; i < 2; i++) assert.ok(locks[i].x1 > locks[i + 1].x0, `le ciocche ${i} e ${i + 1} non si sovrappongono`);
});
test('bob from the back is no wider than the head', () => {
  const c = lib(), L = layoutOf(c, 'ragazza', { view: 'back' });
  const hair = partBox(L, q => q.id === 'hair'), head = partBox(L, q => q.id === 'head');
  assert.ok(hair.w <= head.w * 1.15, `capelli larghi ${hair.w.toFixed(2)} contro la testa ${head.w.toFixed(2)}`);
});
test('hero quiff from the front', () => {
  const c = lib(), spikes = layoutOf(c, 'supereroe', { view: 'front' }).parts.filter(q => /^spike\d$/.test(q.id));
  assert.equal(spikes.length, 3);
  for (const s of spikes) assert.ok(s.pts[1][0] > (s.pts[0][0] + s.pts[2][0]) / 2, 'una punta non è spazzata verso destra');
});

// ---------- 4b2: face parts, blink, talk ----------
const adultGirl = c => {
  const spec = JSON.parse(JSON.stringify(c.get('CHARACTERS.ragazza')));
  spec.parts.eyes = { adult: true }; spec.parts.mouth = { lip: true }; spec.roles.iris = '#527D9C'; spec.roles.lip = '#D99A8E';
  return spec;
};
const faceOf = (c, spec, expression, view = 'front') => c.call('((sp, s) => BODIES.biped.layout(sp, s))', spec, { view, t: 0, pose: {}, expression });
test('adult face parts combine', () => {
  const c = lib(), spec = adultGirl(c);
  assert.deepEqual(c.call('validateCharacter', spec), []);
  for (const eyes of ['open', 'sleepy', 'closed', 'happy']) for (const mouth of ['flat', 'ajar', 'open', 'o', 'grin']) for (const brows of ['neutral', 'raised', 'frown', 'sad']) {
    const L = faceOf(c, spec, { eyes, mouth, brows });
    for (const p of L.parts) assert.ok(finite(p.pts) && p.pts.length > 1, `${eyes} ${mouth} ${brows}: ${p.id}`);
  }
  assert.ok(faceOf(c, spec, { mouth: 'grin' }).parts.some(p => /^mouth/.test(p.id) && p.role === 'eyeWhite'), 'il sorriso con i denti non ha i denti');
  assert.ok(faceOf(c, spec, { mouth: 'flat' }).parts.some(p => p.id === 'lip' && p.role === 'lip'), 'manca il labbro');
  const irisTop = e => box(faceOf(c, spec, { eyes: e }).parts.find(p => p.id === 'eye0iris').pts).y0, r = .135 * c.get('BODIES.biped.HU');
  assert.ok(irisTop('sleepy') > irisTop('open') + r * .2, `socchiusi: iride a ${irisTop('sleepy').toFixed(2)}, aperti a ${irisTop('open').toFixed(2)}`);
});
test('brow names are validated', () => {
  const c = lib(), spec = JSON.parse(JSON.stringify(c.get('CHARACTERS.ragazza')));
  spec.expressions.strana = { brows: 'stupite' };
  assert.match(c.call('validateCharacter', spec).join(' '), /stupite/);
  spec.expressions.strana = { brows: 'raised' };
  assert.deepEqual(c.call('validateCharacter', spec), []);
  const browTop = b => partBox(faceOf(c, spec, { brows: b }), p => p.id === 'brow0').y0;
  assert.ok(browTop('raised') < browTop('neutral') - .05, 'le sopracciglia alzate non stanno più in alto');
});
test('option roles are required', () => {
  const c = lib(), spec = JSON.parse(JSON.stringify(c.get('CHARACTERS.ragazza')));
  spec.parts.eyes = { adult: true };
  assert.match(c.call('validateCharacter', spec).join(' '), /vuole il ruolo colore "iris"/);
});
test('blink is deterministic and short', () => {
  const c = lib(), seq = seed => [...Array(2000)].map((_, i) => c.call('blink', i / 100, seed));
  const a = seq(0);
  assert.deepEqual(a, seq(0));
  for (let w = 0; w + 500 <= 2000; w += 500) assert.ok(a.slice(w, w + 500).includes('closed'), `nessun battito tra ${w / 100} e ${w / 100 + 5} s`);
  let run = 0; for (const e of a) { run = e === 'open' ? 0 : run + 1; assert.ok(run <= 25, 'occhi non aperti per più di 0,25 s'); }
  assert.notDeepEqual(a, seq(7), 'semi diversi, stessi battiti');
  for (const e of a) assert.ok(['open', 'sleepy', 'closed'].includes(e));
});
test('talk cycles mouth names', () => {
  const c = lib(), mouths = c.get('FACES.MOUTHS');
  assert.equal(c.call('talk', 0), 'flat');
  for (let i = 0; i < 40; i++) { const m = c.call('talk', i / 20); assert.ok(mouths.includes(m), m); assert.equal(m, c.call('talk', i / 20 + 1)); }
});

// ---------- 4b2: the adult figure and vale ----------
test('vale spec is valid', () => { assert.deepEqual(lib().call('validateCharacter', lib().get('CHARACTERS.vale')), []); });
test('vale features per view and counts', () => checkFeatures(lib(), 'vale'));
test('vale uses only its roles', () => checkRoles(lib(), 'vale'));
test('vale has no NaN', () => checkFinite(lib(), 'vale'));
test('vale flip mirrors exactly', () => checkFlip(lib(), 'vale'));
test('vale layout is deterministic', () => {
  const c = lib(); assert.deepEqual(layoutOf(c, 'vale', { view: 'side', t: .41 }), layoutOf(c, 'vale', { view: 'side', t: .41 }));
});
test('vale is 7.5 heads tall', () => {
  const c = lib(), got = headsTall(c, 'vale');
  assert.ok(near(got, 7.5, .05), `${got.toFixed(2)} teste invece di 7,5`);
});
test('vale limbs keep their length', () => checkLimbs(lib(), 'vale'));
test('vale limbs are simple outlines', () => {
  const c = lib(), spec = c.get('CHARACTERS.vale');
  for (const view of ['front', 'q', 'side', 'back']) for (const pose of Object.keys(spec.poses)) for (const t of [0, .37])
    for (const p of layoutOf(c, 'vale', { view, pose, t }).parts.filter(q => /^(arm|leg)[LR]$/.test(q.id)))
      assert.ok(simple(p.pts), `vale ${view} ${pose} t=${t}: ${p.id} si incrocia`);
});
test('vale figure follows the reference', () => {
  const c = lib(), HU = c.get('BODIES.biped.HU');
  const F = layoutOf(c, 'vale', { view: 'front' }), J = F.joints, torso = F.parts.find(p => p.id === 'torso').pts, pelvis = F.parts.find(p => p.id === 'pelvis').pts;
  const fig = c.get('CHARACTERS.vale.parts.figure'), at = (poly, y) => widthAt(poly, y);
  const waistY = box(torso).y0 + (J.hipL[1] - box(torso).y0) * .68;
  const ys = k => box(torso).y0 + k * HU;
  const chest = Math.max(...[.6, .75, .9].map(k => at(torso, ys(k)))), waist = at(torso, waistY);
  const hips = Math.max(...[0, .05, .1, .15].map(k => at(pelvis, J.hipL[1] + k * HU)));
  assert.ok(waist < .75 * hips, `vita ${waist.toFixed(2)} contro fianchi ${hips.toFixed(2)}`);
  assert.ok(waist < .8 * chest, `vita ${waist.toFixed(2)} contro petto ${chest.toFixed(2)}`);
  const S = layoutOf(c, 'vale', { view: 'side' }), sj = S.joints, st = [...S.parts.find(p => p.id === 'torso').pts, ...S.parts.find(p => p.id === 'pelvis').pts];
  const front = Math.max(...st.map(p => p[0])), back = Math.min(...st.map(p => p[0])), line = (sj.shoulderR[0] + sj.hipR[0]) / 2;
  assert.ok(front > line + fig.bustDepth * HU * .8, `il petto non sporge: ${front.toFixed(2)}`);
  assert.ok(back < line - fig.rumpDepth * HU * .8, `i glutei non sporgono: ${back.toFixed(2)}`);
});
test('leggings shine in every view', () => {
  const c = lib(), spec = c.get('CHARACTERS.vale');
  for (const view of ['front', 'q', 'side', 'back']) for (const pose of Object.keys(spec.poses)) {
    const L = layoutOf(c, 'vale', { view, pose });
    for (const s of ['L', 'R']) assert.ok(L.parts.some(p => p.role === 'clothLight' && p.id.startsWith('shine' + s)), `vale ${view} ${pose}: nessuna luce sulla gamba ${s}`);
  }
});
test('heels stand on the ground', () => {
  const c = lib(), spec = c.get('CHARACTERS.vale'), HU = c.get('BODIES.biped.HU');
  for (const view of ['front', 'q', 'side', 'back']) for (const pose of Object.keys(spec.poses)) {
    if (spec.poses[pose].lift) continue;
    const y = partBox(layoutOf(c, 'vale', { view, pose }), q => /^(leg|foot|shoe|heel|boot)/.test(q.id)).y1;
    assert.ok(Math.abs(y) < 1e-6, `vale ${view} ${pose}: il piede è a ${y.toFixed(3)} dal suolo`);
  }
  const flat = JSON.parse(JSON.stringify(spec)); flat.parts.shoes = {};
  const ankle = sp => c.call('((sp, s) => BODIES.biped.layout(sp, s))', sp, { view: 'side', t: 0, pose: {}, expression: {} }).joints.ankleR[1];
  assert.ok(ankle(flat) - ankle(spec) > spec.parts.shoes.heel * HU * .95, `il tacco non alza la caviglia: ${(ankle(flat) - ankle(spec)).toFixed(3)}`);
});
test('a figure without a body shape is the old torso', () => {
  const c = lib(), L = layoutOf(c, 'ragazza', { view: 'front' }), J = L.joints, pr = c.get('CHARACTERS.ragazza.proportions'), HU = c.get('BODIES.biped.HU');
  const torso = L.parts.find(p => p.id === 'torso').pts, shY = J.hipL[1] - pr.torso * HU;
  const old = c.call('CG.block', 0, shY - .03 * HU, J.hipL[1] + .06 * HU, pr.shoulders * HU, pr.hips * HU * 1.06, .32);
  assert.deepEqual(torso, old);
  assert.ok(!L.parts.some(p => p.id === 'pelvis'));
});

// ---------- 4b2: gestures, bust, breath, looking back ----------
const valeState = (c, o) => c.call('((o) => resolveState(CHARACTERS.vale, o))', o);
const valeLayout = (c, o) => c.call('((o) => BODIES.biped.layout(CHARACTERS.vale, resolveState(CHARACTERS.vale, o)))', o);
test('gestures are validated', () => {
  const c = lib(), spec = JSON.parse(JSON.stringify(c.get('CHARACTERS.vale')));
  spec.gestures.strano = { coda: 1 }; spec.expressions.persa = { gesture: 'nessuno' };
  const errs = c.call('validateCharacter', spec).join(' ');
  assert.match(errs, /coda/); assert.match(errs, /nessuno/);
});
test('a gesture overrides the arms only', () => {
  const c = lib(), spec = c.get('CHARACTERS.vale'), s = valeState(c, { pose: 'manoSulFianco', expression: 'arrabbiata' });
  const pose = spec.poses.manoSulFianco, g = spec.gestures[spec.expressions.arrabbiata.gesture];
  for (const k of ['hipL', 'hipR', 'kneeL', 'kneeR', 'lean']) if (k in pose) assert.equal(s.pose[k], pose[k], k);
  for (const [k, v] of Object.entries(g)) assert.equal(s.pose[k], v, k);
});
test('crossed arms stay inside the shoulders', () => {
  const c = lib(), HU = c.get('BODIES.biped.HU'), L = valeLayout(c, { view: 'front', expression: 'arrabbiata' }), J = L.joints;
  const half = c.get('CHARACTERS.vale.proportions.shoulders') * HU / 2;
  for (const s of ['L', 'R']) assert.ok(Math.abs(J['wrist' + s][0]) < half, `polso ${s} a ${J['wrist' + s][0].toFixed(2)}, spalle a ±${half.toFixed(2)}`);
  const len = s => Math.hypot(J['elbow' + s][0] - J['shoulder' + s][0], J['elbow' + s][1] - J['shoulder' + s][1]) + Math.hypot(J['wrist' + s][0] - J['elbow' + s][0], J['wrist' + s][1] - J['elbow' + s][1]);
  for (const s of ['L', 'R']) assert.ok(near(len(s), c.get('CHARACTERS.vale.proportions.arm') * HU, .01), `braccio ${s} lungo ${len(s).toFixed(2)}`);
});
test('thinking hand is over the face', () => {
  const c = lib(), L = valeLayout(c, { view: 'front', expression: 'pensierosa' }), mouth = L.parts.find(p => p.id === 'mouth').depth;
  assert.ok(L.parts.some(p => /^hand[LR]$/.test(p.id) && p.depth > mouth), 'nessuna mano davanti alla faccia');
});
test('bust keeps the gestures', () => {
  const c = lib(), spec = c.get('CHARACTERS.vale');
  for (const e of Object.keys(spec.expressions)) {
    const L = valeLayout(c, { view: 'front', expression: e, bust: true });
    if (spec.expressions[e].gesture) assert.ok(L.parts.some(p => /^hand/.test(p.id)), `${e}: nessuna mano nel mezzo busto`);
    assert.ok(L.parts.every(p => p.pts.every(q => q[1] <= 1e-6)), `${e}: qualcosa sotto il taglio`);
  }
});
test('breath moves only the upper body', () => {
  const c = lib(), at = t => valeLayout(c, { view: 'front', pose: { breath: 1 }, t }).joints;
  const a = at(0), b = at(2);
  assert.deepEqual(a.ankleL, b.ankleL);
  assert.ok(Math.abs(a.shoulderL[1] - b.shoulderL[1]) > .02, 'le spalle non respirano');
});
test('looking back shows a profile', () => {
  const c = lib(), L = valeLayout(c, { view: 'back', pose: 'voltataIndietro' });
  assert.ok(L.parts.some(p => /^eye/.test(p.id)) && L.parts.some(p => p.id === 'mouth'), 'dal retro non si vede il profilo');
});
test('pose views are validated', () => {
  const c = lib(), spec = JSON.parse(JSON.stringify(c.get('CHARACTERS.vale')));
  spec.poseViews = { volo: 'back', inPiedi: 'sopra' };
  const errs = c.call('validateCharacter', spec).join(' ');
  assert.match(errs, /volo/); assert.match(errs, /sopra/);
});
