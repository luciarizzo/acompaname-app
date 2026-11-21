import { randomInt } from 'node:crypto';
import { normalizar } from './ciudad.mjs';

// Lógica pura de la API de turnos. No toca la base, así se puede probar sin Supabase (ver tests/turnos-api.test.mjs).

export const ESPECIALIDADES = ['Clínica médica', 'Cardiología', 'Oftalmología', 'Odontología'];
export const MAX_TURNOS_ACTIVOS = 3;
export const MAX_OPCIONES = 6;
export const MAX_OPCIONES_POR_DIA = 2;
// No se ofrecen horarios que empiecen en menos de este tiempo: da margen para llegar.
export const ANTICIPACION_MINIMA_MS = 2 * 60 * 60 * 1000;
const ZONA = 'America/Argentina/Buenos_Aires';

export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Busca la sede de la ciudad que eligió la persona (misma ciudad y provincia, sin importar tildes ni mayúsculas).
export function centrosDeLaCiudad(centros, ciudad) {
  if (!ciudad) return [];
  return centros.filter(centro => normalizar(centro.ciudad) === normalizar(ciudad.nombre) && normalizar(centro.provincia) === normalizar(ciudad.provincia));
}

// Datos de la sede que se crea cuando todavía no hay una en la ciudad de la persona.
// La calle es real (del catálogo oficial de esa ciudad); la altura y los profesionales se eligen siempre igual para cada ciudad.
const PROFESIONALES = {
  'Clínica médica': ['Dra. Paula Ríos', 'Dra. Sofía Benítez', 'Dra. Carla Medina', 'Dr. Ignacio Ferrari', 'Dra. Lucía Romero', 'Dr. Martín Aguirre'],
  Cardiología: ['Dr. Martín López', 'Dr. Ricardo Paz', 'Dr. Julián Sosa', 'Dra. Verónica Ledesma', 'Dr. Diego Castro', 'Dra. Natalia Quiroga'],
  Oftalmología: ['Dra. Laura Acosta', 'Dra. Inés Gutiérrez', 'Dra. Valeria Ortiz', 'Dr. Esteban Morales', 'Dra. Marta Giménez', 'Dr. Leandro Funes'],
  Odontología: ['Dr. Andrés Molina', 'Dr. Tomás Ferreyra', 'Dr. Pablo Herrera', 'Dra. Florencia Vidal', 'Dr. Federico Vera', 'Dra. Camila Ojeda'],
};
function numeroDe(texto) {
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
export function datosDeSede(ciudad, calle) {
  const semilla = numeroDe(`${ciudad.nombre}|${ciudad.provincia}`);
  return {
    nombre: 'Centro Médico Acompáñame',
    direccion: `${calle} ${200 + (semilla % 1700)}`,
    ciudad: ciudad.nombre,
    provincia: ciudad.provincia,
    profesionales: ESPECIALIDADES.map((especialidad, i) => ({ especialidad, nombre: PROFESIONALES[especialidad][(semilla >>> (i * 3)) % PROFESIONALES[especialidad].length] })),
  };
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
  const provincia = String(params?.provincia || '').trim().slice(0, 100);
  if (!ESPECIALIDADES.includes(especialidad)) return { error: 'Elegí una especialidad de la lista.' };
  if (!ciudad || ciudad.length > 100) return { error: 'Indicá la ciudad donde querés atenderte.' };
  return { especialidad, ciudad, provincia };
}

export function validarIdDeHorario(body) {
  const id = String(body?.slotId || '');
  return uuid.test(id) ? id : null;
}
