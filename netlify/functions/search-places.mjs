const headers = { 'Content-Type': 'application/json' };
const json = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const types = { pharmacy: 'pharmacy', hospital: 'hospital', supermarket: 'supermarket', atm: 'atm' };
function distanceKm(a, b, c, d) { const rad = x => x * Math.PI / 180; const h = Math.sin(rad(c-a)/2)**2 + Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2)**2; return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h)); }
export const handler = async (request) => {
  if (request.httpMethod !== 'POST') return json(405, { error: 'Método no permitido.' });
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return json(503, { error: 'La búsqueda de lugares todavía no está configurada. Podés volver a intentarlo más adelante.' });
  try {
    const { category, latitude, longitude } = JSON.parse(request.body || '{}');
    if (!types[category] || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return json(400, { error: 'Necesito una categoría y una ubicación válidas para buscar.' });
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location' }, body: JSON.stringify({ includedPrimaryTypes: [types[category]], maxResultCount: 8, rankPreference: 'DISTANCE', languageCode: 'es', regionCode: 'AR', locationRestriction: { circle: { center: { latitude, longitude }, radius: 5000 } } }) });
    const payload = await response.json();
    if (!response.ok) return json(502, { error: 'Google Places no pudo completar la búsqueda en este momento. Podemos volver a intentarlo.' });
    const items = (payload.places || []).map((place) => { const loc = place.location || {}; const dist = Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude) ? distanceKm(latitude, longitude, loc.latitude, loc.longitude) : null; return { id: place.id, name: place.displayName?.text || 'Lugar sin nombre', address: place.formattedAddress || 'Dirección no disponible', distance: dist === null ? 'Distancia no disponible' : dist < 1 ? `A unos ${Math.round(dist*1000)} m` : `A unos ${dist.toFixed(1)} km`, latitude: loc.latitude, longitude: loc.longitude, mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.displayName?.text || ''} ${place.formattedAddress || ''}`)}` }; });
    return json(200, { mode: 'real', items });
  } catch { return json(502, { error: 'No pude consultar este servicio en este momento. Podemos volver a intentarlo.' }); }
};
