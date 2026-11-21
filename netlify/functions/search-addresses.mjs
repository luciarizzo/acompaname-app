import { kmEntre, normalizar, prolijo, resolverCiudad } from '../lib/ciudad.mjs';

// Búsqueda de direcciones y lugares mientras la persona escribe (para "Pedir un viaje").
//   GET /.netlify/functions/search-addresses?q=hospital&ciudad=Lanús&provincia=Buenos Aires&lat=-34.70&lon=-58.39
// Busca SOLO cerca de la ciudad del perfil: no muestra direcciones de otras ciudades.
// Usa Photon (OpenStreetMap, gratis, sin API key) dentro de un recuadro alrededor de la ciudad.
// Si Photon no responde, usa Georef (catálogo oficial argentino) para calles con altura de esa ciudad.

const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const UA = 'AcompanameApp/1.0 (proyecto academico)';
const RADIO_KM = 30;
const cache = new Map(); // respuestas recientes: evita repetir consultas a Photon
const CACHE_MS = 10 * 60 * 1000;

async function photon(params) {
  const response = await fetch(`https://photon.komoot.io/api/?${new URLSearchParams(params)}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error('Photon no disponible');
  const data = await response.json();
  return Array.isArray(data.features) ? data.features : [];
}

export function aSugerencia(feature) {
  const p = feature?.properties || {};
  const [lon, lat] = feature?.geometry?.coordinates || [];
  if (p.countrycode && p.countrycode !== 'AR') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const calle = [p.street, p.housenumber].filter(Boolean).join(' ');
  const lugar = [p.city || p.district || p.county, p.state].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');
  const titulo = p.name || calle;
  if (!titulo) return null;
  const detalle = [p.name && calle ? calle : '', lugar].filter(Boolean).join(', ');
  return { id: `${p.osm_type || 'x'}${p.osm_id || `${lat},${lon}`}`, label: titulo, detail: detalle, lat, lon, zona: [p.city, p.district, p.county, p.locality].filter(Boolean).join('|') };
}

// Primero lo que queda en la misma ciudad (en el orden de relevancia de Photon);
// después lo de ciudades vecinas, del más cercano al más lejano.
export function ordenarPorCercania(items, ciudad, centro) {
  const nombres = ciudad ? [ciudad.nombre, ciudad.censal].map(normalizar) : [];
  const enLaCiudad = (item) => nombres.length > 0 && normalizar(item.zona || '').split('|').some(z => nombres.some(n => z === n || z.startsWith(`${n} `)));
  const propios = items.filter(enLaCiudad);
  const vecinos = items.filter(item => !enLaCiudad(item)).sort((a, b) => kmEntre(centro, a) - kmEntre(centro, b));
  return [...propios, ...vecinos];
}

// Recuadro de unos 40 km alrededor del centro de la ciudad.
export function recuadro(centro) {
  const dLat = 0.36;
  const dLon = 0.36 / Math.cos(centro.lat * Math.PI / 180);
  return [centro.lon - dLon, centro.lat - dLat, centro.lon + dLon, centro.lat + dLat].map(n => n.toFixed(4)).join(',');
}

async function georef(q, ciudad) {
  const params = new URLSearchParams({ direccion: q, max: '8', localidad_censal: ciudad.censal, provincia: ciudad.provincia });
  const response = await fetch(`https://apis.datos.gob.ar/georef/api/direcciones?${params}`, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error('Georef no disponible');
  const data = await response.json();
  const vistos = new Set();
  return (data.direcciones || []).filter(d => d.ubicacion?.lat != null).map(d => ({
    id: `georef-${d.nomenclatura}`, label: prolijo(d.nomenclatura.split(',')[0]), detail: d.nomenclatura.split(',').slice(1).join(',').trim(), lat: d.ubicacion.lat, lon: d.ubicacion.lon,
  })).filter(item => !vistos.has(item.id) && vistos.add(item.id));
}

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') return reply(405, { error: 'Método no permitido.' });
  const params = event.queryStringParameters || {};
  const q = String(params.q || '').trim();
  const nombreCiudad = String(params.ciudad || '').trim().slice(0, 100);
  const provincia = String(params.provincia || '').trim().slice(0, 100);
  if (q.length < 3 || q.length > 120) return reply(400, { error: 'Escribí al menos tres letras.' });
  if (!nombreCiudad) return reply(400, { error: 'Primero elegí tu ciudad en Mi configuración.' });

  const cacheKey = `${normalizar(nombreCiudad)}|${normalizar(provincia)}|${normalizar(q)}`;
  const guardado = cache.get(cacheKey);
  if (guardado && Date.now() - guardado.at < CACHE_MS) return reply(200, { items: guardado.items });

  let ciudad = null;
  try { ciudad = await resolverCiudad(nombreCiudad, provincia); } catch { /* se usa la ubicación que mandó el perfil */ }
  const lat = Number(params.lat), lon = Number(params.lon);
  const centro = ciudad ? { lat: ciudad.lat, lon: ciudad.lon } : Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
  if (!centro) return reply(404, { error: `No encontramos «${nombreCiudad}». Revisá tu ciudad en Mi configuración.` });

  try {
    const vistos = new Set();
    const cercanos = (await photon({ q, limit: '40', bbox: recuadro(centro), lat: String(centro.lat), lon: String(centro.lon), location_bias_scale: '0.1' }))
      .map(aSugerencia).filter(Boolean)
      .filter(item => kmEntre(centro, item) <= RADIO_KM)
      .filter(item => { const key = `${item.label}|${item.detail}`; return !vistos.has(key) && vistos.add(key); });
    const items = ordenarPorCercania(cercanos, ciudad, centro).slice(0, 6).map(({ zona, ...item }) => item);
    if (cache.size > 500) cache.clear();
    cache.set(cacheKey, { at: Date.now(), items });
    return reply(200, { items });
  } catch {
    try {
      return reply(200, { items: ciudad && /\d/.test(q) ? await georef(q, ciudad) : [] });
    } catch {
      return reply(502, { error: 'No pudimos buscar direcciones en este momento.' });
    }
  }
};
