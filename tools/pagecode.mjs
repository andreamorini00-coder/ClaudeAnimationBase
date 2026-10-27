// pagecode.mjs: runs the page's PURE scripts (no p5, no DOM) in a node:vm context, so tests check the same bytes the
// browser draws with. Classic scripts share their top-level const/let/function across files, in a vm context as on a page.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// The character library's pure files, in the order studio.html loads them.
export const CHAR_SCRIPTS = [
  'src/characters/registry.js',
  'src/characters/shapes.js',
  'src/characters/faces.js',
  'src/characters/act.js',
  'src/characters/bodies/quadruped.js',
  'src/characters/bodies/blob.js',
  'src/characters/bodies/crawler.js',
  'src/characters/bodies/biped.js',
  'src/characters/gatto.js',
  'src/characters/mostro.js',
  'src/characters/bruco.js',
  'src/characters/draghetto.js',
  'src/characters/ragazza.js',
];

// get(expr): the value of an expression in the page context. run(code): runs more code there.
// call(fn, ...args): calls a page function and returns a plain copy of the result (JSON), so assert.deepEqual compares
// values rather than objects from another realm.
export function loadPageScripts(paths) {
  const ctx = vm.createContext({ Math, console });
  for (const p of paths) vm.runInContext(readFileSync(resolve(ROOT, p), 'utf8'), ctx, { filename: p });
  const get = expr => vm.runInContext(expr, ctx);
  return {
    get,
    run: code => { vm.runInContext(code, ctx); },
    call: (fn, ...args) => { const r = get(fn)(...args); return r === undefined ? r : JSON.parse(JSON.stringify(r)); },
  };
}
