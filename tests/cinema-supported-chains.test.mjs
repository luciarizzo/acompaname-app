import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('el selector muestra solo cadenas con cartelera real integrada', () => {
  const source = readFileSync(new URL('../src/data/officialCinemas.ts', import.meta.url), 'utf8');
  assert.match(source, /id: 'cinemark'/);
  assert.match(source, /id: 'showcase'/);
  assert.doesNotMatch(source, /id: '(atlas|cinepolis|cinemacenter)'/);
});
