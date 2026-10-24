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
  assert.match(source, /backdrop-filter: url\(#lens-refraction\)/);
  assert.match(source, /addEventListener\('pointerdown'/);
  assert.match(source, /addEventListener\('pointermove'/);
  assert.doesNotMatch(source, /<h1|<p|<a /);
});
