import { createHash, randomUUID } from 'node:crypto';

// Lógica de la API simulada de viajes (netlify/functions/viajes.mjs).
// Funciona como una app de viajes: cotiza según la distancia real entre dos puntos,
// asigna un conductor y avanza el estado del viaje con el tiempo.
// Es una simulación: no hay autos ni cobros reales. Ver tests/viajes-api.test.mjs.

// Cada minuto simulado dura este tiempo real, para poder mostrar un viaje completo en una presentación.
export const MS_POR_MINUTO = 6000;
const BUSCANDO_MS = 6000;
const ESPERA_EN_PUERTA_MIN = 2;
const FACTOR_CALLES = 1.35; // las calles no van en línea recta
const VELOCIDAD_KMH = 24;

export const TIPOS = {
  auto: { id: 'auto', label: 'Auto', detail: 'Un auto común, para hasta 4 personas', base: 1400, porKm: 620, porMin: 95, minimo: 2600, extraEspera: 0 },
  espacio: { id: 'espacio', label: 'Auto con más espacio', detail: 'Con baúl amplio, si viajás con andador o silla de ruedas plegable', base: 1900, porKm: 780, porMin: 120, minimo: 3400, extraEspera: 3 },
};

const CONDUCTORES = ['Carlos M.', 'Mariela G.', 'Jorge R.', 'Silvia P.', 'Daniel F.', 'Andrea L.', 'Raúl V.', 'Patricia S.', 'Hernán B.', 'Gabriela T.'];
const AUTOS = [
  { modelo: 'Toyota Etios', color: 'gris' }, { modelo: 'Chevrolet Onix', color: 'blanco' }, { modelo: 'Fiat Cronos', color: 'gris oscuro' },
  { modelo: 'Volkswagen Gol Trend', color: 'negro' }, { modelo: 'Peugeot 208', color: 'azul' }, { modelo: 'Renault Logan', color: 'blanco' },
];
const AUTOS_GRANDES = [
  { modelo: 'Chevrolet Spin', color: 'blanco' }, { modelo: 'Renault Kangoo', color: 'gris' }, { modelo: 'Citroën Berlingo', color: 'blanco' },
];

export function validarPunto(punto) {
  const lat = Number(punto?.lat);
  const lon = Number(punto?.lon);
  const label = typeof punto?.label === 'string' ? punto.label.trim().slice(0, 160) : '';
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon, label };
}

// Distancia en línea recta (fórmula de haversine), en km.
export function distanciaKm(a, b) {
  const rad = (x) => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Número estable entre 0 y 1 a partir de un texto: el mismo recorrido da siempre la misma cotización.
function azar(texto) {
  return parseInt(createHash('sha256').update(texto).digest('hex').slice(0, 8), 16) / 0xffffffff;
}
const redondear = (valor, paso) => Math.round(valor / paso) * paso;

export function cotizar(origen, destino) {
  const km = Math.max(0.5, distanciaKm(origen, destino) * FACTOR_CALLES);
  const minutos = Math.max(4, Math.round((km / VELOCIDAD_KMH) * 60));
  const semilla = `${origen.lat.toFixed(4)},${origen.lon.toFixed(4)}>${destino.lat.toFixed(4)},${destino.lon.toFixed(4)}`;
  const llegadaBase = 3 + Math.round(azar(semilla) * 5);
  const opciones = Object.values(TIPOS).map((tipo) => ({
    id: tipo.id,
    label: tipo.label,
    detail: tipo.detail,
    price: Math.max(tipo.minimo, redondear(tipo.base + tipo.porKm * km + tipo.porMin * minutos, 50)),
    pickupMinutes: llegadaBase + tipo.extraEspera,
  }));
  return { distanceKm: Math.round(km * 10) / 10, durationMinutes: minutos, options: opciones };
}

export function formatoPrecio(valor) {
  return `$${Math.round(valor).toLocaleString('es-AR')}`;
}

function patente(r) {
  const letras = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const l = (i) => letras[Math.floor(azar(`${r}-${i}`) * letras.length)];
  const n = String(100 + Math.floor(azar(`${r}-n`) * 900));
  return `${l(1)}${l(2)} ${n} ${l(3)}${l(4)}`;
}

export function crearViaje(origen, destino, tipoId, ahora = Date.now()) {
  const tipo = TIPOS[tipoId];
  if (!tipo) return null;
  const cotizacion = cotizar(origen, destino);
  const opcion = cotizacion.options.find((o) => o.id === tipoId);
  const id = randomUUID();
  const autos = tipoId === 'espacio' ? AUTOS_GRANDES : AUTOS;
  const auto = autos[Math.floor(azar(`${id}-auto`) * autos.length)];
  return {
    id,
    createdAt: new Date(ahora).toISOString(),
    rideType: tipo.id,
    rideLabel: tipo.label,
    price: opcion.price,
    distanceKm: cotizacion.distanceKm,
    durationMinutes: cotizacion.durationMinutes,
    pickupMinutes: opcion.pickupMinutes,
    pin: String(1000 + Math.floor(azar(`${id}-pin`) * 9000)),
    driver: {
      name: CONDUCTORES[Math.floor(azar(`${id}-chofer`) * CONDUCTORES.length)],
      rating: Math.round((4.7 + azar(`${id}-puntaje`) * 0.29) * 100) / 100,
      trips: 300 + Math.floor(azar(`${id}-viajes`) * 4200),
    },
    vehicle: { model: auto.modelo, color: auto.color, plate: patente(id) },
    origin: origen,
    destination: destino,
  };
}

// El viaje viaja entre el front y la API como un token: la API no guarda estado.
export function aToken(viaje) {
  return Buffer.from(JSON.stringify(viaje)).toString('base64url');
}
export function desdeToken(token) {
  try {
    if (typeof token !== 'string' || token.length > 4000) return null;
    const viaje = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    if (!viaje?.id || !viaje?.createdAt || !TIPOS[viaje.rideType]) return null;
    return viaje;
  } catch { return null; }
}

// Estado del viaje según el tiempo que pasó desde que se pidió.
// searching → arriving → waiting → in_progress → completed (o cancelled)
export function estadoDelViaje(viaje, ahora = Date.now()) {
  const inicio = Date.parse(viaje.createdAt);
  const llegada = inicio + BUSCANDO_MS + viaje.pickupMinutes * MS_POR_MINUTO;
  const subida = llegada + ESPERA_EN_PUERTA_MIN * MS_POR_MINUTO;
  const fin = subida + Math.min(viaje.durationMinutes, 20) * MS_POR_MINUTO;
  const t = ahora;
  const minutosHasta = (momento) => Math.max(1, Math.ceil((momento - t) / MS_POR_MINUTO));
  if (viaje.cancelledAt) return { status: 'cancelled' };
  if (t < inicio + BUSCANDO_MS) return { status: 'searching' };
  if (t < llegada) return { status: 'arriving', minutesToPickup: minutosHasta(llegada) };
  if (t < subida) return { status: 'waiting' };
  if (t < fin) return { status: 'in_progress', minutesToDestination: minutosHasta(fin), progress: Math.round(((t - subida) / (fin - subida)) * 100) };
  return { status: 'completed' };
}

// Se puede cancelar mientras el auto no llegó a buscarte.
export function sePuedeCancelar(estado) {
  return estado.status === 'searching' || estado.status === 'arriving' || estado.status === 'waiting';
}
