import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const root = new URL('../src/', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

// Ejecuta la implementación pura de navegación sin dependencias del navegador ni TypeScript.
const source = read('utils/navigationExit.ts');
const body = source.match(/export function shouldConfirmLeavingFlow\([^)]*\): boolean \{([^}]+)\}/)?.[1];
assert.ok(body, 'No se encontró la lógica de salida');
const shouldConfirmLeavingFlow = new Function('flow', 'hasSavedDraft', body);

test('HU21: solo pide confirmación si existe borrador recuperable', () => {
  assert.equal(shouldConfirmLeavingFlow('cinema', true), true);
  assert.equal(shouldConfirmLeavingFlow('appointment', true), true);
  assert.equal(shouldConfirmLeavingFlow('trip', false), false);
  assert.equal(shouldConfirmLeavingFlow(null, true), false);
  assert.equal(shouldConfirmLeavingFlow('other', true), false);
});

test('HU21: se usa una sola confirmación compartida para cabecera y barra móvil', () => {
  const main = read('main.tsx');
  assert.match(main, /const home = \(\) => \{ if \(!canLeaveFlow\(\)\) return;/);
  assert.match(main, /const changeView=\(next:[^\n]+if \(!canLeaveFlow\(\)\) return;/);
  assert.equal((main.match(/window\.confirm\(/g) || []).length, 1);
  assert.match(main, /puedas retomarlo despu[eé]s/);
});

test('HU13: las tres acciones de lectura son accesibles sin abrir menú', () => {
  const header = read('components/BrandHeader.tsx');
  const css = read('styles.css');
  assert.match(header, /<div className="header-reading-actions" role="group"/);
  assert.match(header, /data-guide="reading-controls"/);
  assert.doesNotMatch(header, /<details|<summary/);
  assert.match(header, /Escuchar pantalla/);
  assert.match(header, /Tamaño del texto/);
  assert.match(header, /Activar contraste alto/);
  assert.match(css, /\.header-reading-actions\{display:flex/);
  assert.match(header, /aria-current=\{currentSection === 'tasks'/);
});

test('HU13: el botón de ayuda mantiene el mismo nombre en escritorio y celular', () => {
  const main = read('main.tsx');
  const css = read('styles.css');
  assert.match(main, /aria-label="Pedir ayuda: elegir a quién llamar"/);
  assert.match(main, /<PhoneCall size=\{21\}\/><span>Pedir ayuda<\/span><\/button>/);
  assert.doesNotMatch(main, /trusted-label-short|trusted-label-full/);
  assert.doesNotMatch(css, /\.trusted-label-short|\.trusted-label-full/);
});

test('HU13: el acceso móvil a Mis gestiones conserva la navegación existente', () => {
  const css = read('styles.css');
  const home = read('pages/HomePage.tsx');
  assert.match(css, /@media \(min-width:651px\) \{[\s\S]*?\.home-saved-entry\{display:none\}/);
  assert.match(home, /className="home-saved-entry"/);
  assert.match(home, /className="quick-card quick-saved-card"/);
});
