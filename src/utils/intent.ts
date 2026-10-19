import type { FlowKind } from '../types';
export interface ClassifiedNeed { kind: FlowKind; eventCategory?: string }
export function classifyNeed(text: string): ClassifiedNeed {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/\b(turno|turnos|medico|medica|consulta|especialista|cardiologo|odontologo|oftalmologo)\b/.test(normalized)) return { kind: 'appointment' };
  if (/\b(salida|evento|recital|concierto|hacer algo|musica|teatro|deporte|deportes)\b/.test(normalized)) {
    const eventCategory = /\b(teatro)\b/.test(normalized) ? 'theater' : /\b(deporte|deportes|partido)\b/.test(normalized) ? 'sports' : /\b(musica|recital|concierto)\b/.test(normalized) ? 'music' : '';
    return { kind: 'event', eventCategory };
  }
  return { kind: 'other' };
}
