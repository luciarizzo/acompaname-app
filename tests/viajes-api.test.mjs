import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MS_POR_MINUTO, aToken, cotizar, crearViaje, desdeToken, distanciaKm, estadoDelViaje, sePuedeCancelar, validarPunto } from '../netlify/lib/viajes.mjs';
import { handler } from '../netlify/functions/viajes.mjs';
import { aSugerencia, recuadro } from '../netlify/functions/search-addresses.mjs';
import { prolijo } from '../netlify/lib/ciudad.mjs';

const plaza = { lat: -32.8894, lon: -68.8446, label: 'Plaza Independencia' };
const hospital = { lat: -32.8921, lon: -68.8329, label: 'Hospital Central' };
const lejos = { lat: -32.95, lon: -68.85, label: 'Godoy Cruz' };
const post = (body) => handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body), queryStringParameters: {} });

test('Viajes: la distancia y el precio crecen con el recorrido', () => {
  assert.ok(Math.abs(distanciaKm(plaza, hospital) - 1.15) < 0.1);
  const corto = cotizar(plaza, hospital);
  const largo = cotizar(plaza, lejos);
  assert.ok(largo.distanceKm > corto.distanceKm);
  assert.ok(largo.options[0].price > corto.options[0].price);
  for (const opcion of largo.options) assert.equal(opcion.price % 50, 0);
  // El auto con más espacio siempre cuesta más y tarda un poco más en llegar.
  assert.ok(largo.options[1].price > largo.options[0].price);
  assert.ok(largo.options[1].pickupMinutes > largo.options[0].pickupMinutes);
});

test('Viajes: la misma cotización para el mismo recorrido', () => {
  assert.deepEqual(cotizar(plaza, lejos), cotizar(plaza, lejos));
});

test('Viajes: el viaje asigna conductor, auto, patente y PIN', () => {
  const viaje = crearViaje(plaza, lejos, 'auto');
  assert.match(viaje.vehicle.plate, /^[A-Z]{2} \d{3} [A-Z]{2}$/);
  assert.match(viaje.pin, /^\d{4}$/);
  assert.ok(viaje.driver.rating >= 4.7 && viaje.driver.rating <= 5);
  assert.deepEqual(desdeToken(aToken(viaje)), viaje);
  assert.equal(desdeToken('basura'), null);
});

test('Viajes: el estado avanza con el tiempo y se puede cancelar solo antes de subir', () => {
  const inicio = Date.parse('2026-11-21T12:00:00Z');
  const viaje = crearViaje(plaza, lejos, 'auto', inicio);
  const en = (ms) => estadoDelViaje(viaje, inicio + ms);
  assert.equal(en(1000).status, 'searching');
  const yendo = en(6000 + MS_POR_MINUTO);
  assert.equal(yendo.status, 'arriving');
  assert.equal(yendo.minutesToPickup, viaje.pickupMinutes - 1);
  const llegada = 6000 + viaje.pickupMinutes * MS_POR_MINUTO;
  assert.equal(en(llegada + 1000).status, 'waiting');
  const enViaje = en(llegada + 2 * MS_POR_MINUTO + 1000);
  assert.equal(enViaje.status, 'in_progress');
  assert.ok(enViaje.progress >= 0 && enViaje.progress <= 100);
  assert.equal(en(llegada + 2 * MS_POR_MINUTO + 25 * MS_POR_MINUTO).status, 'completed');
  assert.ok(sePuedeCancelar(en(1000)));
  assert.ok(!sePuedeCancelar(enViaje));
  assert.equal(estadoDelViaje({ ...viaje, cancelledAt: new Date().toISOString() }).status, 'cancelled');
});

test('Viajes API: cotiza, pide, consulta y cancela', async () => {
  const cotizacion = await post({ action: 'estimate', origin: plaza, destination: lejos });
  assert.equal(cotizacion.statusCode, 200);
  assert.equal(JSON.parse(cotizacion.body).options.length, 2);

  const pedido = await post({ action: 'request', origin: plaza, destination: lejos, rideType: 'espacio' });
  assert.equal(pedido.statusCode, 201);
  const { token, trip, state } = JSON.parse(pedido.body);
  assert.equal(trip.rideLabel, 'Auto con más espacio');
  assert.equal(state.status, 'searching');

  const estado = await handler({ httpMethod: 'GET', headers: {}, queryStringParameters: { token } });
  assert.equal(JSON.parse(estado.body).state.status, 'searching');

  const cancelado = await post({ action: 'cancel', token });
  assert.equal(JSON.parse(cancelado.body).state.status, 'cancelled');
});

test('Viajes API: rechaza datos inválidos', async () => {
  assert.equal(validarPunto({ lat: 'x', lon: 1 }), null);
  assert.equal((await post({ action: 'estimate', origin: plaza, destination: plaza })).statusCode, 400);
  assert.equal((await post({ action: 'estimate', origin: plaza, destination: { lat: -34.6, lon: -58.4 } })).statusCode, 400);
  assert.equal((await post({ action: 'request', origin: plaza, destination: lejos, rideType: 'helicoptero' })).statusCode, 400);
  assert.equal((await post({ action: 'otra' })).statusCode, 400);
});

test('Direcciones: convierte resultados de Photon y Georef en sugerencias claras', () => {
  const lugar = aSugerencia({ geometry: { coordinates: [-68.83, -32.89] }, properties: { countrycode: 'AR', name: 'Hospital Central de Mendoza', street: 'Leandro N. Alem', housenumber: '500', city: 'Mendoza', state: 'Mendoza', osm_type: 'W', osm_id: 1 } });
  assert.equal(lugar.label, 'Hospital Central de Mendoza');
  assert.equal(lugar.detail, 'Leandro N. Alem 500, Mendoza');
  const calle = aSugerencia({ geometry: { coordinates: [-68.8, -32.9] }, properties: { countrycode: 'AR', street: 'San Martín', housenumber: '1250', city: 'Godoy Cruz', state: 'Mendoza' } });
  assert.equal(calle.label, 'San Martín 1250');
  assert.equal(aSugerencia({ geometry: { coordinates: [-3.7, 40.4] }, properties: { countrycode: 'ES', name: 'Madrid' } }), null);
  assert.equal(prolijo('AV GRL SAN MARTIN 1250'), 'Av. Gral. San Martín 1250');
});

test('Direcciones: se busca solo en un recuadro alrededor de la ciudad del perfil', () => {
  const [oeste, sur, este, norte] = recuadro({ lat: -34.7076, lon: -58.3911 }).split(',').map(Number);
  assert.ok(oeste < -58.3911 && este > -58.3911 && sur < -34.7076 && norte > -34.7076);
  assert.ok(norte - sur < 1 && este - oeste < 1); // unos 40 km, no todo el país
});

test('Direcciones API: sin ciudad en el perfil pide elegirla', async () => {
  const { handler } = await import('../netlify/functions/search-addresses.mjs');
  const res = await handler({ httpMethod: 'GET', queryStringParameters: { q: 'hospital' } });
  assert.equal(res.statusCode, 400);
  assert.match(JSON.parse(res.body).error, /ciudad/);
});
