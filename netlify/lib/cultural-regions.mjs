const sources = [
  { id: 'caba', name: 'Ciudad de Buenos Aires', match: /^(caba|capital federal|ciudad (autonoma de )?buenos aires|buenos aires)$/i, url: 'https://turismo.buenosaires.gob.ar/es/article/que-hacer-esta-semana', automatic: true },
  { id: 'rosario', name: 'Rosario (Santa Fe)', match: /^rosario(?:,? santa fe)?$/i, url: 'https://www.rosario.gob.ar/inicio/agenda', automatic: true },
  { id: 'cordoba', name: 'Córdoba Capital', match: /^(cordoba|cordoba capital|ciudad de cordoba)$/i, url: 'https://cultura.cordoba.gob.ar/agenda/', automatic: false },
  { id: 'mendoza', name: 'Mendoza Capital', match: /^(mendoza|ciudad de mendoza|mendoza capital)$/i, url: 'https://ciudaddemendoza.gob.ar/servicios/agenda-de-la-ciudad-de-mendoza/', automatic: false },
  { id: 'laplata', name: 'La Plata (Buenos Aires)', match: /^la plata(?:,? buenos aires)?$/i, url: 'https://institutocultural.gba.gob.ar/agenda', automatic: false },
  { id: 'pba', name: 'Provincia de Buenos Aires', match: /^(provincia de buenos aires|pba|claypole|quilmes|avellaneda|lanus|lomas de zamora|almirante brown|mar del plata)$/i, url: 'https://institutocultural.gba.gob.ar/agenda', automatic: false },
];

export function resolveCulturalSource(input) {
  const city = String(input || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return sources.find(source => source.match.test(city)) || null;
}

const plain = (html) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
export function inferRosarioCategory(title) {
  const text = String(title).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/\b(musica|musical|concierto|recital|orquesta|coro|jazz|tango)\b/.test(text)) return 'music';
  if (/\b(teatro|teatral|obra|escena|dramaturgia)\b/.test(text)) return 'theater';
  if (/\b(deporte|deportivo|futbol|maraton|carrera)\b/.test(text)) return 'sports';
  return 'other';
}
export function parseRosarioAgenda(html, { date = '', category = 'all', query = '', today = new Date() } = {}) {
  const year = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric' }).format(today));
  const todayDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(today);
  const cards = [...html.matchAll(/<actividad\b[^>]*>([\s\S]*?)<\/actividad>/gi)];
  if (!cards.length) throw new Error('El sitio cambió su estructura de actividades');
  return cards.flatMap(([, block], i) => {
    const href = block.match(/<a\s+href="(\/inicio\/[^\"]+)"/i)?.[1];
    const title = block.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1];
    const schedule = block.match(/class="fecha-card[^\"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1];
    if (!href || !title || !schedule) return [];
    const label = plain(schedule);
    const dates = [...label.matchAll(/(\d{1,2})\.(\d{1,2})/g)].map(m => `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
    const first = dates[0];
    const last = dates[1] || first;
    if (!first || last < todayDate || (date && (date < first || date > last))) return [];
    const name = plain(title);
    if (query.trim() && !name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())) return [];
    if (!['all', 'culture'].includes(category) && inferRosarioCategory(name) !== category) return [];
    return [{ id: `rosario-${i}`, name, date: label, venue: 'Rosario, Santa Fe · Ver ubicación en el sitio oficial', url: `https://www.rosario.gob.ar${href}` }];
  }).slice(0, 30);
}
