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
  onMessage({type: 'STAI_EXTRACTION', payload: {
    title: 'button · 120 × 40', sourceUrl: 'https://example.com/button', html: '<button></button>', css: '',
    interactions: [{type: 'drag', selector: '.stai-button__lens'}]
  }}, {tab: {id: 42, windowId: 9}}, () => {});
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(sent.length, 1);
  const [tabId, message] = sent[0];
  assert.equal(tabId, 42);
  assert.equal(message.type, 'STAI_SHOW_CAPTURE_READY');
  assert.equal(message.title, 'button · 120 × 40');
  assert.equal(message.language, 'zh');
  assert.match(message.code, /Check whether the steal-to-ai-component skill is available in your environment and read its version field/);
  assert.match(message.code, /This export requires version 0\.1\.1 or newer/);
  assert.match(message.code, /If it is unavailable, has no version, or is older, ask the user once whether they want to install or update it/);
  assert.match(message.code, /<!-- Source reference: https:\/\/example\.com\/button -->/);
  assert.match(message.code, /\.stai-button__lens is draggable/);
});

test('a component bundle keeps each captured component separate in the copied code', async () => {
  const source = await readFile(new URL('../extension/background.js', import.meta.url), 'utf8');
  const state = {};
  const sent = [];
  let onMessage;
  const chrome = {
    runtime: {onMessage: {addListener(listener) { onMessage = listener; }}},
    storage: {local: {async get() { return {}; }, async set(next) { Object.assign(state, next); }}},
    tabs: {async sendMessage(tabId, message) { sent.push([tabId, message]); }},
    downloads: {async download() {}},
    scripting: {async executeScript() {}}
  };

  vm.runInNewContext(source, {chrome, FileReader: class {}, OffscreenCanvas: class {}, fetch() {}});
  onMessage({type: 'STAI_EXTRACTION', payload: {
    title: '2 components',
    sourceUrl: 'https://example.com/landing',
    components: [
      {title: 'nav · 800 × 64', html: '<nav>Navigation</nav>', css: '.stai-nav { color: navy; }', interactions: []},
      {title: 'section · 800 × 480', html: '<section>Hero</section>', css: '.stai-section { color: purple; }', interactions: []}
    ]
  }}, {tab: {id: 42, windowId: 9}}, () => {});
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(state.lastExtraction.components.length, 2);
  assert.equal(sent.length, 1);
  assert.match(sent[0][1].code, /<!-- Component 1: nav · 800 × 64 -->/);
  assert.ok(sent[0][1].code.includes('<nav>Navigation</nav>'));
  assert.match(sent[0][1].code, /<!-- Component 2: section · 800 × 480 -->/);
  assert.ok(sent[0][1].code.includes('<section>Hero</section>'));
  assert.doesNotMatch(sent[0][1].code, /undefined/);
});

test('ultimate mode downloads a packaged offline page instead of returning bare HTML', async () => {
  const [backgroundSource, archiveSource] = await Promise.all([
    readFile(new URL('../extension/background.js', import.meta.url), 'utf8'),
    readFile(new URL('../extension/page-archive.js', import.meta.url), 'utf8')
  ]);
  const downloads = [];
  const revoked = [];
  let onMessage;
  class SnapshotURL extends URL {}
  SnapshotURL.createObjectURL = () => 'blob:stai-snapshot';
  SnapshotURL.revokeObjectURL = (url) => revoked.push(url);
  const context = {
    self: null,
    URL: SnapshotURL,
    Blob,
    btoa(value) { return Buffer.from(value, 'binary').toString('base64'); },
    setTimeout(callback) { callback(); },
    importScripts() {},
    fetch() { throw new Error('No network fetch expected for an empty snapshot.'); },
    chrome: {
      runtime: {onMessage: {addListener(listener) { onMessage = listener; }}},
      downloads: {async download(details) { downloads.push(details); }},
      storage: {local: {async set() {}, async get() { return {}; }}},
      tabs: {}, scripting: {}
    }
  };
  context.self = context;
  vm.createContext(context);
  vm.runInContext(archiveSource, context);
  vm.runInContext(backgroundSource, context);

  const response = await new Promise((resolve) => {
    assert.equal(onMessage({
      type: 'STAI_DOWNLOAD_PAGE_SNAPSHOT',
      payload: {sourceUrl: 'https://example.com/design', html: '<!doctype html><html><body>Snapshot</body></html>'}
    }, {}, resolve), true);
  });

  assert.equal(response.ok, true);
  assert.match(response.filename, /^steal-to-ai-example-com-\d+\.html$/);
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].url, 'blob:stai-snapshot');
  assert.equal(revoked[0], 'blob:stai-snapshot');
});
