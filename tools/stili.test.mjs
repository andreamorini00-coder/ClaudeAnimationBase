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

// ---------- the cel technique's pure parts ----------
const celOk = { line: 1, lineInner: .6, wobble: .25, light: [-1, -1], shadow: '#8C8074', shadeK: .45, shadeSize: .22, tones: 1, outline: 'constant' };
test('a cel style missing a field is rejected by name', () => {
  const c = lib();
  assert.deepEqual(c.call('CEL.problems', { technique: 'cel', cel: celOk }), []);
  assert.match(c.call('CEL.problems', { technique: 'cel' }).join(' '), /cel/);
  const { shadeK, ...rest } = celOk;
  assert.match(c.call('CEL.problems', { technique: 'cel', cel: rest }).join(' '), /cel\.shadeK/);
  assert.deepEqual(c.call('CEL.problems', { technique: 'watercolor' }), [], 'only a cel style needs them');
});
test('cel parameters are in range', () => {
  const c = lib(), bad = o => c.call('CEL.problems', { technique: 'cel', cel: { ...celOk, ...o } }).join(' ');
  assert.match(bad({ line: 0 }), /cel\.line/);
  assert.match(bad({ shadeK: 1.5 }), /cel\.shadeK/);
  assert.match(bad({ shadeSize: 0 }), /cel\.shadeSize/);
  assert.match(bad({ light: [0, 0] }), /cel\.light/);
  assert.match(bad({ light: [1] }), /cel\.light/);
  assert.match(bad({ tones: 3 }), /cel\.tones/);
  assert.match(bad({ outline: 'tondo' }), /cel\.outline/);
  assert.match(bad({ shadow: 'viola' }), /cel\.shadow/);
  assert.match(bad({ wobble: -1 }), /cel\.wobble/);
});
test('the crescent is shifted towards the light, and its canvas holds the shape and the shifted copy', () => {
  const c = lib(), box = { x0: 100, y0: 50, x1: 300, y1: 150 };
  const r = c.call('CEL.crescent', box, [-1, -1], .2);                       // light up and to the left
  assert.ok(r.dx < 0 && r.dy < 0 && near(Math.hypot(r.dx, r.dy), .2 * 200, .5), 'verso la luce, .2 × il lato maggiore');
  assert.ok(near(r.dx, r.dy, .01), 'la luce a 45°');
  const r2 = c.call('CEL.crescent', box, [1, 0], .1);
  assert.ok(r2.dx > 0 && near(r2.dy, 0, .001));
  for (const k of [r, r2]) {
    assert.ok(k.box.x0 <= box.x0 + Math.min(0, k.dx) && k.box.x1 >= box.x1 + Math.max(0, k.dx));
    assert.ok(k.box.y0 <= box.y0 + Math.min(0, k.dy) && k.box.y1 >= box.y1 + Math.max(0, k.dy));
  }
});

