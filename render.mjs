// render.mjs: renders studio.html in headless Chrome. Length and fps come from the page (PROJECT in src/config.js).
//
//   Look at it (open the images with your image viewer / Read tool):
//     node render.mjs --sheet=0.5,1,1.5,2 [--cols=4] [--w=480] --out=out/check/a.jpg        contact sheet of chosen times
//     node render.mjs --strip=2.0:2.5 [--cols=6] [--w=320] --out=out/check/strip.jpg        EVERY frame in a stretch (motion)
//     node render.mjs --sheet=2.1,2.2 --crop=760,300,400,400 --w=600 --out=out/check/face.jpg full-res crops (details)
//     node render.mjs --strip=2.0:2.5 --crop-at=960,780,500,400 --out=out/check/feet.jpg       crops that follow a WORLD point
//         (x,y in world px, may be page expressions like PLK.MX(1.38); w,h in screen px) through each frame's camera
//     node render.mjs --stills=1.2,3.4 --out=out/stills                                     full-res PNGs
//   Make the video:
//     node render.mjs --clip [--range=0:4] --out=out/video.mp4                               straight to MP4 (one worker)
//     node render.mjs --frames [--range=0:8] --workers=4                                     JPEG frames → out/frames (parallel, resumable)
//     node render.mjs --encode --out=out/video.mp4                                           out/frames → MP4
//   Standalone loops (LOOPS in the page): add --loop=<name> to any of the above (times are then loop times), or
//     node render.mjs --loop=emotions --png --out=out/loop_emotions                          one cycle as PNGs (for GIFs)
//   Sound: the scene's sounds() (or LOOPS.x.sounds) are mixed into --clip and --encode at -14 LUFS, AAC 48 kHz.
//     node render.mjs --mix [--loop=tall] [--range=a:b] --out=out/mix.wav                    only the sound, nothing drawn
//     --music=assets/x.mp3 (or the older --audio=…) sets the music; PROJECT.music is the default. Other flags: --fps=24,
//   --chrome=<path to Chrome/Chromium>, --style=<name in src/styles/>, --format=landscape|vertical|feed, --recycle=N (see below).
//   Draft preview: add --draft to any of the above (to --encode too, after --frames --draft): 12 fps and flat colour
//   instead of watercolour fills. --draft=flat,half also paints at half resolution. Never for the final video.
//   Safe zones: add --safe to --sheet, --strip or --stills to draw the format's social safe zones over the frames.
//   It's refused with --clip, --frames, --png and --encode, so it can never end up in a video.
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, statSync, renameSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { checkStamp, writeStamp, readStamp } from './tools/stamp.mjs';
import { resolvePlan, levelGains, renderMix } from './tools/audio.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const CHROMES = [args.chrome, process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ...playwrightChromes()];
// Chromium builds Playwright downloaded (~/.cache/ms-playwright/chromium-NNNN), newest first
function playwrightChromes() {
  const dir = `${homedir()}/.cache/ms-playwright`;
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(n => /^chromium-\d+$/.test(n)).sort((a, b) => b.split('-')[1] - a.split('-')[1])
    .map(n => `${dir}/${n}/chrome-linux64/chrome`);
}
const CHROME = CHROMES.find(p => p && existsSync(p));
if (!CHROME) { console.error('Chrome not found: pass --chrome=<path> or set CHROME_PATH'); process.exit(1); }
if (args.safe && (args.clip || args.frames || args.png || args.encode)) {
  console.error('--safe è solo per sheet, strip e stills: non va mai in un video'); process.exit(1);
}
const fps = +(args.fps || (args.draft ? 12 : 24)), FRAMES_DIR = 'out/frames';
// Frames are JPEGs (full-range YUV), so ffmpeg would write yuvj420p; social apps want yuv420p in TV range.
const TO_TV = ['-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-color_range', 'tv'];
const run = (cmd, a) => new Promise((ok, bad) => { const p = spawn(cmd, a, { stdio: 'inherit' }); p.on('close', c => c ? bad(new Error(cmd + ' exited ' + c)) : ok()); });
const times = s => String(s).split(',').map(Number);
const span = s => String(s).split(':').map(Number);
// comma-separated fields, keeping commas inside parentheses ('PLK.MX(1.38),PLK.WL,500,300'); numbers stay numbers
const fields = s => { const out = []; let d = 0, cur = ''; for (const ch of String(s)) { if (ch === ',' && !d) { out.push(cur); cur = ''; continue; } d += ch === '(' ? 1 : ch === ')' ? -1 : 0; cur += ch; } out.push(cur); return out.map(v => isNaN(+v) ? v : +v); };


