import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

import { shouldShowOnboarding } from '../src/onboarding.js';

test('shows onboarding only until the user has dismissed or started it', () => {
  assert.equal(shouldShowOnboarding(undefined), true);
  assert.equal(shouldShowOnboarding(false), true);
  assert.equal(shouldShowOnboarding(true), false);
});

test('renders the English welcome copy after English is selected in the preview', async () => {
  const html = await readFile(new URL('../demo/first-run.html', import.meta.url), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'expected the preview to contain its onboarding behavior');

  const handlers = new Map();
  const makeButton = (language) => ({
    dataset: { language },
    addEventListener(type, handler) { handlers.set(language + ':' + type, handler); }
  });
  const chinese = makeButton('zh');
  const english = makeButton('en');
  const start = {
    disabled: false,
    textContent: '',
    addEventListener(type, handler) { handlers.set('start:' + type, handler); }
  };
  const title = { dataset: { copy: 'title' }, textContent: '' };
  const gate = { hidden: false, classList: { add() {} } };
  const welcome = { hidden: true, classList: { add() {} } };
  const shell = { addEventListener() {}, classList: { add() {}, remove() {} } };
  const glow = { style: {} };
  const location = { assign(url) { this.redirectedTo = url; } };
  const document = {
    documentElement: {},
    querySelector(selector) {
      return new Map([
        ['.language-gate', gate],
        ['.welcome-content', welcome],
        ['.welcome-shell', shell],
        ['.cursor-glow', glow],
        ['#start', start]
      ]).get(selector);
    },
    querySelectorAll(selector) {
      if (selector === '.language-option') return [chinese, english];
      if (selector === '[data-copy]') return [title];
      return [];
    }
  };

  vm.runInNewContext(script, {
    document,
    window: {
      matchMedia: () => ({ matches: true }),
      setTimeout: (callback) => callback(),
      location
    },
    setTimeout: (callback) => callback(),
    requestAnimationFrame: (callback) => callback()
  });
  handlers.get('en:click')();

  assert.equal(document.documentElement.lang, 'en');
  assert.equal(title.textContent, 'See good design. Bring its language with you.');
  handlers.get('start:click')();
  assert.equal(start.disabled, true);
  assert.equal(start.textContent, 'Opening picker…');
  assert.equal(location.redirectedTo, 'index.html?startPicking=1');
});
