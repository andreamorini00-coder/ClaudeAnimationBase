// stamp.test.mjs: tests for tools/stamp.mjs (run with `npm test`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkStamp, writeStamp, readStamp } from './stamp.mjs';

const final = { style: 'classic', draft: '', fps: 24, format: 'landscape' }, draft = { style: 'classic', draft: 'flat', fps: 12, format: 'landscape' };
const tmp = () => mkdtempSync(join(tmpdir(), 'stamp-'));

test('another format blocks a resume', () => {
  const d = tmp(); writeStamp(d, final);
  assert.match(checkStamp(d, { ...final, format: 'vertical' }), /vertical/);
});

test('old stamp without format counts as landscape', () => {
  const d = tmp(); writeFileSync(join(d, 'stamp.json'), JSON.stringify({ style: 'classic', draft: '', fps: 24 }));
  assert.equal(checkStamp(d, final), null);
});

test('empty folder can be started', () => {
  assert.equal(checkStamp(tmp(), final), null);
});

test('same settings can resume', () => {
  const d = tmp(); writeStamp(d, final);
  assert.equal(checkStamp(d, final), null);
});

test('draft frames block a final render', () => {
  const d = tmp(); writeStamp(d, draft);
  assert.match(checkStamp(d, final), /draft/);
});

test('another style blocks a resume', () => {
  const d = tmp(); writeStamp(d, final);
  assert.match(checkStamp(d, { ...final, style: 'acquerello-leggero' }), /acquerello-leggero/);
});

test('frames without a stamp block a resume', () => {
  const d = tmp(); writeFileSync(join(d, 'f00000.jpg'), 'x');
  assert.match(checkStamp(d, final), /timbro/);
});

test('encode reads the fps the frames were made at', () => {
  const d = tmp(); writeStamp(d, draft);
  assert.equal(readStamp(d).fps, 12);
});
