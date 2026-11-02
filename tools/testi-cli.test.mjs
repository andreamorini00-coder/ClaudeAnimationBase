// testi-cli.test.mjs: the command-line side of the texts layer (tools/testi.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profiloLettura, srtDi, righeAvviso } from './testi.mjs';

test('profiloLettura accepts base and bambini, and defaults to base', () => {
  assert.equal(profiloLettura('base'), 'base'); assert.equal(profiloLettura('bambini'), 'bambini');
  assert.equal(profiloLettura(undefined), undefined, 'assente: il progetto decide (base di norma)');
});
test('profiloLettura rejects an unknown name, a bare flag, and lists the profiles', () => {
  assert.throws(() => profiloLettura('boh'), /Lettura "boh" inesistente\. Disponibili: base, bambini/);
  assert.throws(() => profiloLettura(true), /Lettura.*Disponibili: base, bambini/);
  assert.throws(() => profiloLettura(''), /Disponibili: base, bambini/);
});
test('srtDi gives the .srt of the subtitles', () => {
  assert.equal(srtDi([{ da: 1, a: 2.5, testo: 'Ciao' }, { da: 0, a: 5, testo: 'T', tipo: 'titolo' }]), '1\n00:00:01,000 --> 00:00:02,500\nCiao\n\n');
  assert.equal(srtDi([]), '');
});
test('righeAvviso formats one line per problem', () => {
  assert.deepEqual(righeAvviso(['testo 1: a', 'testo 2: b']), ['Testi: testo 1: a', 'Testi: testo 2: b']);
  assert.deepEqual(righeAvviso([]), []);
});
