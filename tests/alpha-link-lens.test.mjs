import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('AlphaLink reconstruction isolates the draggable liquid-glass lens over the supplied background', async () => {
  const source = await readFile(
    new URL('../demo/alpha-link-liquid-glass-lens.html', import.meta.url),
    'utf8'
  ).catch(() => '');

  assert.match(source, /task-mtfswvmtdph96\.png/);
  assert.match(source, /class="liquid-lens"/);
  assert.match(source, /class="lens-optic"/);
  assert.match(source, /backdrop-filter: url\(#lens-refraction\)/);
  assert.match(source, /function updateOptic\(\)/);
  assert.match(source, /optic\.style\.backgroundPosition/);
  assert.match(source, /@keyframes lens-rebound/);
  assert.match(source, /\.liquid-lens\.is-pressed/);
  assert.match(source, /\.liquid-lens\.is-rebounding/);
  assert.match(source, /--drag-stretch-x/);
  assert.match(source, /--drag-stretch-y/);
  assert.match(source, /addEventListener\('pointerdown'/);
  assert.match(source, /addEventListener\('pointermove'/);
  assert.match(source, /lens\.classList\.add\('is-pressed'\)/);
  assert.match(source, /function updateDragMotion\(/);
  assert.match(source, /lens\.classList\.add\('is-rebounding'\)/);
  assert.doesNotMatch(source, /<h1|<p|<a /);
});
