// audio.mjs: the sound side of render.mjs. A scene declares its sounds (sounds() in src/audio.js, or LOOPS.x.sounds);
// these functions turn that plan into files and times, a music ducking curve and one ffmpeg mix graph.
// Everything here except the measuring is a pure function, tested in audio.test.mjs.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// ---------- plan ----------
const NUMBERED = /^(.*)_(\d\d)\.mp3$/;

// The files a sound name stands for: name_01.mp3, name_02.mp3… in order, or name.mp3 itself (a numbered name like
// pop_02 is a file too). [] if there is none.
export function variantsOf(name, files) {
  if (files.includes(name + '.mp3')) return [name + '.mp3'];
  return files.filter(f => { const m = f.match(NUMBERED); return m && m[1] === name; }).sort();
}
// Names a scene can use: every file without its number, plus the numbered files themselves.
const soundNames = files => [...new Set(files.filter(f => f.endsWith('.mp3')).map(f => f.replace(NUMBERED, '$1').replace(/\.mp3$/, '')))].sort();

// raw = { sfx: [[t, name, { vol, duck }]], ambience: [{ name, from, to, fadeIn, fadeOut, vol }], music: { file, vol }, voice }
// → { sfx: [{ t, file, vol, duck }], ambience: [{ file, from, to, fadeIn, fadeOut, vol }], music, duration }, with times
// shifted to the range [a, b] (the whole video by default) and whatever falls outside it left out.
// Variations are picked on the whole list, before the cut, so a clip of a video sounds like that part of the video.
export function resolvePlan(raw = {}, { files, dir, duration, range, music = '' }) {
  if (raw.voice) throw new Error('voce non ancora supportata: togli "voice" dal piano dei suoni');
  const fileOf = name => {
    const v = variantsOf(name, files);
    if (!v.length) throw new Error(`Suono "${name}" inesistente in ${dir}. Disponibili: ${soundNames(files).join(', ')}`);
    return v;
  };
  const [a, b] = range || [0, duration], seen = {};
  const sfx = (raw.sfx || []).map(([t, name, o = {}]) => ({ t, name, vol: o.vol ?? 0, duck: o.duck ?? true, v: fileOf(name) }))
    .sort((x, y) => x.t - y.t)
    .map(s => { const n = seen[s.name] = (seen[s.name] ?? -1) + 1; return { t: s.t, file: `${dir}/${s.v[n % s.v.length]}`, vol: s.vol, duck: s.duck }; })
    .filter(s => s.t >= a && s.t < b)
    .map(s => ({ ...s, t: s.t - a }));
  const ambience = (raw.ambience || []).map(m => ({ name: m.name, from: m.from ?? 0, to: m.to ?? duration, fadeIn: m.fadeIn ?? .5, fadeOut: m.fadeOut ?? .8, vol: m.vol ?? 0 }))
    .filter(m => m.to > a && m.from < b)
    .map(m => ({ file: `${dir}/${fileOf(m.name)[0]}`, from: Math.max(m.from, a) - a, to: Math.min(m.to, b) - a,
                 fadeIn: m.from >= a ? m.fadeIn : 0, fadeOut: m.to <= b ? m.fadeOut : 0, vol: m.vol }));
  const mus = raw.music?.file ? { file: raw.music.file, vol: raw.music.vol ?? 0 } : music ? { file: music, vol: 0 } : null;
  return { sfx, ambience, music: mus, duration: b - a };
}

