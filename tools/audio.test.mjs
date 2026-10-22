// audio.test.mjs: tests for tools/audio.mjs (run with `npm test`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { variantsOf, resolvePlan, duckAmount, duckExpr, mixGraph, measureFile, levelGains, TARGETS } from './audio.mjs';
import { mkdtempSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const FILES = ['bonk_01.mp3', 'bonk_02.mp3', 'bonk_03.mp3', 'scintillio_01.mp3', 'scintillio_02.mp3', 'pop_01.mp3', 'pop_02.mp3',
  'pop_03.mp3', 'caduta_tonfo_01.mp3', 'amb_notte_grilli_loop.mp3', 'licenze.md'];
const opts = (o = {}) => ({ files: FILES, dir: 'sfx', duration: 11, ...o });
const names = r => r.sfx.map(s => [s.t, s.file.replace('sfx/', '')]);

test('variantsOf finds numbered files, or the plain file', () => {
  assert.deepEqual(variantsOf('bonk', FILES), ['bonk_01.mp3', 'bonk_02.mp3', 'bonk_03.mp3']);
  assert.deepEqual(variantsOf('amb_notte_grilli_loop', FILES), ['amb_notte_grilli_loop.mp3']);
  assert.deepEqual(variantsOf('nope', FILES), []);
});

test('three variants rotate by time', () => {
  const r = resolvePlan({ sfx: [[3, 'bonk'], [1, 'bonk'], [2, 'bonk'], [4, 'bonk']] }, opts());
  assert.deepEqual(names(r), [[1, 'bonk_01.mp3'], [2, 'bonk_02.mp3'], [3, 'bonk_03.mp3'], [4, 'bonk_01.mp3']]);
});

test('two variants rotate', () => {
  const r = resolvePlan({ sfx: [[1, 'scintillio'], [2, 'scintillio'], [3, 'scintillio']] }, opts());
  assert.deepEqual(names(r).map(n => n[1]), ['scintillio_01.mp3', 'scintillio_02.mp3', 'scintillio_01.mp3']);
});

test('explicit variant is kept and does not count in the rotation', () => {
  const r = resolvePlan({ sfx: [[1, 'pop'], [2, 'pop_02'], [3, 'pop']] }, opts());
  assert.deepEqual(names(r).map(n => n[1]), ['pop_01.mp3', 'pop_02.mp3', 'pop_02.mp3']);
});

test('unknown name lists the valid ones', () => {
  assert.throws(() => resolvePlan({ sfx: [[1, 'tonfo']] }, opts()), e => /tonfo/.test(e.message) && /caduta_tonfo/.test(e.message));
});

test('voice is refused', () => {
  assert.throws(() => resolvePlan({ voice: { file: 'v.mp3' } }, opts()), /voce non ancora supportata/);
});

test('defaults are filled', () => {
  const r = resolvePlan({ sfx: [[1, 'pop']], ambience: [{ name: 'amb_notte_grilli_loop', from: 0, to: 5 }] }, opts());
  assert.equal(r.sfx[0].vol, 0); assert.equal(r.sfx[0].duck, true);
  assert.equal(r.ambience[0].fadeIn, .5); assert.equal(r.ambience[0].fadeOut, .8); assert.equal(r.ambience[0].vol, 0);
  assert.equal(r.music, null); assert.equal(r.duration, 11);
});

test('sound at 0 and past the end', () => {
  const r = resolvePlan({ sfx: [[0, 'pop'], [12, 'pop']] }, opts());
  assert.deepEqual(r.sfx.map(s => s.t), [0]);
});

test('range shifts and trims, variants picked before the cut', () => {
  const r = resolvePlan({ sfx: [[3, 'pop'], [5, 'pop'], [8, 'pop']], ambience: [{ name: 'amb_notte_grilli_loop', from: 0, to: 11 }] },
    opts({ range: [4, 7] }));
  assert.deepEqual(names(r), [[1, 'pop_02.mp3']]);
  assert.equal(r.ambience[0].from, 0); assert.equal(r.ambience[0].to, 3);
  assert.equal(r.duration, 3);
});

test('project music is used when the scene has none, scene music wins', () => {
  assert.deepEqual(resolvePlan({}, opts({ music: 'assets/m.mp3' })).music, { file: 'assets/m.mp3', vol: 0, start: 0 });
  assert.deepEqual(resolvePlan({ music: { file: 'a.mp3', vol: -3 } }, opts({ music: 'assets/m.mp3' })).music, { file: 'a.mp3', vol: -3, start: 0 });
});

// ---------- ducking and mix graph ----------
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);