// ---------- the styles' data ----------
const REQUIRED = ['technique', 'palette', 'paper', 'grain', 'brushes', 'brushScale', 'boil', 'paint', 'character', 'cel'];
const PAINT_KEYS = ['fillOp', 'bleed', 'tex', 'washOp', 'sw', 'fillAs'];
test('cozy and anime are complete cel styles', () => {
  const c = lib();
  for (const name of ['cozy', 'anime']) {
    const st = c.get(`STYLES.${name}`);
    for (const k of REQUIRED) assert.ok(st[k] != null, `${name}: manca ${k}`);
    for (const k of PAINT_KEYS) assert.ok(st.paint[k] != null, `${name}: manca paint.${k}`);
    assert.equal(st.technique, 'cel');
    assert.deepEqual(c.call('CEL.problems', st), [], name);
    for (const n of PAL_NAMES) assert.match(st.palette[n], hex, `${name}: ${n}`);
    assert.deepEqual(Object.keys(st.palette).sort(), [...PAL_NAMES].sort(), `${name}: i nomi di PAL`);
    for (const v of Object.values(st.palette)) assert.ok(!['#000000', '#FFFFFF'].includes(v.toUpperCase()), `${name}: nero o bianco puro`);
    for (const b of ['ink', 'inkfine', 'dry']) assert.ok(st.brushes[b], `${name}: pennello ${b}`);
    assert.equal(st.character.shadow, 'hard');
  }
});
test('the styles\' palettes follow the notes, and the derived colours their rule', () => {
  const c = lib(), mix = (a, b, k) => c.call('LIGHT.mixHex', a, b, k), P = n => c.get(`STYLES.${n}.palette`);
  const cozy = P('cozy'), anime = P('anime');
  // given by reference/styles/cozy/note.md
  assert.deepEqual([cozy.paper, cozy.ink, cozy.clay, cozy.clayDk, cozy.night, cozy.rose, cozy.ochre, cozy.sap, cozy.violet],
    ['#F6EBD8', '#59463B', '#D9956C', '#B8674F', '#7E8C9A', '#C99595', '#E8BF78', '#A6B39A', '#8C8074']);
  // derived
  assert.equal(cozy.clayLt, mix(cozy.clay, cozy.paper, .35));
  assert.equal(cozy.indigo, mix(cozy.night, cozy.ink, .25));
  assert.equal(cozy.teal, mix(cozy.night, cozy.sap, .4));
  assert.equal(cozy.cream, mix(cozy.paper, '#FFFFFF', .4));
  assert.equal(cozy.sky, mix(cozy.ochre, cozy.paper, .45));    // the warm afternoon sky of the mood board
  // given by reference/styles/anime/note.md
  assert.deepEqual([anime.paper, anime.ink, anime.clay, anime.night, anime.indigo, anime.ochre, anime.sap, anime.violet, anime.cream, anime.sky],
    ['#F7F2E8', '#1C2440', '#FF5D73', '#2B3766', '#555B91', '#FFD166', '#3FAE9B', '#ADA2E8', '#F7F2E8', '#427BEF']);
  assert.equal(anime.clayDk, mix(anime.clay, anime.ink, .25));
  assert.equal(anime.clayLt, mix(anime.clay, anime.paper, .35));
  assert.equal(anime.rose, mix(anime.clay, anime.violet, .3));
  assert.equal(anime.teal, mix(anime.sap, anime.sky, .35));
});
test('the styles\' shadow tones and outlines', () => {
  const c = lib(), cozy = c.get('STYLES.cozy'), anime = c.get('STYLES.anime');
  assert.equal(cozy.cel.shadow, '#8C8074'); assert.equal(anime.cel.shadow, '#555B91');
  assert.ok(anime.cel.lineInner < 1 && anime.cel.line >= 1, 'il contorno esterno dell\'anime è più spesso delle linee interne');
  assert.equal(anime.paper.stains, 0, 'l\'anime non ha texture di carta'); assert.ok(cozy.paper.stains > 0, 'cozy ha una carta leggera');
  assert.equal(c.get('STYLES.cozy.luci'), undefined, 'cozy non ha set di luci');
});