// ---------- ducking ----------
// The music dips by DUCK.depth (0.5 = −6 dB) under every effect with duck: starting DUCK.pre before it, down in
// DUCK.down, held for the effect's length plus DUCK.hold, back up in DUCK.up. Overlapping dips take the deepest.
export const DUCK = { depth: .5, pre: .05, down: .1, hold: .2, up: .4 };
const clip01 = x => Math.min(1, Math.max(0, x));
const dip = (t, c) => { const s = c.t - DUCK.pre, e = c.t + c.dur + DUCK.hold; return clip01((t - s) / DUCK.down) * clip01((e + DUCK.up - t) / DUCK.up); };
// 0 = full music, 1 = fully ducked, at time t, for cues [{ t, dur }].
export const duckAmount = (t, cues) => cues.reduce((m, c) => Math.max(m, dip(t, c)), 0);
const num = x => String(+x.toFixed(4));
// The same curve as an ffmpeg expression in t (for volume=…:eval=frame).
export function duckExpr(cues) {
  const terms = cues.map(c => { const s = c.t - DUCK.pre, e = c.t + c.dur + DUCK.hold;
    return `clip((t-${num(s)})/${num(DUCK.down)},0,1)*clip((${num(e + DUCK.up)}-t)/${num(DUCK.up)},0,1)`; });
  return terms.length ? terms.reduce((acc, x) => `max(${acc},${x})`) : '0';
}

// ---------- mix graph ----------
// One ffmpeg filter_complex for a resolved plan: effects delayed to their times, ambiences looped and faded over their
// span, the music ducked under the effects, everything at 48 kHz stereo, summed and cut to the clip's length.
// gains/durs: per file, the dB that bring it to its category's level and its length in seconds (levelGains).
// Returns { inputs: files for -i, in order, filter, out: '[mix]' }.
export function mixGraph(plan, { gains, durs }) {
  const uses = [...plan.sfx.map(s => s.file), ...plan.ambience.map(m => m.file), ...(plan.music ? [plan.music.file] : [])];
  const inputs = [...new Set(uses)], count = {}, taken = {}, parts = [], mixIn = [];
  uses.forEach(f => count[f] = (count[f] || 0) + 1);
  inputs.forEach((f, i) => { if (count[f] > 1) parts.push(`[${i}:a]asplit=${count[f]}${Array.from({ length: count[f] }, (_, k) => `[i${i}_${k}]`).join('')}`); });
  const src = f => { const i = inputs.indexOf(f), k = taken[f] = (taken[f] ?? -1) + 1; return count[f] > 1 ? `[i${i}_${k}]` : `[${i}:a]`; };
  const base = (f, vol) => `aresample=48000,aformat=channel_layouts=stereo,volume=${num((gains[f] ?? 0) + vol)}dB`;
  plan.sfx.forEach((s, k) => { parts.push(`${src(s.file)}${base(s.file, s.vol)},adelay=${Math.round(s.t * 1000)}:all=1[s${k}]`); mixIn.push(`[s${k}]`); });
  plan.ambience.forEach((m, k) => {
    const d = m.to - m.from, fx = [`aloop=loop=-1:size=2000000000`, `atrim=duration=${num(d)}`];
    if (m.fadeIn > 0) fx.push(`afade=t=in:d=${num(m.fadeIn)}`);
    if (m.fadeOut > 0) fx.push(`afade=t=out:st=${num(d - m.fadeOut)}:d=${num(m.fadeOut)}`);
    parts.push(`${src(m.file)}${base(m.file, m.vol)},${fx.join(',')},adelay=${Math.round(m.from * 1000)}:all=1[a${k}]`); mixIn.push(`[a${k}]`);
  });
  if (plan.music) {
    const cues = plan.sfx.filter(s => s.duck).map(s => ({ t: s.t, dur: durs[s.file] ?? 1 }));
    const duck = cues.length ? `,volume='1-${num(DUCK.depth)}*(${duckExpr(cues)})':eval=frame` : '';
    parts.push(`${src(plan.music.file)}${base(plan.music.file, plan.music.vol)}${duck},atrim=duration=${num(plan.duration)}[m0]`); mixIn.push('[m0]');
  }
  parts.push(`${mixIn.join('')}amix=inputs=${mixIn.length}:normalize=0:duration=longest,apad,atrim=duration=${num(plan.duration)}[mix]`);
  return { inputs, filter: parts.join(';'), out: '[mix]' };
}

