import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('starting from onboarding returns to the original tab, starts picking, and closes onboarding', async () => {
  const source = await readFile(new URL('../extension/background.js', import.meta.url), 'utf8');
  const state = {onboardingReturnTabId: 41, onboardingTabId: 88};
  const updated = [];
  const sent = [];
  const removed = [];
  let onMessage;
  const chrome = {
    runtime: {onMessage: {addListener(listener) { onMessage = listener; }}},
    storage: {
      local: {
        async get(key) {
          if (Array.isArray(key)) return Object.fromEntries(key.map((name) => [name, state[name]]));
          return {[key]: state[key]};
        },
        async set(next) { Object.assign(state, next); }
      }
    },
    tabs: {
      async query() { return [{id: 41}]; },
      async update(tabId, details) { updated.push([tabId, details]); },
      async sendMessage(tabId, message) { sent.push([tabId, message]); },
      async remove(tabId) { removed.push(tabId); }
    },
    scripting: {async executeScript() {}}
  };

  vm.runInNewContext(source, {chrome});
  const response = await new Promise((resolve) => {
    assert.equal(onMessage({type: 'STAI_START_PICKING_FROM_ONBOARDING', preferences: {effectMode: 'smart'}}, {}, resolve), true);
  });

  assert.equal(JSON.stringify(updated), JSON.stringify([[41, {active: true}]]));
  assert.equal(JSON.stringify(sent), JSON.stringify([[41, {type: 'STAI_START_PICKING', preferences: {effectMode: 'smart'}}]]));
  assert.deepEqual(removed, [88]);
  assert.equal(state.isPicking, true);
  assert.equal(JSON.stringify(response), JSON.stringify({ok: true}));
});

test('an extracted element notifies its source page that code is ready to copy', async () => {
  const source = await readFile(new URL('../extension/background.js', import.meta.url), 'utf8');
  const state = {};
  const sent = [];
  let onMessage;
  const chrome = {
    runtime: {onMessage: {addListener(listener) { onMessage = listener; }}},
    storage: {local: {async get() { return {}; }, async set(next) { Object.assign(state, next); }}},
    tabs: {
      async sendMessage(tabId, message) { sent.push([tabId, message]); }
    },
    downloads: {async download() {}},
    scripting: {async executeScript() {}}
  };

  vm.runInNewContext(source, {chrome, FileReader: class {}, OffscreenCanvas: class {}, fetch() {}});
  onMessage({type: 'STAI_EXTRACTION', payload: {title: 'button · 120 × 40', html: '<button></button>', css: ''}}, {tab: {id: 42, windowId: 9}}, () => {});
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(
    JSON.stringify(sent),
    JSON.stringify([[42, {type: 'STAI_SHOW_CAPTURE_READY', title: 'button · 120 × 40', language: 'zh'}]])
  );
});
