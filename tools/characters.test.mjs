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
