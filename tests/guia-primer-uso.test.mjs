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
  assert.equal((guide.match(/title: '/g) || []).length, 6);
  for (const selector of ['ask','quick','tasks-desktop','tasks-mobile','settings-desktop','settings-mobile','reading-desktop','reading-mobile','trusted-call']) {
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

test('Menú de lectura y configuración con iconos diferentes y nombres claros', () => {
  const header = read('components/BrandHeader.tsx');
  const css = read('styles.css');
  assert.match(header, /Leer y escuchar/);
  assert.match(header, /BookOpenText/);
  assert.match(header, /<Settings size=\{20\}/);
  assert.match(read('components/BottomNav.tsx'), /<Settings size=\{22\}/);
  assert.doesNotMatch(header, /<Accessibility\b/);
  assert.match(header, /Escuchar pantalla/);
  assert.match(header, /Tamaño del texto/);
  assert.match(header, /Contraste alto/);
  assert.match(css, /html\.high-contrast \.accessibility-panel :is\(span,p,svg\)/);
  assert.match(css, /html\.high-contrast \.accessibility-option:hover :is\(span,svg\)/);
});

test('Animación del tutorial: pasos separados, progreso visual y movimiento reducido', () => {
  const guide = read('components/FirstUseGuide.tsx');
  const css = read('styles.css');
  assert.match(guide, /title: 'Cambiá tu configuración'/);
  assert.match(guide, /settings-desktop/);
  assert.match(guide, /settings-mobile/);
  assert.match(guide, /mobileDescription/);
  assert.match(guide, /Tocá «Leer y escuchar»/);
  assert.match(guide, /Estos tres botones permiten/);
  assert.match(guide, /key=\{index\}/);
  assert.match(guide, /first-use-guide-steps/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /@keyframes guide-step-appear/);
  assert.match(css, /first-use-guide-spotlight\{transition/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});


test('Guía: se posiciona con su altura medida y no depende de desplazar manualmente la pantalla', () => {
  const guide = read('components/FirstUseGuide.tsx');
  assert.match(guide, /useLayoutEffect/);
  assert.match(guide, /card\.offsetHeight/);
  assert.match(guide, /function placeGuide/);
  assert.match(guide, /const requiredScroll/);
  assert.match(guide, /window\.scrollBy\(\{ top: distance, behavior: 'auto' \}\)/);
  assert.match(guide, /ResizeObserver/);
  assert.doesNotMatch(guide, /panelHeightEstimate/);
  assert.match(guide, /visibility: layout \? 'visible' : 'hidden'/);
});

test('Guía: despliega Leer y escuchar solo durante su paso y resalta las tres opciones', () => {
  const guide = read('components/FirstUseGuide.tsx');
  const header = read('components/BrandHeader.tsx');
  assert.match(guide, /const DESKTOP_READING_STEP = 4/);
  assert.match(guide, /menu\.open = true/);
  assert.match(guide, /menu\.open = false/);
  assert.match(guide, /highlightedRect\(element, showMenu\)/);
  assert.match(guide, /accessibility-panel/);
  assert.match(guide, /mobileDescription: 'Estos tres botones permiten/);
  for (const name of ['Escuchar pantalla', 'Tamaño del texto', 'Contraste alto']) {
    assert.match(header, new RegExp(name));
  }
});
