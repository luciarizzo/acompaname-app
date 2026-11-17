const HOME = 'https://www.voyalcine.net/showcase/Default.aspx';
const API = 'https://api.voyalcine.net';
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=600' };
const json = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const catalogCache = new Map();
const theaterNames = ['Belgrano', 'Norte', 'Haedo', 'Quilmes', 'Córdoba', 'Rosario', 'Villa Allende'];
const normalizeName = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function belongsToShowcaseTheater(name, selectedName) {
  const selected = normalizeName(selectedName).replace(/^showcase\s+/, '');
  return theaterNames.some(value => normalizeName(value) === selected) && normalizeName(name).includes(selected);
}
async function getMoviesForTheater(theaterName) {
  const key = normalizeName(theaterName);
  const cached = catalogCache.get(key);
  if (cached && Date.now() - cached.at < 600000) return cached.movies;
  const response = await fetch(HOME, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Cartelera no disponible');
  const movies = parseShowcaseMovies(await response.text());
  if (!movies.length) throw new Error('Cartelera vacía');
  // Verificamos cada película contra funciones reales de la sede. Si una consulta
  // falla, no presentamos una lista incompleta como si fuera la cartelera completa.
  const checks = await Promise.all(movies.map(async movie => {
    const result = await fetch(`${API}/films/${movie.id}/tree/showcase`, { signal: AbortSignal.timeout(10000) });
    if (!result.ok) throw new Error('Funciones no disponibles');
    const showtimes = normalizeShowcaseTree(await result.json());
    return showtimes.some(row => belongsToShowcaseTheater(row.theater, theaterName)) ? movie : null;
  }));
  const available = checks.filter(Boolean);
  catalogCache.set(key, { at: Date.now(), movies: available });
  return available;
}

export function parseShowcaseMovies(html) {
  const result = [];
  const seen = new Set();
  const pattern = /<a\s+href=['"](?:\/showcase\/)?pelicula\.aspx\?filmid=(\d+)['"]([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    if (seen.has(match[1])) continue;
    const name = match[3].match(/<h3\s+class=['"]name['"]>([^<]+)<\/h3>/i)?.[1];
    if (!name) continue;
    const image = match[3].match(/<img\b[^>]*\bsrc=['"](https:\/\/static\.voyalcine\.net\/Uploads\/[\w.-]+)['"]/i)?.[1] || '';
    seen.add(match[1]);
    result.push({ id: match[1], name: name.trim().replace(/&amp;/g, '&').replace(/&quot;/g, '"'), image });
  }
  return result;
}
export function normalizeShowcaseTree(data) {
  if (!data?.days || typeof data.days !== 'object') return [];
  const result = [];
  for (const [date, theaters] of Object.entries(data.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(theaters)) continue;
    for (const theater of theaters) {
      for (const format of theater.formats || []) {
        for (const performance of format.performances || []) {
          if (!/^\d{2}:\d{2}$/.test(performance.showTime || '')) continue;
          result.push({ id: String(performance.performanceId), theaterId: String(theater.id), theater: String(theater.name || ''), date,
            time: performance.showTime, format: String(format.formatDescription || ''), houseId: String(theater.ewaveId || '') });
        }
      }
    }
  }
  return result.slice(0, 1200);
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido.' });
  let input;
  try { input = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Solicitud inválida.' }); }
  if (!['movies', 'showtimes', 'theater-movies'].includes(input?.action)) return json(400, { error: 'Operación inválida.' });
  if (input.action === 'showtimes' && !/^\d{1,8}$/.test(String(input.movieId))) return json(400, { error: 'Película inválida.' });
  if (input.action === 'theater-movies' && !theaterNames.some(name => normalizeName(name) === normalizeName(input.theaterName))) return json(400, { error: 'Complejo inválido.' });
  try {
    if (input.action === 'theater-movies') return json(200, { mode: 'real', movies: await getMoviesForTheater(input.theaterName) });
    const endpoint = input.action === 'movies' ? HOME : `${API}/films/${input.movieId}/tree/showcase`;
    const response = await fetch(endpoint, { headers: { Accept: input.action === 'movies' ? 'text/html' : 'application/json' }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`Showcase ${response.status}`);
    if (input.action === 'movies') {
      const movies = parseShowcaseMovies(await response.text());
      if (!movies.length) throw new Error('Cartelera no reconocida');
      return json(200, { mode: 'real', movies });
    }
    const showtimes = normalizeShowcaseTree(await response.json());
    return json(200, { mode: 'real', showtimes });
  } catch {
    return json(502, { error: 'No pudimos consultar las funciones de Showcase. Podés usar su cartelera oficial.' });
  }
};
