// testi.mjs: the command-line side of the texts layer (src/testi.js): which reading profile was asked for, the .srt of the
// subtitles, and how the check's problems are printed. The pure rules live in TESTI (src/testi.js), read here through the same
// vm the tests use, so there is one source for them (15 and 13 letters a second included).
import { loadPageScripts, TESTI_SCRIPTS } from './pagecode.mjs';

const testi = () => loadPageScripts(TESTI_SCRIPTS);

// The profile name for --lettura=<name>: undefined when none was asked (the project's own, 'base' by default); an error that lists
// the profiles when it is not one of them (a bare --lettura with no value comes as `true`).
export function profiloLettura(nome) {
  if (nome === undefined) return undefined;
  const profili = Object.keys(testi().get('TESTI.LETTURA'));
  if (typeof nome !== 'string' || !profili.includes(nome)) throw new Error(`Lettura "${nome === true ? '' : nome}" inesistente. Disponibili: ${profili.join(', ')}`);
  return nome;
}
// The .srt of the subtitles in a list ('' when there are none).
export function srtDi(lista) { return testi().call('TESTI.srt', lista); }
// The check's problems as lines to print.
export function righeAvviso(problemi) { return problemi.map(p => `Testi: ${p}`); }
