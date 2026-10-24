import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

function makeNode() {
  return {
    dataset: {},
    classList: {toggle() {}},
    addEventListener(type, handler) { this.handlers[type] = handler; },
    handlers: {},
    setAttribute() {},
    textContent: '',
    hidden: false,
    disabled: false,
    checked: false
  };
}

test('starting the picker closes the popup after the page picker is ready', async () => {
  const source = await readFile(new URL('../extension/popup.js', import.meta.url), 'utf8');
  const start = makeNode();
  const copy = makeNode();
  const status = makeNode();
  const title = makeNode();
  const detail = makeNode();
  const result = makeNode();
  const preview = makeNode();
  const previewContent = makeNode();
  const workspace = makeNode();
  const screenshot = makeNode();
  const languageToggle = makeNode();
  const update = makeNode();
  const updateMessage = makeNode();
  const updateLink = makeNode();
  const zh = makeNode(); zh.dataset.language = 'zh';
  const en = makeNode(); en.dataset.language = 'en';
  const smart = makeNode(); smart.value = 'smart';
  const all = makeNode(); all.value = 'all';
  const staticMode = makeNode(); staticMode.value = 'static';
  const choiceList = makeNode();
  const nodes = new Map([
    ['#start', start], ['#copy', copy], ['#status', status], ['#title', title], ['#result-detail', detail],
    ['#capture-result', result], ['#code-preview', preview], ['#code-preview-content', previewContent],
    ['#workspace', workspace], ['#screenshot', screenshot], ['[data-language-toggle]', languageToggle], ['.choice-list', choiceList],
    ['#update-status', update], ['#update-message', updateMessage], ['#update-link', updateLink]
  ]);
  const writes = [];
  const sent = [];
  let closeCount = 0;
  const document = {
    documentElement: {},
    querySelector(selector) { return nodes.get(selector); },
    querySelectorAll(selector) {
      if (selector === '[data-language]') return [zh, en];
      if (selector === 'input[name="effectMode"]') return [smart, all, staticMode];
      return [];
    }
  };
  const chrome = {
    runtime: {lastError: null, getManifest() { return {version: '0.1.1'}; }, sendMessage() {}},
    storage: {
      local: {
        get() {
          return Promise.resolve({
            hasSeenOnboarding: true,
            preferences: {language: 'en'},
            isPicking: false,
            lastExtraction: {
              title: 'button · 160 × 48',
              sourceUrl: 'https://example.com/components/button',
              html: '<button class="stai-button">Save</button>',
              css: '.stai-button {\n  color: white;\n}'
            }
          });
        },
        set(value) { writes.push(value); return Promise.resolve(); }
      }
    },
    tabs: {
      query() { return Promise.resolve([{id: 42}]); },
      sendMessage(tabId, message, callback) { sent.push([tabId, message]); callback(); }, create() { return Promise.resolve(); }
    }
  };

  vm.runInNewContext(source, {chrome, document, fetch: async () => ({ok: false}), window: {close() { closeCount += 1; }, setTimeout() {}}, navigator: {clipboard: {writeText() {}}}});
  await new Promise((resolve) => setImmediate(resolve));
  await start.handlers.click();

  assert.equal(
    JSON.stringify(sent),
    JSON.stringify([[42, {type: 'STAI_START_PICKING', preferences: {language: 'en', effectMode: 'smart', screenshotMode: 'off'}}]])
  );
  assert.ok(writes.some((value) => value.isPicking === true));
  assert.equal(closeCount, 1);
  assert.match(previewContent.textContent, /^<!-- Source reference: https:\/\/example\.com\/components\/button -->/);
});
