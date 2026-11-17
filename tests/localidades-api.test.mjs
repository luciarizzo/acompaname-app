import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../netlify/functions/search-localities.mjs';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('rechaza búsquedas vacías o métodos no admitidos', async () => {
  assert.equal((await handler({ httpMethod: 'POST' })).statusCode, 405);
  assert.equal((await handler({ httpMethod: 'GET', queryStringParameters: { q: 'a' } })).statusCode, 400);
});

test('consulta el catálogo oficial y distingue localidades por provincia', async () => {
  globalThis.fetch = async url => {
    assert.match(url, /apis\.datos\.gob\.ar\/georef\/api\/localidades/);
    assert.match(url, /nombre=Rosario/);
    return { ok: true, json: async () => ({ localidades: [
      { id: '1', nombre: 'Rosario', provincia: { nombre: 'Santa Fe' } },
      { id: '2', nombre: 'Rosario', provincia: { nombre: 'Córdoba' } }
    ] }) };
  };
  const response = await handler({ httpMethod: 'GET', queryStringParameters: { q: 'Rosario' } });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body).items.map(item => item.province), ['Santa Fe', 'Córdoba']);
});

test('informa si la API oficial no está disponible', async () => {
  globalThis.fetch = async () => { throw new Error('offline'); };
  const response = await handler({ httpMethod: 'GET', queryStringParameters: { q: 'Mendoza' } });
  assert.equal(response.statusCode, 502);
});
