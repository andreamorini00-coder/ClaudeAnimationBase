// progetti.mjs: the projects folder. One video per subfolder, progetti/<nome>/:
//   progetto.js   its sheet: window.PROGETTO = { duration, bpm, offset?, style, format, music?, scene: ['scena.js', …] }
//   <scene files> the scenes it lists, loaded by studio.html in that order, in place of the demo
// Run one with: node render.mjs --progetto=<nome> …   (studio.html?progetto=<nome> opens it by hand)
// Pure node, no browser: render.mjs refuses a bad project before it opens Chrome, and the tests check every folder.
import vm from 'node:vm';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// The formats core.js draws (a test keeps this list equal to FORMATS there).
export const FORMAT_NAMES = ['landscape', 'vertical', 'feed'];

const dirOf = (root, name) => join(root, 'progetti', name);
export const listProgetti = (root = HERE) => {
  const d = join(root, 'progetti');
  return existsSync(d) ? readdirSync(d).filter(n => statSync(join(d, n)).isDirectory()).sort() : [];
};
// Where a run's files go: out/ as ever, out/<nome>/ for a project (so two projects never share frames).
export const outDir = name => name ? `out/${name}/` : 'out/';

// the styles are the engine's, wherever the projects folder is
const styles = root => { const d = join(root, 'src', 'styles'); return existsSync(d) ? readdirSync(d).filter(f => f.endsWith('.js') && f !== 'registry.js' && !f.startsWith('_')).map(f => f.slice(0, -3)) : []; };

// The sheet of a project, or an Error that says what is wrong and which projects exist.
export function loadProgetto(name, root = HERE) {
  if (!/^[A-Za-z0-9_-]+$/.test(name || '')) throw new Error(`Nome di progetto "${name}" non valido: solo lettere, cifre, - e _`);
  const file = join(dirOf(root, name), 'progetto.js');
  if (!existsSync(file) && existsSync(dirOf(root, name))) throw new Error(`Manca progetti/${name}/progetto.js (la scheda del progetto)`);
  if (!existsSync(file)) throw new Error(`Progetto "${name}" inesistente. Disponibili: ${listProgetti(root).join(', ') || '(nessuno)'}`);
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(file, 'utf8'), ctx, { filename: file });
  if (!ctx.window.PROGETTO || typeof ctx.window.PROGETTO !== 'object') throw new Error(`progetti/${name}/progetto.js deve definire window.PROGETTO = { … }`);
  return JSON.parse(JSON.stringify(ctx.window.PROGETTO));
}

// The problems with a project, in Italian, one string each; [] when it is fine.
export function validateProgetto(name, root = HERE) {
  let p;
  try { p = loadProgetto(name, root); } catch (e) { return [e.message]; }
  const errs = [], num = k => typeof p[k] === 'number' && Number.isFinite(p[k]);
  if (!num('duration') || p.duration <= 0) errs.push('duration: serve un numero di secondi maggiore di 0');
  if (!num('bpm') || p.bpm <= 0) errs.push('bpm: serve un numero maggiore di 0');
  if (p.offset != null && !num('offset')) errs.push('offset: serve un numero');
  if (!FORMAT_NAMES.includes(p.format)) errs.push(`format: "${p.format}" inesistente. Disponibili: ${FORMAT_NAMES.join(', ')}`);
  if (!styles(HERE).includes(p.style)) errs.push(`style: "${p.style}" inesistente. Disponibili: ${styles(HERE).join(', ')}`);
  if (!Array.isArray(p.scene) || !p.scene.length) errs.push('scene: serve l\'elenco dei file di scena');
  else for (const f of p.scene) {
    const rel = typeof f === 'string' ? relative(dirOf(root, name), resolve(dirOf(root, name), f)) : '..';
    if (typeof f !== 'string' || rel.startsWith('..') || isAbsolute(rel)) errs.push(`scene: "${f}" deve stare dentro la cartella del progetto`);
    else if (!existsSync(join(dirOf(root, name), f))) errs.push(`scene: manca il file "${f}"`);
  }
  if (p.music && !existsSync(resolve(root, p.music))) errs.push(`music: manca il file "${p.music}"`);
  return errs;
}
