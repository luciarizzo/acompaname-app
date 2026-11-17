const BASE = 'https://bff.cinemark.com.ar/api';
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60' };
const json = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

const safeText = (value) => String(value ?? '').slice(0, 150);
export function normalizeTheaters(rows) {
  return (Array.isArray(rows) ? rows : []).filter(item => Number.isSafeInteger(item.id) && item.name && /^[a-z0-9-]+$/i.test(item.slug || '')).map(item => ({
    id: String(item.id), name: safeText(item.name), slug: item.slug, city: safeText(item.city),
    region: safeText(item.location?.name), address: safeText(item.address)
  }));
}
export function normalizeShowtimes(rows) {
  return (Array.isArray(rows) ? rows : []).filter(item => item.movieName && /^\d{4}-\d{2}-\d{2}$/.test(item.sessionDisplayDate || '') && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(item.sessionDateTime || '')).map(item => ({
    id: safeText(item.sessionId), movieId: safeText(item.movieId), movie: safeText(item.movieName), date: item.sessionDisplayDate,
    // La API marca Z pero el proveedor informa hora local de Argentina.
    time: item.sessionDateTime.slice(11, 16), room: safeText(item.theaterRoom), format: safeText(item.sessionFormat),
    language: safeText(item.language?.name), available: Number.isFinite(item.occupation?.availableSeats) ? Math.max(0, item.occupation.availableSeats) : null
  })).filter(item => item.id && item.movieId);
}
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido.' });
  let input;
  try { input = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Solicitud inválida.' }); }
  const { action, theaterId } = input || {};
  if (action !== 'theaters' && action !== 'showtimes') return json(400, { error: 'Operación inválida.' });
  if (action === 'showtimes' && !/^\d{1,8}$/.test(String(theaterId))) return json(400, { error: 'Cine inválido.' });
  const path = action === 'theaters' ? '/cinema/theaters?limit=100' : `/cinema/showtimes?theater=${theaterId}`;
  try {
    const response = await fetch(`${BASE}${path}`, { headers: { country: 'AR', Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`Cinemark ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload?.data)) throw new Error('Formato inesperado');
    return json(200, action === 'theaters' ? { mode: 'real', theaters: normalizeTheaters(payload.data) } : { mode: 'real', showtimes: normalizeShowtimes(payload.data) });
  } catch {
    return json(502, { error: 'No pudimos actualizar las funciones de Cinemark. Podés usar su cartelera oficial.' });
  }
};
