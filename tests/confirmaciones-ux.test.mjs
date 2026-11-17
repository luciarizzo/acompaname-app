import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const contacts = source('../src/components/TrustedContactsDialog.tsx');
const plans = source('../src/pages/TasksPage.tsx');
const styles = source('../src/styles.css');

test('HU16: eliminar contacto reemplaza la lista por una sola confirmación', () => {
  assert.match(contacts, /pendingDelete \? <div className="trusted-delete-screen">/);
  assert.match(contacts, /pendingDelete \? '¿Eliminar este contacto\?' : 'Contactos de confianza'/);
  assert.doesNotMatch(contacts, /className="trusted-delete-confirm"/);
  assert.match(contacts, /setPendingDelete\(null\)/);
  assert.match(contacts, /onContactsChange\(contacts\.filter\(contact => contact\.id !== pendingDelete\.id\)\)/);
});

test('HU16: Llamar va al lado del contacto y Editar/Eliminar quedan debajo', () => {
  const contact = contacts.slice(contacts.indexOf('<article className="trusted-contact"'));
  assert.ok(contact.indexOf('className="trusted-call"') < contact.indexOf('<div className="trusted-contact-actions">'));
  const actions = contact.slice(contact.indexOf('<div className="trusted-contact-actions">'));
  assert.ok(actions.indexOf('className="trusted-manage"') < actions.indexOf('className="trusted-manage trusted-danger"'));
  assert.match(styles, /\.trusted-contact>\.trusted-call\{grid-column:3;grid-row:1/);
  assert.match(styles, /\.trusted-contact-actions\{grid-column:1\/-1;grid-row:2;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  // El botón vuelve a ocupar el ancho completo solo en pantallas pequeñas.
  assert.match(styles, /@media\(max-width:440px\)[\s\S]*?\.trusted-contact>\.trusted-call\{grid-column:1\/-1;grid-row:2/);
});

test('HU16: la X, Escape y el fondo retroceden dentro del diálogo antes de cerrarlo', () => {
  const start = contacts.indexOf('const dismissCurrentView = () =>');
  const end = contacts.indexOf('dismissCurrentViewRef.current = dismissCurrentView', start);
  const handler = contacts.slice(start, end);
  assert.match(handler, /if \(pendingDelete\) \{ setPendingDelete\(null\); return; \}/);
  assert.match(handler, /if \(adding\) \{/);
  assert.ok(handler.indexOf('onClose()') > handler.indexOf('if (adding)'));
  assert.match(contacts, /onClick=\{dismissCurrentView\}\><X size=\{22\}\/>/);
  assert.match(contacts, /if \(event\.key === 'Escape'\) \{[\s\S]*?dismissCurrentViewRef\.current\(\)/);
  assert.match(contacts, /if \(event\.target === event\.currentTarget\) dismissCurrentView\(\)/);
  assert.match(contacts, /'Volver a mis contactos' : 'Cerrar contactos de confianza'/);
});

test('HU19: la confirmación de borrado reemplaza las acciones del plan', () => {
  assert.match(plans, /if \(pendingDeleteId === item\.id\) return <article/);
  assert.match(plans, /className="saved-card saved-card-confirming"/);
  assert.match(plans, /className="saved-delete saved-delete-screen"/);
  assert.doesNotMatch(plans, /pendingDeleteId === item\.id && <section/);
  assert.match(plans, /disabled=\{deleteBusy\}/);
  assert.match(plans, /Esto no cancela ninguna compra, reserva ni solicitud externa\./);
  assert.match(plans, /deleteOriginRef\.current = event\.currentTarget/);
});


test('HU19: alto contraste muestra un único borde en la confirmación del plan', () => {
  const parent = styles.match(/html\.high-contrast \.saved-card-confirming\s*\{([^}]*)\}/)?.[1];
  const confirmation = styles.match(/html\.high-contrast \.saved-card-confirming \.saved-delete\s*\{([^}]*)\}/)?.[1];
  assert.ok(parent, 'La tarjeta debe tener una regla específica para alto contraste');
  assert.ok(confirmation, 'La confirmación debe tener una regla específica para alto contraste');
  assert.match(parent, /border:\s*0\s*;/);
  assert.match(parent, /padding:\s*0\s*;/);
  assert.match(confirmation, /border:\s*2px solid #fff\s*;/);
  assert.match(confirmation, /padding:\s*22px\s*;/);
  assert.match(styles, /html\.high-contrast \.saved-card-confirming \.saved-delete\{padding:18px\}/);
  assert.match(styles, /html\.high-contrast \.saved-delete,html\.high-contrast \.saved-danger/);
});
