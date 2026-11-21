// Comunicación con la API de viajes (netlify/functions/viajes.mjs) y la búsqueda de direcciones.

export interface AddressSuggestion { id: string; label: string; detail: string; lat: number; lon: number }
export interface TripPoint { lat: number; lon: number; label: string }
export interface RideQuote { id: 'auto' | 'espacio'; label: string; detail: string; price: number; pickupMinutes: number }
export interface TripEstimate { distanceKm: number; durationMinutes: number; options: RideQuote[] }
export type TripStatus = 'searching' | 'arriving' | 'waiting' | 'in_progress' | 'completed' | 'cancelled';
export interface TripState { status: TripStatus; minutesToPickup?: number; minutesToDestination?: number; progress?: number }
export interface Trip {
  id: string; rideLabel: string; price: number; distanceKm: number; durationMinutes: number; pickupMinutes: number; pin: string;
  driver: { name: string; rating: number; trips: number };
  vehicle: { model: string; color: string; plate: string };
}
export interface TripResponse { token: string; trip: Trip; state: TripState }

async function call<T>(init: RequestInit & { query?: string } = {}): Promise<T> {
  const response = await fetch(`/.netlify/functions/viajes${init.query ? `?${init.query}` : ''}`, { ...init, headers: { 'Content-Type': 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'No pudimos comunicarnos con el servicio de viajes. Probá de nuevo.');
  return payload as T;
}

export const estimateTrip = (origin: TripPoint, destination: TripPoint) =>
  call<TripEstimate>({ method: 'POST', body: JSON.stringify({ action: 'estimate', origin, destination }) });
export const requestTrip = (origin: TripPoint, destination: TripPoint, rideType: string) =>
  call<TripResponse>({ method: 'POST', body: JSON.stringify({ action: 'request', origin, destination, rideType }) });
export const tripStatus = (token: string) => call<{ state: TripState }>({ method: 'GET', query: new URLSearchParams({ token }).toString() });
export const cancelTrip = (token: string) => call<TripResponse>({ method: 'POST', body: JSON.stringify({ action: 'cancel', token }) });

export async function searchAddresses(q: string, city: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const response = await fetch(`/.netlify/functions/search-addresses?${new URLSearchParams({ q, ciudad: city })}`, { signal });
  if (!response.ok) throw new Error('Sin conexión');
  const data: { items?: AddressSuggestion[] } = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}

export const formatPrice = (value: number) => `$${Math.round(value).toLocaleString('es-AR')}`;
