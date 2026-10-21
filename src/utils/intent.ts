import type { FlowKind } from '../types';
export interface ClassifiedNeed { kind: FlowKind; eventCategory?: string }
export function extractRequestedDate(text: string, from = new Date()): string | null {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/\b(?:el\s+)?sabado\s+pasado\b|\bpasado\s+sabado\b/.test(normalized)) return null;
  if (!/\bsabado\b/.test(normalized)) return null;

  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const daysUntilSaturday = (6 - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + daysUntilSaturday);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function classifyNeed(text: string): ClassifiedNeed {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/\b(turno|turnos|medico|medica|consulta|especialista|cardiologo|odontologo|oftalmologo)\b/.test(normalized)) return { kind: 'appointment' };
  if (/\b(salida|evento|recital|concierto|hacer algo|musica|teatro|cine|pelicula|peliculas|deporte|deportes)\b/.test(normalized)) {
    const eventCategory = /\b(teatro|cine|pelicula|peliculas)\b/.test(normalized) ? 'theater' : /\b(deporte|deportes|partido)\b/.test(normalized) ? 'sports' : /\b(musica|recital|concierto)\b/.test(normalized) ? 'music' : '';
    return { kind: 'event', eventCategory };
  }
  return { kind: 'other' };
}
