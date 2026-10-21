// compare.test.mjs: tests for tools/compare.mjs (run with `npm test`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { compareDirs } from './compare.mjs';

const dir = (files) => {
  const d = mkdtempSync(join(tmpdir(), 'cmp-'));
  for (const [name, bytes] of Object.entries(files)) { const p = join(d, name); mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, Buffer.from(bytes)); }
  return d;
};

test('identical dirs pass', () => {
  const files = { 'a.png': [1, 2, 3], 'b.png': [4, 5, 6] };
  assert.deepEqual(compareDirs(dir(files), dir(files)), { same: 2, total: 2, firstDiff: null, missing: [] });
});

test('one changed byte fails', () => {
  const r = compareDirs(dir({ 'a.png': [1, 2, 3], 'b.png': [4, 5, 6] }), dir({ 'a.png': [1, 2, 3], 'b.png': [4, 5, 7] }));
  assert.equal(r.firstDiff, 'b.png');
  assert.equal(r.same, 1);
});

test('missing file is reported', () => {
  const r = compareDirs(dir({ 'a.png': [1], 'b.png': [2] }), dir({ 'a.png': [1] }));
  assert.deepEqual(r.missing, ['b.png']);
});

test('empty reference is an error', () => {
  assert.throws(() => compareDirs(dir({}), dir({ 'a.png': [1] })), /nessun file/);
});

test('nested dirs are compared', () => {
  const r = compareDirs(dir({ 'a.png': [1], 'emotions/t1_00.png': [2] }), dir({ 'a.png': [1], 'emotions/t1_00.png': [3] }));
  assert.equal(r.total, 2);
  assert.equal(r.firstDiff, 'emotions/t1_00.png');
});
