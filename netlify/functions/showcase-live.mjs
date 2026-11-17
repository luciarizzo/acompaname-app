const HOME = 'https://www.voyalcine.net/showcase/Default.aspx';
const API = 'https://api.voyalcine.net';
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=600' };
const json = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

export function parseShowcaseMovies(html) {
  const result = [];
  const seen = new Set();
  const pattern = /<a\s+href=['"](?:\/showcase\/)?pelicula\.aspx\?filmid=(\d+)['"][\s\S]*?<h3\s+class=['"]name['"]>([^<]+)<\/h3>/gi;
  for (const match of html.matchAll(pattern)) {
    if (seen.has(match[1])) continue;
    seen.add(match[1]);
    result.push({ id: match[1], name: match[2].trim().replace(/&amp;/g, '&').replace(/&quot;/g, '"') });
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
  if (!['movies', 'showtimes'].includes(input?.action)) return json(400, { error: 'Operación inválida.' });
  if (input.action === 'showtimes' && !/^\d{1,8}$/.test(String(input.movieId))) return json(400, { error: 'Película inválida.' });
  try {
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
