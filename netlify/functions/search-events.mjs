const headers = { 'Content-Type': 'application/json' };
const json = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const keywords = { music: 'music', theater: 'theater', sports: 'sports', other: '' };
export const handler = async (request) => {
  if (request.httpMethod !== 'POST') return json(405, { error: 'Método no permitido.' });
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return json(503, { error: 'La búsqueda de eventos todavía no está configurada. Podés seguir usando el modo demostración.' });
  try {
    const { category = 'music', city = 'Mendoza', date } = JSON.parse(request.body || '{}');
    const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json'); url.searchParams.set('apikey', key); url.searchParams.set('city', city); url.searchParams.set('countryCode', 'AR'); url.searchParams.set('size', '8'); url.searchParams.set('sort', 'date,asc');
    if (keywords[category]) url.searchParams.set('classificationName', keywords[category]);
    if (date) { const stamp = new Date(`${date}T00:00:00Z`).toISOString().replace('.000Z','Z'); url.searchParams.set('startDateTime', stamp); const end = new Date(`${date}T23:59:59Z`).toISOString().replace('.000Z','Z'); url.searchParams.set('endDateTime', end); }
    const response = await fetch(url); const payload = await response.json();
    if (!response.ok) return json(502, { error: 'Ticketmaster no pudo completar la búsqueda en este momento. Podemos volver a intentarlo.' });
    const items = (payload._embedded?.events || []).map((event) => ({ id: event.id, name: event.name, date: [event.dates?.start?.localDate, event.dates?.start?.localTime].filter(Boolean).join(' · ') || 'Fecha a confirmar', localDate: event.dates?.start?.localDate, localTime: event.dates?.start?.localTime, venue: event._embedded?.venues?.[0]?.name || 'Lugar a confirmar', image: event.images?.find((image) => image.ratio === '16_9')?.url || event.images?.[0]?.url, url: event.url }));
    return json(200, { mode: 'real', items });
  } catch { return json(502, { error: 'No pude consultar este servicio en este momento. Podemos volver a intentarlo.' }); }
};
