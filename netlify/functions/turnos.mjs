import { authenticate, ensureProfileRow, getAdmin, json } from '../lib/supabase-admin.mjs';
import {
  ANTICIPACION_MINIMA_MS, MAX_OPCIONES, MAX_TURNOS_ACTIVOS,
  aOpcionDeTurno, centrosDeLaCiudad, datosDeSede, descripcionDelTurno, elegirHorarios, generarCodigo,
  validarBusqueda, validarIdDeHorario,
} from '../lib/turnos.mjs';
import { normalizar, prolijo, resolverCiudad } from '../lib/ciudad.mjs';

// API de turnos médicos de Acompáñame.
//
//   GET    /.netlify/functions/turnos?especialidad=Cardiología&ciudad=Lanús&provincia=Buenos Aires
//          Horarios libres en la ciudad del perfil. Si todavía no hay sede ahí, la crea (con una calle real de esa ciudad).
//          No necesita sesión: la disponibilidad no es un dato personal.
//   POST   /.netlify/functions/turnos   { "slotId": "<id del horario>" }
//          Reserva el horario a nombre del usuario y lo guarda en Mis gestiones. Necesita sesión.
//   DELETE /.netlify/functions/turnos   { "slotId": "<id del horario>" }
//          Cancela el turno, libera el horario y lo quita de Mis gestiones. Necesita sesión.
//
// Los consultorios son de prueba (ver supabase/migrations/20261118_turnos_medicos.sql).

const desde = () => new Date(Date.now() + ANTICIPACION_MINIMA_MS).toISOString();

// Una calle real de la ciudad (catálogo oficial Georef), para la dirección de la sede.
// Se prefiere una avenida con nombre conocido; se descartan nombres abreviados o con letras sueltas.
const CALLES_CONOCIDAS = ['san martin', 'belgrano', 'rivadavia', 'mitre', 'sarmiento', 'colon', 'libertador', 'hipolito yrigoyen', 'espana', 'moreno', 'italia', 'independencia', '9 de julio', '25 de mayo'];
export function elegirCalle(nombres) {
  const legibles = nombres.filter(n => n && !/^calle \d+$/i.test(n) && !/\b[a-z]\b/i.test(n.replace(/^(av|bv)\s+/i, '')) && n.length >= 6);
  const conocida = legibles.find(n => CALLES_CONOCIDAS.some(c => normalizar(n).includes(c)));
  return conocida || legibles[0] || null;
}
async function calleDe(ciudad) {
  for (const categoria of ['AV', 'CALLE']) {
    try {
      const params = new URLSearchParams({ localidad_censal: ciudad.censal, provincia: ciudad.provincia, categoria, max: '100', campos: 'nombre' });
      const response = await fetch(`https://apis.datos.gob.ar/georef/api/calles?${params}`, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) continue;
      const { calles = [] } = await response.json();
      const elegida = elegirCalle(calles.map(c => c.nombre));
      if (elegida) return prolijo(elegida);
    } catch { /* se prueba con la siguiente categoría */ }
  }
  return 'Av. San Martín';
}

// Crea la sede, sus profesionales y sus horarios en la ciudad de la persona.
async function crearSede(db, ciudad) {
  const sede = datosDeSede(ciudad, await calleDe(ciudad));
  const { error } = await db.from('turnos_centros').upsert(
    { nombre: sede.nombre, direccion: sede.direccion, ciudad: sede.ciudad, provincia: sede.provincia },
    { onConflict: 'nombre,ciudad,provincia', ignoreDuplicates: true });
  if (error) throw error;
  const { data: centro, error: lookupError } = await db.from('turnos_centros').select('id, nombre, direccion, ciudad, provincia')
    .eq('nombre', sede.nombre).eq('ciudad', sede.ciudad).eq('provincia', sede.provincia).single();
  if (lookupError) throw lookupError;
  const { error: profError } = await db.from('turnos_profesionales').upsert(
    sede.profesionales.map(p => ({ centro_id: centro.id, nombre: p.nombre, especialidad: p.especialidad })),
    { onConflict: 'centro_id,especialidad', ignoreDuplicates: true });
  if (profError) throw profError;
  const { error: rpcError } = await db.rpc('generar_horarios_turnos', { dias: 21 });
  if (rpcError) throw rpcError;
  return centro;
}

async function buscarHorarios(db, especialidad, ciudadPedida, provinciaPedida) {
  const ciudad = await resolverCiudad(ciudadPedida, provinciaPedida);
  if (!ciudad) return { items: [], notice: `No encontramos «${ciudadPedida}» en el listado oficial de localidades. Revisá tu ciudad en Mi configuración.` };
  const { data: centros, error: centrosError } = await db.from('turnos_centros').select('id, nombre, direccion, ciudad, provincia').eq('provincia', ciudad.provincia);
  if (centrosError) throw centrosError;
  let enLaCiudad = centrosDeLaCiudad(centros, ciudad);
  if (!enLaCiudad.length) enLaCiudad = [await crearSede(db, ciudad)];

  const { data: profesionales, error: profesionalesError } = await db.from('turnos_profesionales')
    .select('id, nombre, especialidad, centro_id')
    .eq('especialidad', especialidad)
    .in('centro_id', enLaCiudad.map(centro => centro.id));
  if (profesionalesError) throw profesionalesError;
  if (!profesionales.length) return { items: [], notice: `No hay profesionales de ${especialidad.toLowerCase()} en ${ciudad.nombre} por ahora.` };

  const consultar = async () => {
    const { data, error } = await db.from('turnos_horarios')
      .select('id, inicio, profesional_id')
      .in('profesional_id', profesionales.map(p => p.id))
      .is('usuario_id', null)
      .gt('inicio', desde())
      .order('inicio', { ascending: true })
      .limit(60);
    if (error) throw error;
    return elegirHorarios(data);
  };

  let horarios = await consultar();
  if (horarios.length < MAX_OPCIONES) {
    // Quedan pocos horarios cargados: se generan los de las próximas semanas y se vuelve a buscar.
    const { error } = await db.rpc('generar_horarios_turnos', { dias: 21 });
    if (error) console.warn('turnos: no se pudieron generar horarios', error);
    else horarios = await consultar();
  }

  const profesionalPorId = new Map(profesionales.map(p => [p.id, p]));
  const centroPorId = new Map(enLaCiudad.map(c => [c.id, c]));
  const items = horarios.map(horario => {
    const profesional = profesionalPorId.get(horario.profesional_id);
    return aOpcionDeTurno(horario, profesional, centroPorId.get(profesional.centro_id));
  });
  return { items };
}

