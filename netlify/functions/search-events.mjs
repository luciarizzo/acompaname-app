import { parseRosarioAgenda, resolveCulturalSource } from '../lib/cultural-regions.mjs';

const AGENDA_URL = 'https://turismo.buenosaires.gob.ar/es/article/que-hacer-esta-semana';
const responseHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=900' };
const json = (statusCode, data) => ({ statusCode, headers: responseHeaders, body: JSON.stringify(data) });
const weekDays = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const categories = new Set(['all', 'culture', 'music', 'theater', 'sports', 'other']);
export function officialCategory(item) {
  const label = normalize(item.categoria_actividad_filtro).trim();
  if (label === 'musica') return 'music';
  if (label === 'teatro') return 'theater';
  if (label === 'deporte') return 'sports';
  return 'other';
}

// El sitio oficial publica sus actividades como JSON dentro del HTML.
// No es una API documentada: si cambia el formato, fallamos explícitamente.
export function extractOfficialAgenda(html) {
  const match = html.match(/const\s+json\s*=\s*`([\s\S]*?)`\s*;/);
  if (!match) throw new Error('Formato de agenda no reconocido');
  const records = JSON.parse(match[1]);
  if (!Array.isArray(records)) throw new Error('Agenda inválida');
  return records;
}

export function normalizeActivities(records, { date = '', category = 'all', today = new Date() } = {}) {
  const targetDate = date ? new Date(`${date}T12:00:00-03:00`) : null;
  const weekday = targetDate ? weekDays[targetDate.getUTCDay()] : null;
  const currentDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(today);
  // El catálogo es semanal: no proyectar actividades recurrentes indefinidamente.
  const lastDay = new Date(`${currentDay}T12:00:00Z`);
  lastDay.setUTCDate(lastDay.getUTCDate() + 7);
  const lastSupportedDay = lastDay.toISOString().slice(0, 10);
  if (date && (date < currentDay || date > lastSupportedDay)) return [];
  const seen = new Set();
  return records.flatMap((item, index) => {
    const name = String(item.nombre_actividad || '').trim();
    const start = String(item.fecha_inicio || '');
    const schedule = String(item.dias_horarios || '').trim();
    const days = normalize(item.dias_filtro).split(',').map(day => day.trim());
    const externalUrl = String(item.url_boton || '');
    if (!['all', 'culture'].includes(category) && officialCategory(item) !== category) return [];
    if (!name || !schedule || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^https:\/\//i.test(externalUrl)) return [];
    if (date && (start > date || !days.includes(weekday))) return [];
    const id = `${name}-${item.proveedor || ''}`;
    if (seen.has(id)) return [];
    seen.add(id);
    const location = [item.proveedor, item.barrio, item.calle_altura].filter(Boolean).join(' · ');
    return [{
      id: `ba-${index}`,
      name,
      date: date ? `${date} · ${schedule}` : schedule,
      venue: location || 'Buenos Aires · lugar a confirmar',
      image: /^https:\/\//i.test(item.foto || '') ? item.foto : undefined,
      url: externalUrl,
      ...(date ? { localDate: date } : {})
    }];
  }).slice(0, 30);
}

export const handler = async (request) => {
  if (request.httpMethod !== 'POST') return json(405, { error: 'Método no permitido.' });
  let input;
  try { input = JSON.parse(request.body || '{}'); } catch { return json(400, { error: 'Solicitud inválida.' }); }
  const { category = 'all', city = 'Buenos Aires', date = '' } = input ?? {};
  if (!categories.has(category) || typeof city !== 'string' || !city.trim() || (date && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))))) {
    return json(400, { error: 'Revisá los filtros de la búsqueda cultural.' });
  }
  const source = resolveCulturalSource(city);
  if (!source) return json(200, { mode: 'real', source: 'Sin proveedor local', items: [], notice: `Todavía no hay una agenda automática verificada para ${city}.`, agendaUrl: null });
  if (!source.automatic) return json(200, { mode: 'real', source: source.name, items: [], notice: `Todavía no hay integración automática para ${source.name}. Podés consultar su sitio oficial.`, agendaUrl: source.url });
  try {
    const siteResponse = await fetch(source.url, { signal: AbortSignal.timeout(10000), headers: { Accept: 'text/html' } });
    if (!siteResponse.ok) throw new Error(`HTTP ${siteResponse.status}`);
    const html = await siteResponse.text();
    const items = source.id === 'rosario' ? parseRosarioAgenda(html, { date, category }) : normalizeActivities(extractOfficialAgenda(html), { date, category });
    return json(200, {
      mode: 'real', source: source.name, items,
      agendaUrl: source.url,
      notice: 'Actividades publicadas en la agenda oficial municipal. Confirmá fechas, horarios y disponibilidad con el organizador.'
    });
  } catch {
    return json(502, { error: `No pude actualizar la agenda de ${source.name} en este momento.`, agendaUrl: source.url });
  }
};
