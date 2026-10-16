import type { FlightResult, FlightSearch, SearchResult } from '../../types';
import { functionRequest, liveApisEnabled } from '../common';
const demo: FlightResult[] = [
  { id: 'demo-flight-1', airline: 'Aerolínea de ejemplo', departure: '08:20', arrival: '10:05', duration: '1 h 45 min', price: '85.000', currency: 'ARS', origin: 'Buenos Aires', destination: 'Mendoza' },
  { id: 'demo-flight-2', airline: 'Aerolínea de ejemplo', departure: '14:10', arrival: '15:55', duration: '1 h 45 min', price: '102.500', currency: 'ARS', origin: 'Buenos Aires', destination: 'Mendoza' }
];
export async function searchFlights(input: FlightSearch): Promise<SearchResult<FlightResult>> {
  if (liveApisEnabled) return functionRequest('search-flights', input);
  return { mode: 'demo', items: demo.map((flight) => ({ ...flight, origin: input.origin, destination: input.destination })) };
}
