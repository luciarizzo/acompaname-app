import type { EventResult, EventSearch, SearchResult } from '../../types';
import { functionRequest, liveApisEnabled } from '../common';
export async function searchEvents(input: EventSearch): Promise<SearchResult<EventResult>> {
  if (liveApisEnabled) return functionRequest('search-events', input);
  return { mode: 'demo', items: [
    { id: 'demo-event-1', name: `Música en vivo · ${input.city}`, date: input.date || 'Sábado · horario a confirmar', venue: 'Espacio cultural de ejemplo', url: 'https://www.ticketmaster.com/' },
    { id: 'demo-event-2', name: `Teatro para disfrutar · ${input.city}`, date: input.date || 'Este fin de semana', venue: 'Teatro de ejemplo', url: 'https://www.ticketmaster.com/' }
  ] };
}
