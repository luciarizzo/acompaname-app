import type { PlaceCategory, PlaceResult, PlaceSearch, SearchResult } from '../../types';
import { functionRequest, liveApisEnabled } from '../common';
const labels: Record<PlaceCategory, string> = { pharmacy: 'Farmacia del Parque', hospital: 'Centro de salud cercano', supermarket: 'Mercado de la Plaza', atm: 'Cajero automático' };
export async function searchPlaces(input: PlaceSearch): Promise<SearchResult<PlaceResult>> {
  if (liveApisEnabled) return functionRequest('search-places', input);
  return { mode: 'demo', items: [{ id: 'demo-place-1', name: labels[input.category], address: 'Dirección de ejemplo · no corresponde a un lugar real', open: 'Horario no disponible', distance: 'Distancia de ejemplo · no calculada', latitude: input.latitude, longitude: input.longitude, mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${input.latitude},${input.longitude}` }] };
}
