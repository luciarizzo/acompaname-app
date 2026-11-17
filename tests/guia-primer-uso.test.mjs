import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');

test('Guía de primer uso: una vez por dispositivo y posibilidad de volver a verla', () => {
  const main = read('main.tsx');
  assert.match(main, /localStorage\.getItem\('acompaname-guide-v1-seen'\)/);
  assert.match(main, /localStorage\.setItem\('acompaname-guide-v1-seen','true'\)/);
  assert.match(main, /authReady && view === 'home' && !flow && welcomeSeen && !guideSeen/);
  assert.match(main, /onHowItWorks=\{\(\)=>setGuideOpen\(true\)\}/);
  assert.match(main, /<FirstUseGuide onFinish=\{closeGuide\}\/>/);
});

test('Guía de primer uso: destaca controles reales en escritorio y móvil', () => {
  const guide = read('components/FirstUseGuide.tsx');
  const header = read('components/BrandHeader.tsx');
  const home = read('pages/HomePage.tsx');
  const bottom = read('components/BottomNav.tsx');
  assert.equal((guide.match(/title: '/g) || []).length, 5);
  for (const selector of ['ask','quick','tasks-desktop','tasks-mobile','reading-desktop','reading-mobile','trusted-call']) {
    assert.match(guide, new RegExp(`data-guide=\\"${selector}\\"`));
    assert.ok([header, home, bottom, read('main.tsx')].some(source => source.includes(`data-guide="${selector}"`) || (selector === 'quick' && source.includes("data-guide={kind === 'event'"))), `Falta el elemento destacado: ${selector}`);
  }
});

test('Guía accesible: diálogo modal, foco controlado y salida libre', () => {
  const guide = read('components/FirstUseGuide.tsx');
  assert.match(guide, /role="dialog"/);
  assert.match(guide, /aria-modal="true"/);
  assert.match(guide, /appRoot\.inert = true/);
  assert.match(guide, /appRoot\.inert = false/);
  assert.match(guide, /event\.key === 'Escape'/);
  assert.match(guide, /event\.key !== 'Tab'/);
  assert.match(guide, /Saltear guía/);
  assert.match(guide, /Siguiente/);
  assert.match(guide, /Anterior/);
});

test('Menú descriptivo: opciones por su función, sin icono de silla de ruedas', () => {
  const header = read('components/BrandHeader.tsx');
  const css = read('styles.css');
  assert.match(header, /Ver y escuchar mejor/);
  assert.match(header, /SlidersHorizontal/);
  assert.doesNotMatch(header, /<Accessibility\b/);
  assert.match(header, /Escuchar pantalla/);
  assert.match(header, /Tamaño del texto/);
  assert.match(header, /Contraste alto/);
  assert.match(css, /html\.high-contrast \.accessibility-panel :is\(span,p,svg\)/);
  assert.match(css, /html\.high-contrast \.accessibility-option:hover :is\(span,svg\)/);
});
