// Ubica la ciudad que la persona eligió en su perfil, con el catálogo oficial Georef (gratis, sin API key).
// Devuelve el nombre oficial, la provincia, la localidad censal (para buscar calles) y el centro en el mapa.
// Lo usan los turnos (para crear la sede en esa ciudad) y la búsqueda de direcciones de los viajes.

const cache = new Map();
export const normalizar = (texto) => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function alias(nombre) {
  const n = normalizar(nombre.split(',')[0]);
  if (['caba', 'capital federal', 'buenos aires', 'ciudad autonoma de buenos aires', 'ciudad de buenos aires'].includes(n)) return 'ciudad de buenos aires';
  return n.replace(/ capital$/, '');
}

export async function resolverCiudad(ciudad, provincia = '') {
  const nombre = alias(String(ciudad || ''));
  if (!nombre) return null;
  const key = `${nombre}|${normalizar(provincia)}`;
  if (cache.has(key)) return cache.get(key);
  const params = new URLSearchParams({ nombre, max: '20', campos: 'nombre,provincia.nombre,centroide,localidad_censal.nombre' });
  if (provincia && nombre !== 'ciudad de buenos aires') params.set('provincia', provincia);
  const response = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?${params}`, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error('Georef no disponible');
  const { localidades = [] } = await response.json();
  const elegida = localidades.find(l => normalizar(l.nombre) === nombre) || localidades[0];
  const resultado = elegida?.centroide ? {
    nombre: elegida.nombre,
    provincia: elegida.provincia?.nombre || provincia,
    censal: elegida.localidad_censal?.nombre || elegida.nombre,
    lat: elegida.centroide.lat,
    lon: elegida.centroide.lon,
  } : null;
  cache.set(key, resultado);
  return resultado;
}

export function kmEntre(a, b) {
  const rad = (x) => x * Math.PI / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// "AV GRL SAN MARTIN 1250" → "Av. Gral. San Martin 1250"
const ABREV = { av: 'Av.', grl: 'Gral.', gral: 'Gral.', dr: 'Dr.', pte: 'Pte.', cnel: 'Cnel.', tte: 'Tte.', bv: 'Bv.', pje: 'Pje.', ing: 'Ing.', pres: 'Pres.' };
// Georef no usa tildes ni eñes: se corrigen las palabras más comunes en nombres de calles.
const TILDES = { espana: 'España', colon: 'Colón', martin: 'Martín', peron: 'Perón', bartolome: 'Bartolomé', hipolito: 'Hipólito', jose: 'José', maria: 'María', garcia: 'García', lopez: 'López', perez: 'Pérez', fernandez: 'Fernández', gonzalez: 'González', rodriguez: 'Rodríguez', alvarez: 'Álvarez', ramon: 'Ramón', julian: 'Julián', sebastian: 'Sebastián', cordoba: 'Córdoba', tucuman: 'Tucumán', jujuy: 'Jujuy', neuquen: 'Neuquén', republica: 'República', constitucion: 'Constitución', peru: 'Perú', bolivar: 'Bolívar', echeverria: 'Echeverría', guemes: 'Güemes', almirante: 'Almirante' };
export function prolijo(texto) {
  return String(texto).toLowerCase().split(' ').map(p => ABREV[p] || TILDES[p] || (['de', 'del', 'la', 'las', 'los', 'y'].includes(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(' ');
}
