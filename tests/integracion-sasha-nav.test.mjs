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

test('HU13: el menú accesible permite elegir las tres opciones sin hover', () => {
  const header = read('components/BrandHeader.tsx');
  const css = read('styles.css');
  assert.match(header, /<details ref=\{menuRef\} className="desktop-access-menu">/);
  assert.match(header, /<summary className="accessibility-trigger" data-guide="reading-desktop"/);
  assert.match(header, /Escuchar pantalla/);
  assert.match(header, /Tamaño del texto/);
  assert.match(header, /Activar contraste alto/);
  assert.match(css, /\.accessibility-trigger:focus-visible/);
  assert.match(header, /aria-current=\{currentSection === 'tasks'/);
});

test('HU13: el acceso a llamada conserva una etiqueta visible y accesible', () => {
  const main = read('main.tsx');
  const css = read('styles.css');
  assert.match(main, /aria-label="Llamar a alguien de confianza"/);
  assert.match(main, /trusted-label-short">Llamar</);
  assert.match(main, /trusted-label-full">Llamar a alguien/);
  assert.match(css, /\.trusted-label-full\{display:none\}/);
  assert.match(css, /\.trusted-label-short\{display:none\}/);
});

test('HU13: el acceso móvil a Mis gestiones conserva la navegación existente', () => {
  const css = read('styles.css');
  const home = read('pages/HomePage.tsx');
  assert.match(css, /@media \(min-width:651px\) \{[\s\S]*?\.home-saved-entry\{display:none\}/);
  assert.match(home, /className="home-saved-entry"/);
  assert.match(home, /className="quick-card quick-saved-card"/);
});