// --soft-gl: no GPU on this machine; render WebGL in software (SwiftShader), which Chrome only allows when asked.
// --gpu-angle=vulkan|gl-egl: headless Linux on an NVIDIA GPU (e.g. a cloud or cluster node); plain --use-gl=angle gets
// no WebGL context there. Check which GPU Chrome actually lands on with gpu_probe.mjs.
const ANGLE = { vulkan: ['--use-angle=vulkan', '--enable-features=Vulkan'], 'gl-egl': ['--use-angle=gl-egl'] };
if (args['gpu-angle'] && !ANGLE[args['gpu-angle']]) { console.error(`--gpu-angle must be one of ${Object.keys(ANGLE)}`); process.exit(1); }
const gpu = args['soft-gl'] ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  : args['gpu-angle'] ? ANGLE[args['gpu-angle']]
  : process.platform === 'win32' ? ['--use-angle=d3d11'] : process.platform === 'darwin' ? ['--use-angle=metal'] : ['--use-gl=angle'];
// Ubuntu 23.10+ blocks Chrome's user-namespace sandbox; headless rendering of local files doesn't need it.
const sandbox = process.platform === 'linux' ? ['--no-sandbox'] : [];
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, protocolTimeout: 0,
  args: [...sandbox, '--allow-file-access-from-files', '--ignore-gpu-blocklist', ...gpu, '--enable-gpu-rasterization', '--window-size=1920,1080', '--disable-renderer-backgrounding', '--disable-background-timer-throttling']
});
async function openPage(tag = '') {
  const page = await browser.newPage();
  page.on('console', m => { if (['error', 'warn'].includes(m.type())) console.log(`[page${tag}]`, m.text()); });
  page.on('pageerror', e => { if (!/inesistente|incompleto|Personaggio/.test(e.message)) console.log(`[page error${tag}]`, e.message); });
  const query = '?render' + (args.style ? '&style=' + encodeURIComponent(args.style) : '')
    + (args.format ? '&format=' + encodeURIComponent(args.format) : '')
    + (args.loop ? '&loop=' + encodeURIComponent(args.loop) : '')
    + (args.safe ? '&safe' : '')
    + (args.draft ? '&draft' + (args.draft === true ? '' : '=' + encodeURIComponent(args.draft)) : '');
  await page.goto(pathToFileURL(resolve('studio.html')).href + query, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.ready === true || !!window.loadError', { timeout: 60000 });
  const loadError = await page.evaluate(() => window.loadError);
  if (loadError) { console.error(loadError); await browser.close(); process.exit(1); }
  if (args.loop) {
    const ok = await page.evaluate(name => { if (!LOOPS[name]) return false; window.LOOP = LOOPS[name]; return true; }, args.loop);
    if (!ok) { console.error(`no loop named "${args.loop}"`); process.exit(1); }
  }
  return page;
}
// --recycle=N: --clip, --frames and --png reopen the page every N frames (0 = never, the default). Frames are pure
// functions of t, so the output doesn't change. Measured on integrated graphics it made a 144-frame clip slower
// (210 s without, 241–245 s every 24–48 frames), so it's off unless a long render shows a page slowing down.
const RECYCLE_DEFAULT = 0;
const recycle = +(args.recycle ?? RECYCLE_DEFAULT);
// state = { page, n }: one per worker. Returns the page to render the next frame with, reopening it when it's due.
async function pageFor(state, tag = '') {
  if (state.page && recycle && state.n >= recycle) { await state.page.close(); state.page = null; }
  if (!state.page) { state.page = await openPage(tag); state.n = 0; }
  state.n++;
  return state.page;
}
// The sound of [a, b] in the page's plan (sounds() / LOOPS.x.sounds, music from --music, the plan or PROJECT.music),
// levelled, mixed and normalised into out. null when there is nothing to hear; plan errors stop the render.
const SFX_DIR = 'assets/sfx';
async function mixFor(page, [a, b], out) {
  const { raw, duration, music } = await page.evaluate(() => window.audioPlan());
  let plan;
  try {
    plan = resolvePlan(raw, { files: existsSync(SFX_DIR) ? readdirSync(SFX_DIR) : [], dir: SFX_DIR, duration, range: [a, b],
      music: args.music || (typeof args.audio === 'string' ? args.audio : '') || music });
    if (plan.music && !existsSync(plan.music.file)) throw new Error(`Musica "${plan.music.file}" inesistente`);
  } catch (e) { console.error(e.message); await browser.close(); process.exit(1); }
  if (!plan.sfx.length && !plan.ambience.length && !plan.music) return null;
  try {
    const r = await renderMix(plan, { out, ...await levelGains(plan) });
    if (r.warn) console.warn('Attenzione: ' + r.warn);
    return r;
  } catch (e) {   // an ffmpeg failure: say what failed in a line, and don't leave Chrome running
    console.error('Mix audio fallito: ' + e.message.split('\n').filter(Boolean).slice(-2).join(' / '));
    await browser.close(); process.exit(1);
  }
}
const frameOf = async (page, t, type, q) => {
  const url = await page.evaluate((t, type, q) => window.renderAt(t, type, q), t, type, q);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
};
// the length of whatever is being rendered: a loop's .len, or the video's duration
const lengthOf = page => page.evaluate(() => window.LOOP ? window.LOOP.len : DUR);

if (args.encode) {
  // The frames' own settings (stamped by --frames) win over the defaults: their fps, so a draft doesn't play at double
  // speed, and their style, format and loop, so the sound is the plan of what was rendered.
  const stamp = readStamp(FRAMES_DIR) || {}, out = args.out || 'out/video.mp4', n = readdirSync(FRAMES_DIR).filter(f => f.endsWith('.jpg')).length;
  const efps = args.fps ? fps : stamp.fps ?? fps;
  for (const k of ['style', 'format', 'loop']) if (!args[k] && stamp[k]) args[k] = stamp[k];
  const mixFile = 'out/tmp-mix.m4a', mixed = await mixFor(await openPage(), [0, n / efps], mixFile);
  console.log(`encoding ${n} frames at ${efps} fps → ${out}${mixed ? ` with sound (${mixed.lufs} LUFS)` : ''}`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-stats', '-framerate', String(efps), '-i', `${FRAMES_DIR}/f%05d.jpg`,
    ...(mixed ? ['-i', mixFile, '-map', '0:v', '-map', '1:a', '-c:a', 'copy', '-shortest'] : []),
    ...TO_TV, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-movflags', '+faststart', out]);
  if (mixed) unlinkSync(mixFile);
  console.log('wrote ' + out);
} else if (args.sheet || args.strip) {
  const page = await openPage(), out = args.out || 'out/sheet.jpg'; mkdirSync(dirname(out), { recursive: true });
  let ts;
  if (args.strip) { const [a, b] = span(args.strip); ts = []; for (let i = Math.round(a * fps); i <= Math.round(b * fps); i++) ts.push(i / fps); }
  else ts = times(args.sheet);
  const crop = args.crop ? times(args.crop) : null, at = args['crop-at'] ? fields(args['crop-at']) : null;
  const { url, ms } = await page.evaluate((ts, c, w, crop, at) => window.renderSheet(ts, c, w, crop, at), ts, +(args.cols || (args.strip ? 6 : 3)), +(args.w || (args.strip ? 320 : 640)), crop, at);
  writeFileSync(out, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  console.log(`${out}  (${ts.length} frames)  ms/frame: ${ms.join(' ')}`);
} else if (args.stills) {
  const page = await openPage(), out = args.out || 'out/stills'; mkdirSync(out, { recursive: true });
  console.log('GPU:', await page.evaluate(() => window.gpuInfo()));
  for (const s of times(args.stills)) {
    const t0 = Date.now(), buf = await frameOf(page, s, 'image/png');
    const f = `${out}/t${s.toFixed(2).replace('.', '_')}.png`; writeFileSync(f, buf);
    console.log(`${f}  ${Date.now() - t0} ms`);
  }
} else if (args.png) {
  // PNG sequence (for GIFs): a loop's full cycle (frame n equals frame 0, so it isn't rendered), or --range=a:b.
  const probe = await openPage(), len = await lengthOf(probe); await probe.close();
  const [a, b] = args.range ? span(args.range) : [0, len], n = Math.round((b - a) * fps);
  const out = args.out || `out/${args.loop ? 'loop_' + args.loop : 'png'}`, workers = +(args.workers || 3); mkdirSync(out, { recursive: true });
  let next = 0; const start = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const st = {};
    while (next < n) { const i = next++; writeFileSync(`${out}/f${String(i).padStart(4, '0')}.png`, await frameOf(await pageFor(st, '#' + w), a + i / fps, 'image/png')); }
  }));
  console.log(`${n} frames → ${out}  (${((Date.now() - start) / n).toFixed(0)} ms/frame)`);
} else if (args.frames) {
  // Parallel and resumable: each worker pulls the next missing frame; files are written atomically.
  const probe = await openPage(), len = await lengthOf(probe);
  // Resuming only makes sense with the same settings: refuse to mix draft and final frames, or two styles.
  const stamp = { ...await probe.evaluate(() => ({ style: STYLE_NAME, draft: DRAFT.on ? DRAFT_OPTS : '', format: FORMAT_NAME })), fps, loop: args.loop || '' };
  await probe.close();
  const clash = checkStamp(FRAMES_DIR, stamp);
  if (clash) { console.error(`${clash}.\nSvuota la cartella e rilancia (CMD: rmdir /s /q out\\frames).`); await browser.close(); process.exit(1); }
  const [a, b] = args.range ? span(args.range) : [0, len], workers = +(args.workers || 4);
  writeStamp(FRAMES_DIR, stamp);
  const first = Math.round(a * fps), last = Math.min(Math.ceil(len * fps) - 1, Math.round(b * fps) - 1);
  const todo = []; for (let i = first; i <= last; i++) { const f = `${FRAMES_DIR}/f${String(i).padStart(5, '0')}.jpg`; if (!existsSync(f) || statSync(f).size < 1000) todo.push(i); }
  console.log(`${todo.length} frames to render (${last - first + 1 - todo.length} already done), ${workers} workers`);
  let next = 0, done = 0; const start = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const st = {};
    while (next < todo.length) {
      const i = todo[next++], f = `${FRAMES_DIR}/f${String(i).padStart(5, '0')}.jpg`;
      const buf = await frameOf(await pageFor(st, '#' + w), i / fps, 'image/jpeg', .94);
      writeFileSync(f + '.tmp', buf); renameSync(f + '.tmp', f);
      if (++done % 24 === 0 || done === todo.length) {
        const el = (Date.now() - start) / 1000;
        console.log(`frame ${done}/${todo.length}  ${(el / done * 1000).toFixed(0)} ms/frame effective  eta ${((todo.length - done) * el / done / 60).toFixed(1)} min`);
      }
    }
  }));
} else if (args.clip) {
  const page = await openPage(), len = await lengthOf(page);
  const [a, b] = args.range ? span(args.range) : typeof args.clip === 'string' ? span(args.clip) : [0, len];
  const out = args.out || 'out/clip.mp4'; mkdirSync(dirname(out), { recursive: true });
  const mixFile = 'out/tmp-mix.m4a', mixed = await mixFor(page, [a, b], mixFile);   // the sound first: it takes seconds
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    ...(mixed ? ['-i', mixFile, '-map', '0:v', '-map', '1:a', '-c:a', 'copy', '-shortest'] : []),
    ...TO_TV, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((b - a) * fps), start = Date.now(), st = { page, n: 0 };
  for (let i = 0; i < n; i++) {
    const buf = await frameOf(await pageFor(st), a + i / fps, 'image/jpeg', .93);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 24 === 0 || i === n - 1) console.log(`frame ${i + 1}/${n}  ${((Date.now() - start) / (i + 1)).toFixed(0)} ms/frame`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  if (mixed) unlinkSync(mixFile);
  console.log(`wrote ${out}${mixed ? `  (sound ${mixed.lufs} LUFS, peak ${mixed.tp} dBTP)` : ''}`);
} else if (args.mix) {
  // Only the sound, nothing drawn: the quick way to listen to a scene's effects, ambience and music.
  const page = await openPage(), len = await lengthOf(page), [a, b] = args.range ? span(args.range) : [0, len];
  const out = args.out || 'out/mix.wav'; mkdirSync(dirname(out), { recursive: true });
  const m = await mixFor(page, [a, b], out);
  if (!m) { console.error('nessun suono da mixare'); await browser.close(); process.exit(1); }
  console.log(`wrote ${out}  (${m.lufs} LUFS, picco ${m.tp} dBTP)`);
} else {
  console.log('nothing to do: see the usage notes at the top of render.mjs');
}
await browser.close();
