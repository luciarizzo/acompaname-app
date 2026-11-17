import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { extractOfficialAgenda, normalizeActivities, officialCategory, handler } from '../netlify/functions/search-events.mjs';

const initialFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = initialFetch; });
const request = (data) => ({ httpMethod: 'POST', body: JSON.stringify(data) });
const records = [
  { nombre_actividad: 'Visita cultural', fecha_inicio: '2026-11-01', dias_filtro: 'martes,jueves', dias_horarios: 'Martes y jueves a las 18 h.', proveedor: 'Centro Cultural', barrio: 'San Telmo', url_boton: 'https://buenosaires.gob.ar/visita', foto: 'https://buenosaires.gob.ar/imagen.jpg' },
  { nombre_actividad: 'Evento pasado', fecha_inicio: '2026-01-01', dias_filtro: 'lunes', dias_horarios: 'Lunes 9 h.', url_boton: 'javascript:alert(1)' },
];
const html = `<html><script type="text/javascript">const json = \`\n${JSON.stringify(records)}\n\`; window.onload = function() {}</script></html>`;

test('extrae el catálogo publicado como JSON en la página oficial', () => {
  assert.deepEqual(extractOfficialAgenda(html), records);
  assert.throws(() => extractOfficialAgenda('<html>sin datos</html>'));
});

test('filtra por día sin inventar horarios ni aceptar enlaces inseguros', () => {
  const tuesday = normalizeActivities(records, { date: '2026-11-17', today: new Date('2026-11-17T12:00:00Z') });
  assert.equal(tuesday.length, 1);
  assert.match(tuesday[0].date, /Martes y jueves/);
  assert.match(tuesday[0].venue, /San Telmo/);
  assert.equal(normalizeActivities(records, { date: '2026-11-18', today: new Date('2026-11-17T12:00:00Z') }).length, 0);
});

test('clasifica según categorías publicadas por Turismo BA', () => {
  assert.equal(officialCategory({ categoria_actividad_filtro: 'Música' }), 'music');
  assert.equal(officialCategory({ categoria_actividad_filtro: 'Teatro' }), 'theater');
  assert.equal(officialCategory({ categoria_actividad_filtro: 'Deporte' }), 'sports');
  assert.equal(officialCategory({ categoria_actividad_filtro: 'Artes visuales' }), 'other');
  const tagged = records.map((record, i) => ({ ...record, categoria_actividad_filtro: i ? 'Teatro' : 'Música' }));
  assert.equal(normalizeActivities(tagged, { category: 'music' }).length, 1);
  assert.equal(normalizeActivities(tagged, { category: 'theater' }).length, 0); // segundo registro sin URL segura
});

test('obtiene resultados reales sin credenciales desde Turismo BA', async () => {
  globalThis.fetch = async (url) => {
    assert.match(String(url), /turismo\.buenosaires\.gob\.ar/);
    return { ok: true, text: async () => html };
  };
  const result = await handler(request({ category: 'culture', city: 'Buenos Aires' }));
  const body = JSON.parse(result.body);
  assert.equal(result.statusCode, 200);
  assert.equal(body.mode, 'real');
  assert.equal(body.items.length, 1);
  assert.match(body.source, /Ciudad de Buenos Aires/);
});

test('distingue fallos del proveedor de una búsqueda sin resultados', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  const failure = await handler(request({ category: 'culture', city: 'Buenos Aires' }));
  assert.equal(failure.statusCode, 502);
  assert.equal(JSON.parse(failure.body).items, undefined);
  const elsewhere = await handler(request({ category: 'culture', city: 'Mendoza' }));
  assert.equal(elsewhere.statusCode, 200);
  assert.deepEqual(JSON.parse(elsewhere.body).items, []);
});
