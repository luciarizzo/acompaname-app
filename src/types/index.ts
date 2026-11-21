export type SourceMode = 'demo' | 'real';
export type FlowKind = 'event' | 'cinema' | 'appointment' | 'trip' | 'other';
export type AppointmentSpecialty = 'Clínica médica' | 'Cardiología' | 'Oftalmología' | 'Odontología';
export interface AppointmentOption { id: string; specialty: AppointmentSpecialty; professional: string; date: string; time: string; location: string }
export interface EventSearch { category: string; city: string; date?: string; query?: string }
export interface EventResult { id: string; name: string; date: string; venue: string; image?: string; url: string; localDate?: string; localTime?: string }
export interface SearchResult<T> { mode: SourceMode; items: T[]; source?: string; notice?: string; agendaUrl?: string | null }
/** Turno reservado de verdad con la API de turnos: slotId identifica el horario y code es el código para mostrar al llegar. */
export interface AppointmentBooking { slotId: string; code: string }
export interface SavedTask { id: string; kind: FlowKind; title: string; description: string; createdAt: string; mode: SourceMode; editChoices?: { appointmentSlots: AppointmentOption[] }; booking?: AppointmentBooking }

/** Ciudad del perfil: con ella se buscan sedes de turnos y direcciones de viajes cerca de la persona. */
export interface UserLocation { city: string; province?: string; lat?: number; lon?: number }
