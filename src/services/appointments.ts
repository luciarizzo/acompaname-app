import type { AppointmentOption, AppointmentSpecialty, UserLocation } from '../types';

// Búsqueda de horarios libres en la API de turnos (netlify/functions/turnos.mjs).
// No necesita sesión: cualquiera puede ver la disponibilidad. Reservar sí la necesita (ver accountData.ts).
export interface AppointmentSearchResult { items: AppointmentOption[]; notice?: string }

export async function searchAppointments(specialty: AppointmentSpecialty, location: UserLocation): Promise<AppointmentSearchResult> {
  const params = new URLSearchParams({ especialidad: specialty, ciudad: location.city, provincia: location.province || '' });
  const response = await fetch(`/.netlify/functions/turnos?${params}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'No pudimos consultar los turnos en este momento. Probá de nuevo en unos minutos.');
  return { items: payload.items || [], notice: payload.notice };
}
