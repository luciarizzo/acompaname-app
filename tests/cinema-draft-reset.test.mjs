import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../src/pages/${file}`, import.meta.url), 'utf8');

test('al entrar al cine real se elimina el borrador del selector padre', () => {
  const parent = read('CinemaFlow.tsx');
  assert.match(parent, /const continueToCinema = \(\) =>/);
  assert.match(parent, /removeFlowDraft\('cinema'\);\s*setTheater\(''\)/);
  assert.match(parent, /onClick=\{continueToCinema\}/);
});

test('empezar de nuevo elimina borradores relacionados en ambos recorridos', () => {
  const parent = read('CinemaFlow.tsx');
  assert.match(parent, /removeFlowDraft\('cinemark-live'\); removeFlowDraft\('showcase-live'\)/);
  for (const file of ['CinemarkLiveFlow.tsx', 'ShowcaseLiveFlow.tsx']) {
    assert.match(read(file), /const reset = \(\) => \{ removeFlowDraft\('cinema'\); removeFlowDraft\('/);
  }
});
