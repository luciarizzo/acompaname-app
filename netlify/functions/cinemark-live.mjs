const BASE = 'https://bff.cinemark.com.ar/api';
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60' };
const json = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

const safeText = (value) => String(value ?? '').slice(0, 150);
const titleKey = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function enrichShowtimesWithMovies(showtimes, movies) {
  const entries = (Array.isArray(movies) ? movies : []).filter(movie => movie?.title).map(movie => ({ key: titleKey(movie.title), movie }));
  const catalog = new Map(entries.map(entry => [entry.key, entry.movie]));
  return showtimes.map(session => {
    const key = titleKey(session.movie);
    let movie = catalog.get(key);
    if (!movie && key.length >= 14) {
      const matching = entries.filter(entry => entry.key.startsWith(`${key} `));
      if (matching.length === 1) movie = matching[0].movie;
    }
    const poster = String(movie?.posterUrl || '');
    const slug = String(movie?.slug || '');
    return { ...session,
      poster: /^https:\/\/cdn\.cinemark\.com\.ar\/content\/posters\/[\w.-]+$/.test(poster) ? poster : '',
      slug: /^[a-z0-9-]+$/.test(slug) ? slug : '' };
  });
}
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
    const options = { headers: { country: 'AR', Accept: 'application/json' }, signal: AbortSignal.timeout(12000) };
    const moviesPromise = action === 'showtimes'
      ? fetch(`${BASE}/cinema/movies?limit=100`, options).then(response => response.ok ? response.json() : null).catch(() => null)
      : Promise.resolve(null);
    const response = await fetch(`${BASE}${path}`, options);
    if (!response.ok) throw new Error(`Cinemark ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload?.data)) throw new Error('Formato inesperado');
    if (action === 'theaters') return json(200, { mode: 'real', theaters: normalizeTheaters(payload.data) });
    const moviePayload = await moviesPromise;
    return json(200, { mode: 'real', showtimes: enrichShowtimesWithMovies(normalizeShowtimes(payload.data), moviePayload?.data) });
  } catch {
    return json(502, { error: 'No pudimos actualizar las funciones de Cinemark. Podés usar su cartelera oficial.' });
  }
};