test('duck curve', () => {
  const c = [{ t: 2, dur: 1 }];
  [[1.9, 0], [2.0, .5], [2.05, 1], [3.2, 1], [3.4, .5], [3.6, 0]].forEach(([t, v]) => near(duckAmount(t, c), v));
});

test('overlapping cues take the max', () => {
  const c = [{ t: 2, dur: 1 }, { t: 2.5, dur: 1 }];
  for (let t = 1.8; t < 5; t += .01) assert.ok(duckAmount(t, c) <= 1 + 1e-12);
  near(duckAmount(3.4, c), 1);
});

test('duckExpr matches duckAmount', () => {
  const c = [{ t: 2, dur: 1 }, { t: 2.5, dur: .3 }];
  const f = new Function('t', 'clip', 'max', 'return ' + duckExpr(c));
  const clip = (x, a, b) => Math.min(b, Math.max(a, x));
  for (let t = 0; t < 5; t += .037) near(f(t, clip, (a, b) => Math.max(a, b)), duckAmount(t, c));
  assert.equal(duckExpr([]), '0');
});

const one = { sfx: [], ambience: [], music: null, duration: 5 };
test('graph delays and gains', () => {
  const g = mixGraph({ ...one, sfx: [{ t: 1.25, file: 'sfx/pop_01.mp3', vol: 0, duck: true }] }, { gains: { 'sfx/pop_01.mp3': -4.1 }, durs: { 'sfx/pop_01.mp3': 1 } });
  assert.deepEqual(g.inputs, ['sfx/pop_01.mp3']);
  assert.match(g.filter, /adelay=1250:all=1/); assert.match(g.filter, /volume=-4\.1dB/);
  assert.match(g.filter, /atrim=duration=5\[mix\]$/); assert.equal(g.out, '[mix]');
});

test('ambience in range', () => {
  const g = mixGraph({ ...one, ambience: [{ file: 'sfx/amb.mp3', from: 0, to: 3, fadeIn: .5, fadeOut: .8, vol: 0 }] }, { gains: { 'sfx/amb.mp3': 18.2 }, durs: { 'sfx/amb.mp3': 10 } });
  assert.match(g.filter, /aloop=loop=-1/); assert.match(g.filter, /atrim=duration=3,/);
  assert.match(g.filter, /afade=t=in:d=0\.5/); assert.match(g.filter, /afade=t=out:st=2\.2:d=0\.8/);
});

test('same file twice', () => {
  const s = { t: 2, file: 'sfx/pop_01.mp3', vol: 0, duck: true };
  const g = mixGraph({ ...one, sfx: [s, { ...s }] }, { gains: { 'sfx/pop_01.mp3': 0 }, durs: { 'sfx/pop_01.mp3': 1 } });
  assert.deepEqual(g.inputs, ['sfx/pop_01.mp3']); assert.match(g.filter, /asplit=2/); assert.match(g.filter, /amix=inputs=2/);
});