// ---------- applying a light to the page's palette (luce() in core.js is a thin wrapper) ----------
const withPal = (c, style, code) => { c.run(`globalThis.__pal = { ...STYLES.${style}.palette }; globalThis.__base = { ...STYLES.${style}.palette };`); return c.run(code); };
test('luce does not leak: a reset gives the base palette back', () => {
  const c = lib();
  withPal(c, 'anime', 'LIGHT.apply(__pal, { ...STYLES.anime, palette: __base }, "notte");');
  assert.notEqual(c.get('__pal.sky'), c.get('__base.sky'), 'la notte ha cambiato PAL');
  c.run('LIGHT.reset(__pal, { palette: __base });');
  assert.equal(JSON.stringify(c.get('__pal')), JSON.stringify(c.get('__base')));
  c.run('LIGHT.apply(__pal, { ...STYLES.anime, palette: __base }, "controluce"); LIGHT.apply(__pal, { ...STYLES.anime, palette: __base }, "giorno");');
  assert.equal(JSON.stringify(c.get('__pal')), JSON.stringify(c.get('__base')), 'giorno dopo controluce = base, senza resto');
});
test('luce is the same called once or twice, and the base palette is never changed', () => {
  const c = lib(), once = () => JSON.stringify(c.get('__pal'));
  withPal(c, 'anime', 'LIGHT.apply(__pal, { ...STYLES.anime, palette: __base }, "notte");');
  const a = once();
  c.run('LIGHT.apply(__pal, { ...STYLES.anime, palette: __base }, "notte");');
  assert.equal(once(), a);
  assert.equal(c.get('__base.sky'), c.get('STYLES.anime.palette.sky'));
});
test('luce with two lights blends them: k 0 is the first, k 1 the second', () => {
  const c = lib();
  withPal(c, 'anime', 'LIGHT.apply(__pal, { ...STYLES.anime, palette: __base }, "giorno", "notte", 1);');
  assert.equal(c.get('__pal.sky'), c.get('STYLES.anime.luci.notte.palette.sky'));
  withPal(c, 'anime', 'LIGHT.apply(__pal, { ...STYLES.anime, palette: __base }, "giorno", "notte", 0);');
  assert.equal(JSON.stringify(c.get('__pal')), JSON.stringify(c.get('__base')));
});
test('luce in a style without lights does nothing; an unknown light is an error naming the right ones', () => {
  const c = lib();
  withPal(c, 'classic', 'globalThis.__r = LIGHT.apply(__pal, { ...STYLES.classic, palette: __base }, "notte");');
  assert.equal(c.get('__r'), null);
  assert.equal(JSON.stringify(c.get('__pal')), JSON.stringify(c.get('STYLES.classic.palette')));
  assert.throws(() => c.call('LIGHT.set', c.get('STYLES.anime'), 'alba'), /Disponibili: giorno, notte, controluce/);
});

