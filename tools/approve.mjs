// approve.mjs: a character's model sheets, approved once per style and then watched for drift.
//   node tools/approve.mjs gatto classic    renders sheet_gatto and pose_gatto at t = 0 in that style, stores them in
//                                           reference/characters/gatto/approvati/ and records the spec's version
//   node tools/approve.mjs --check          for every character and style: "ok", "da approvare" (never approved, or
//                                           approved at an older version) or "deriva" (approved, unchanged version,
//                                           but the drawing changed); exits 1 only on drift (npm run check-characters)
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadPageScripts, CHAR_SCRIPTS } from './pagecode.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function approvalStatus({ version, approvedVersion, sameBytes }) {
  if (approvedVersion == null || approvedVersion < version) return 'da approvare';
  return sameBytes ? 'ok' : 'deriva';
}

const dirOf = id => join(ROOT, 'reference', 'characters', id, 'approvati');
const readApproved = id => { const f = join(dirOf(id), 'approvati.json'); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {}; };
const styles = () => readdirSync(join(ROOT, 'src', 'styles')).filter(f => f.endsWith('.js') && f !== 'registry.js' && !f.startsWith('_')).map(f => f.slice(0, -3));

// The two sheets of a character in a style, rendered at t = 0 into dir: { sheet, pose } file paths.
function renderSheets(id, style, dir) {
  const out = {};
  for (const kind of ['sheet', 'pose']) {
    const target = join(dir, kind);
    const r = spawnSync(process.execPath, ['render.mjs', `--loop=${kind}_${id}`, '--stills=0', '--format=landscape', `--style=${style}`, `--out=${target}`], { cwd: ROOT, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`render di ${kind}_${id} (${style}) fallito:\n${r.stdout}${r.stderr}`);
    out[kind] = join(target, 't0_00.png');
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const characters = loadPageScripts(CHAR_SCRIPTS).call('(() => Object.fromEntries(Object.entries(CHARACTERS).map(([k, v]) => [k, v.version])))');
  const args = process.argv.slice(2);
  if (args[0] === '--check') {
    let drift = 0;
    for (const [id, version] of Object.entries(characters)) for (const style of styles()) {
      const approved = readApproved(id)[style];
      let sameBytes = null;
      if (approved != null && approved >= version) {
        const tmp = mkdtempSync(join(tmpdir(), 'approve-')), now = renderSheets(id, style, tmp);
        sameBytes = ['sheet', 'pose'].every(k => readFileSync(now[k]).equals(readFileSync(join(dirOf(id), `${k}-${style}.png`))));
        rmSync(tmp, { recursive: true, force: true });
      }
      const s = approvalStatus({ version, approvedVersion: approved, sameBytes });
      if (s === 'deriva') drift++;
      console.log(`${id.padEnd(10)} ${style.padEnd(20)} v${version}  ${s}`);
    }
    process.exit(drift ? 1 : 0);
  }
  const [id, style] = args;
  if (!characters[id] || !styles().includes(style)) {
    console.error(`uso: node tools/approve.mjs <personaggio> <stile> | --check\npersonaggi: ${Object.keys(characters).join(', ')}\nstili: ${styles().join(', ')}`);
    process.exit(2);
  }
  const tmp = mkdtempSync(join(tmpdir(), 'approve-')), files = renderSheets(id, style, tmp), dir = dirOf(id);
  mkdirSync(dir, { recursive: true });
  for (const k of ['sheet', 'pose']) copyFileSync(files[k], join(dir, `${k}-${style}.png`));
  const approved = { ...readApproved(id), [style]: characters[id] };
  writeFileSync(join(dir, 'approvati.json'), JSON.stringify(approved, null, 2) + '\n');
  rmSync(tmp, { recursive: true, force: true });
  console.log(`approvato ${id} v${characters[id]} in ${style}: ${dir}`);
}
