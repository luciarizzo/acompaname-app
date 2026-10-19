import type { EventResult, EventSearch, SearchResult } from '../../types';
import { functionRequest, liveApisEnabled } from '../common';
export async function searchEvents(input: EventSearch): Promise<SearchResult<EventResult>> {
  if (liveApisEnabled) return functionRequest('search-events', input);
  const eventNames: Record<string, [string, string]> = {
    music: [`Música en vivo · ${input.city}`, `Concierto acústico · ${input.city}`],
    theater: [`Una noche de teatro · ${input.city}`, `Comedia para disfrutar · ${input.city}`],
    sports: [`Encuentro deportivo · ${input.city}`, `Partido de demostración · ${input.city}`],
    other: [`Actividad cultural · ${input.city}`, `Plan para compartir · ${input.city}`]
  };
  const names = eventNames[input.category] || eventNames.other;
  return { mode: 'demo', items: [
    { id: 'demo-event-1', name: names[0], date: input.date || 'Sábado · horario a confirmar', venue: 'Espacio de ejemplo', url: 'https://www.ticketmaster.com/' },
    { id: 'demo-event-2', name: names[1], date: input.date || 'Este fin de semana', venue: 'Lugar de demostración', url: 'https://www.ticketmaster.com/' }
  ] };
}
