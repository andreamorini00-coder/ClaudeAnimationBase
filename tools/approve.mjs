// approve.mjs: a character's model sheets, approved once per style and then watched for drift.
//   node tools/approve.mjs gatto classic    renders sheet_gatto and pose_gatto (and face_gatto, for a spec with
//                                           faceSheet) at t = 0 in that style, stores them in
//                                           reference/characters/gatto/approvati/ and records the spec's version
//   node tools/approve.mjs vale.ufficio classic   the same for one of a character's outfits, in
//                                           reference/characters/vale/approvati/ufficio/
//   node tools/approve.mjs --check          for every character and style: "ok", "da approvare" (never approved, or
//                                           approved at an older version) or "deriva" (approved, unchanged version,
//                                           but the drawing changed) or "altra GPU" (approved on another graphics card:
//                                           the bytes can't be compared there); exits 1 only on drift (npm run check-characters)
// approvati.json: { "<style>": { "version": n, "gpu": "<renderer>" } }; the PNG bytes depend on the GPU and its driver.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadPageScripts, CHAR_SCRIPTS } from './pagecode.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function approvalStatus({ version, approvedVersion, sameBytes, sameGpu }) {
  if (approvedVersion == null || approvedVersion < version) return 'da approvare';
  if (sameBytes) return 'ok';
  return sameGpu === false ? 'altra GPU' : 'deriva';
}

// What can be approved: every character, and each of its outfits as "<id>.<outfit>". characters: { id: { version,
// faceSheet, outfits: [names] } } → [{ id, dir (under reference/characters/), kinds, version }].
export function sheetTargets(characters) {
  const out = [];
  for (const [id, c] of Object.entries(characters)) {
    const kinds = ['sheet', 'pose', ...(c.faceSheet ? ['face'] : [])];
    out.push({ id, dir: `${id}/approvati`, kinds, version: c.version });
    for (const o of c.outfits || []) out.push({ id: `${id}.${o}`, dir: `${id}/approvati/${o}`, kinds, version: c.version });
  }
  return out;
}

const dirOf = target => join(ROOT, 'reference', 'characters', ...target.dir.split('/'));
const readApproved = target => { const f = join(dirOf(target), 'approvati.json'); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {}; };
const styles = () => readdirSync(join(ROOT, 'src', 'styles')).filter(f => f.endsWith('.js') && f !== 'registry.js' && !f.startsWith('_')).map(f => f.slice(0, -3));

// The sheets of a target in a style, rendered at t = 0 into dir: { sheet, pose, face? } file paths and the gpu used.
function renderSheets({ id, kinds }, style, dir) {
  const out = {};
  for (const kind of kinds) {
    const target = join(dir, kind);
    const r = spawnSync(process.execPath, ['render.mjs', `--loop=${kind}_${id}`, '--stills=0', '--format=landscape', `--style=${style}`, `--out=${target}`], { cwd: ROOT, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`render di ${kind}_${id} (${style}) fallito:\n${r.stdout}${r.stderr}`);
    out[kind] = join(target, 't0_00.png');
    out.gpu = (r.stdout.match(/^GPU: (.*)$/m) || [])[1] || '';
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const characters = loadPageScripts(CHAR_SCRIPTS).call('(() => Object.fromEntries(Object.entries(CHARACTERS).map(([k, v]) => [k, { version: v.version, faceSheet: !!v.faceSheet, outfits: Object.keys(v.outfits || {}) }])))');
  const targets = sheetTargets(characters), args = process.argv.slice(2);
  if (args[0] === '--check') {
    let drift = 0;
    for (const target of targets) for (const style of styles()) {
      const { id, version } = target, entry = readApproved(target)[style], approved = typeof entry === 'number' ? entry : entry && entry.version;
      let sameBytes = null, sameGpu;
      if (approved != null && approved >= version) {
        const tmp = mkdtempSync(join(tmpdir(), 'approve-')), now = renderSheets(target, style, tmp);
        sameBytes = target.kinds.every(k => existsSync(join(dirOf(target), `${k}-${style}.png`)) && readFileSync(now[k]).equals(readFileSync(join(dirOf(target), `${k}-${style}.png`))));
        if (entry && entry.gpu) sameGpu = entry.gpu === now.gpu;
        rmSync(tmp, { recursive: true, force: true });
      }
      const s = approvalStatus({ version, approvedVersion: approved, sameBytes, sameGpu });
      if (s === 'deriva') drift++;
      console.log(`${id.padEnd(13)} ${style.padEnd(20)} v${version}  ${s}`);
    }
    process.exit(drift ? 1 : 0);
  }
  const [id, style] = args, target = targets.find(x => x.id === id);
  if (!target || !styles().includes(style)) {
    console.error(`uso: node tools/approve.mjs <personaggio> <stile> | --check\npersonaggi e abiti: ${targets.map(x => x.id).join(', ')}\nstili: ${styles().join(', ')}`);
    process.exit(2);
  }
  const tmp = mkdtempSync(join(tmpdir(), 'approve-')), files = renderSheets(target, style, tmp), dir = dirOf(target);
  mkdirSync(dir, { recursive: true });
  for (const k of target.kinds) copyFileSync(files[k], join(dir, `${k}-${style}.png`));
  const approved = { ...readApproved(target), [style]: { version: target.version, gpu: files.gpu } };
  writeFileSync(join(dir, 'approvati.json'), JSON.stringify(approved, null, 2) + '\n');
  rmSync(tmp, { recursive: true, force: true });
  console.log(`approvato ${id} v${target.version} in ${style}: ${dir}`);
}
