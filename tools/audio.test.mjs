// audio.test.mjs: tests for tools/audio.mjs (run with `npm test`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { variantsOf, resolvePlan } from './audio.mjs';

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
  assert.deepEqual(resolvePlan({}, opts({ music: 'assets/m.mp3' })).music, { file: 'assets/m.mp3', vol: 0 });
  assert.deepEqual(resolvePlan({ music: { file: 'a.mp3', vol: -3 } }, opts({ music: 'assets/m.mp3' })).music, { file: 'a.mp3', vol: -3 });
});
