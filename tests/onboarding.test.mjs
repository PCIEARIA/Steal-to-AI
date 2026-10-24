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

test('requires a companion Skill decision before first-run selection can start', async () => {
  const source = await readFile(new URL('../extension/onboarding.js', import.meta.url), 'utf8');
  const handlers = new Map();
  const makeElement = (name, properties = {}) => ({
    hidden: false,
    disabled: false,
    textContent: '',
    dataset: {},
    classList: {add() {}, toggle() {}},
    addEventListener(type, handler) { handlers.set(name + ':' + type, handler); },
    ...properties
  });
  const chinese = makeElement('zh', {dataset: {language: 'zh'}});
  const english = makeElement('en', {dataset: {language: 'en'}});
  const gate = makeElement('gate');
  const welcome = makeElement('welcome', {hidden: true});
  const start = makeElement('start');
  const startStatus = makeElement('start-status', {hidden: true});
  const dependency = makeElement('dependency', {hidden: true});
  const skillInstall = makeElement('skill-install');
  const skillSkip = makeElement('skill-skip');
  const skillStatus = makeElement('skill-status', {hidden: true});
  const generic = makeElement('generic');
  const elements = new Map([
    ['#language-gate', gate],
    ['#welcome-content', welcome],
    ['#start', start],
    ['#start-status', startStatus],
    ['#skill-dependency', dependency],
    ['#skill-install', skillInstall],
    ['#skill-skip', skillSkip],
    ['#skill-status', skillStatus]
  ]);
  const state = {};
  const document = {
    documentElement: {},
    querySelector(selector) { return elements.get(selector) || generic; },
    querySelectorAll(selector) {
      if (selector === '[data-language]') return [chinese, english];
      if (selector === '[data-copy]') return [];
      return [];
    }
  };
  const chrome = {
    storage: {local: {
      async get() { return {}; },
      async set(next) { Object.assign(state, next); }
    }},
    runtime: {async sendMessage() { return {ok: true}; }}
  };
  const opened = [];

  vm.runInNewContext(source, {chrome, document, window: {setTimeout(callback) { callback(); }, open(...args) { opened.push(args); }}});
  await handlers.get('zh:click')();

  assert.equal(dependency.hidden, false);
  assert.equal(start.disabled, true);
  await handlers.get('skill-install:click')();
  assert.equal(opened[0][0], 'https://github.com/PCIEARIA/Steal-to-AI#companion-codex-skill');
  assert.equal(start.disabled, false);
  assert.equal(skillStatus.hidden, false);
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
  const dependency = {hidden: true};
  const installSkill = {hidden: false, addEventListener(type, handler) { handlers.set('install-skill:' + type, handler); }};
  const skipSkill = {addEventListener(type, handler) { handlers.set('skip-skill:' + type, handler); }};
  const skillStatus = {hidden: true, textContent: ''};
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
        ['#start', start],
        ['#skill-dependency', dependency],
        ['#skill-install', installSkill],
        ['#skill-status', skillStatus],
        ['#skill-skip', skipSkill]
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
  assert.equal(dependency.hidden, false);
  assert.equal(start.disabled, true);
  handlers.get('skip-skill:click')();
  assert.equal(start.disabled, false);
  handlers.get('start:click')();
  assert.equal(start.disabled, true);
  assert.equal(start.textContent, 'Opening picker…');
  assert.equal(location.redirectedTo, 'index.html?startPicking=1');
});
