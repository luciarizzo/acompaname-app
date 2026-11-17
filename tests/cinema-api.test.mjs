import test from 'node:test';
import assert from 'node:assert/strict';
import { handler, normalizeCinemas, normalizeSchedule } from '../netlify/functions/cinema-catalog.mjs';

test('normaliza cines reales y descarta enlaces inseguros', () => {
  const result = normalizeCinemas({ results: [{ id: 12, name: 'Cine Real', city: 'Buenos Aires', chain: { name: 'Cadena' }, url: 'javascript:alert(1)' }] });
  assert.equal(result[0].name, 'Cine Real');
  assert.equal(result[0].website, null);
});

test('filtra funciones por fecha, preserva datos y descarta esquemas no seguros', () => {
  const movies = normalizeSchedule({ results: [{ id: 123, title: 'Película', showtimes: [
    { date: '2026-11-18', start: '2026-11-18T19:30:00', auditorium: 'Sala 2', formats: ['2D'], booking_url: 'https://cine.example/comprar' },
    { date: '2026-11-19', start: '2026-11-19T20:00:00' }
  ] }] }, '2026-11-18');
  assert.equal(movies.length, 1);
  assert.equal(movies[0].sessions.length, 1);
  assert.equal(movies[0].sessions[0].bookingUrl, 'https://cine.example/comprar');
});

test('sin clave configurada no ofrece datos simulados', async () => {
  const prior = process.env.AMODB_KEY;
  delete process.env.AMODB_KEY;
  try {
    const response = await handler({ httpMethod: 'POST', body: JSON.stringify({ action: 'cinemas', city: 'CABA' }) });
    assert.equal(response.statusCode, 503);
    assert.match(JSON.parse(response.body).error, /AMODB_KEY/);
  } finally { if (prior) process.env.AMODB_KEY = prior; }
});

test('rechaza identificadores de cine no válidos', async () => {
  const response = await handler({ httpMethod: 'POST', body: JSON.stringify({ action: 'schedule', cinemaId: '../../etc/passwd', date: '2026-11-18' }) });
  assert.equal(response.statusCode, 400);
});
