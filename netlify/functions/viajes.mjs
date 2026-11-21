import { aToken, cotizar, crearViaje, desdeToken, distanciaKm, estadoDelViaje, sePuedeCancelar, TIPOS, validarPunto } from '../lib/viajes.mjs';

// API simulada de viajes, con la misma forma que la de una app de autos.
//
//   POST /.netlify/functions/viajes  { "action": "estimate", "origin": {lat,lon,label}, "destination": {...} }
//        Cotiza: distancia, duración y precio y tiempo de llegada de cada tipo de auto.
//   POST /.netlify/functions/viajes  { "action": "request", "origin", "destination", "rideType": "auto" | "espacio" }
//        Pide el viaje: asigna conductor, auto, patente y PIN. Devuelve un token del viaje.
//   GET  /.netlify/functions/viajes?token=…
//        Estado actual: searching, arriving, waiting, in_progress, completed o cancelled.
//   POST /.netlify/functions/viajes  { "action": "cancel", "token": "…" }
//        Cancela si el auto todavía no te buscó.
//
// No hay autos ni cobros reales: el estado avanza solo con el tiempo (1 minuto simulado = 6 segundos).

const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const MAX_KM = 150;

function puntos(body) {
  const origin = validarPunto(body.origin);
  const destination = validarPunto(body.destination);
  if (!origin || !destination) return { error: reply(400, { error: 'Elegí el origen y el destino de la lista de direcciones.' }) };
  const km = distanciaKm(origin, destination);
  if (km < 0.1) return { error: reply(400, { error: 'El origen y el destino son el mismo lugar. Elegí otro destino.' }) };
  if (km > MAX_KM) return { error: reply(400, { error: 'Ese recorrido es muy largo para un viaje en auto. Elegí un destino más cercano.' }) };
  return { origin, destination };
}

const resumen = (viaje, token) => ({ token, trip: viaje, state: estadoDelViaje(viaje) });

export const handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const viaje = desdeToken(event.queryStringParameters?.token);
      if (!viaje) return reply(404, { error: 'No encontramos ese viaje.' });
      return reply(200, { state: estadoDelViaje(viaje) });
    }
    if (event.httpMethod !== 'POST') return reply(405, { error: 'Método no permitido.' });

    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'El pedido no tiene un formato válido.' }); }

    if (body.action === 'estimate') {
      const p = puntos(body);
      if (p.error) return p.error;
      return reply(200, cotizar(p.origin, p.destination));
    }

    if (body.action === 'request') {
      const p = puntos(body);
      if (p.error) return p.error;
      if (!TIPOS[body.rideType]) return reply(400, { error: 'Elegí un tipo de viaje.' });
      const viaje = crearViaje(p.origin, p.destination, body.rideType);
      return reply(201, resumen(viaje, aToken(viaje)));
    }

    if (body.action === 'cancel') {
      const viaje = desdeToken(body.token);
      if (!viaje) return reply(404, { error: 'No encontramos ese viaje.' });
      const estado = estadoDelViaje(viaje);
      if (estado.status === 'cancelled') return reply(200, resumen(viaje, body.token));
      if (!sePuedeCancelar(estado)) return reply(409, { error: 'El viaje ya empezó y no se puede cancelar.' });
      const cancelado = { ...viaje, cancelledAt: new Date().toISOString() };
      return reply(200, resumen(cancelado, aToken(cancelado)));
    }

    return reply(400, { error: 'Acción desconocida.' });
  } catch (error) {
    console.error('viajes', error);
    return reply(500, { error: 'No pudimos procesar el viaje. Probá de nuevo en unos segundos.' });
  }
};
