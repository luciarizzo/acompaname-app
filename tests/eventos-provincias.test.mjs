import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCulturalSource, parseRosarioAgenda, inferRosarioCategory } from '../netlify/lib/cultural-regions.mjs';
import { handler } from '../netlify/functions/search-events.mjs';

test('selecciona la fuente municipal adecuada sin confundir CABA con otras provincias', () => {
  assert.equal(resolveCulturalSource('Buenos Aires').id, 'caba');
  assert.equal(resolveCulturalSource('Ciudad de Buenos Aires').id, 'caba');
  assert.equal(resolveCulturalSource('Ciudad Autónoma de Buenos Aires').id, 'caba');
  assert.equal(resolveCulturalSource('CABA').id, 'caba');
  assert.equal(resolveCulturalSource('Ciudad de Buenos Aires, Argentina').id, 'caba');
  assert.equal(resolveCulturalSource('Rosario, Santa Fe').id, 'rosario');
  assert.equal(resolveCulturalSource('Córdoba').id, 'cordoba');
  assert.equal(resolveCulturalSource('Mendoza').id, 'mendoza');
  assert.equal(resolveCulturalSource('La Plata').id, 'laplata');
  assert.equal(resolveCulturalSource('Salta'), null);
});

test('extrae tarjetas actuales de la agenda municipal de Rosario', () => {
  const html = `<actividad class="actividad"><a href="/inicio/muestra-en-rosario"><div class="fecha-card alpar">19.11<span> al </span>28.11</div><h3 class="govuk-heading-s">Muestra cultural de Rosario</h3></a></actividad>`;
  const upcoming = parseRosarioAgenda(html, { today: new Date('2026-11-17T12:00:00Z'), date: '2026-11-20' });
  assert.equal(upcoming.length, 1);
  assert.equal(upcoming[0].name, 'Muestra cultural de Rosario');
  assert.match(upcoming[0].url, /^https:\/\/www\.rosario\.gob\.ar/);
  assert.equal(parseRosarioAgenda(html, { today: new Date('2026-11-17T12:00:00Z'), date: '2026-11-18' }).length, 0);
  assert.equal(parseRosarioAgenda(html, { today: new Date('2026-11-17T12:00:00Z'), query: 'MUESTRA' }).length, 1);
  assert.equal(parseRosarioAgenda(html, { today: new Date('2026-11-17T12:00:00Z'), query: 'concierto' }).length, 0);
});

test('Rosario mantiene títulos ambiguos fuera de Música, Teatro y Deportes', () => {
  assert.equal(inferRosarioCategory('Concierto de jazz'), 'music');
  assert.equal(inferRosarioCategory('Obra de teatro'), 'theater');
  assert.equal(inferRosarioCategory('Carrera deportiva'), 'sports');
  assert.equal(inferRosarioCategory('Noche de librerías'), 'other');
});

test('ciudades sin feed verificado muestran el enlace oficial, sin inventar eventos', async () => {
  const r = await handler({ httpMethod: 'POST', body: JSON.stringify({ category: 'culture', city: 'Mendoza' }) });
  const body = JSON.parse(r.body);
  assert.equal(r.statusCode, 200);
  assert.deepEqual(body.items, []);
  assert.match(body.agendaUrl, /ciudaddemendoza\.gob\.ar/);
  assert.match(body.notice, /no hay integración automática/);
});

test('Ciudad de Buenos Aires consulta el proveedor real y no cae en sin proveedor', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    assert.match(String(url), /turismo\.buenosaires\.gob\.ar/);
    return { ok: true, text: async () => '<script>const json = `[]`;</script>' };
  };
  try {
    const response = await handler({ httpMethod: 'POST', body: JSON.stringify({ category: 'all', city: 'Ciudad de Buenos Aires' }) });
    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).source, 'Ciudad de Buenos Aires');
  } finally { globalThis.fetch = previousFetch; }
});
