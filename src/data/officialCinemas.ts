// Únicamente URLs oficiales verificadas. No se infieren películas, funciones ni butacas.
export type OfficialCinema = { id: string; name: string; url: string; detail: string };
export const officialCinemas: OfficialCinema[] = [
  { id: 'cinemark', name: 'Cinemark Hoyts', url: 'https://www.cinemark.com.ar/', detail: 'Cartelera y compra online' },
  { id: 'showcase', name: 'Showcase Cinemas', url: 'https://www.todoshowcase.com/', detail: 'Cartelera y venta oficial' },
  { id: 'atlas', name: 'Atlas Cines', url: 'https://atlascines.com/cartelera/cartelera', detail: 'Cartelera por complejo' },
  { id: 'cinepolis', name: 'Cinépolis', url: 'https://www.cinepolis.com.ar/', detail: 'Cines, funciones y entradas' },
  { id: 'cinemacenter', name: 'Cinemacenter', url: 'https://www.cinemacenter.com.ar/', detail: 'Cines y cartelera oficial' }
];
