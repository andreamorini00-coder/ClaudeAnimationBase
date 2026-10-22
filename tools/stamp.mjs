// stamp.mjs: the settings a frames folder was rendered with ({ style, draft, fps, format } in stamp.json), so render.mjs
// never resumes --frames with different settings (draft frames inside a final video) and --encode uses the right fps.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const FILE = 'stamp.json';
const show = s => `stile ${s.style}${s.draft ? `, draft ${s.draft}` : ''}, ${s.fps} fps, formato ${s.format}`;

// Stamps written before formats existed were all landscape.
export function readStamp(dir) {
  const f = join(dir, FILE);
  return existsSync(f) ? { format: 'landscape', ...JSON.parse(readFileSync(f, 'utf8')) } : null;
}
export function writeStamp(dir, s) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, FILE), JSON.stringify({ style: s.style, draft: s.draft, fps: s.fps, format: s.format }));
}
// null when frames with these settings can be written into dir (empty, or same stamp); otherwise why not.
export function checkStamp(dir, want) {
  if (!existsSync(dir)) return null;
  const old = readStamp(dir);
  if (!old) return readdirSync(dir).some(f => f.endsWith('.jpg')) ? `${dir} contiene fotogrammi senza timbro (stamp.json)` : null;
  if (old.style === want.style && old.draft === want.draft && old.fps === want.fps && old.format === want.format) return null;
  return `${dir} contiene fotogrammi fatti con ${show(old)}, non con ${show(want)}`;
}
