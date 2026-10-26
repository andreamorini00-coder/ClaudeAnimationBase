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
