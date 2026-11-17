import test from 'node:test';
import assert from 'node:assert/strict';
import { handler as cinemark, normalizeTheaters, normalizeShowtimes } from '../netlify/functions/cinemark-live.mjs';
import { handler as showcase, parseShowcaseMovies, normalizeShowcaseTree } from '../netlify/functions/showcase-live.mjs';

test('Cinemark normaliza complejos y funciones sin convertir la hora local', () => {
  const theaters = normalizeTheaters([{ id: 103, name: 'Abasto', slug: 'abasto', city: 'CABA', location: { name: 'Ciudad de Buenos Aires' } }]);
  assert.equal(theaters[0].slug, 'abasto');
  const shows = normalizeShowtimes([{ movieName: 'Película real', movieId: 'A1', sessionId: 75, sessionDisplayDate: '2026-11-18', sessionDateTime: '2026-11-18T19:30:00.000Z', occupation: { availableSeats: 72 } }]);
  assert.equal(shows[0].time, '19:30');
  assert.equal(shows[0].available, 72);
});

test('Showcase extrae películas publicadas sin repetir IDs', () => {
  const html = "<a href='pelicula.aspx?filmid=6330'><h3 class='name'>Película uno</h3></a><a href='pelicula.aspx?filmid=6330'><h3 class='name'>Película uno</h3></a>";
  assert.deepEqual(parseShowcaseMovies(html), [{ id: '6330', name: 'Película uno' }]);
});

test('Showcase normaliza fechas, salas y formatos reales', () => {
  const rows = normalizeShowcaseTree({ days: { '2026-11-18': [{ id: 15, name: 'Showcase Quilmes', ewaveId: 3208, formats: [{ formatDescription: '2D', performances: [{ performanceId: 10, showTime: '22:25' }] }] }] } });
  assert.equal(rows[0].theater, 'Showcase Quilmes');
  assert.equal(rows[0].time, '22:25');
});

test('rechaza parámetros no válidos sin consultar proveedores', async () => {
  const a = await cinemark({ httpMethod: 'POST', body: JSON.stringify({ action: 'showtimes', theaterId: '../../etc/passwd' }) });
  const b = await showcase({ httpMethod: 'POST', body: JSON.stringify({ action: 'showtimes', movieId: 'oops' }) });
  assert.equal(a.statusCode, 400);
  assert.equal(b.statusCode, 400);
});
