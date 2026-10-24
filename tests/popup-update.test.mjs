import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

function node() {
  return {
    dataset: {}, classList: {toggle() {}}, handlers: {}, textContent: '', hidden: false, disabled: false, checked: false,
    addEventListener(type, handler) { this.handlers[type] = handler; }, setAttribute() {}
  };
}

test('popup shows a GitHub update when the remote extension version is newer', async () => {
  const source = await readFile(new URL('../extension/popup.js', import.meta.url), 'utf8');
  const start = node(); const copy = node(); const status = node(); const title = node(); const detail = node();
  const result = node(); const preview = node(); const previewContent = node(); const workspace = node(); const screenshot = node(); const copyPageSource = node();
  const languageToggle = node(); const choiceList = node();
  const update = node(); update.hidden = true;
  const updateMessage = node();
  const updateLink = node(); updateLink.hidden = true;
  const zh = node(); zh.dataset.language = 'zh'; const en = node(); en.dataset.language = 'en';
  const smart = node(); smart.value = 'smart'; const all = node(); all.value = 'all'; const staticMode = node(); staticMode.value = 'static';
  const nodes = new Map([
    ['#start', start], ['#copy', copy], ['#status', status], ['#title', title], ['#result-detail', detail],
    ['#capture-result', result], ['#code-preview', preview], ['#code-preview-content', previewContent],
    ['#workspace', workspace], ['#screenshot', screenshot], ['#copy-page-source', copyPageSource], ['[data-language-toggle]', languageToggle], ['.choice-list', choiceList],
    ['#update-status', update], ['#update-message', updateMessage], ['#update-link', updateLink]
  ]);
  const document = {
    documentElement: {}, querySelector(selector) { return nodes.get(selector); },
    querySelectorAll(selector) {
      if (selector === '[data-language]') return [zh, en];
      if (selector === 'input[name="effectMode"]') return [smart, all, staticMode];
      return [];
    }
  };
  const chrome = {
    runtime: {lastError: null, getManifest() { return {version: '0.1.0'}; }, sendMessage() {}},
    storage: {local: {get() { return Promise.resolve({hasSeenOnboarding: true, preferences: {language: 'en'}}); }, set() { return Promise.resolve(); }}},
    tabs: {query() { return Promise.resolve([]); }, sendMessage() {}, create() { return Promise.resolve(); }}
  };
  const fetch = async () => ({ok: true, async json() { return {version: '0.1.1'}; }});

  vm.runInNewContext(source, {chrome, document, fetch, window: {close() {}, setTimeout() {}}, navigator: {clipboard: {writeText() {}}}});
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(update.hidden, false);
  assert.equal(updateMessage.textContent, 'Update v0.1.1 is available.');
  assert.equal(updateLink.hidden, false);
  assert.equal(updateLink.textContent, 'Get update');
});
