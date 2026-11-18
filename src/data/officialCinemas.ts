// Únicamente URLs oficiales verificadas. No se infieren películas, funciones ni butacas.
export type OfficialCinema = { id: string; name: string; url: string; detail: string };
export const officialCinemas: OfficialCinema[] = [
  { id: 'cinemark', name: 'Cinemark Hoyts', url: 'https://www.cinemark.com.ar/', detail: 'Cartelera y compra online' },
  { id: 'showcase', name: 'Showcase Cinemas', url: 'https://www.todoshowcase.com/', detail: 'Cartelera y venta oficial' }
];
