const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' };
const json = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const canonicalCity = (city) => /^(?:caba|capital federal|ciudad (?:aut[oó]noma )?de buenos aires)$/i.test(city.trim()) ? 'Buenos Aires' : city.trim();
const safeLink = (value) => {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
};
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));

export function normalizeCinemas(payload) {
  return (Array.isArray(payload.results) ? payload.results : []).filter(item => Number.isSafeInteger(item.id) && item.name).map(item => ({
    id: String(item.id), name: String(item.name), city: String(item.city || ''), address: String(item.address || ''),
    chain: String(item.chain?.name || ''), website: safeLink(item.url || item.chain?.website), showtimeCount: Number(item.showtime_count || 0)
  }));
}
export function normalizeSchedule(payload, date) {
  return (Array.isArray(payload.results) ? payload.results : []).flatMap((film, i) => {
    const title = String(film.title || film.listed_title || '').trim();
    if (!title) return [];
    const sessions = (Array.isArray(film.showtimes) ? film.showtimes : []).filter(session => session.date === date && /^\d{2}:\d{2}/.test(String(session.start || '').slice(11) || String(session.start || ''))).map((session, j) => ({
      id: `${i}-${j}`, date: session.date, start: String(session.start), auditorium: String(session.auditorium || ''),
      formats: Array.isArray(session.formats) ? session.formats.map(String) : [], bookingUrl: safeLink(session.booking_url),
      soldOut: session.sold_out === true
    }));
    return sessions.length ? [{ id: `${film.id || i}-${i}`, title, sessions }] : [];
  });
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido.' });
  let input;
  try { input = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Solicitud inválida.' }); }
  const { action, city = '', cinemaId = '', date = '' } = input || {};
  if (action !== 'cinemas' && action !== 'schedule') return json(400, { error: 'Consulta desconocida.' });
  if (action === 'cinemas' && (typeof city !== 'string' || !city.trim() || city.length > 90)) return json(400, { error: 'Elegí una localidad.' });
  if (action === 'schedule' && (!/^[0-9]{1,15}$/.test(String(cinemaId)) || !validDate(date))) return json(400, { error: 'Cine o fecha inválidos.' });
  const key = process.env.AMODB_KEY;
  if (!key) return json(503, { error: 'La cartelera real todavía no está configurada. Agregá AMODB_KEY en las variables de entorno de Netlify.' });
  try {
    const url = action === 'cinemas'
      ? `https://api.amodb.dev/3/search/cinema?${new URLSearchParams({ country: 'AR', city: canonicalCity(city), page: '1' })}`
      : `https://api.amodb.dev/3/cinema/${cinemaId}/showtimes?${new URLSearchParams({ date, language: 'es-AR' })}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`AMODB ${response.status}`);
    const payload = await response.json();
    return json(200, action === 'cinemas'
      ? { mode: 'real', cinemas: normalizeCinemas(payload), total: Number(payload.total_results || 0), notice: 'Cobertura parcial: AMODB incluye algunas cadenas. La cartelera puede cambiar.' }
      : { mode: 'real', movies: normalizeSchedule(payload, date), cinemaWebsite: safeLink(payload.cinema?.url || payload.cinema?.chain?.website), notice: 'Horarios informados por AMODB. Confirmá la disponibilidad al comprar.' });
  } catch {
    return json(502, { error: 'No pudimos consultar la cartelera en este momento. Intentá nuevamente más tarde.' });
  }
};
