export type SourceMode = 'demo' | 'real';
export type FlowKind = 'flight' | 'place' | 'event' | 'other';
export type PlaceCategory = 'pharmacy' | 'hospital' | 'supermarket' | 'atm';
export interface FlightSearch { origin: string; destination: string; date: string; passengers: number }
export interface FlightResult { id: string; airline: string; departure: string; arrival: string; duration: string; price: string; currency: string; origin: string; destination: string; bookingUrl?: string }
export interface PlaceSearch { category: PlaceCategory; latitude: number; longitude: number }
export interface PlaceResult { id: string; name: string; address: string; open?: string; distance?: string; latitude?: number; longitude?: number; mapsUrl: string }
export interface EventSearch { category: string; city: string; date?: string }
export interface EventResult { id: string; name: string; date: string; venue: string; image?: string; url: string; localDate?: string; localTime?: string }
export interface SearchResult<T> { mode: SourceMode; items: T[] }
export interface SavedTask { id: string; kind: FlowKind; title: string; description: string; createdAt: string; mode: SourceMode }
