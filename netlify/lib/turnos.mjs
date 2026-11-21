import { randomInt } from 'node:crypto';

// Lógica pura de la API de turnos. No toca la base, así se puede probar sin Supabase (ver tests/turnos-api.test.mjs).

export const ESPECIALIDADES = ['Clínica médica', 'Cardiología', 'Oftalmología', 'Odontología'];
export const MAX_TURNOS_ACTIVOS = 3;
export const MAX_OPCIONES = 6;
export const MAX_OPCIONES_POR_DIA = 2;
// No se ofrecen horarios que empiecen en menos de este tiempo: da margen para llegar.
export const ANTICIPACION_MINIMA_MS = 2 * 60 * 60 * 1000;
const ZONA = 'America/Argentina/Buenos_Aires';

export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// "Ciudad Autónoma de Buenos Aires", "CABA", "Mendoza, Argentina" o "mendoza capital" se comparan igual.
export function normalizarCiudad(value) {
  let text = String(value || '').split(',')[0]
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
  if (text === 'caba' || text === 'capital federal' || text === 'ciudad autonoma de buenos aires' || text === 'ciudad de buenos aires') text = 'buenos aires';
  text = text.replace(/^ciudad de /, '').replace(/ capital$/, '').trim();
  return text;
}

export function centrosDeLaCiudad(centros, ciudad) {
  const buscada = normalizarCiudad(ciudad);
  if (!buscada) return [];
  return centros.filter(centro => normalizarCiudad(centro.ciudad) === buscada);
}

// Ofrece pocas opciones y repartidas en distintos días: menos opciones = menos confusión.
// Los horarios llegan ordenados del más cercano al más lejano.
export function elegirHorarios(horarios, ahora = Date.now()) {
  const porDia = new Map();
  const elegidos = [];
  for (const horario of horarios) {
    if (new Date(horario.inicio).getTime() - ahora < ANTICIPACION_MINIMA_MS) continue;
    const dia = fechaLocal(horario.inicio, { year: 'numeric', month: '2-digit', day: '2-digit' });
    const cantidad = porDia.get(dia) || 0;
    if (cantidad >= MAX_OPCIONES_POR_DIA) continue;
    porDia.set(dia, cantidad + 1);
    elegidos.push(horario);
    if (elegidos.length >= MAX_OPCIONES) break;
  }
  return elegidos;
}

function fechaLocal(iso, options) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, ...options }).format(new Date(iso));
}

// Convierte un horario de la base al formato AppointmentOption que usa el front (src/types/index.ts).
export function aOpcionDeTurno(horario, profesional, centro) {
  return {
    id: horario.id,
    specialty: profesional.especialidad,
    professional: profesional.nombre,
    date: fechaLocal(horario.inicio, { weekday: 'long', day: 'numeric', month: 'long' }),
    time: fechaLocal(horario.inicio, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
    location: `${centro.nombre} · ${centro.direccion}, ${centro.ciudad}`,
  };
}

// Mismo formato que appointmentDescription() en src/utils/taskDetails.ts.
export function descripcionDelTurno(opcion) {
  return `${opcion.specialty} · ${opcion.date} · ${opcion.time} · ${opcion.location}`;
}

// Código corto para mostrar al llegar. Sin letras ni números que se confunden (0/O, 1/I/L, 5/S, 8/B, 2/Z).
const LETRAS_CODIGO = 'ACDEFGHJKMNPQRTUVWXY34679';
export function generarCodigo(largo = 6) {
  let codigo = '';
  for (let i = 0; i < largo; i++) codigo += LETRAS_CODIGO[randomInt(LETRAS_CODIGO.length)];
  return codigo;
}

export function validarBusqueda(params) {
  const especialidad = String(params?.especialidad || '');
  const ciudad = String(params?.ciudad || '').trim();
  if (!ESPECIALIDADES.includes(especialidad)) return { error: 'Elegí una especialidad de la lista.' };
  if (!ciudad || ciudad.length > 100) return { error: 'Indicá la ciudad donde querés atenderte.' };
  return { especialidad, ciudad };
}

export function validarIdDeHorario(body) {
  const id = String(body?.slotId || '');
  return uuid.test(id) ? id : null;
}
