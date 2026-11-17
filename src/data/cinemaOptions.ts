// Opciones compartidas entre el recorrido del cine y la edición de planes.
export type CinemaPick = { id: string; label: string; detail?: string };
export const cinemas: CinemaPick[] = [
  { id: 'centro', label: 'Cine del Centro', detail: 'En el centro de la ciudad' },
  { id: 'parque', label: 'Cine Parque', detail: 'Una opción cerca de espacios verdes' },
];
export const movies: CinemaPick[] = [
  { id: 'viaje', label: 'El viaje inesperado', detail: 'Aventura · 2 h 05 min' },
  { id: 'isla', label: 'La última isla', detail: 'Drama · 1 h 48 min' },
  { id: 'familia', label: 'Una familia especial', detail: 'Comedia · 1 h 35 min' },
];
export const showtimes: CinemaPick[] = [
  { id: '17:15', label: '17:15', detail: 'Función de la tarde' },
  { id: '19:30', label: '19:30', detail: 'Función de la tarde' },
  { id: '21:45', label: '21:45', detail: 'Función de la noche' },
];
export const seatZones: CinemaPick[] = [
  { id: 'front', label: 'Adelante', detail: 'Más cerca de la pantalla' },
  { id: 'center', label: 'En el centro', detail: 'A una distancia intermedia' },
  { id: 'back', label: 'Al fondo', detail: 'Más lejos de la pantalla' },
];
export const paymentOptions: CinemaPick[] = [
  { id: 'debit-card', label: 'Tarjeta de débito' },
  { id: 'credit-card', label: 'Tarjeta de crédito' },
];
export const ticketAmounts = ['1', '2', '3', '4'] as const;
export function formatCinemaDate(value: string): string {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || !parts.every(Number.isInteger)) return 'Sin elegir';
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return 'Sin elegir';
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}
const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
export function parseCinemaDate(text: string): string | null {
  const normalized = text.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const match = normalized.match(/^(?:[a-z]+,\s*)?(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/);
  if (!match) return null;
  const month = months.indexOf(match[2]) + 1;
  if (!month) return null;
  const iso = `${match[3]}-${String(month).padStart(2,'0')}-${match[1].padStart(2,'0')}`;
  return formatCinemaDate(iso) === 'Sin elegir' ? null : iso;
}
