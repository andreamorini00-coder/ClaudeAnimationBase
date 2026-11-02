// testi.js: the texts layer: subtitles and titles painted by the page over the finished frame (over the grain), declared in the
// scene with the times of its animation, like sounds() for the audio. Off by default: a scene with no testi() is byte for byte
// what it was. The "No text" rule of ANIMATION_GUIDE.md is about the painted scene; this layer is separate from it.
//   testi([{ da, a, testo, tipo, battuta }, ...])      seconds on the scene's timeline; tipo 'sottotitolo' (default) or 'titolo';
//                                                       battuta: seconds of spoken line (the field the voice will fill)
// A loop declares its own as LOOPS.name.testi = [...].
// TESTI is the pure part (numbers and strings in, numbers and strings out: tested without a browser); the page functions at the
// bottom measure, check and draw. Only local fonts: Permanent Marker for titles, Atkinson Hyperlegible for subtitles (a system
// font would differ from machine to machine and break the byte-identical checks).
const TESTI = {
  LETTURA: { base: 15, bambini: 13 },          // letters per second a reader takes in: --lettura=bambini for the slower one
  FADE: .2,                                    // seconds in and out
  CORPO: { landscape: 44, vertical: 54, feed: 50 },   // a subtitle's size in px, by format; a title is twice as big
  TIPI: ['sottotitolo', 'titolo'],
  PAD: 14,                                     // px between the text and the edge of its plate
  SIDE: 40,                                    // px the plate keeps from the safe margins at the sides
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
  // Where a text goes in a format ({ nome, w, h, safe }): its lines, the size it fits at (shrinking by 5% down to MINIMO), and its
  // plate (x = the centre, y = the top, w, h); fuori when it does not fit even at the smallest. misura(text, size, tipo) in px.
  // A subtitle fills the format's band (safe.subs; in 16:9 the strip from 80% to 93% of the height) in at most 2 lines; a title
  // starts 40 px under the top safe margin, in at most 3.
  layout(voce, formato, misura) {
    const tipo = TESTI.tipo(voce), titolo = tipo === 'titolo', { safe } = formato, base = (TESTI.CORPO[formato.nome] ?? 44) * (titolo ? 2 : 1);
    const x0 = safe.left, x1 = formato.w - safe.right, maxW = Math.max(1, x1 - x0 - 2 * TESTI.SIDE - 2 * TESTI.PAD), maxRighe = titolo ? 3 : 2;
    const band = titolo ? [safe.top + 40, safe.top + 40 + formato.h * .3] : (safe.subs || [formato.h * .8, formato.h * .93]), bandH = band[1] - band[0];
    let r = null;
    for (let pct = 1; pct >= TESTI.MINIMO - 1e-9; pct -= .05) {
      const size = base * pct, righe = TESTI.wrap(voce.testo, maxW, s => misura(s, size, tipo));
      const w = Math.max(0, ...righe.map(s => misura(s, size, tipo))) + 2 * TESTI.PAD, h = righe.length * size * TESTI.LINE + 2 * TESTI.PAD;
      r = { righe, size, w, h, fuori: righe.length > maxRighe || h > bandH + 1e-9 };
      if (!r.fuori) break;
    }
    return { tipo, righe: r.righe, size: r.size, x: (x0 + x1) / 2, y: titolo ? band[0] : band[0] + (bandH - r.h) / 2, w: r.w, h: r.h, fuori: r.fuori };
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
  // The subtitles as an .srt file (the titles are not subtitles), in order of time.
  srt(lista) {
    const hms = x => { const ms = Math.round(x * 1000), p = (n, d = 2) => String(n).padStart(d, '0'); return `${p(Math.floor(ms / 36e5))}:${p(Math.floor(ms / 6e4) % 60)}:${p(Math.floor(ms / 1e3) % 60)},${p(ms % 1000, 3)}`; };
    return lista.filter(v => TESTI.valid(v) && TESTI.tipo(v) === 'sottotitolo').sort((a, b) => a.da - b.da)
      .map((v, i) => `${i + 1}\n${hms(v.da)} --> ${hms(v.a)}\n${v.testo.trim()}\n\n`).join('');
  },
};
