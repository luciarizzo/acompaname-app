import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/utils/cinemaLocation.ts', import.meta.url), 'utf8');
test('la zona del usuario filtra los complejos y permite ampliar la búsqueda', () => {
  assert.match(source, /ciudad \(autonoma \)\?de buenos aires/);
  assert.match(source, /\['caba', 'buenos aires'\]/);
  assert.match(readFileSync(new URL('../src/pages/CinemarkLiveFlow.tsx', import.meta.url), 'utf8'), /showAllTheaters \? theaters : localTheaters/);
  assert.match(readFileSync(new URL('../src/pages/ShowcaseLiveFlow.tsx', import.meta.url), 'utf8'), /showAllTheaters \? theaters : localTheaters/);
});
test('la derivación a Cinemark va a la película y conserva el enlace alternativo al cine', () => {
  const page = readFileSync(new URL('../src/pages/CinemarkLiveFlow.tsx', import.meta.url), 'utf8');
  assert.match(page, /cinemarkMovieUrl\(selectedMovie\.name, theater\.slug\)/);
  assert.match(page, /officialUrl\(theater\.slug\)/);
});
