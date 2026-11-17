const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const caba = /^(caba|capital federal|ciudad (autonoma )?de buenos aires)$/;
const gba = /^(buenos aires|provincia de buenos aires|gran buenos aires|amba)$/;

export function matchesCinemarkCity(city: string, theater: { city: string; region: string; address: string; name: string }) {
  const location = normalize(city);
  if (!location) return true;
  if (caba.test(location)) return normalize(theater.city) === 'caba';
  if (gba.test(location)) return ['caba', 'buenos aires'].includes(normalize(theater.city));
  const field = normalize([theater.city, theater.region, theater.address, theater.name].join(' '));
  if (field.includes(location)) return true;
  // Las localidades del conurbano no siempre aparecen en el campo city de Cinemark.
  if (/^(claypole|adrogue|banfield|lanus|lomas de zamora|temperley|avellaneda|quilmes|moron|haedo|ramos mejia|san justo|moreno|tigre|san isidro|vicente lopez)$/.test(location)) return normalize(theater.city) === 'buenos aires';
  return false;
}

export function matchesShowcaseCity(city: string, theaterName: string) {
  const location = normalize(city);
  if (!location) return true;
  const theater = normalize(theaterName);
  if (theater.includes(location)) return true;
  if (caba.test(location)) return /belgrano|caballito|capital|caba/.test(theater);
  if (gba.test(location)) return !/rosario|cordoba|santa fe|mendoza/.test(theater);
  if (/^(claypole|adrogue|banfield|lanus|lomas de zamora|temperley|avellaneda|quilmes)$/.test(location)) return /quilmes|haedo|norcenter|norte/.test(theater);
  if (/^(moron|haedo|ramos mejia|san justo|moreno)$/.test(location)) return /haedo|norcenter|norte|quilmes/.test(theater);
  if (location === 'santa fe') return theater.includes('rosario');
  return false;
}

export function cinemarkMovieUrl(movieName: string, theaterSlug?: string) {
  const slug = normalize(movieName).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const base = slug ? `https://www.cinemark.com.ar/pelicula/${slug}` : 'https://www.cinemark.com.ar/elegi-pelicula';
  return theaterSlug ? `${base}?cine=${encodeURIComponent(theaterSlug)}` : base;
}
