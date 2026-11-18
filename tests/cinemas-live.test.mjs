import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handler as cinemark, normalizeTheaters, normalizeShowtimes, enrichShowtimesWithMovies } from '../netlify/functions/cinemark-live.mjs';
import { handler as showcase, parseShowcaseMovies, normalizeShowcaseTree, belongsToShowcaseTheater } from '../netlify/functions/showcase-live.mjs';

test('Cinemark normaliza complejos y funciones sin convertir la hora local', () => {
  const theaters = normalizeTheaters([{ id: 103, name: 'Abasto', slug: 'abasto', city: 'CABA', location: { name: 'Ciudad de Buenos Aires' } }]);
  assert.equal(theaters[0].slug, 'abasto');
  const shows = normalizeShowtimes([{ movieName: 'Película real', movieId: 'A1', sessionId: 75, sessionDisplayDate: '2026-11-18', sessionDateTime: '2026-11-18T19:30:00.000Z', occupation: { availableSeats: 72 } }]);
  assert.equal(shows[0].time, '19:30');
  assert.equal(shows[0].available, 72);
});

test('Cinemark agrupa tarjetas por título y conserva todos los horarios de sus variantes', () => {
  const page = readFileSync(new URL('../src/pages/CinemarkLiveFlow.tsx', import.meta.url), 'utf8');
  assert.match(page, /const key = movieKey\(session\.movie\)/);
  assert.match(page, /showtimes\.filter\(x => movieKey\(x\.movie\) === movieId\)/);
  assert.match(page, /showtimes\.filter\(x => movieKey\(x\.movie\) === movieId && x\.date === date\)/);
});

test('Cinemark usa afiches y slugs del catálogo oficial, sin aceptar dominios externos', () => {
  const sessions = [{ movie: 'ANIQUILACIÓN', id: '1' }];
  const good = enrichShowtimesWithMovies(sessions, [{ title: 'Aniquilacion', slug: 'aniquilacion', posterUrl: 'https://cdn.cinemark.com.ar/content/posters/HO123.jpg' }]);
  assert.equal(good[0].poster, 'https://cdn.cinemark.com.ar/content/posters/HO123.jpg');
  assert.equal(good[0].slug, 'aniquilacion');
  const bad = enrichShowtimesWithMovies(sessions, [{ title: 'Aniquilacion', slug: '../../bad', posterUrl: 'https://malicioso.test/poster.jpg' }]);
  assert.equal(bad[0].poster, '');
  assert.equal(bad[0].slug, '');
  const abbreviated = enrichShowtimesWithMovies([{ movie: 'LOS JUEGOS DEL HAMBRE: AMANECER' }], [{ title: 'LOS JUEGOS DEL HAMBRE: AMANECER EN LA COSECHA', slug: 'los-juegos-del-hambre-amanecer-en-la-cosecha', posterUrl: 'https://cdn.cinemark.com.ar/content/posters/HO00013353.jpg' }]);
  assert.equal(abbreviated[0].slug, 'los-juegos-del-hambre-amanecer-en-la-cosecha');
});

test('Showcase extrae películas publicadas sin repetir IDs', () => {
  const html = "<a href='pelicula.aspx?filmid=6330'><img src='https://static.voyalcine.net/Uploads/i6330.jpg'><h3 class='name'>Película uno</h3></a><a href='pelicula.aspx?filmid=6330'><h3 class='name'>Película uno</h3></a>";
  assert.deepEqual(parseShowcaseMovies(html), [{ id: '6330', name: 'Película uno', image: 'https://static.voyalcine.net/Uploads/i6330.jpg' }]);
});

test('Showcase normaliza fechas, salas y formatos reales', () => {
  const rows = normalizeShowcaseTree({ days: { '2026-11-18': [{ id: 15, name: 'Showcase Quilmes', ewaveId: 3208, formats: [{ formatDescription: '2D', performances: [{ performanceId: 10, showTime: '22:25' }] }] }] } });
  assert.equal(rows[0].theater, 'Showcase Quilmes');
  assert.equal(rows[0].time, '22:25');
  assert.equal(rows[0].houseId, '3208');
});

test('Showcase identifica sede Córdoba sin confundirla con Villa Allende', () => {
  assert.equal(belongsToShowcaseTheater('Showcase Córdoba', 'Córdoba'), true);
  assert.equal(belongsToShowcaseTheater('Showcase Villa Allende', 'Córdoba'), false);
  assert.equal(belongsToShowcaseTheater('Showcase Villa Allende', 'Villa Allende'), true);
  assert.equal(belongsToShowcaseTheater('Showcase Rosario', 'Córdoba'), false);
});

test('Showcase elige primero la sede y consulta solo películas con funciones allí', () => {
  const page = readFileSync(new URL('../src/pages/ShowcaseLiveFlow.tsx', import.meta.url), 'utf8');
  const backend = readFileSync(new URL('../netlify/functions/showcase-live.mjs', import.meta.url), 'utf8');
  assert.match(page, /const steps: Step\[\] = \['theater', 'movie'/);
  assert.match(page, /action: 'theater-movies'/);
  assert.match(backend, /showtimes\.some\(row => belongsToShowcaseTheater/);
  // Al cambiar de película se reinician fecha y hora, pero nunca la sede ya elegida.
  assert.match(page, /onClick=\{\(\)=>\{setMovieId\(x\.id\);setDate\(''\);setTimeId\(''\);\}\}/);
  assert.doesNotMatch(page, /setMovieId\(x\.id\);setTheaterId\(''\)/);
});

test('Showcase deriva al dominio de entradas con película y complejo', () => {
  const page = readFileSync(new URL('../src/pages/ShowcaseLiveFlow.tsx', import.meta.url), 'utf8');
  assert.match(page, /entradas\.todoshowcase\.com\/showcase\/pelicula\?filmid=/);
  assert.match(page, /house_id=\$\{encodeURIComponent\(selected\.houseId\)\}/);
  assert.doesNotMatch(page, /voyalcine\.net\/showcase\/pelicula\.aspx/);
});

test('rechaza parámetros no válidos sin consultar proveedores', async () => {
  const a = await cinemark({ httpMethod: 'POST', body: JSON.stringify({ action: 'showtimes', theaterId: '../../etc/passwd' }) });
  const b = await showcase({ httpMethod: 'POST', body: JSON.stringify({ action: 'showtimes', movieId: 'oops' }) });
  assert.equal(a.statusCode, 400);
  assert.equal(b.statusCode, 400);
});
