// stili.test.mjs: the looks (Phase 3): the pure lighting functions, the style files' data, the palettes. No browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPageScripts, STYLE_SCRIPTS } from './pagecode.mjs';

const lib = () => loadPageScripts(STYLE_SCRIPTS);
const PAL_NAMES = ['paper', 'ink', 'clay', 'clayDk', 'clayLt', 'night', 'indigo', 'rose', 'ochre', 'sap', 'teal', 'violet', 'cream', 'sky'];
const hex = /^#[0-9A-Fa-f]{6}$/;
const channels = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hueDiff = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

test('contrast and luminance', () => {
  const c = lib();
  assert.ok(near(c.call('LIGHT.contrast', '#000000', '#FFFFFF'), 21, .01));
  assert.equal(c.call('LIGHT.contrast', '#2B3766', '#2B3766'), 1);
  // the colours of the mood board: the outline on the night sky is a low contrast, as in the reference
  assert.ok(near(c.call('LIGHT.contrast', '#1C2440', '#2B3766'), 1.34, .05));
  assert.ok(near(c.call('LIGHT.hue', '#FF0000'), 0, .5) && near(c.call('LIGHT.hue', '#00FF00'), 120, .5) && near(c.call('LIGHT.hue', '#0000FF'), 240, .5));
});

const lights = c => { const st = c.get('STYLES.anime'); return Object.keys(st.luci).map(n => [n, c.call('LIGHT.set', st, n)]); };
test('anime has the three lights, each a complete set', () => {
  const c = lib(), st = c.get('STYLES.anime');
  assert.deepEqual(Object.keys(st.luci), ['giorno', 'notte', 'controluce']);
  for (const [n, s] of lights(c)) {
    for (const k of PAL_NAMES) assert.match(s.palette[k], hex, `${n}: ${k}`);
    for (const k of ['ink', 'tone', 'skin', 'skinShadow', 'shadow']) assert.match(s[k], hex, `${n}: ${k}`);
    assert.equal(typeof s.k, 'number');
    for (const v of Object.values(s.palette)) assert.ok(v.toUpperCase() !== '#000000' && v.toUpperCase() !== '#FFFFFF', `${n}: nero o bianco puro`);
  }
  assert.equal(c.call('LIGHT.set', st, 'giorno').k, 0);
  assert.equal(JSON.stringify(c.call('LIGHT.set', st, 'giorno').palette), JSON.stringify(st.palette));
});
test('anime lights: the outline stays readable at night', () => {
  const c = lib(), st = c.get('STYLES.anime'), L = Object.fromEntries(lights(c));
  assert.ok(c.call('LIGHT.contrast', L.giorno.ink, L.giorno.palette.night) >= 1.3, 'giorno');
  assert.ok(c.call('LIGHT.contrast', L.notte.ink, L.notte.palette.sky) >= 1.5, 'notte su sky');
  assert.ok(c.call('LIGHT.contrast', L.notte.ink, L.notte.palette.night) >= 1.5, 'notte su night');
  for (const [n, s] of Object.entries(L)) for (const bg of ['sky', 'night']) assert.notEqual(s.ink.toUpperCase(), s.palette[bg].toUpperCase(), `${n}: ink = ${bg}`);
  assert.ok(st.luci.notte.ink && st.luci.notte.ink !== st.palette.ink, 'il contorno di notte è più scuro');
});
test('anime lights: skin stays skin', () => {
  const c = lib(), skin = c.call('LIGHT.hue', '#F5C6A5'), shade = c.call('LIGHT.hue', '#D99A86');
  for (const [n, s] of lights(c)) {
    const [r, , b] = channels(s.skin);
    assert.ok(hueDiff(c.call('LIGHT.hue', s.skin), skin) <= 25, `${n}: tinta della pelle`);
    assert.ok(hueDiff(c.call('LIGHT.hue', s.skinShadow), shade) <= 25, `${n}: tinta dell'ombra della pelle`);
    assert.ok(r - b > 20, `${n}: la pelle è rosa o grigia`);
    assert.ok(channels(s.skinShadow)[0] - channels(s.skinShadow)[2] > 20, `${n}: l'ombra della pelle è rosa o grigia`);
  }
});
test('a mix of two lights goes from one to the other', () => {
  const c = lib(), st = c.get('STYLES.anime'), S = n => c.call('LIGHT.set', st, n), same = (a, b) => assert.deepEqual(a, b);
  const strip = s => ({ palette: s.palette, tone: s.tone, k: s.k, skin: s.skin, skinShadow: s.skinShadow, shadow: s.shadow, ink: s.ink });
  same(strip(c.call('LIGHT.mix', st, 'giorno', 'notte', 0)), strip(S('giorno')));
  same(strip(c.call('LIGHT.mix', st, 'giorno', 'notte', 1)), strip(S('notte')));
  same(strip(c.call('LIGHT.mix', st, 'notte', 'notte', .5)), strip(S('notte')));
  const mid = c.call('LIGHT.mix', st, 'giorno', 'notte', .5);
  assert.ok(mid.k > 0 && mid.k < S('notte').k);
  assert.notEqual(mid.palette.sky, S('giorno').palette.sky); assert.notEqual(mid.palette.sky, S('notte').palette.sky);
});
test('a light in a role: the outline and the whites stay, the skin is the set\'s, the rest takes the tone', () => {
  const c = lib(), st = c.get('STYLES.anime'), night = c.call('LIGHT.set', st, 'notte'), day = c.call('LIGHT.set', st, 'giorno');
  assert.equal(c.call('LIGHT.role', '#59463B', 'line', night), '#59463B');
  assert.equal(c.call('LIGHT.role', '#F6EBD8', 'eyeWhite', night), '#F6EBD8');
  assert.equal(c.call('LIGHT.role', '#123456', 'skin', night), night.skin);
  assert.equal(c.call('LIGHT.role', '#123456', 'skinShadow', night), night.skinShadow);
  assert.notEqual(c.call('LIGHT.role', '#D9956C', 'fur', night), '#D9956C');
  assert.equal(c.call('LIGHT.role', '#D9956C', 'fur', day), '#D9956C', 'di giorno i ruoli non cambiano');
});
test('only the backlight has a rim light', () => {
  const c = lib();
  for (const [n, s] of lights(c)) assert.equal(!!s.rim, n === 'controluce', n);
  const rim = lights(c).find(([n]) => n === 'controluce')[1].rim;
  assert.match(rim.colore, hex); assert.ok(rim.spessore > 0);
});
