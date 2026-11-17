import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
import { validTaskDescriptionUpdate } from '../netlify/lib/validar-gestion.mjs';

// Ejecuta la lógica de las utilidades TypeScript sin depender de un navegador.
// TypeScript ya está incluido como dependencia de desarrollo del proyecto.
const require = createRequire(import.meta.url);
const ts = require('typescript');
function loadModule(path, modules = {}, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => { if (!(name in modules)) throw new Error(`Dependencia no simulada: ${name}`); return modules[name]; },
    ...globals,
  }, { filename: path });
  return exports;
}

const cinemaModule = loadModule('../src/data/cinemaOptions.ts');
const taskModule = loadModule('../src/utils/taskDetails.ts', { '../data/cinemaOptions': cinemaModule });
const baseTask = {
  id: '51f5b167-ab67-45f2-9002-019c220a5f68', kind: 'cinema', title: 'Plan de cine',
  description: 'Una familia especial · sábado, 21 de noviembre · 19:30 · Cine Parque, Mendoza · 2 entradas · Al fondo · Tarjeta de débito',
  createdAt: '2026-11-16T14:00:00Z', mode: 'demo',
};

test('HU17: presenta correctamente los datos de un plan de cine sin afirmar una compra', () => {
  const fields = taskModule.taskFields(baseTask);
  assert.equal(fields.length, 7);
  assert.equal(fields[0].label, 'Película');
  assert.equal(fields[4].value, '2 entradas');
  assert.match(taskModule.taskStatus('cinema'), /No se compraron entradas/);
});

test('HU18: serializa campos editados manteniendo el formato del almacenamiento existente', () => {
  const fields = taskModule.taskFields(baseTask);
  fields[4].value = '3 entradas';
  const revised = taskModule.serializeTaskFields(fields);
  assert.match(revised, /3 entradas/);
  assert.equal(revised.split(' · ').length, 7);
});

test('HU17: distingue evento con separadores en el nombre', () => {
  const fields = taskModule.taskFields({ ...baseTask, kind: 'event', description: 'Música en vivo · Acompáñame · Mendoza' });
  assert.equal(fields.length, 2);
  assert.equal(fields[0].value, 'Música en vivo · Acompáñame');
});

test('HU18 y HU19: las mutaciones locales no alteran otros planes', async () => {
  const entries = new Map();
  const localStorage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
  const storage = loadModule('../src/utils/storage.ts', {
    '../services/accountData': {
      TASKS_KEY: 'test-tasks', pushTask: () => {},
      updateTaskOnAccount: async () => {}, deleteTaskOnAccount: async () => {},
    },
    './storageMode': { storageKey: key => key },
  }, { localStorage });
  const second = { ...baseTask, id: '1c5296c9-f593-4cca-b785-79d221552e44', title: 'Otro plan' };
  entries.set('test-tasks', JSON.stringify([baseTask, second]));
  const updated = await storage.updateSavedTask({ ...baseTask, title: 'Plan editado' });
  assert.equal(updated[0].title, 'Plan editado');
  assert.equal(updated[1].title, 'Otro plan');
  const remaining = await storage.deleteSavedTask(baseTask.id);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, second.id);
});

test('HU18: un error remoto conserva el plan local sin modificar', async () => {
  const entries = new Map([['test-tasks', JSON.stringify([baseTask])]]);
  const storage = loadModule('../src/utils/storage.ts', {
    '../services/accountData': {
      TASKS_KEY: 'test-tasks', pushTask: () => {},
      updateTaskOnAccount: async () => { throw new Error('Sin red'); },
      deleteTaskOnAccount: async () => {},
    },
    './storageMode': { storageKey: key => key },
  }, { localStorage: { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) } });
  await assert.rejects(storage.updateSavedTask({ ...baseTask, title: 'No persistido' }), /Sin red/);
  assert.equal(storage.getSavedTasks()[0].title, 'Plan de cine');
});

