// fontcmap.mjs: which characters a woff2 font really has (its cmap table), read without a browser. The texts layer only allows
// characters the local fonts have (src/testi.js), and a test keeps that list equal to the fonts' own, so a font swapped for another
// one can't leave the list lying. A woff2 file is a brotli-compressed stream of the font's tables: this reads just the cmap.
import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';

// the 63 table tags woff2 names by index (the spec's table), in order
const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX',
  'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx',
  'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

// The set of code points (numbers) the woff2 file at `path` has a glyph for.
export function cmapOf(path) {
  const b = readFileSync(path), numTables = b.readUInt16BE(12), compressed = b.readUInt32BE(20);
  let o = 48;
  const base128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const x = b[o++]; v = (v << 7) | (x & 127); if (!(x & 128)) return v; } return v; };
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const flags = b[o++]; let tag;
    if ((flags & 63) === 63) { tag = b.toString('latin1', o, o + 4); o += 4; } else tag = KNOWN[flags & 63];
    const version = (flags >> 6) & 3, orig = base128(); let len = orig;
    if ((tag === 'glyf' || tag === 'loca') ? version === 0 : version !== 0) len = base128();     // a transformed table has its own length
    tables.push({ tag, len });
  }
  const data = brotliDecompressSync(b.subarray(o, o + compressed));
  let p = 0, cmap = null;
  for (const t of tables) { if (t.tag === 'cmap') cmap = data.subarray(p, p + t.len); p += t.len; }
  if (!cmap) throw new Error(`${path}: nessuna tabella cmap`);
  const found = new Set();
  for (let i = 0, n = cmap.readUInt16BE(2); i < n; i++) {
    const off = cmap.readUInt32BE(4 + i * 8 + 4), format = cmap.readUInt16BE(off);
    if (format === 4) {
      const segX2 = cmap.readUInt16BE(off + 6), ends = off + 14, starts = ends + segX2 + 2, deltas = starts + segX2, offsets = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = cmap.readUInt16BE(ends + s * 2), start = cmap.readUInt16BE(starts + s * 2), delta = cmap.readInt16BE(deltas + s * 2), ro = cmap.readUInt16BE(offsets + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let g; if (ro === 0) g = (c + delta) & 0xffff; else { g = cmap.readUInt16BE(offsets + s * 2 + ro + (c - start) * 2); if (g) g = (g + delta) & 0xffff; }
          if (g) found.add(c);
        }
      }
    } else if (format === 12) {
      for (let k = 0, ng = cmap.readUInt32BE(off + 12); k < ng; k++) { const s = cmap.readUInt32BE(off + 16 + k * 12), e = cmap.readUInt32BE(off + 20 + k * 12); for (let c = s; c <= e; c++) found.add(c); }
    }
  }
  return found;
}
// The sorted set as [[lo, hi], …] ranges, without the controls and the space (which are never drawn as glyphs).
export function rangesOf(set) {
  const cps = [...set].filter(c => c > 0x20 && !(c >= 0x7f && c <= 0x9f)).sort((a, b) => a - b), out = [];
  for (const c of cps) { const last = out[out.length - 1]; if (last && c === last[1] + 1) last[1] = c; else out.push([c, c]); }
  return out;
}
