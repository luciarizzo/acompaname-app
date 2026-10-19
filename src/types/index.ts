export type SourceMode = 'demo' | 'real';
export type FlowKind = 'event' | 'appointment' | 'other';
export type AppointmentSpecialty = 'Clínica médica' | 'Cardiología' | 'Oftalmología' | 'Odontología';
export interface AppointmentOption { id: string; specialty: AppointmentSpecialty; professional: string; date: string; time: string; location: string }
export interface EventSearch { category: string; city: string; date?: string }
export interface EventResult { id: string; name: string; date: string; venue: string; image?: string; url: string; localDate?: string; localTime?: string }
export interface SearchResult<T> { mode: SourceMode; items: T[] }
export interface SavedTask { id: string; kind: FlowKind; title: string; description: string; createdAt: string; mode: SourceMode }
