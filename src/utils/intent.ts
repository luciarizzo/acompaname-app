import type { FlowKind, PlaceCategory } from '../types';
export interface ClassifiedNeed { kind: FlowKind; placeCategory?: PlaceCategory; eventCategory?: string }
export function classifyNeed(text: string): ClassifiedNeed {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/\b(viaje|viajar|vuelo|volar|pasaje|pasajes|avion|aeropuerto)\b/.test(normalized)) return { kind: 'flight' };
  if (/\b(farmacia|farmacias)\b/.test(normalized)) return { kind: 'place', placeCategory: 'pharmacy' };
  if (/\b(hospital|clinica|guardia|centro de salud)\b/.test(normalized)) return { kind: 'place', placeCategory: 'hospital' };
  if (/\b(supermercado|super)\b/.test(normalized)) return { kind: 'place', placeCategory: 'supermarket' };
  if (/\b(cajero|cajero automatico)\b/.test(normalized)) return { kind: 'place', placeCategory: 'atm' };
  if (/\b(salida|evento|recital|concierto|hacer algo|musica|teatro|deporte|deportes)\b/.test(normalized)) {
    const eventCategory = /\b(teatro)\b/.test(normalized) ? 'theater' : /\b(deporte|deportes|partido)\b/.test(normalized) ? 'sports' : /\b(musica|recital|concierto)\b/.test(normalized) ? 'music' : '';
    return { kind: 'event', eventCategory };
  }
  if (/\b(encontrar un lugar|buscar un lugar|cerca de mi|cerca mio)\b/.test(normalized)) return { kind: 'place' };
  return { kind: 'other' };
}
