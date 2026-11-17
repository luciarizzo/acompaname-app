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

test('HU16: Llamar ocupa primero toda la fila, con Editar y Eliminar debajo', () => {
  const actions = contacts.slice(contacts.indexOf('<div className="trusted-contact-actions">'));
  assert.ok(actions.indexOf('className="trusted-call"') < actions.indexOf('className="trusted-manage"'));
  assert.ok(actions.indexOf('className="trusted-manage"') < actions.indexOf('className="trusted-manage trusted-danger"'));
  assert.match(styles, /\.trusted-contact-actions \.trusted-call\{grid-column:1\/-1;grid-row:1/);
  assert.match(styles, /\.trusted-contact-actions\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
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