test('no music, no duck filter; music ducks under the effects', () => {
  const plan = { ...one, sfx: [{ t: 1, file: 'sfx/pop_01.mp3', vol: 0, duck: true }] }, opt = { gains: { 'sfx/pop_01.mp3': 0, 'm.mp3': -2 }, durs: { 'sfx/pop_01.mp3': 1, 'm.mp3': 60 } };
  assert.doesNotMatch(mixGraph(plan, opt).filter, /eval=frame/);
  const g = mixGraph({ ...plan, music: { file: 'm.mp3', vol: 0 } }, opt);
  assert.match(g.filter, /volume='1-0\.5\*\(.+\)':eval=frame/); assert.deepEqual(g.inputs, ['sfx/pop_01.mp3', 'm.mp3']);
});

// ---------- levels (these run ffmpeg on real files) ----------
const TONFO = 'assets/sfx/caduta_tonfo_01.mp3', GRILLI = 'assets/sfx/amb_notte_grilli_loop.mp3';
const cache = () => join(mkdtempSync(join(tmpdir(), 'lvl-')), 'cache.json');

test('measures a real file', async () => {
  const m = await measureFile(TONFO);
  near(m.lufs, -13.9, .3); near(m.dur, 2, .06);
});

test('gain per category', async () => {
  const plan = { sfx: [{ t: 0, file: TONFO, vol: 0, duck: true }], ambience: [{ file: GRILLI, from: 0, to: 5, fadeIn: .5, fadeOut: .8, vol: 0 }], music: null, duration: 5 };
  const { gains, durs } = await levelGains(plan, { cachePath: cache() });
  assert.deepEqual(TARGETS, { sfx: -18, ambience: -30, music: -20 });
  near(gains[TONFO], -4.1, .3); near(gains[GRILLI], 18.2, .3); near(durs[GRILLI], 10, .06);
});

test('cache is reused', async () => {
  const c = cache(), plan = { sfx: [{ t: 0, file: TONFO, vol: 0, duck: true }], ambience: [], music: null, duration: 5 };
  let n = 0; const measure = f => { n++; return measureFile(f); };
  await levelGains(plan, { cachePath: c, measure }); await levelGains(plan, { cachePath: c, measure });
  assert.equal(n, 1);
});

test('cache notices a changed file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'chg-')), f = join(dir, 'x.mp3'), c = cache();
  const plan = { sfx: [{ t: 0, file: f, vol: 0, duck: true }], ambience: [], music: null, duration: 5 };
  copyFileSync('assets/sfx/pop_01.mp3', f);
  const a = (await levelGains(plan, { cachePath: c })).gains[f];
  copyFileSync(TONFO, f);
  const b = (await levelGains(plan, { cachePath: c })).gains[f];
  near(b, -4.1, .3); assert.ok(Math.abs(a - b) > .5);
});

// ---------- fixes from the branch review ----------
test('range keeps the music and ambience in step with the video', () => {
  const r = resolvePlan({ ambience: [{ name: 'amb_notte_grilli_loop', from: 1, to: 11 }], music: { file: 'm.mp3' } }, opts({ range: [4, 7] }));
  assert.equal(r.music.start, 4); assert.equal(r.ambience[0].skip, 3);
  const g = mixGraph(r, { gains: {}, durs: { 'sfx/amb_notte_grilli_loop.mp3': 10, 'm.mp3': 60 } });
  assert.match(g.filter, /atrim=start=4,asetpts=PTS-STARTPTS/);
  assert.match(g.filter, /aloop=loop=-1:size=2000000000,atrim=start=3:duration=3,asetpts=PTS-STARTPTS/);
});

test('fades never outlast a short ambience', () => {
  const g = mixGraph({ ...one, ambience: [{ file: 'a.mp3', from: 0, to: .4, fadeIn: .5, fadeOut: .8, vol: 0, skip: 0 }] }, { gains: {}, durs: { 'a.mp3': 10 } });
  assert.match(g.filter, /afade=t=in:d=0\.2,/); assert.match(g.filter, /afade=t=out:st=0\.2:d=0\.2/);
  assert.doesNotMatch(g.filter, /st=-/);
});
