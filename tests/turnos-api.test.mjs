import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ANTICIPACION_MINIMA_MS, MAX_OPCIONES, MAX_OPCIONES_POR_DIA,
  aOpcionDeTurno, centrosDeLaCiudad, datosDeSede, descripcionDelTurno, elegirHorarios, generarCodigo,
  validarBusqueda, validarIdDeHorario,
} from '../netlify/lib/turnos.mjs';
import { prolijo } from '../netlify/lib/ciudad.mjs';

// La API de turnos sin base de datos: se prueban las reglas y los mensajes de error.
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
const { handler } = await import('../netlify/functions/turnos.mjs');

test('Turnos: busca la sede de la misma ciudad y provincia, sin importar tildes', () => {
  const centros = [
    { id: 'a', ciudad: 'San Martín', provincia: 'Mendoza' },
    { id: 'b', ciudad: 'San Martín', provincia: 'Buenos Aires' },
    { id: 'c', ciudad: 'Lanús', provincia: 'Buenos Aires' },
  ];
  assert.deepEqual(centrosDeLaCiudad(centros, { nombre: 'San Martin', provincia: 'Mendoza' }).map(c => c.id), ['a']);
  assert.deepEqual(centrosDeLaCiudad(centros, { nombre: 'Lanus', provincia: 'Buenos Aires' }).map(c => c.id), ['c']);
  assert.deepEqual(centrosDeLaCiudad(centros, { nombre: 'Tandil', provincia: 'Buenos Aires' }), []);
  assert.deepEqual(centrosDeLaCiudad(centros, null), []);
});

test('Turnos: la sede nueva usa una calle de la ciudad y es siempre la misma para esa ciudad', async () => {
  const lanus = { nombre: 'Lanús', provincia: 'Buenos Aires' };
  const sede = datosDeSede(lanus, 'Av. Gral. San Martín');
  assert.equal(sede.ciudad, 'Lanús');
  assert.equal(sede.provincia, 'Buenos Aires');
  assert.match(sede.direccion, /^Av\. Gral\. San Martín \d{3,4}$/);
  assert.equal(sede.profesionales.length, 4);
  assert.ok(sede.profesionales.every(p => p.nombre && p.especialidad));
  assert.deepEqual(datosDeSede(lanus, 'Av. Gral. San Martín'), sede);
  const { elegirCalle } = await import('../netlify/functions/turnos.mjs');
  assert.equal(elegirCalle(['AV B SUR MER', 'AV BARTOLOME MITRE', 'AV LIMA']), 'AV BARTOLOME MITRE');
  assert.equal(elegirCalle(['CALLE 12', 'AV LAS HERAS']), 'AV LAS HERAS');
  assert.equal(prolijo('AV GRL SAN MARTIN'), 'Av. Gral. San Martín');
  assert.equal(prolijo('AV ESPANA'), 'Av. España');
});

test('Turnos: ofrece pocas opciones, repartidas en días y con margen para llegar', () => {
  const ahora = Date.parse('2026-11-18T12:00:00Z');
  const horarios = [];
  // Uno demasiado cercano y luego 5 horarios por día durante 5 días.
  horarios.push({ id: 'cerca', inicio: new Date(ahora + ANTICIPACION_MINIMA_MS - 60_000).toISOString() });
  for (let dia = 1; dia <= 5; dia++) for (let h = 0; h < 5; h++) {
    horarios.push({ id: `${dia}-${h}`, inicio: new Date(ahora + dia * 86_400_000 + h * 5_400_000).toISOString() });
  }
  const elegidos = elegirHorarios(horarios, ahora);
  assert.equal(elegidos.length, MAX_OPCIONES);
  assert.ok(!elegidos.some(h => h.id === 'cerca'));
  const porDia = new Map();
  for (const h of elegidos) porDia.set(h.id.split('-')[0], (porDia.get(h.id.split('-')[0]) || 0) + 1);
  assert.ok([...porDia.values()].every(n => n <= MAX_OPCIONES_POR_DIA));
});

test('Turnos: muestra fecha y hora de Argentina y la descripción que usa Mis gestiones', () => {
  const opcion = aOpcionDeTurno(
    { id: 'x', inicio: '2026-11-23T12:00:00Z' },
    { nombre: 'Dra. Paula Ríos', especialidad: 'Clínica médica' },
    { nombre: 'Centro Médico Acompáñame', direccion: 'Av. España 1340', ciudad: 'Mendoza' },
  );
  assert.equal(opcion.time, '09:00');
  assert.match(opcion.date, /lunes.*23.*noviembre/);
  assert.equal(descripcionDelTurno(opcion), `Clínica médica · ${opcion.date} · 09:00 · Centro Médico Acompáñame · Av. España 1340, Mendoza`);
});

test('Turnos: el código es corto y no usa caracteres que se confunden', () => {
  for (let i = 0; i < 200; i++) assert.match(generarCodigo(), /^[ACDEFGHJKMNPQRTUVWXY34679]{6}$/);
});

test('Turnos: valida especialidad, ciudad e identificador de horario', () => {
  assert.ok(validarBusqueda({ especialidad: 'Pediatría', ciudad: 'Mendoza' }).error);
  assert.ok(validarBusqueda({ especialidad: 'Cardiología', ciudad: '  ' }).error);
  assert.deepEqual(validarBusqueda({ especialidad: 'Cardiología', ciudad: ' Lanús ', provincia: 'Buenos Aires' }), { especialidad: 'Cardiología', ciudad: 'Lanús', provincia: 'Buenos Aires' });
  assert.equal(validarIdDeHorario({ slotId: 'abc' }), null);
  assert.equal(validarIdDeHorario({ slotId: '51f5b167-ab67-45f2-9002-019c220a5f68' }), '51f5b167-ab67-45f2-9002-019c220a5f68');
});

test('Turnos API: sin base configurada avisa en lugar de inventar horarios', async () => {
  const res = await handler({ httpMethod: 'GET', headers: {}, queryStringParameters: { especialidad: 'Cardiología', ciudad: 'Mendoza' } });
  assert.equal(res.statusCode, 503);
});

test('Turnos API: rechaza reservas con datos inválidos y métodos no permitidos', async () => {
  const invalid = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ slotId: 'no-es-un-id' }) });
  assert.equal(invalid.statusCode, 400);
  const broken = await handler({ httpMethod: 'DELETE', headers: {}, body: '{' });
  assert.equal(broken.statusCode, 400);
  const noDb = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ slotId: '51f5b167-ab67-45f2-9002-019c220a5f68' }) });
  assert.equal(noDb.statusCode, 503);
  const put = await handler({ httpMethod: 'PUT', headers: {} });
  assert.equal(put.statusCode, 405);
});
