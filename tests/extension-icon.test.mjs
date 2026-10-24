import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

test('ships the supplied hand-and-card logo for the toolbar and visible brand areas', async () => {
  const [manifestSource, popup, onboarding] = await Promise.all([
    readFile(new URL('../extension/manifest.json', import.meta.url), 'utf8'),
    readFile(new URL('../extension/popup.html', import.meta.url), 'utf8'),
    readFile(new URL('../extension/onboarding.html', import.meta.url), 'utf8')
  ]);
  const manifest = JSON.parse(manifestSource);

  assert.equal(manifest.icons['16'], 'icons/logo-16.png');
  assert.equal(manifest.icons['128'], 'icons/logo-128.png');
  assert.equal(manifest.action.default_icon['48'], 'icons/logo-48.png');
  assert.ok(popup.includes('class="brand-logo" src="icons/logo-32.png"'));
  assert.ok(onboarding.includes('class="brand-logo" src="icons/logo-48.png"'));

  await Promise.all([16, 32, 48, 128].map((size) => access(new URL(`../extension/icons/logo-${size}.png`, import.meta.url))));
});
