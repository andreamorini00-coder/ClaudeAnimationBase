// audio.mjs: the sound side of render.mjs. A scene declares its sounds (sounds() in src/audio.js, or LOOPS.x.sounds);
// these functions turn that plan into files and times, a music ducking curve and one ffmpeg mix graph.
// Everything here except the measuring is a pure function, tested in audio.test.mjs.

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
