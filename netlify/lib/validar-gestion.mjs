// Reglas de edición del MVP: nunca se permite alterar una reserva real ni
// inventar horarios, profesionales o lugares fuera de las alternativas ofrecidas.
const cinemas = ['Cine del Centro', 'Cine Parque'];
const movies = ['El viaje inesperado', 'La última isla', 'Una familia especial'];
const hours = ['17:15', '19:30', '21:45'];
const seats = ['Adelante', 'En el centro', 'Al fondo'];
const payments = ['Tarjeta de débito', 'Tarjeta de crédito'];
const amounts = ['1 entrada', '2 entradas', '3 entradas', '4 entradas'];
const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function validDate(next, before) {
  if (next === before) return true;
  const match = next.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .match(/^(?:[a-z]+,\s*)?(\d{1,2}) de ([a-z]+) de (\d{4})$/);
  if (!match) return false;
  const [, day, month, year] = match;
  const yearNum = Number(year);
  const monthNum = months.indexOf(month) + 1;
  const date = new Date(yearNum, monthNum - 1, Number(day));
  const thisYear = new Date().getFullYear();
  return Boolean(monthNum && yearNum >= thisYear && yearNum <= thisYear + 5 &&
    date.getFullYear() === yearNum && date.getMonth() === monthNum - 1 && date.getDate() === Number(day));
}

export function validTaskDescriptionUpdate(row, description) {
  if (typeof description !== 'string') return false;
  if (description === row.descripcion) return true;
  if (row.tipo === 'appointment') {
    const slots = row.opciones_edicion?.appointmentSlots;
    return Array.isArray(slots) && slots.some(slot =>
      description === `${slot.specialty} · ${slot.date} · ${slot.time} · ${slot.location}`);
  }
  if (row.tipo !== 'cinema') return false;
  const old = row.descripcion.split(' · ');
  const next = description.split(' · ');
  if (old.length !== 7 || next.length !== 7) return false;
  const originalCity = old[3].split(', ').slice(1).join(', ');
  const cinemasAvailable = originalCity && cinemas.map(cinema => `${cinema}, ${originalCity}`);
  return movies.includes(next[0]) && validDate(next[1], old[1]) && hours.includes(next[2]) &&
    Boolean(cinemasAvailable && cinemasAvailable.includes(next[3])) && amounts.includes(next[4]) &&
    seats.includes(next[5]) && payments.includes(next[6]);
}
