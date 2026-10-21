// compare.mjs: checks that a refactor left the frames unchanged, byte for byte.
//   node tools/compare.mjs out/ref out/check-ref     → "OK n/n identici", or the first differing file and exit code 1
// Compares every .png in the reference folder (subfolders included) with the file at the same path in the other one.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const pngs = (root, d = root) => readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? pngs(root, join(d, e.name)) : e.name.endsWith('.png') ? [relative(root, join(d, e.name)).split(sep).join('/')] : []);

export function compareDirs(refDir, newDir) {
  const files = pngs(refDir).sort();
  if (!files.length) throw new Error(`nessun file .png in ${refDir}`);
  let same = 0, firstDiff = null; const missing = [];
  for (const f of files) {
    const p = join(newDir, f);
    if (!existsSync(p)) { missing.push(f); continue; }
    if (readFileSync(join(refDir, f)).equals(readFileSync(p))) same++; else firstDiff ??= f;
  }
  return { same, total: files.length, firstDiff, missing };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [ref, cur] = process.argv.slice(2);
  if (!ref || !cur) { console.error('uso: node tools/compare.mjs <cartella riferimento> <cartella nuova>'); process.exit(2); }
  const r = compareDirs(ref, cur);
  if (r.same === r.total) { console.log(`OK ${r.same}/${r.total} identici`); process.exit(0); }
  if (r.missing.length) console.error(`mancanti: ${r.missing.join(', ')}`);
  if (r.firstDiff) console.error(`diverso: ${r.firstDiff}`);
  console.error(`FALLITO ${r.same}/${r.total} identici`);
  process.exit(1);
}
