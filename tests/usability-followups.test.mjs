import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function loadTs(path, modules, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: name => {
    if (!Object.hasOwn(modules, name)) throw new Error(`Falta módulo ${name}`);
    return modules[name];
  }, ...globals });
  return exports;
}
function setupDraftStorage() {
  const records = new Map(); let accountId = null;
  const localStorage = {
    getItem: key => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value),
    removeItem: key => records.delete(key),
  };
  const draft = loadTs('../src/utils/flowDraft.ts', { './storageMode': { currentAccountId: () => accountId } }, { localStorage });
  return { draft, records, setAccount: id => { accountId = id; } };
}

test('HU23: recupera elecciones sin incluir datos personales y borra el borrador al finalizar', () => {
  const { draft, records } = setupDraftStorage();
  const plan = { step: 'review', theater: 'theater-1', movie: 'movie-1', date: '2026-11-20', time: '19:30' };
  draft.saveFlowDraft('cinema', plan);
  assert.equal(draft.loadFlowDraft('cinema').step, 'review');
  assert.equal(JSON.stringify([...records.values()]).includes('password'), false);
  draft.removeFlowDraft('cinema');
  assert.equal(draft.loadFlowDraft('cinema'), null);
});

test('HU23: un borrador vencido o dañado no se restaura', () => {
  const { draft, records } = setupDraftStorage();
  const key = 'acompaname-flow-draft-appointment';
  records.set(key, JSON.stringify({ version: 1, savedAt: Date.now() - 8 * 24 * 3600_000, payload: { specialty: 'Clínica médica' } }));
  assert.equal(draft.loadFlowDraft('appointment'), null);
  assert.equal(records.has(key), false);
  records.set(key, '{texto inválido');
  assert.equal(draft.loadFlowDraft('appointment'), null);
});

test('HU23: no comparte borradores entre cuentas ni con el modo invitado', () => {
  const { draft, setAccount } = setupDraftStorage();
  draft.saveFlowDraft('trip', { step: 'from', toId: 'home' });
  setAccount('cuenta-1');
  assert.equal(draft.loadFlowDraft('trip'), null);
  draft.saveFlowDraft('trip', { step: 'options', toId: 'work' });
  setAccount('cuenta-2');
  assert.equal(draft.loadFlowDraft('trip'), null);
  setAccount('cuenta-1');
  assert.equal(draft.loadFlowDraft('trip').toId, 'work');
  setAccount(null);
  assert.equal(draft.loadFlowDraft('trip').toId, 'home');
});

test('HU21: botón Atrás del navegador llama a volver sin salir de la app', () => {
  let onPop = null; let added = 0; let returns = 0; let removed = false;
  const window = {
    history: { pushState: () => { added++; } },
    addEventListener: (event, listener) => { if (event === 'popstate') onPop = listener; },
    removeEventListener: (event, listener) => { if (event === 'popstate' && listener === onPop) removed = true; },
  };
  let cleanup;
  const hook = loadTs('../src/utils/useBrowserBack.ts', { react: {
    useRef: initial => ({ current: initial }),
    useEffect: effect => { cleanup = effect(); },
  } }, { window });
  hook.useBrowserBack(() => { returns++; });
  assert.equal(added, 1);
  onPop();
  assert.equal(added, 2);
  assert.equal(returns, 1);
  cleanup();
  assert.equal(removed, true);
});

test('HU25: el perfil editable conserva contactos y opciones de accesibilidad', () => {
  const profileEditor = readFileSync(new URL('../src/pages/ProfileSettingsPage.tsx', import.meta.url), 'utf8');
  assert.match(profileEditor, /Mi configuración/);
  assert.match(profileEditor, /onSave\(\{ \.\.\.draft, name:/);
  assert.match(profileEditor, /Texto más grande/);
  assert.match(profileEditor, /Leer instrucciones en voz alta/);
  assert.match(profileEditor, /Cancelar/);
});

test('HU21: la barra móvil se presenta incluso durante una gestión', () => {
  const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
  assert.match(main, /<BottomNav view=\{flow \? null/);
  assert.match(main, /<ProfileSettingsPage/);
});

test('HU26: los indicadores seleccionados no son controles separados', () => {
  const cinema = readFileSync(new URL('../src/pages/CinemaFlow.tsx', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8');
  assert.match(cinema, /aria-pressed=\{theater === option\.id\}/);
  assert.match(cinema, /className="selected-indicator" aria-hidden="true"/);
  assert.match(home, /trust-note-label/);
  assert.doesNotMatch(home, /trust-check">✓/);
});
