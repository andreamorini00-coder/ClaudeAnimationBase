// testi.test.mjs: the texts layer (Phase 2c): the pure part of src/testi.js. No browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPageScripts, TESTI_SCRIPTS } from './pagecode.mjs';

const lib = () => loadPageScripts(TESTI_SCRIPTS);
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const v = (da, a, testo = 'Ciao', o = {}) => ({ da, a, testo, ...o });
const misura = (s, size = 10) => s.length * size * .5;          // a fake font: half the size per letter
const FORMATI = {
  landscape: { nome: 'landscape', w: 1920, h: 1080, safe: { top: 0, bottom: 0, left: 0, right: 0, subs: null } },
  vertical: { nome: 'vertical', w: 1080, h: 1920, safe: { top: 220, bottom: 420, left: 0, right: 140, subs: [1150, 1500] } },
  feed: { nome: 'feed', w: 1080, h: 1350, safe: { top: 60, bottom: 60, left: 100, right: 100, subs: [940, 1170] } },
};

test('problems: a good list has none', () => {
  const c = lib();
  assert.deepEqual(c.call('TESTI.problems', [v(1, 3), v(0, 4, 'Titolo', { tipo: 'titolo' }), v(5, 7, 'è à ù ’ …', { battuta: 1.2 })], 10), []);
  assert.deepEqual(c.call('TESTI.problems', [], 10), []);
});
test('problems: each wrong field is named, with the index of the text', () => {
  const c = lib(), p = (voce, d = 10) => c.call('TESTI.problems', [voce], d).join(' | ');
  assert.match(p({ a: 3, testo: 'x' }), /testo 1: .*da/);
  assert.match(p({ da: 1, testo: 'x' }), /testo 1: .*a/);
  assert.match(p(v(3, 3)), /a.*maggiore/); assert.match(p(v(3, 2)), /a.*maggiore/);
  assert.match(p(v(-1, 2)), /da.*0/);
  assert.match(p(v(1, 11)), /oltre la durata/);
  assert.match(p(v(1, 3, '')), /testo vuoto/); assert.match(p(v(1, 3, '   ')), /testo vuoto/);
  assert.match(p(v(1, 3, 42)), /testo.*stringa/);
  assert.match(p(v(1, 3, 'x', { tipo: 'didascalia' })), /tipo.*sottotitolo, titolo/);
  assert.match(p(v(1, 3, 'x', { battuta: -1 })), /battuta/); assert.match(p(v(1, 3, 'x', { battuta: 'due' })), /battuta/);
  assert.match(c.call('TESTI.problems', [v(1, 3), v(5, 4)], 10).join(' '), /testo 2/);
  assert.match(c.call('TESTI.problems', 'no', 10).join(' '), /elenco/);
});
test('problems flags characters the local font does not have', () => {
  const c = lib(), p = t => c.call('TESTI.problems', [v(1, 3, t)], 10).join(' ');
  assert.equal(p('Perché è già così? « » “ ” — …'), '');
  assert.match(p('Ciao 😀'), /carattere fuori dal font/); assert.match(p('Привет'), /П/); assert.match(p('你好'), /你/);
  assert.equal(p('due\nrighe'), '', 'a capo ammesso');
});
test('at: fades in and out in 0.2 s', () => {
  const c = lib(), L = [v(1, 3)], at = t => c.call('TESTI.at', L, t);
  assert.deepEqual(at(.9), []); assert.deepEqual(at(1), [], 'a `da` ancora invisibile');
  assert.ok(near(at(1.1)[0].alpha, .5, 1e-9)); assert.equal(at(1.2)[0].alpha, 1); assert.equal(at(2)[0].alpha, 1);
  assert.ok(near(at(2.9)[0].alpha, .5, 1e-9)); assert.deepEqual(at(3), []); assert.deepEqual(at(5), []);
  assert.equal(at(2)[0].testo, 'Ciao');
});
test('at: a short text never goes above its own fade', () => {
  const c = lib(), r = c.call('TESTI.at', [v(1, 1.2)], 1.1); assert.ok(near(r[0].alpha, .5, 1e-9));
});
test('wrap: words, newlines, a long word, empty', () => {
  const c = lib(), m = '(s) => s.length * 10', w = (t, n) => c.call(`((t, n) => TESTI.wrap(t, n, ${m}))`, t, n);
  assert.deepEqual(w('uno due tre', 70), ['uno due', 'tre']);
  assert.deepEqual(w('a\nb', 70), ['a', 'b']);
  assert.deepEqual(w('abcdefghijkl', 50).every(r => r.length <= 5), true); assert.equal(w('abcdefghijkl', 50).join(''), 'abcdefghijkl');
  assert.deepEqual(w('', 70), []); assert.deepEqual(w('   ', 70), []);
  assert.deepEqual(w('è già così', 1000), ['è già così'], 'accenti');
});
const lay = (c, voce, f) => c.call(`((voce, f) => TESTI.layout(voce, f, ${misura.toString()}))`, voce, FORMATI[f]);
test('layout: a subtitle sits in the band of the format, 1.5 times the old size', () => {
  const c = lib(), L = lay(c, v(1, 3, 'Ma dov\'è finito?'), 'vertical');
  assert.equal(L.fuori, false); assert.ok(L.y >= 1150 && L.y + L.h <= 1500, `${L.y} ${L.h}`);
  assert.equal(L.size, 81);
  const P = lay(c, v(1, 3, 'Ciao'), 'landscape'); assert.ok(P.y >= 1080 * .76 - 1e-9 && P.y + P.h <= 1080 * .94 + 1e-9); assert.equal(P.size, 66);
  const F = lay(c, v(1, 3, 'Ciao'), 'feed'); assert.ok(F.y >= 940 && F.y + F.h <= 1170); assert.equal(F.size, 75);
  assert.deepEqual(JSON.parse(JSON.stringify(c.get('TESTI.CORPO'))), { landscape: 66, vertical: 81, feed: 75 });
  assert.deepEqual(JSON.parse(JSON.stringify(c.get('TESTI.CORPO_TITOLO'))), { landscape: 88, vertical: 108, feed: 100 });
});
test('layout: the plate is centred on the frame; the safe zone only limits it', () => {
  const c = lib();
  for (const f of ['vertical', 'feed', 'landscape']) { const L = lay(c, v(1, 3, 'Ciao'), f); assert.ok(near(L.x, FORMATI[f].w / 2, 1e-9), `${f}: x ${L.x}`); }
  // a plate that would cross the right safe margin (vertical: 940) is moved left, just enough; it never crosses the left one
  const W = lay(c, v(1, 3, 'abcdefghi abcdefghi'), 'vertical');
  assert.ok(W.x < 540 && near(W.x + W.w / 2, 940, 1e-6), `${W.x} ${W.w}`); assert.ok(W.x - W.w / 2 >= 0); assert.equal(W.fuori, false);
  const F = lay(c, v(1, 3, 'abcdefghi abcdefghi abcdefgh'), 'feed'); assert.ok(F.x - F.w / 2 >= 100 - 1e-6 && F.x + F.w / 2 <= 980 + 1e-6);
});
test('layout: a title sits under the top safe margin, bigger', () => {
  const c = lib(), T = lay(c, v(1, 5, 'Il gatto', { tipo: 'titolo' }), 'vertical');
  assert.ok(T.y >= 260 - 1e-9); assert.equal(T.size, 108); assert.equal(T.fuori, false);
});
test('layout: a long subtitle shrinks, then is out', () => {
  const c = lib(), long = Array(8).fill('abcde').join(' ');
  const L = lay(c, v(1, 3, long), 'vertical');
  assert.ok(L.size < 81 && L.size >= 81 * .7 - 1e-9, `${L.size}`); assert.equal(L.fuori, false);
  assert.ok(L.righe.length <= 2);
  assert.equal(lay(c, v(1, 3, Array(80).fill('abcde').join(' ')), 'vertical').fuori, true);
  assert.equal(lay(c, v(1, 3, 'x'.repeat(300)), 'feed').fuori, true, 'una parola enorme');
});
test('layout: stays inside the side safe margins', () => {
  const c = lib(), L = lay(c, v(1, 3, 'una frase abbastanza lunga da andare a capo nel formato feed ' + 'parola '.repeat(3)), 'feed');
  assert.ok(L.x - L.w / 2 >= 100 - 1e-9 && L.x + L.w / 2 <= 1080 - 100 + 1e-9, `${L.x} ${L.w}`);
});
test('layout: the plate has more room at the sides than above and below', () => {
  const c = lib(), L = lay(c, v(1, 3, 'Ciao'), 'vertical');
  assert.ok(L.padX > L.padY && L.padX >= L.size * .4 && L.padY > 0, `${L.padX} ${L.padY}`);
  assert.ok(near(L.h, L.righe.length * L.size * 1.25 + 2 * L.padY, 1e-6));
});
test('layout: a short title shrinks until it fits on one line', () => {
  const c = lib(), T = lay(c, v(1, 5, 'Il gatto e il mostro', { tipo: 'titolo' }), 'vertical');
  assert.equal(T.righe.length, 1); assert.ok(T.size < 108 && T.size >= 108 * .7 - 1e-9, `${T.size}`); assert.equal(T.fuori, false);
  assert.equal(lay(c, v(1, 5, 'Il gatto', { tipo: 'titolo' }), 'vertical').size, 108, 'se sta già a una riga resta grande');
});
test('layout: a long title is balanced over lines of similar length, none ending with a short article or preposition', () => {
  const c = lib(), T = lay(c, v(1, 5, 'Il gatto e il mostro che non voleva dormire mai', { tipo: 'titolo' }), 'vertical');
  assert.ok(T.righe.length >= 2 && T.righe.length <= 3, T.righe.join(' / ')); assert.equal(T.fuori, false);
  const widths = T.righe.map(r => r.length); assert.ok(Math.max(...widths) - Math.min(...widths) <= 14, `${widths}`);
  for (const r of T.righe.slice(0, -1)) assert.doesNotMatch(r, /\b(il|lo|la|i|gli|le|un|uno|una|di|a|da|in|con|su|per|tra|fra|e|ed|o|ma|che|non)$/i, r);
});
test('balance: even lines, no short word hanging at the end of a line', () => {
  const c = lib(), b = (t, n) => c.call(`((t, n) => TESTI.balance(t, n, (s) => s.length * 10))`, t, n);
  assert.deepEqual(b('Il gatto e il mostro', 130), ['Il gatto', 'e il mostro'], 'greedy would be "Il gatto e il / mostro"');
  assert.deepEqual(b('La casa di Marco è grande', 160), ['La casa di Marco', 'è grande'], 'non "La casa di / Marco è grande"');
  assert.deepEqual(b('Ciao a tutti', 500), ['Ciao a tutti'], 'una riga se ci sta');
  assert.deepEqual(b('uno due\ntre quattro', 500), ['uno due', 'tre quattro'], 'gli a capo espliciti restano');
  assert.deepEqual(b('', 100), []);
  const eq = b('alfa beta gamma delta epsilon zeta eta theta', 190); assert.equal(eq.length, 3);
  assert.ok(Math.max(...eq.map(r => r.length)) - Math.min(...eq.map(r => r.length)) <= 6, eq.join(' / '));
  assert.ok(b('abcdefghijkl uno', 50).every(r => r.length <= 5), 'una parola troppo lunga si spezza come prima');
});
test('leggi: the roadmap\'s rules', () => {
  const c = lib(), l = (voce, d = 100, r) => c.call('TESTI.leggi', [voce], d, r);
  const r = l(v(1, 2.2, 'o'));
  assert.equal(r.length, 1); assert.match(r[0], /1,0–2,2 s «o»: resta 1,2 s, ne servono 1,8/);
  assert.deepEqual(l(v(1, 2.8, 'o')), [], 'almeno 1,8 s');
  assert.equal(l(v(0, 2.3, 'ok', { battuta: 2 })).length, 1); assert.deepEqual(l(v(0, 2.6, 'ok', { battuta: 2 })), [], 'battuta + 0,6 s');
  const t24 = 'abcdefgh abcdefgh abcdefgh';                               // 24 letters: 24 / 15 + 1,5 + 0,2 = 3,3 s
  assert.equal(l(v(0, 3.2, t24)).length, 1); assert.deepEqual(l(v(0, 3.3, t24)), []);
  assert.equal(l(v(0, 3.9, 'Gatto', { tipo: 'titolo' })).length, 1); assert.match(l(v(0, 3.9, 'Gatto', { tipo: 'titolo' }))[0], /titolo/);
  assert.deepEqual(l(v(0, 4, 'Gatto', { tipo: 'titolo' })), []);
});
test('leggi: kids\' speed is slower', () => {
  const c = lib(), voce = v(0, 3.3, 'abcdefgh abcdefgh abcdefgh');
  assert.deepEqual(c.call('TESTI.leggi', [voce], 100, 'base'), []);
  const k = c.call('TESTI.leggi', [voce], 100, 'bambini'); assert.equal(k.length, 1); assert.match(k[0], /lettere ÷ 13/);
  assert.deepEqual(JSON.parse(JSON.stringify(c.get('TESTI.LETTURA'))), { base: 15, bambini: 13 });
});
test('leggi: unknown profile throws and lists the profiles', () => {
  const c = lib();
  assert.throws(() => c.call('TESTI.leggi', [], 10, 'boh'), /Lettura "boh" inesistente\. Disponibili: base, bambini/);
});
test('leggi: overlapping subtitles are reported, a title over a subtitle is not', () => {
  const c = lib(), s = (a, b) => v(a, b, 'Una frase lunga abbastanza per restare', {});
  assert.match(c.call('TESTI.leggi', [s(0, 5), s(4, 9)], 100).join(' '), /si sovrappongono/);
  assert.deepEqual(c.call('TESTI.leggi', [s(0, 5), s(5, 10)], 100), [], 'uno dopo l\'altro');
  assert.deepEqual(c.call('TESTI.leggi', [s(0, 5), v(0, 5, 'Titolo grande', { tipo: 'titolo' })], 100), []);
});
test('controllo: all the problems, no duplicates, no NaN with extreme values', () => {
  const c = lib(), f = `(l, d, r) => TESTI.controllo(l, d, r, ${JSON.stringify(FORMATI.vertical)}, ${misura.toString()})`;
  const run = (l, d = 10, r = 'base') => c.call(`(${f})`, l, d, r);
  assert.deepEqual(run([]), []);
  const bad = run([v(1, 1.5, 'ok'), v(9, 12, 'x'), v(3, 4, '')]);
  assert.ok(bad.length >= 3); assert.equal(new Set(bad).size, bad.length);
  assert.match(run([v(1, 9, Array(80).fill('abcde').join(' '))]).join(' '), /non entra nel formato vertical/);
  for (const l of [[v(0, 1e9, 'x')], [v(1e9, 2e9)], [v(0, 1e-9, 'x')], [{}], [null], [v(NaN, 2)]]) assert.ok(!JSON.stringify(run(l, 1e12)).includes('NaN'), JSON.stringify(l));
});
test('srt: format, order, titles left out', () => {
  const c = lib(), r = c.call('TESTI.srt', [v(4.4, 8, 'Secondo\nrigo'), v(.3, 4.3, 'Titolo', { tipo: 'titolo' }), v(1.2, 3.6, 'Primo')]);
  assert.equal(r, '1\n00:00:01,200 --> 00:00:03,600\nPrimo\n\n2\n00:00:04,400 --> 00:00:08,000\nSecondo\nrigo\n\n');
  assert.equal(c.call('TESTI.srt', [v(0, 3661.5, 'Lungo')]), '1\n00:00:00,000 --> 01:01:01,500\nLungo\n\n');
  assert.equal(c.call('TESTI.srt', [v(0, 3, 'T', { tipo: 'titolo' })]), '');
});