async function detalleDelHorario(db, slotId) {
  const { data, error } = await db.from('turnos_horarios')
    .select('id, inicio, turnos_profesionales!inner(nombre, especialidad, turnos_centros!inner(nombre, direccion, ciudad))')
    .eq('id', slotId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const profesional = data.turnos_profesionales;
  return aOpcionDeTurno(data, profesional, profesional.turnos_centros);
}

async function reservar(db, user, slotId) {
  const { count, error: countError } = await db.from('turnos_horarios')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', user.id).gt('inicio', new Date().toISOString());
  if (countError) throw countError;
  if ((count || 0) >= MAX_TURNOS_ACTIVOS) {
    return json(409, { error: `Ya tenés ${MAX_TURNOS_ACTIVOS} turnos reservados. Para sacar otro, cancelá alguno desde Mis gestiones.` });
  }

  // La reserva es un único UPDATE que solo toma el horario si sigue libre.
  // Si dos personas eligen el mismo horario a la vez, solo una lo consigue.
  let reservado = null;
  for (let intento = 0; intento < 3 && !reservado; intento++) {
    const { data, error } = await db.from('turnos_horarios')
      .update({ usuario_id: user.id, codigo: generarCodigo(), reservado_en: new Date().toISOString() })
      .eq('id', slotId).is('usuario_id', null).gt('inicio', desde())
      .select('id, codigo').maybeSingle();
    if (error?.code === '23505') continue; // el código ya existía: se prueba con otro
    if (error) throw error;
    if (!data) return json(409, { error: 'Ese horario ya no está disponible. Elegí otro de la lista.' });
    reservado = data;
  }
  if (!reservado) throw new Error('No se pudo generar un código de turno único.');

  try {
    const appointment = await detalleDelHorario(db, slotId);
    await ensureProfileRow(db, user.id);
    const { data: gestion, error } = await db.from('gestiones').insert({
      usuario_id: user.id,
      tipo: 'appointment',
      titulo: 'Turno médico reservado',
      descripcion: descripcionDelTurno(appointment),
      modo: 'real',
      turno_id: slotId,
    }).select('id, creado_en').single();
    if (error) throw error;
    const task = {
      id: gestion.id, kind: 'appointment', title: 'Turno médico reservado',
      description: descripcionDelTurno(appointment), createdAt: gestion.creado_en, mode: 'real',
      booking: { slotId, code: reservado.codigo },
    };
    return json(201, { task, appointment, code: reservado.codigo });
  } catch (error) {
    // Si no se pudo guardar la gestión, se libera el horario para no dejar un turno "fantasma".
    await db.from('turnos_horarios').update({ usuario_id: null, codigo: null, reservado_en: null }).eq('id', slotId).eq('usuario_id', user.id);
    throw error;
  }
}

async function cancelar(db, user, slotId) {
  const { data: turno, error: lookupError } = await db.from('turnos_horarios')
    .select('id, inicio').eq('id', slotId).eq('usuario_id', user.id).maybeSingle();
  if (lookupError) throw lookupError;
  if (!turno) return json(404, { error: 'No encontramos este turno en tu cuenta.' });
  if (new Date(turno.inicio).getTime() <= Date.now()) return json(409, { error: 'Este turno ya pasó y no se puede cancelar.' });

  const { error } = await db.from('turnos_horarios')
    .update({ usuario_id: null, codigo: null, reservado_en: null })
    .eq('id', slotId).eq('usuario_id', user.id);
  if (error) throw error;
  const { error: gestionError } = await db.from('gestiones').delete().eq('usuario_id', user.id).eq('turno_id', slotId);
  if (gestionError) console.warn('turnos: el turno se canceló pero no se pudo quitar la gestión', gestionError);
  return json(200, { ok: true });
}

export const handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const db = getAdmin();
      if (!db) return json(503, { error: 'El servidor no tiene configurada la base de datos de turnos.' });
      const busqueda = validarBusqueda(event.queryStringParameters);
      if (busqueda.error) return json(400, { error: busqueda.error });
      const result = await buscarHorarios(db, busqueda.especialidad, busqueda.ciudad, busqueda.provincia);
      return json(200, { mode: 'real', ...result });
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'DELETE') {
      let body;
      try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'El pedido no tiene un formato válido.' }); }
      const slotId = validarIdDeHorario(body);
      if (!slotId) return json(400, { error: 'El horario no tiene un identificador válido.' });
      const auth = await authenticate(event);
      if (auth.error) return auth.error;
      return event.httpMethod === 'POST' ? await reservar(auth.db, auth.user, slotId) : await cancelar(auth.db, auth.user, slotId);
    }

    return json(405, { error: 'Método no permitido.' });
  } catch (error) {
    console.error('turnos', error);
    return json(500, { error: 'No pudimos consultar los turnos en este momento. Probá de nuevo en unos minutos.' });
  }
};