// ---------- the characters in a light ----------
import { CHAR_SCRIPTS } from './pagecode.mjs';
const both = () => loadPageScripts([...STYLE_SCRIPTS, ...CHAR_SCRIPTS]);
const charRole = (c, id, role, light) => c.call(`((l) => LIGHT.charRole(CHARACTERS.${id}, ${JSON.stringify(role)}, CHARACTERS.${id}.roles[${JSON.stringify(role)}], l && LIGHT.set(STYLES.anime, l), "anime"))`, light);
test('a character in the day light keeps all its colours, skin included', () => {
  const c = both();
  for (const id of ['gatto', 'ragazza', 'supereroe']) for (const role of Object.keys(c.get(`CHARACTERS.${id}.roles`)))
    assert.equal(charRole(c, id, role, 'giorno'), c.get(`CHARACTERS.${id}.roles.${role}`), `${id}.${role}`);
});
test('a character in the night: skin is the light\'s, the outline and whites stay, the rest takes the tone', () => {
  const c = both(), night = c.call('LIGHT.set', c.get('STYLES.anime'), 'notte');
  assert.equal(charRole(c, 'ragazza', 'skin', 'notte'), night.skin);
  assert.equal(charRole(c, 'ragazza', 'legs', 'notte'), night.skin, 'le gambe hanno il colore della pelle: seguono la pelle');
  assert.equal(charRole(c, 'supereroe', 'skinShadow', 'notte'), night.skinShadow);
  assert.equal(charRole(c, 'ragazza', 'line', 'notte'), c.get('CHARACTERS.ragazza.roles.line'));
  assert.equal(charRole(c, 'ragazza', 'eyeWhite', 'notte'), c.get('CHARACTERS.ragazza.roles.eyeWhite'));
  for (const [id, role] of [['ragazza', 'top'], ['ragazza', 'skirt'], ['gatto', 'fur'], ['supereroe', 'accent']])
    assert.notEqual(charRole(c, id, role, 'notte'), c.get(`CHARACTERS.${id}.roles.${role}`), `${id}.${role}`);
});
test('with no light at all a role is its own colour', () => {
  const c = both();
  assert.equal(charRole(c, 'gatto', 'fur', null), c.get('CHARACTERS.gatto.roles.fur'));
});
test('a character can give its own colour for a role in a light', () => {
  const c = both(), r = c.call('((spec) => LIGHT.charRole(Object.assign({}, spec, { styles: { anime: { luci: { notte: { top: "#123456" } } } } }), "top", spec.roles.top, LIGHT.set(STYLES.anime, "notte"), "anime"))', c.get('CHARACTERS.ragazza'));
  assert.equal(r, '#123456');
});
test('a part\'s own shadow role is used when the spec has one', () => {
  const c = both(), s = (id, role) => c.call('((id, role) => LIGHT.shadeRole(CHARACTERS[id], role))', id, role);
  assert.equal(s('supereroe', 'skin'), 'skinShadow');
  assert.equal(s('ragazza', 'skin'), null);
  assert.equal(s('gatto', 'fur'), null);
});
test('a mix of two lights moves a character\'s skin smoothly (no jump at the first frame of a change)', () => {
  const c = both(), own = c.get('CHARACTERS.ragazza.roles.skin');
  const at = k => c.call('((k) => LIGHT.charRole(CHARACTERS.ragazza, "skin", CHARACTERS.ragazza.roles.skin, LIGHT.mix(STYLES.anime, "giorno", "notte", k), "anime"))', k);
  assert.equal(at(0), own);
  const night = c.call('LIGHT.set', c.get('STYLES.anime'), 'notte').skin;
  assert.equal(at(1), night);
  const d = (a, b) => Math.abs(parseInt(a.slice(1, 3), 16) - parseInt(b.slice(1, 3), 16));
  assert.ok(d(at(.05), own) < d(night, own) * .25, 'a k piccolo la pelle è ancora quasi la sua');
});
test('which roles are skin: the skin and every role with the skin\'s colour', () => {
  const c = both(), is = (id, role) => c.call('((id, role) => LIGHT.isSkin(CHARACTERS[id], role))', id, role);
  assert.equal(is('ragazza', 'skin'), true);
  assert.equal(is('ragazza', 'legs'), true, 'le gambe hanno il colore della pelle');
  assert.equal(is('ragazza', 'top'), false); assert.equal(is('ragazza', 'line'), false);
  assert.equal(is('gatto', 'fur'), false);
  assert.equal(is('supereroe', 'skin'), true); assert.equal(is('supereroe', 'legs'), false);
});
test('cozy and anime give a warm shadow for skin that has no shadow role of its own', () => {
  const c = lib();
  for (const n of ['cozy', 'anime']) assert.match(c.get(`STYLES.${n}.cel.skinShadow`), hex, n);
  assert.equal(c.get('STYLES.anime.cel.skinShadow'), '#D99A86');
});

// ---------- 3a closing: scarti dalle mood board ----------
test('cozy\'s sky is the warm afternoon light of its mood board, from oro tenue towards crema', () => {
  const c = lib(), cozy = c.get('STYLES.cozy.palette');
  assert.equal(cozy.sky, c.call('LIGHT.mixHex', cozy.ochre, cozy.paper, .45));
  assert.ok(channels(cozy.sky)[0] > channels(cozy.sky)[2] + 20, 'caldo: più rosso che blu');
});
test('anime draws its characters with the style\'s ink outline, cozy with the characters\' own', () => {
  const c = lib();
  assert.equal(c.get('STYLES.anime.character.line'), c.get('STYLES.anime.palette.ink'));
  assert.equal(c.get('STYLES.cozy.character.line'), undefined);
});