test('HU18: usa los horarios y opciones del recorrido de cine, no texto libre', () => {
  assert.equal(taskModule.cinemaFieldChoices(baseTask, 'Horario').join(','), '17:15,19:30,21:45');
  assert.ok(taskModule.cinemaFieldChoices(baseTask, 'Cine y ciudad').includes('Cine Parque, Mendoza'));
  assert.match(taskModule.editTaskError(baseTask, { ...baseTask, description: baseTask.description.replace('19:30', '01:15') }), /Horario/);
  assert.equal(taskModule.editTaskError(baseTask, { ...baseTask, description: baseTask.description.replace('19:30', '21:45') }), null);
  assert.match(taskModule.editTaskError(baseTask, { ...baseTask, description: baseTask.description.replace('Cine Parque', 'Cine inventado') }), /Cine y ciudad/);
});

test('HU18: las fechas nuevas de cine usan el mismo formato de entrada y edición', () => {
  const formatted = cinemaModule.formatCinemaDate('2026-11-21');
  assert.equal(cinemaModule.parseCinemaDate(formatted), '2026-11-21');
  assert.equal(cinemaModule.parseCinemaDate('32 de noviembre de 2026'), null);
});

test('HU18: un turno solo permite las sedes y horarios guardados en su consulta', () => {
  const slot = { id: 'demo-1', specialty: 'Clínica médica', professional: 'Dra. Paula Ríos', date: 'jueves 19 de noviembre', time: '10:30', location: 'Consultorio Centro · Mendoza' };
  const other = { ...slot, id: 'demo-2', time: '16:00', location: 'Consultorios Parque · Mendoza' };
  const appointment = { ...baseTask, kind: 'appointment', description: taskModule.appointmentDescription(slot), editChoices: { appointmentSlots: [slot, other] } };
  assert.equal(taskModule.editTaskError(appointment, { ...appointment, description: taskModule.appointmentDescription(other) }), null);
  assert.match(taskModule.editTaskError(appointment, { ...appointment, description: appointment.description.replace('10:30', '04:15') }), /ofrecidos/);
  const legacy = { ...appointment, editChoices: undefined };
  assert.match(taskModule.editTaskError(legacy, { ...legacy, description: taskModule.appointmentDescription(other) }), /ofrecidos/);
  assert.equal(taskModule.editTaskError(legacy, { ...legacy, title: 'Consulta renombrada' }), null);
});

test('HU20: muestra solamente recorridos realmente disponibles dentro de la app', () => {
  const options = loadModule('../src/data/availableFeatures.ts');
  assert.equal(options.availableFeatures.length, 4);
  assert.deepEqual(options.availableFeatures.map(x => x.kind).join(','), 'event,cinema,appointment,trip');
  assert.ok(!options.availableFeatures.some(x => x.kind === 'other'));
});

test('HU20: una petición de viaje se reconoce y las consultas genéricas permanecen en Otra cosa', () => {
  const intent = loadModule('../src/utils/intent.ts');
  assert.equal(intent.classifyNeed('Quiero pedir un taxi').kind, 'trip');
  assert.equal(intent.classifyNeed('Tengo otra consulta').kind, 'other');
  assert.equal(intent.classifyNeed('Sacar un turno médico').kind, 'appointment');
});

test('HU20: sugerencias deben ser claras y sin datos de contacto personales', () => {
  const suggestion = loadModule('../src/utils/featureSuggestion.ts');
  assert.ok(suggestion.suggestionError('hola'));
  assert.ok(suggestion.suggestionError('Me gustaría llamar al 11 5656 1234'));
  assert.ok(suggestion.suggestionError('Escribime a nombre@correo.com'));
  assert.equal(suggestion.suggestionError('Me gustaría consultar horarios de colectivos'), null);
});