// ---------- levels ----------
// Every file is brought to its category's loudness before the mix (the files range from about -14 to -48 LUFS), then
// each sound's vol is added on top. Measures are cached by path, size and modification time.
export const TARGETS = { sfx: -18, ambience: -30, music: -20 };
const MAX_GAIN = 30;   // a near-silent file isn't pushed into noise

const ffmpegOut = args => new Promise((ok, bad) => {
  const p = spawn('ffmpeg', args); let err = '';
  p.stderr.on('data', d => err += d); p.on('close', c => c ? bad(new Error('ffmpeg: ' + err.slice(-400))) : ok(err));
});
// { lufs, dur } of one file: integrated loudness (ebur128) and length in seconds.
export async function measureFile(file) {
  const log = await ffmpegOut(['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128', '-f', 'null', '-']);
  const lufs = +log.match(/Integrated loudness:\s*\n\s*I:\s*(-?[\d.]+|-inf)/)[1].replace('-inf', '-70');
  const t = [...log.matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop(), d = log.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const [, h, m, sec] = d || t;
  return { lufs, dur: +h * 3600 + +m * 60 + +sec };
}
// { gains: { file: dB }, durs: { file: s } } for every file in a resolved plan.
export async function levelGains(plan, { cachePath = 'out/audio-cache.json', measure = measureFile } = {}) {
  const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};
  const cat = {}; plan.sfx.forEach(s => cat[s.file] = 'sfx'); plan.ambience.forEach(m => cat[m.file] = 'ambience'); if (plan.music) cat[plan.music.file] = 'music';
  const gains = {}, durs = {};
  for (const [file, c] of Object.entries(cat)) {
    const st = statSync(file), hit = cache[file];
    const m = hit && hit.size === st.size && hit.mtimeMs === st.mtimeMs ? hit : { ...(await measure(file)), size: st.size, mtimeMs: st.mtimeMs };
    cache[file] = m;
    gains[file] = Math.min(MAX_GAIN, TARGETS[c] - m.lufs); durs[file] = m.dur;
  }
  mkdirSync(dirname(cachePath), { recursive: true }); writeFileSync(cachePath, JSON.stringify(cache, null, 1));
  return { gains, durs };
}

// ---------- final mix ----------
// LOUD: the social target (-14 LUFS, peaks under -1 dBTP). Two loudnorm passes: the first measures the mix, the second
// applies a linear gain to it. TP aims at -1.5 because AAC encoding lifts true peaks by a few tenths of a dB.
export const LOUD = { I: -14, TP: -1.5, LRA: 11 };
const lastJson = log => JSON.parse(log.slice(log.lastIndexOf('{'), log.lastIndexOf('}') + 1));
// Mixes a resolved plan to out (.wav, or .m4a for AAC 192 kbps), 48 kHz. Returns { lufs, tp } of the result.
export async function renderMix(plan, { out, gains, durs }) {
  const g = mixGraph(plan, { gains, durs }), ins = g.inputs.flatMap(f => ['-i', f]), ln = `loudnorm=I=${LOUD.I}:TP=${LOUD.TP}:LRA=${LOUD.LRA}`;
  const m = lastJson(await ffmpegOut(['-hide_banner', '-nostats', ...ins, '-filter_complex', `${g.filter};${g.out}${ln}:print_format=json[o]`, '-map', '[o]', '-f', 'null', '-']));
  const second = `${ln}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=json`;
  const codec = out.endsWith('.m4a') ? ['-c:a', 'aac', '-b:a', '192k'] : [];
  const r = lastJson(await ffmpegOut(['-hide_banner', '-nostats', '-y', ...ins, '-filter_complex', `${g.filter};${g.out}${second},aresample=48000[o]`,
    '-map', '[o]', '-ar', '48000', ...codec, out]));
  return { lufs: +r.output_i, tp: +r.output_tp };
}
