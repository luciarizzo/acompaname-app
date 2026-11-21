const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

// Georef Argentina: catálogo oficial de localidades, sin API key.
export const handler = async (event) => {
  if (event.httpMethod !== 'GET') return reply(405, { error: 'Método no permitido.' });
  const input = event.queryStringParameters?.q;
  if (typeof input !== 'string' || input.trim().length < 2 || input.length > 60) return reply(400, { error: 'Ingresá al menos dos letras.' });
  const query = new URLSearchParams({ nombre: input.trim(), max: '15', campos: 'id,nombre,provincia.nombre,centroide' });
  try {
    const response = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?${query}`, { signal: AbortSignal.timeout(7000) });
    if (!response.ok) throw new Error('Proveedor no disponible');
    const data = await response.json();
    if (!Array.isArray(data.localidades)) throw new Error('Formato inválido');
    const items = data.localidades.filter(item => typeof item.id === 'string' && typeof item.nombre === 'string' && typeof item.provincia?.nombre === 'string')
      .map(item => ({ id: item.id, name: item.nombre, province: item.provincia.nombre, lat: item.centroide?.lat, lon: item.centroide?.lon }));
    return reply(200, { items });
  } catch {
    return reply(502, { error: 'No se pudo consultar el listado oficial de localidades.' });
  }
};