// ---------- 3a final review: fixes ----------
test('a rim light fades in and out in a blend, it does not pop in', () => {
  const c = lib(), st = c.get('STYLES.anime'), rimAt = k => c.call('LIGHT.mix', st, 'giorno', 'controluce', k).rim;
  assert.equal(rimAt(0), null);
  const low = rimAt(.05);
  assert.ok(low && low.fade > 0 && near(low.fade, .05, .001), `fade ${low && low.fade}`);
  assert.ok(near(rimAt(1).fade, 1, .001));
  assert.ok(rimAt(.6).fade > rimAt(.3).fade, 'cresce con k');
  assert.ok(near(c.call('LIGHT.mix', st, 'controluce', 'giorno', .25).fade ?? c.call('LIGHT.mix', st, 'controluce', 'giorno', .25).rim.fade, .75, .001), 'e cala all\'uscita');
  const both = c.call('LIGHT.mix', st, 'controluce', 'controluce', .5).rim;
  assert.ok(near(both.fade, 1, .001), 'con il bordo in entrambe le luci resta pieno');
  assert.ok(near(c.call('LIGHT.set', st, 'controluce').rim.fade ?? 1, 1, .001));
});
test('a canvas never exceeds the texture cap: big shapes at high zoom are scaled down, not lost', () => {
  const c = lib();
  const fit = (w, h, z) => c.call('CEL.fit', w, h, z, 4096);
  assert.equal(fit(200, 100, 1.8), 1.8, 'una forma piccola non cambia');
  const z = fit(3900, 900, 2.2);
  assert.ok(3900 * z <= 4096 + 1e-6 && z < 2.2, `zoom ${z}`);
  assert.ok(fit(20000, 400, 1) <= 4096 / 20000 + 1e-9, 'una forma più larga del limite scende sotto 1');
  assert.ok(fit(500, 500, 1) === 1);
  assert.equal(c.call('CEL.finite', [[0, 0], [1, 2], [3, NaN]]), false);
  assert.equal(c.call('CEL.finite', [[0, 0], [1, 2], [3, 4]]), true);
  assert.equal(c.call('CEL.finite', [[0, 0], [Infinity, 1]]), false);
});
test('a style\'s lights are validated at load, by name', () => {
  const c = lib(), prob = st => c.call('LIGHT.problems', st);
  assert.deepEqual(prob(c.get('STYLES.anime')), []);
  assert.deepEqual(prob(c.get('STYLES.classic')), [], 'uno stile senza luci non ha problemi');
  const mk = f => { const st = JSON.parse(JSON.stringify(c.get('STYLES.anime'))); f(st); return prob(st).join(' | '); };
  assert.match(mk(s => { delete s.luci.notte.skin; }), /notte.*skin/);
  assert.match(mk(s => { delete s.luci.notte.tone; }), /notte.*tone/);
  assert.match(mk(s => { delete s.luci.controluce.shadow; }), /controluce.*shadow/);
  assert.match(mk(s => { s.luci.notte.skinShadow = 'rosa'; }), /notte.*skinShadow/);
  assert.match(mk(s => { s.luci.notte.palette.cielo = '#112233'; }), /notte.*cielo/);
  assert.match(mk(s => { s.luci.notte.palette.sky = 'blu'; }), /notte.*sky/);
  assert.match(mk(s => { delete s.luci.notte.k; }), /notte.*k/);
  assert.match(mk(s => { delete s.luci.giorno; }), /giorno/);
  assert.match(mk(s => { s.luci.controluce.rim = { colore: '#FFD166' }; }), /controluce.*rim/);
});
test('luce(da, a) without a number k is an error, not a black palette', () => {
  const c = lib();
  c.run('globalThis.__pal = { ...STYLES.anime.palette };');
  assert.throws(() => c.run('LIGHT.apply(__pal, STYLES.anime, "giorno", "notte");'), /k/);
  assert.throws(() => c.run('LIGHT.apply(__pal, STYLES.anime, "giorno", "notte", NaN);'), /k/);
  assert.doesNotThrow(() => c.run('LIGHT.apply(__pal, STYLES.anime, "giorno", "notte", 0.5);'));
});
test('cel.skinShadow, when given, is a colour', () => {
  const c = lib(), bad = v => c.call('CEL.problems', { technique: 'cel', cel: { ...celOk, skinShadow: v } }).join(' ');
  assert.match(bad('pesca'), /cel\.skinShadow/);
  assert.equal(bad('#D99A86'), '');
});
