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
