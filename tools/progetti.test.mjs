// progetti.test.mjs: the projects folder (progetti/<nome>/progetto.js + the scene files it lists), checked without a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { listProgetti, loadProgetto, validateProgetto, outDir, FORMAT_NAMES } from './progetti.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const good = { duration: 12, bpm: 120, style: 'acquerello-leggero', format: 'vertical', scene: ['scena.js'] };
const tmpRoot = (name, progetto, files = ['scena.js']) => {
  const root = mkdtempSync(join(tmpdir(), 'progetti-')), dir = join(root, 'progetti', name);
  mkdirSync(dir, { recursive: true });
  if (progetto != null) writeFileSync(join(dir, 'progetto.js'), progetto);
  for (const f of files) writeFileSync(join(dir, f), '// scene');
  return root;
};
const sheet = o => `window.PROGETTO = ${JSON.stringify(o)};`;

test('a valid project has no errors', () => {
  const root = tmpRoot('prova', sheet(good));
  assert.deepEqual(validateProgetto('prova', root), []);
  assert.deepEqual(loadProgetto('prova', root).scene, ['scena.js']);
});
test('a project that is missing or has no sheet is refused with the list of the existing ones', () => {
  const root = tmpRoot('prova', sheet(good));
  assert.throws(() => loadProgetto('altro', root), /altro.*prova/s);
  const vuoto = tmpRoot('vuoto', null);
  assert.match(validateProgetto('vuoto', vuoto).join(' '), /progetto\.js/);
});
test('the sheet is checked field by field', () => {
  const errs = o => validateProgetto('prova', tmpRoot('prova', sheet({ ...good, ...o }), ['scena.js'])).join(' | ');
  assert.match(errs({ duration: 0 }), /duration/);
  assert.match(errs({ bpm: 'veloce' }), /bpm/);
  assert.match(errs({ format: 'cinema' }), /format.*cinema/);
  assert.match(errs({ style: 'inesistente' }), /style.*inesistente/);
  assert.match(errs({ scene: [] }), /scene/);
  assert.match(errs({ scene: ['manca.js'] }), /manca\.js/);
  assert.match(errs({ scene: ['../fuori.js'] }), /fuori\.js/);
  assert.match(errs({ music: 'assets/non_c_e.mp3' }), /music/);
});
test('a project name is only letters, digits, dash and underscore', () => {
  assert.throws(() => loadProgetto('../src', ROOT), /nome/i);
  assert.throws(() => loadProgetto('a b', ROOT), /nome/i);
});
test('outputs go to out/<nome>/ for a project, out/ otherwise', () => {
  assert.equal(outDir(undefined), 'out/');
  assert.equal(outDir('reel-gatto-mostro'), 'out/reel-gatto-mostro/');
});
test('the format names are the ones core.js knows', () => {
  const core = readFileSync(join(ROOT, 'src/core.js'), 'utf8');
  const keys = [...core.slice(core.indexOf('const FORMATS = {')).matchAll(/^  (\w+): \{ w:/gm)].map(m => m[1]);
  assert.deepEqual([...FORMAT_NAMES].sort(), keys.sort());
});
test('config.js: a project sheet overrides the defaults, nothing else changes', () => {
  const run = win => { const ctx = vm.createContext({ window: win }); vm.runInContext(readFileSync(join(ROOT, 'src/config.js'), 'utf8') + '\nthis.P = PROJECT;', ctx); return JSON.parse(JSON.stringify(ctx.P)); };
  const base = run({});
  assert.equal(base.format, 'landscape'); assert.equal(base.duration, 11); assert.equal(base.style, 'classic');
  const mine = run({ PROGETTO: good });
  assert.equal(mine.duration, 12); assert.equal(mine.format, 'vertical'); assert.equal(mine.style, 'acquerello-leggero');
  assert.equal(mine.bpm, 120); assert.equal(mine.offset, 0);
});
test('studio.html loads a project in place of the demo, and the demo otherwise', () => {
  const html = readFileSync(join(ROOT, 'studio.html'), 'utf8');
  assert.ok(html.indexOf('progetti/') > -1 && html.indexOf('progetti/') < html.indexOf('src/config.js'), 'la scheda si carica prima di config.js');
  assert.match(html, /src\/scenes\/demo\.js/);
  assert.match(html, /PROGETTO/);
});
test('every project in progetti/ is valid', () => {
  for (const name of listProgetti(ROOT)) assert.deepEqual(validateProgetto(name, ROOT), [], name);
});
test('the reel is the first project', () => {
  assert.ok(listProgetti(ROOT).includes('reel-gatto-mostro'));
  const p = loadProgetto('reel-gatto-mostro', ROOT);
  assert.equal(p.format, 'vertical'); assert.equal(p.style, 'acquerello-leggero'); assert.equal(p.duration, 12);
  assert.ok(readdirSync(join(ROOT, 'progetti', 'reel-gatto-mostro')).includes('STORYBOARD.md'));
});
