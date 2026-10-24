import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

function node() {
  return {
    dataset: {}, classList: {toggle() {}}, handlers: {}, hidden: false, disabled: false, checked: false, textContent: '',
    addEventListener(type, handler) { this.handlers[type] = handler; },
    setAttribute() {}
  };
}

test('successful code copy shows the Star prompt on copy 76 and every 75 copies after', async () => {
  const source = await readFile(new URL('../extension/popup.js', import.meta.url), 'utf8');
  const ids = ['start', 'copy', 'copy-component-prompt', 'status', 'title', 'result-detail', 'capture-result', 'code-preview',
    'code-preview-content', 'workspace', 'screenshot', 'copy-page-source', 'update-status', 'update-message', 'update-link',
    'star-prompt', 'star-prompt-link', 'star-prompt-dismiss'];
  const nodes = new Map(ids.map((id) => ['#' + id, node()]));
  const smart = node(); smart.value = 'smart';
  const all = node(); all.value = 'all';
  const staticMode = node(); staticMode.value = 'static';
  const languageToggle = node();
  nodes.set('[data-language-toggle]', languageToggle);
  nodes.set('.choice-list', node());
  const languageButtons = [node(), node()];
  languageButtons[0].dataset.language = 'zh';
  languageButtons[1].dataset.language = 'en';
  nodes.get('#star-prompt-link').dataset.url = 'https://github.com/PCIEARIA/Steal-to-AI';
  const writes = [];
  const opened = [];
  const document = {
    documentElement: {},
    querySelector(selector) { return nodes.get(selector); },
    querySelectorAll(selector) {
      if (selector === '[data-language]') return languageButtons;
      if (selector === 'input[name="effectMode"]') return [smart, all, staticMode];
      return [];
    }
  };
  const chrome = {
    runtime: {lastError: null, getManifest() { return {version: '0.1.15'}; }, sendMessage() {}},
    storage: {
      local: {
        get() {
          return Promise.resolve({
            hasSeenOnboarding: true, isPicking: false, codeCopyCount: 75,
            preferences: {language: 'zh'},
            lastExtraction: {title: 'button · 120 × 40', sourceUrl: 'https://example.com', html: '<button>Save</button>', css: '', interactions: []}
          });
        },
        set(value) { writes.push(value); return Promise.resolve(); }
      }
    },
    tabs: {query() { return Promise.resolve([{id: 42}]); }, sendMessage(_tab, _message, callback) { callback(); }, create(details) { opened.push(details); return Promise.resolve(); }}
  };
  vm.runInNewContext(source, {
    chrome, document, fetch: async () => ({ok: false}),
    window: {close() {}, setTimeout() {}},
    navigator: {clipboard: {async writeText() {}}}
  });
  await new Promise((resolve) => setImmediate(resolve));

  await nodes.get('#copy').handlers.click();

  assert.equal(nodes.get('#star-prompt').hidden, false);
  assert.ok(writes.some((value) => value.codeCopyCount === 76));
  await nodes.get('#star-prompt-link').handlers.click();
  assert.equal(JSON.stringify(opened), JSON.stringify([{url: 'https://github.com/PCIEARIA/Steal-to-AI'}]));
  await nodes.get('#star-prompt-dismiss').handlers.click();
  assert.equal(nodes.get('#star-prompt').hidden, true);
});
