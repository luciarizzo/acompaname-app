import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('ambas carteleras muestran un estado de carga accesible', () => {
  const component = readFileSync(new URL('../src/components/CinemaLoading.tsx', import.meta.url), 'utf8');
  assert.match(component, /role="status"/);
  assert.match(component, /aria-live="polite"/);
  for (const name of ['CinemarkLiveFlow.tsx', 'ShowcaseLiveFlow.tsx']) {
    const page = readFileSync(new URL(`../src/pages/${name}`, import.meta.url), 'utf8');
    assert.match(page, /busy && <CinemaLoading message=/);
  }
});
