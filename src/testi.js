// testi.js: the texts layer: subtitles and titles painted by the page over the finished frame (over the grain), declared in the
// scene with the times of its animation, like sounds() for the audio. Off by default: a scene with no testi() is byte for byte
// what it was. The "No text" rule of ANIMATION_GUIDE.md is about the painted scene; this layer is separate from it.
//   testi([{ da, a, testo, tipo, battuta }, ...])      seconds on the scene's timeline; tipo 'sottotitolo' (default) or 'titolo';
//                                                       battuta: seconds of spoken line (the field the voice will fill)
// A loop declares its own as LOOPS.name.testi = [...].
// TESTI is the pure part (numbers and strings in, numbers and strings out: tested without a browser); the page functions at the
// bottom measure, check and draw. Only local fonts: Permanent Marker for titles, Atkinson Hyperlegible Bold for subtitles (a system
// font would differ from machine to machine and break the byte-identical checks).
const TESTI = {
  LETTURA: { base: 15, bambini: 13 },          // letters per second a reader takes in: --lettura=bambini for the slower one
  FADE: .2,                                    // seconds in and out
  CORPO: { landscape: 66, vertical: 81, feed: 75 },   // a subtitle's size in px, by format (1.5 times the first draft)
  CORPO_TITOLO: { landscape: 88, vertical: 108, feed: 100 },   // a title's, in Permanent Marker (unchanged from the first draft)
  TIPI: ['sottotitolo', 'titolo'],
  PADX: .45, PADY: .2,                         // the room between the text and the edge of its plate, times the size: more at the sides
  SIDE: 40,                                    // px the plate keeps from the safe margins at the sides
  // the short words an Italian line never ends with (articles, prepositions, conjunctions): the next line starts with them
  FUNC: new Set(['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'e', 'ed', 'o', 'ma', 'che', 'non',
    'del', 'dello', 'della', 'dei', 'degli', 'delle', 'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle',
    'nel', 'nello', 'nella', 'nei', 'negli', 'nelle', 'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle', 'si', 'mi', 'ti', 'ci', 'vi']),
  LINE: 1.25,                                  // line height, times the size
  MINIMO: .7,                                  // the smallest share of its size a text may shrink to
  // what the local fonts have (the latin subset: Latin-1, the punctuation block, a few symbols)
  GLYPHS: /[^\n -ÿıŒœʻʼˆ˚˜ -⁯€™↑↓−∕]/u,
  tipo: voce => voce.tipo || 'sottotitolo',
  letters: testo => String(testo).replace(/\s/g, '').length,
  valid: voce => !!voce && typeof voce === 'object' && Number.isFinite(voce.da) && Number.isFinite(voce.a) && typeof voce.testo === 'string' && voce.testo.trim() !== '',
  sec: x => (Math.round(x * 10) / 10).toFixed(1).replace('.', ','),
  // The problems with the shape of the list, one string each, naming the text (1, 2, …); [] when it is fine.
  problems(lista, durata) {
    if (!Array.isArray(lista)) return ['testi: serve un elenco di voci'];
    const errs = [];
    lista.forEach((voce, i) => {
      const n = `testo ${i + 1}: `;
      if (!voce || typeof voce !== 'object') { errs.push(n + 'serve un oggetto { da, a, testo }'); return; }
      const num = typeof voce.da === 'number' && Number.isFinite(voce.da), numA = typeof voce.a === 'number' && Number.isFinite(voce.a);
      if (!num) errs.push(n + 'manca da (secondi)'); else if (voce.da < 0) errs.push(n + 'da deve essere 0 o più');
      if (!numA) errs.push(n + 'manca a (secondi)'); else if (num && voce.a <= voce.da) errs.push(n + 'a deve essere maggiore di da');
      if (numA && durata != null && voce.a > durata) errs.push(n + `a (${TESTI.sec(voce.a)} s) è oltre la durata (${TESTI.sec(durata)} s)`);
      if (typeof voce.testo !== 'string') errs.push(n + 'testo deve essere una stringa');
      else if (voce.testo.trim() === '') errs.push(n + 'testo vuoto');
      else { const bad = Array.from(voce.testo).find(ch => TESTI.GLYPHS.test(ch)); if (bad) errs.push(n + `carattere fuori dal font locale: «${bad}»`); }
      if (voce.tipo != null && !TESTI.TIPI.includes(voce.tipo)) errs.push(n + `tipo "${voce.tipo}" sconosciuto (${TESTI.TIPI.join(', ')})`);
      if (voce.battuta != null && !(typeof voce.battuta === 'number' && Number.isFinite(voce.battuta) && voce.battuta >= 0)) errs.push(n + 'battuta deve essere un numero di secondi, 0 o più');
    });
    return errs;
  },
  // The texts on screen at t, each with alpha 0..1 (a fade of FADE seconds in and out); one at alpha 0 is not on screen.
  at(lista, t) {
    const out = [];
    for (const voce of lista) {
      if (!TESTI.valid(voce) || t < voce.da || t >= voce.a) continue;
      const alpha = Math.round(Math.max(0, Math.min(1, (t - voce.da) / TESTI.FADE, (voce.a - t) / TESTI.FADE)) * 1e6) / 1e6;
      if (alpha > 0) out.push({ ...voce, alpha });
    }
    return out;
  },
  // Lines no wider than `larghezza` (misura(line) in px): at the words and at \n; a word wider than that breaks by letters.
  wrap(testo, larghezza, misura) {
    const lines = [];
    for (const par of String(testo).split('\n')) {
      let line = '';
      for (const word of par.split(/\s+/).filter(Boolean)) {
        const joined = line ? line + ' ' + word : word;
        if (misura(joined) <= larghezza) { line = joined; continue; }
        if (line) { lines.push(line); line = ''; }
        let rest = word;
        while (rest && misura(rest) > larghezza) {
          let k = 1; while (k < rest.length && misura(rest.slice(0, k + 1)) <= larghezza) k++;
          lines.push(rest.slice(0, k)); rest = rest.slice(k);
        }
        line = rest;
      }
      if (line) lines.push(line);
    }
    return lines;
  },
  // Like wrap, but with the lines of similar length (the narrowest widest line for the same number of lines as the plain wrap) and, when
  // it can, with no line ending in a short article or preposition ("Il gatto e il / mostro" becomes "Il gatto / e il mostro"; if that
  // takes one more line, it takes it).
  // Past 24 words or 4 lines it is the plain wrap (the search is only for short texts: titles and subtitles).
  balance(testo, larghezza, misura) {
    const out = [], last = l => l.split(' ').pop().toLowerCase().replace(/[^a-zàèéìòù']/g, '');
    for (const par of String(testo).split('\n')) {
      const words = par.split(/\s+/).filter(Boolean);
      if (!words.length) continue;
      const greedy = TESTI.wrap(par, larghezza, misura), n = greedy.length;
      if (n <= 1 || n > 4 || words.length > 24 || words.some(w => misura(w) > larghezza)) { out.push(...greedy); continue; }
      let best = null, bestKey = null;
      const take = lines => {
        const bad = lines.slice(0, -1).filter(l => TESTI.FUNC.has(last(l))).length, widths = lines.map(misura), key = [bad, Math.max(...widths), widths.reduce((s, w) => s + w * w, 0)];
        if (!bestKey || key[0] < bestKey[0] || (key[0] === bestKey[0] && (key[1] < bestKey[1] - 1e-9 || (Math.abs(key[1] - bestKey[1]) <= 1e-9 && key[2] < bestKey[2])))) { best = lines; bestKey = key; }
      };
      const rec = (i, left, lines) => {
        if (left === 1) { const tail = words.slice(i).join(' '); if (tail && misura(tail) <= larghezza) take([...lines, tail]); return; }
        for (let j = i + 1; j <= words.length - (left - 1); j++) { const line = words.slice(i, j).join(' '); if (misura(line) > larghezza) break; rec(j, left - 1, [...lines, line]); }
      };
      rec(0, n, []);
      if (bestKey && bestKey[0] > 0 && n < 4) {            // a short word still hangs: one more line, if that gets rid of it
        const keep = [best, bestKey]; best = null; bestKey = null; rec(0, n + 1, []);
        if (!(best && bestKey[0] < keep[1][0])) { best = keep[0]; bestKey = keep[1]; }
      }
      out.push(...(best || greedy));
    }
    return out;
  },
  // Where a text goes in a format ({ nome, w, h, safe }): its balanced lines, the size it fits at (shrinking by 5% down to MINIMO), and
  // its plate (x = the centre, y = the top, w, h, padX, padY); fuori when it does not fit even at the smallest. misura(text, size, tipo)
  // in px. The plate is centred on the FRAME; the safe zone only limits it (it moves just enough not to cross it). A subtitle sits in
  // the format's band (safe.subs; in 16:9 the strip from 76% to 94% of the height) in at most 2 lines; a title starts 40 px under
  // the top safe margin, in at most 3 and, if it is short enough to fit on one line at no less than MINIMO of its size, on one.
  layout(voce, formato, misura) {
    const tipo = TESTI.tipo(voce), titolo = tipo === 'titolo', { safe } = formato, base = (titolo ? TESTI.CORPO_TITOLO : TESTI.CORPO)[formato.nome] ?? (titolo ? 88 : 66);
    const x0 = safe.left, x1 = formato.w - safe.right, room = Math.max(1, x1 - x0 - 2 * TESTI.SIDE), maxRighe = titolo ? 3 : 2;
    const band = titolo ? [safe.top + 40, safe.top + 40 + formato.h * .3] : (safe.subs || [formato.h * .76, formato.h * .94]), bandH = band[1] - band[0];
    const at = pct => {
      const size = base * pct, padX = size * TESTI.PADX, padY = size * TESTI.PADY, m = s => misura(s, size, tipo);
      const righe = TESTI.balance(voce.testo, Math.max(1, room - 2 * padX), m);
      const w = Math.max(0, ...righe.map(m)) + 2 * padX, h = righe.length * size * TESTI.LINE + 2 * padY;
      return { righe, size, padX, padY, w, h, fuori: righe.length > maxRighe || h > bandH + 1e-9 };
    };
    const steps = []; for (let pct = 1; pct >= TESTI.MINIMO - 1e-9; pct -= .05) steps.push(pct);
    let r = titolo ? steps.map(at).find(t => t.righe.length === 1 && !t.fuori) : null;      // a short title: one line, shrunk if need be
    if (!r) for (const pct of steps) { r = at(pct); if (!r.fuori) break; }
    const x = Math.min(x1 - r.w / 2, Math.max(x0 + r.w / 2, formato.w / 2));
    return { tipo, righe: r.righe, size: r.size, padX: r.padX, padY: r.padY, x, y: titolo ? band[0] : band[0] + (bandH - r.h) / 2, w: r.w, h: r.h, fuori: r.fuori };
  },
  // The problems of reading, one string each: a text on screen too short for its words (or for its spoken line, or a title under
  // 4 s), and two of the same kind on screen together. lettura: a key of LETTURA.
  leggi(lista, durata, lettura = 'base') {
    const vel = TESTI.LETTURA[lettura];
    if (!vel) throw new Error(`Lettura "${lettura}" inesistente. Disponibili: ${Object.keys(TESTI.LETTURA).join(', ')}`);
    const errs = [], ok = lista.map((voce, i) => [voce, i]).filter(([voce]) => TESTI.valid(voce));
    for (const [voce, i] of ok) {
      const visibile = voce.a - voce.da, n = TESTI.letters(voce.testo);
      const need = [[1.8, 'almeno 1,8 s'], [TESTI.tipo(voce) === 'titolo' ? 4 : 0, 'un titolo almeno 4 s'],
        [Number.isFinite(voce.battuta) ? voce.battuta + .6 : 0, 'battuta + 0,6 s'], [n / vel + 1.5 + TESTI.FADE, `lettere ÷ ${vel} + 1,5`]].reduce((m, c) => c[0] > m[0] ? c : m);
      if (visibile + 1e-9 < need[0]) errs.push(`${TESTI.sec(voce.da)}–${TESTI.sec(voce.a)} s «${voce.testo.replace(/\s+/g, ' ')}»: resta ${TESTI.sec(visibile)} s, ne servono ${TESTI.sec(Math.ceil(need[0] * 10 - 1e-9) / 10)} (${need[1]})`);
    }
    for (let p = 0; p < ok.length; p++) for (let q = p + 1; q < ok.length; q++) {
      const [A, i] = ok[p], [B, j] = ok[q];
      if (TESTI.tipo(A) === TESTI.tipo(B) && A.da < B.a && B.da < A.a) errs.push(`testi ${i + 1} e ${j + 1} si sovrappongono (${TESTI.tipo(A)})`);
    }
    return errs;
  },
  // Everything the check says, once each: the shape, the reading, and (with the format and a measure) what does not fit.
  controllo(lista, durata, lettura, formato, misura) {
    const out = [...TESTI.problems(lista, durata), ...(Array.isArray(lista) ? TESTI.leggi(lista, durata, lettura) : [])];
    if (formato && misura && Array.isArray(lista)) lista.forEach((voce, i) => { if (TESTI.valid(voce) && TESTI.layout(voce, formato, misura).fuori) out.push(`testo ${i + 1}: non entra nel formato ${formato.nome}`); });
    return [...new Set(out)];
  },
  // What to paint for a text on screen (voce.alpha 0..1 from `at`) at its layout `lay`, with the palette's ink and paper: the plate
  // (the ink at 72%, rounded) and one entry per line. Pure: the page only has to fill it. Fonts: local ones only, nothing after them.
  font: (tipo, size) => tipo === 'titolo' ? `${size}px "Permanent Marker"` : `700 ${size}px "Atkinson Hyperlegible"`,
  draw(voce, lay, pal) {
    const alpha = voce.alpha ?? 1, n = parseInt(pal.ink.slice(1), 16), rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255], size = lay.size;
    return {
      placca: { x: lay.x - lay.w / 2, y: lay.y, w: lay.w, h: lay.h, r: size * .35, fill: `rgba(${rgb.join(',')},${+(.72 * alpha).toFixed(4)})` },
      righe: lay.righe.map((txt, i) => ({ txt, x: lay.x, y: lay.y + lay.padY + (i + .5) * size * TESTI.LINE, font: TESTI.font(lay.tipo, size), fill: pal.paper, alpha })),
    };
  },
  // The subtitles as an .srt file (the titles are not subtitles), in order of time.
  srt(lista) {
    const hms = x => { const ms = Math.round(x * 1000), p = (n, d = 2) => String(n).padStart(d, '0'); return `${p(Math.floor(ms / 36e5))}:${p(Math.floor(ms / 6e4) % 60)}:${p(Math.floor(ms / 1e3) % 60)},${p(ms % 1000, 3)}`; };
    return lista.filter(v => TESTI.valid(v) && TESTI.tipo(v) === 'sottotitolo').sort((a, b) => a.da - b.da)
      .map((v, i) => `${i + 1}\n${hms(v.da)} --> ${hms(v.a)}\n${v.testo.trim()}\n\n`).join('');
  },
};

// ---------- page functions ----------
let TESTI_LIST = [];
function testi(lista) { TESTI_LIST.push(...lista); }
let testiCtx = null;                         // made on first use: this file also loads where there is no page (the tests)
function testiMisura(txt, size, tipo) { testiCtx = testiCtx || document.createElement('canvas').getContext('2d'); testiCtx.font = TESTI.font(tipo, size); return testiCtx.measureText(txt).width; }
const testiFormato = () => ({ nome: FORMAT_NAME, w: W, h: H, safe: SAFE });
// Paint the texts on screen at t onto the compositor c (screen pixels, no camera): composite() calls it after the grain. Nothing to
// see = nothing painted, so a scene without testi() is byte for byte what it was.
function drawTesti(c, t) {
  const vis = TESTI.at(window.LOOP ? window.LOOP.testi || [] : TESTI_LIST, t);
  if (!vis.length) return;
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const voce of vis) {
    const d = TESTI.draw(voce, TESTI.layout(voce, testiFormato(), testiMisura), { ink: PAL.ink, paper: PAL.paper }), p = d.placca;
    c.globalAlpha = 1; c.fillStyle = p.fill; c.beginPath(); c.roundRect(p.x, p.y, p.w, p.h, p.r); c.fill();
    for (const r of d.righe) { c.globalAlpha = r.alpha; c.font = r.font; c.fillStyle = r.fill; c.fillText(r.txt, r.x, r.y); }
  }
  c.restore();
}
// What render.mjs reads: the list of the loop being shown (or of the scene), its length, the format and the reading profile; and the
// check of it all (shape, reading, fit) with the real measure of the fonts.
if (typeof window !== 'undefined') {
  window.testiPlan = () => ({ lista: window.LOOP ? window.LOOP.testi || [] : TESTI_LIST, duration: window.LOOP ? window.LOOP.len : DUR, formato: testiFormato(), lettura: PROJECT.lettura || 'base' });
  window.testiControl = lettura => { const p = window.testiPlan(); return TESTI.controllo(p.lista, p.duration, lettura || p.lettura, p.formato, testiMisura); };
}
