import type { EventResult, EventSearch, SearchResult } from '../../types';
import { functionRequest, liveApisEnabled } from '../common';
export async function searchEvents(input: EventSearch): Promise<SearchResult<EventResult>> {
  if (liveApisEnabled) return functionRequest('search-events', input);
  const eventNames: Record<string, [string, string]> = {
    music: [`Música en vivo · ${input.city}`, `Recital acústico · ${input.city}`],
    theater: [`Función de teatro · ${input.city}`, `Comedia en vivo · ${input.city}`],
    sports: [`Encuentro deportivo · ${input.city}`, `Partido de fútbol · ${input.city}`],
    other: [`Feria cultural · ${input.city}`, `Actividad al aire libre · ${input.city}`]
  };
  const names = eventNames[input.category] || eventNames.other;
  return { mode: 'demo', items: [
    { id: 'idea-1', name: names[0], date: input.date || 'Elegí el día que te quede cómodo', venue: 'Mendoza · lugar a elección', url: '' },
    { id: 'idea-2', name: names[1], date: input.date || 'Elegí el día que te quede cómodo', venue: 'Mendoza · lugar a elección', url: '' }
  ] };
}