function backendHandler() {
  const source = readFileSync(new URL('../netlify/functions/gestiones.mjs', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export const handler =', 'const handler =');
  const requests = [];
  const row = { id: baseTask.id, tipo: 'cinema', descripcion: baseTask.description, opciones_edicion: null };
  let missing = false;
  const db = { from(name) {
    assert.equal(name, 'gestiones');
    const query = {
      update(data) { requests.push({ action: 'update', data }); return this; },
      delete() { requests.push({ action: 'delete' }); return this; },
      eq(column, value) { requests.push({ action: 'filter', column, value }); return this; },
      select(column) { requests.push({ action: 'select', column }); return this; },
      async maybeSingle() { return { data: missing ? null : row, error: null }; },
    };
    return query;
  } };
  const context = {
    authenticate: async () => ({ db, user: { id: 'usuario-propietario' } }),
    ensureProfileRow: async () => {},
    json: (statusCode, body) => ({ statusCode, body }),
    validTaskDescriptionUpdate,
    console,
  };
  vm.runInNewContext(`${source}\nthis.handler = handler;`, context);
  return { handler: context.handler, requests, missing: () => { missing = true; } };
}

test('HU18: el backend edita solo la gestión del usuario autenticado', async () => {
  const backend = backendHandler();
  const response = await backend.handler({ httpMethod: 'PUT', body: JSON.stringify({ id: baseTask.id, title: 'Actualizado', description: baseTask.description }) });
  assert.equal(response.statusCode, 200);
  assert.ok(backend.requests.some(item => item.action === 'filter' && item.column === 'usuario_id' && item.value === 'usuario-propietario'));
  assert.ok(backend.requests.some(item => item.action === 'filter' && item.column === 'id' && item.value === baseTask.id));
  const mutation = backend.requests.find(item => item.action === 'update');
  assert.equal(mutation.data.titulo, 'Actualizado');
  assert.equal(mutation.data.descripcion, baseTask.description);
  assert.equal(Object.keys(mutation.data).length, 2);
});

test('HU18: el servidor también impide horarios y sedes inventados', async () => {
  const backend = backendHandler();
  const response = await backend.handler({ httpMethod: 'PUT', body: JSON.stringify({
    id: baseTask.id, title: baseTask.title,
    description: baseTask.description.replace('19:30', '05:45'),
  }) });
  assert.equal(response.statusCode, 400);
  assert.ok(!backend.requests.some(item => item.action === 'update'));
  const row = { tipo: 'appointment', descripcion: 'Clínica médica · jueves 19 de noviembre · 10:30 · Consultorio Centro · Mendoza', opciones_edicion: null };
  assert.equal(validTaskDescriptionUpdate(row, row.descripcion.replace('10:30', '16:00')), false);
});

test('HU19: el backend elimina solo por usuario e identificador y devuelve 404 si ya no existe', async () => {
  const backend = backendHandler();
  backend.missing();
  const response = await backend.handler({ httpMethod: 'DELETE', body: JSON.stringify({ id: baseTask.id }) });
  assert.equal(response.statusCode, 404);
  assert.ok(backend.requests.some(item => item.action === 'filter' && item.column === 'usuario_id' && item.value === 'usuario-propietario'));
  assert.ok(backend.requests.some(item => item.action === 'filter' && item.column === 'id' && item.value === baseTask.id));
});

test('HU19: no permite borrar sin un identificador de gestión válido', async () => {
  const backend = backendHandler();
  const response = await backend.handler({ httpMethod: 'DELETE', body: JSON.stringify({ id: 'invalido' }) });
  assert.equal(response.statusCode, 400);
  assert.equal(backend.requests.length, 0);
});


test('HU14 a HU16: se validan nombres y teléfonos antes de guardar', () => {
  const contacts = loadModule('../src/utils/trustedContacts.ts');
  assert.match(contacts.trustedContactError(' ', '2615551234'), /nombre/);
  assert.match(contacts.trustedContactError('Ana', '123'), /7 y 15/);
  assert.equal(contacts.trustedContactError('Ana', '+54 11 1234 5678'), null);
});

function suggestionBackend({ recent = 0, authorized = true } = {}) {
  const source = readFileSync(new URL('../netlify/functions/sugerencias.mjs', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/m, '').replace('export const handler =', 'const handler =');
  const insertions = [];
  const db = { from(name) {
    assert.equal(name, 'sugerencias_funcionalidades');
    return {
      select() { return this; }, eq() { return this; }, gte() { return this; },
      limit: async () => ({ data: Array.from({ length: recent }, () => ({ id: 'test' })), error: null }),
      insert: async (data) => { insertions.push(data); return { error: null }; },
    };
  } };
  const context = {
    authenticate: async () => authorized ? ({ db, user: { id: 'usuario-propietario' } }) : ({ error: { statusCode: 401 } }),
    json: (statusCode, body) => ({ statusCode, body }),
    validTaskDescriptionUpdate,
    console, Date,
  };
  vm.runInNewContext(`${source}\nthis.handler = handler;`, context);
  return { handler: context.handler, insertions };
}

test('HU20: el servidor guarda solo sugerencias válidas de usuarios autenticados', async () => {
  const backend = suggestionBackend();
  const response = await backend.handler({ httpMethod: 'POST', body: JSON.stringify({ text: 'Me gustaría consultar el estado del subte.' }) });
  assert.equal(response.statusCode, 201);
  assert.equal(backend.insertions.length, 1);
  assert.equal(backend.insertions[0].usuario_id, 'usuario-propietario');
  assert.equal(backend.insertions[0].texto, 'Me gustaría consultar el estado del subte.');
});

test('HU20: no permite envíos anónimos, datos personales ni solicitudes excesivas', async () => {
  const body = JSON.stringify({ text: 'Me gustaría consultar colectivos y trenes' });
  assert.equal((await suggestionBackend({ authorized: false }).handler({ httpMethod: 'POST', body })).statusCode, 401);
  assert.equal((await suggestionBackend().handler({ httpMethod: 'POST', body: JSON.stringify({ text: 'a' }) })).statusCode, 400);
  assert.equal((await suggestionBackend().handler({ httpMethod: 'POST', body: JSON.stringify({ text: 'Mi teléfono es 11 4567 1234' }) })).statusCode, 400);
  assert.equal((await suggestionBackend({ recent: 3 }).handler({ httpMethod: 'POST', body })).statusCode, 429);
});

// Navegación contextual: cancelar el ingreso desde «Otra cosa» no vuelve a la portada.
const loginRoutes = loadModule('../src/utils/loginReturn.ts');
const suggestionDraft = loadModule('../src/utils/featureSuggestion.ts');

test('HU20: cancelar el login vuelve a la sugerencia y no a la entrada', () => {
  assert.deepEqual({ ...loginRoutes.returnFromLogin('suggestion') }, { view: 'home', flow: 'other' });
  assert.deepEqual({ ...loginRoutes.returnFromLogin('entry') }, { view: 'entry', flow: null });
});

test('HU20: al iniciar sesión se retoma la sugerencia solo con perfil configurado', () => {
  assert.equal(loginRoutes.shouldResumeSuggestion('suggestion', true), true);
  assert.equal(loginRoutes.shouldResumeSuggestion('suggestion', false), false);
  assert.equal(loginRoutes.shouldResumeSuggestion('entry', true), false);
});

test('HU20: la sugerencia escrita antes de entrar prevalece sobre el pedido inicial', () => {
  assert.equal(suggestionDraft.initialFeatureSuggestion('Quiero salir', () => 'Me gustaría consultar trenes'), 'Me gustaría consultar trenes');
  assert.equal(suggestionDraft.initialFeatureSuggestion('Quiero salir', () => null), 'Quiero salir');
  assert.equal(suggestionDraft.initialFeatureSuggestion('Quiero salir', () => { throw Error('Almacenamiento inaccesible'); }), 'Quiero salir');
});
