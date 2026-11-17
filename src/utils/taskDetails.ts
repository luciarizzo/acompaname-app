import type { AppointmentOption, FlowKind, SavedTask } from '../types';
import { cinemas, movies, showtimes, seatZones, paymentOptions, ticketAmounts, parseCinemaDate } from '../data/cinemaOptions';

export interface TaskField { label: string; value: string }

const labels: Record<FlowKind, string[]> = {
  cinema: ['Película', 'Día', 'Horario', 'Cine y ciudad', 'Cantidad de entradas', 'Zona de butacas', 'Medio de pago preferido'],
  appointment: ['Especialidad', 'Día', 'Horario', 'Sede'],
  trip: ['Recorrido', 'Tipo de viaje', 'Precio estimado'],
  event: ['Actividad', 'Ciudad'],
  other: ['Tu consulta'],
};

// Se reutiliza el formato de descripción que ya guardan los flujos de la V1.
// No se modifica ni interpreta información de compras o reservas externas.
export function taskFields(task: SavedTask): TaskField[] {
  if (task.kind === 'other') return [{ label: 'Tu consulta', value: task.description }];
  if (task.kind === 'appointment') {
    const parts = task.description.split(' · ');
    if (parts.length >= 4) return [
      { label: 'Especialidad', value: parts[0] },
      { label: 'Día', value: parts[1] },
      { label: 'Horario', value: parts[2] },
      { label: 'Sede', value: parts.slice(3).join(' · ') },
    ];
  }
  if (task.kind === 'event') {
    const separator = task.description.lastIndexOf(' · ');
    if (separator > 0) return [
      { label: 'Actividad', value: task.description.slice(0, separator) },
      { label: 'Ciudad', value: task.description.slice(separator + 3) },
    ];
  }
  return task.description.split(' · ').map((value, index) => ({
    label: labels[task.kind][index] || `Detalle ${index + 1}`,
    value,
  }));
}

export function taskStatus(kind: FlowKind): string {
  switch (kind) {
    case 'cinema': return 'Es un plan guardado. No se compraron entradas.';
    case 'appointment': return 'Es una consulta guardada. No se reservó ningún turno.';
    case 'trip': return 'Es un plan guardado. No se solicitó ningún viaje.';
    case 'event': return 'Es una salida guardada. No se compraron entradas.';
    case 'other': return 'Es una consulta guardada. No se completó ningún trámite.';
  }
}

export function serializeTaskFields(fields: TaskField[]): string {
  return fields.map(field => field.value.trim()).join(' · ');
}

// HU18: reutiliza las opciones del flujo para evitar horarios y lugares inventados.
export function appointmentDescription(slot: AppointmentOption): string {
  return `${slot.specialty} · ${slot.date} · ${slot.time} · ${slot.location}`;
}
export function cinemaFieldChoices(task: SavedTask, label: string): string[] {
  if (task.kind !== 'cinema') return [];
  switch (label) {
    case 'Película': return movies.map(x => x.label);
    case 'Horario': return showtimes.map(x => x.label);
    case 'Cantidad de entradas': return ticketAmounts.map(n => `${n} ${n === '1' ? 'entrada' : 'entradas'}`);
    case 'Zona de butacas': return seatZones.map(x => x.label);
    case 'Medio de pago preferido': return paymentOptions.map(x => x.label);
    case 'Cine y ciudad': {
      const value = taskFields(task).find(x => x.label === label)?.value || '';
      const cinema = cinemas.find(x => value.startsWith(`${x.label}, `));
      if (!cinema) return [];
      const city = value.slice(cinema.label.length + 2);
      return city ? cinemas.map(x => `${x.label}, ${city}`) : [];
    }
    default: return [];
  }
}
export function editTaskError(original: SavedTask, changed: SavedTask): string | null {
  if (changed.id !== original.id || changed.kind !== original.kind) return 'No podés cambiar el tipo de gestión.';
  if (!changed.title.trim() || changed.title.trim().length > 120) return 'Ingresá un nombre de hasta 120 caracteres.';
  if (!changed.description || changed.description.length > 2000) return 'Revisá los datos del plan.';
  if (changed.description === original.description) return null;
  if (original.kind === 'appointment') {
    return (original.editChoices?.appointmentSlots || []).some(slot => appointmentDescription(slot) === changed.description)
      ? null : 'Elegí uno de los horarios y lugares ofrecidos al guardar la consulta.';
  }
  if (original.kind === 'cinema') {
    const previous = taskFields(original);
    const next = taskFields(changed);
    if (previous.length !== 7 || next.length !== previous.length) return 'Los datos de este plan no permiten editar las elecciones.';
    for (let i = 0; i < previous.length; i++) {
      if (previous[i].value === next[i].value) continue;
      if (previous[i].label === 'Día') {
        const iso = parseCinemaDate(next[i].value);
        const year = iso ? Number(iso.slice(0,4)) : 0;
        const current = new Date().getFullYear();
        if (year >= current && year <= current + 5) continue;
      } else if (cinemaFieldChoices(original, previous[i].label).includes(next[i].value)) continue;
      return `Elegí una opción válida para «${previous[i].label}».`;
    }
    return null;
  }
  return 'Para cambiar las opciones de esta gestión, iniciá una nueva consulta.';
}
