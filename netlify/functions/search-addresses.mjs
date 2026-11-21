// Búsqueda de direcciones y lugares mientras la persona escribe (para "Pedir un viaje").
//   GET /.netlify/functions/search-addresses?q=hospital central&ciudad=Mendoza
// Usa Photon (OpenStreetMap, gratis, sin API key), cerca de la ciudad del perfil y solo en Argentina.
// Si Photon no responde, usa Georef (catálogo oficial argentino) para direcciones con altura.

const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const AR_BBOX = '-73.6,-55.1,-53.6,-21.7';
const UA = 'AcompanameApp/1.0 (proyecto academico)';
const centros = new Map();
const CERCA_KM = 60;
const cache = new Map(); // respuestas recientes: evita repetir consultas a Photon
const CACHE_MS = 10 * 60 * 1000;
const kmEntre = (a, b) => {
  const rad = (x) => x * Math.PI / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

async function photon(params) {
  const response = await fetch(`https://photon.komoot.io/api/?${new URLSearchParams(params)}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error('Photon no disponible');
  const data = await response.json();
  return Array.isArray(data.features) ? data.features : [];
}

const normalizar = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Centro de la ciudad del perfil, desde Georef (catálogo oficial): no gasta consultas de Photon.
async function centroDe(ciudad) {
  let nombre = normalizar(ciudad.split(',')[0]);
  if (['caba', 'capital federal', 'buenos aires', 'ciudad autonoma de buenos aires'].includes(nombre)) nombre = 'ciudad de buenos aires';
  if (centros.has(nombre)) return centros.get(nombre);
  let centro = null;
  try {
    const params = new URLSearchParams({ nombre, max: '5', campos: 'nombre,centroide' });
    const response = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?${params}`, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const { localidades = [] } = await response.json();
      const elegida = localidades.find(l => normalizar(l.nombre) === nombre) || localidades[0];
      if (elegida?.centroide) centro = { lat: elegida.centroide.lat, lon: elegida.centroide.lon };
    }
  } catch { /* sin centro: se busca en todo el país */ }
  centros.set(nombre, centro);
  return centro;
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
  return { id: `${p.osm_type || 'x'}${p.osm_id || `${lat},${lon}`}`, label: titulo, detail: detalle, lat, lon };
}

// Georef devuelve todo en mayúsculas ("AV GRL SAN MARTIN 1250"): se pasa a "Av. Gral. San Martin 1250".
const ABREV = { av: 'Av.', grl: 'Gral.', gral: 'Gral.', dr: 'Dr.', pte: 'Pte.', cnel: 'Cnel.', tte: 'Tte.', bv: 'Bv.', pje: 'Pje.' };
export function prolijo(texto) {
  return texto.toLowerCase().split(' ').map(p => ABREV[p] || (['de', 'del', 'la', 'las', 'los', 'y'].includes(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(' ');
}

async function georef(q, ciudad) {
  const params = new URLSearchParams({ direccion: q, max: '8' });
  if (ciudad) params.set('localidad_censal', ciudad);
  const response = await fetch(`https://apis.datos.gob.ar/georef/api/direcciones?${params}`, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error('Georef no disponible');
  const data = await response.json();
  return (data.direcciones || []).filter(d => d.ubicacion?.lat != null).map(d => ({
    id: `georef-${d.nomenclatura}`, label: prolijo(d.nomenclatura.split(',')[0]), detail: d.nomenclatura.split(',').slice(1).join(',').trim(), lat: d.ubicacion.lat, lon: d.ubicacion.lon,
  }));
}

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') return reply(405, { error: 'Método no permitido.' });
  const q = String(event.queryStringParameters?.q || '').trim();
  const ciudad = String(event.queryStringParameters?.ciudad || '').trim().slice(0, 80);
  if (q.length < 3 || q.length > 120) return reply(400, { error: 'Escribí al menos tres letras.' });
  const cacheKey = `${normalizar(ciudad)}|${normalizar(q)}`;
  const guardado = cache.get(cacheKey);
  if (guardado && Date.now() - guardado.at < CACHE_MS) return reply(200, { items: guardado.items });
  try {
    const centro = ciudad ? await centroDe(ciudad) : null;
    const params = { q, limit: '8', bbox: AR_BBOX };
    if (centro) Object.assign(params, { lat: String(centro.lat), lon: String(centro.lon), location_bias_scale: '0.1', zoom: '12', limit: '30' });
    const vistos = new Set();
    let items = (await photon(params)).map(aSugerencia).filter(Boolean).filter(item => {
      const key = `${item.label}|${item.detail}`;
      if (vistos.has(key)) return false;
      vistos.add(key);
      return true;
    });
    // Se muestra solo lo que está cerca de la ciudad del perfil (en el orden de relevancia de Photon); si no hay nada cerca, lo del resto del país.
    if (centro) {
      const cerca = items.filter(item => kmEntre(centro, item) <= CERCA_KM);
      if (cerca.length) items = cerca;
    }
    items = items.slice(0, 6);
    if (cache.size > 500) cache.clear();
    cache.set(cacheKey, { at: Date.now(), items });
    return reply(200, { items });
  } catch {
    try {
      const vistos = new Set();
      const items = (/\d/.test(q) ? await georef(q, ciudad) : []).filter(item => !vistos.has(item.id) && vistos.add(item.id));
      return reply(200, { items });
    } catch {
      return reply(502, { error: 'No pudimos buscar direcciones en este momento.' });
    }
  }
};