// ---------- what to draw (TESTI.draw: pure, no canvas) ----------
const PALD = { ink: '#15151B', paper: '#F7F2E8' };
const draw = (c, voce, f = 'vertical') => c.call(`((voce, f) => { const lay = TESTI.layout(voce, f, ${misura.toString()}); return TESTI.draw(voce, lay, ${JSON.stringify(PALD)}); })`, voce, FORMATI[f]);
test('draw: the plate is the ink at 72% and the text is the paper', () => {
  const c = lib(), d = draw(c, { ...v(1, 5), alpha: 1 });
  assert.equal(d.placca.fill, 'rgba(21,21,27,0.72)');
  assert.ok(d.righe.length > 0); for (const r of d.righe) assert.equal(r.fill, '#F7F2E8');
});
test('draw: subtitles use Atkinson Hyperlegible Bold, titles Permanent Marker, and no system font is in the stack', () => {
  const c = lib(), sub = draw(c, { ...v(1, 5), alpha: 1 }), tit = draw(c, { ...v(1, 5, 'Titolo', { tipo: 'titolo' }), alpha: 1 });
  assert.match(sub.righe[0].font, /^700 \d+(\.\d+)?px "Atkinson Hyperlegible"$/); assert.match(tit.righe[0].font, /^\d+(\.\d+)?px "Permanent Marker"$/);
  for (const f of [sub.righe[0].font, tit.righe[0].font]) assert.doesNotMatch(f, /sans|serif|cursive|Arial|Segoe|Comic|system/i);
});
test('draw: the lines are centred inside the plate, in order', () => {
  const c = lib(), d = draw(c, { ...v(1, 5, 'abcde '.repeat(20).trim()), alpha: 1 });
  assert.ok(d.righe.length >= 2);
  d.righe.forEach((r, i) => { assert.equal(r.x, d.placca.x + d.placca.w / 2); assert.ok(r.y > d.placca.y && r.y < d.placca.y + d.placca.h); if (i) assert.ok(r.y > d.righe[i - 1].y); });
});
test('draw: alpha scales the plate and the text', () => {
  const c = lib(), d = draw(c, { ...v(1, 5), alpha: .5 });
  assert.equal(d.placca.fill, 'rgba(21,21,27,0.36)'); for (const r of d.righe) assert.equal(r.alpha, .5);
});
