const headers = { 'Content-Type': 'application/json' };
const airports = { 'buenos aires':'EZE', 'mendoza':'MDZ', 'córdoba':'COR', 'cordoba':'COR', 'bariloche':'BRC', 'salta':'SLA', 'iguazú':'IGR', 'iguazu':'IGR', 'mar del plata':'MDQ', 'santiago':'SCL', 'santiago de chile':'SCL' };
const formatDuration = (iso) => { const match = typeof iso === 'string' && iso.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?$/); if (!match) return 'Duración no disponible'; const parts = []; if (match[1]) parts.push(`${match[1]} d`); if (match[2]) parts.push(`${match[2]} h`); if (match[3]) parts.push(`${match[3]} min`); return parts.join(' ') || 'Menos de un minuto'; };
const json = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
export const handler = async (request) => {
  if (request.httpMethod !== 'POST') return json(405, { error: 'Método no permitido.' });
  const token = process.env.DUFFEL_API_KEY;
  if (!token) return json(503, { error: 'La búsqueda real de vuelos todavía no está configurada. Podés seguir usando el modo demostración.' });
  try {
    const { origin, destination, date, passengers = 1 } = JSON.parse(request.body || '{}');
    const from = airports[String(origin || '').trim().toLowerCase()]; const to = airports[String(destination || '').trim().toLowerCase()];
    if (!from || !to) return json(400, { error: 'Todavía no tengo el código de aeropuerto para una de esas ciudades. Probá con Buenos Aires, Mendoza, Córdoba, Bariloche, Salta, Iguazú o Mar del Plata.' });
    if (!date || new Date(date) < new Date(new Date().toISOString().slice(0, 10))) return json(400, { error: 'Elegí una fecha de viaje válida para consultar.' });
    const response = await fetch('https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=10000', {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Duffel-Version': 'v2', 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { slices: [{ origin: from, destination: to, departure_date: date }], passengers: Array.from({ length: Math.max(1, Math.min(6, Number(passengers))) }, () => ({ type: 'adult' })), cabin_class: 'economy' } })
    });
    const payload = await response.json();
    if (!response.ok) return json(502, { error: 'Duffel no pudo completar la búsqueda en este momento. Podemos volver a intentarlo.' });
    const offers = payload.data?.offers || [];
    const items = offers.slice(0, 5).map((offer) => {
      const segments = offer.slices?.[0]?.segments || []; const first = segments[0]; const last = segments.at(-1);
      return { id: offer.id, airline: offer.owner?.name || 'Aerolínea', departure: first?.departing_at ? new Date(first.departing_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'Horario no disponible', arrival: last?.arriving_at ? new Date(last.arriving_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'Horario no disponible', duration: formatDuration(offer.slices?.[0]?.duration), price: offer.total_amount || '', currency: offer.total_currency || '', origin, destination };
    });
    return json(200, { mode: 'real', items });
  } catch { return json(502, { error: 'No pude consultar este servicio en este momento. Podemos volver a intentarlo.' }); }
};
