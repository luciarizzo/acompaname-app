import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const src = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('HU13: solo hay un enlace a la guía, visible en el contenido de Inicio', () => {
  const app = src('main.tsx');
  const home = src('pages/HomePage.tsx');
  assert.match(home, /Cómo funciona/);
  assert.doesNotMatch(app, /Ver guía de uso/);
  assert.match(app, /<footer className="site-footer"><span>Hecho con cuidado, para acompañarte.<\/span><\/footer>/);
});

test('HU13: acceso a cuenta visible sin depender del pie', () => {
  const app = src('main.tsx');
  const home = src('pages/HomePage.tsx');
  const styles = src('styles.css');
  assert.match(home, /home-intro-top/);
  assert.match(home, /home-account-button/);
  assert.match(home, /Iniciar sesión/);
  assert.match(home, /Cerrar sesión/);
  assert.match(app, /setLoginOrigin\('home'\);setView\('login'\)/);
  assert.match(styles, /html\.high-contrast \.home-account-button/);
  assert.doesNotMatch(app, /Entrar con una cuenta<\/button>/);
});

test('HU13: el login abierto desde Inicio puede volver al mismo inicio', () => {
  const app = src('main.tsx');
  const login = src('pages/LoginPage.tsx');
  const routes = src('utils/loginReturn.ts');
  assert.match(app, /returnToHome=\{loginOrigin==='home'\}/);
  assert.match(login, /Volver al inicio/);
  assert.match(routes, /origin === 'home'/);
});

test('HU13: ayuda en ambas pantallas usa una sola etiqueta visible', () => {
  const app = src('main.tsx');
  assert.match(app, /<PhoneCall size=\{21\}\/><span>Pedir ayuda<\/span>/);
  assert.doesNotMatch(app, /trusted-label-short|trusted-label-full/);
});
