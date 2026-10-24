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

test('copying a component prompt scopes AI work to the selected UI component', async () => {
  const source = await readFile(new URL('../extension/popup.js', import.meta.url), 'utf8');
  const start = makeNode();
  const copy = makeNode();
  const copyComponentPrompt = makeNode();
  const status = makeNode();
  const title = makeNode();
  const detail = makeNode();
  const result = makeNode();
  const preview = makeNode();
  const previewContent = makeNode();
  const workspace = makeNode();
  const screenshot = makeNode();
  const copyPageSource = makeNode();
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
    ['#start', start], ['#copy', copy], ['#copy-component-prompt', copyComponentPrompt], ['#status', status], ['#title', title], ['#result-detail', detail],
    ['#capture-result', result], ['#code-preview', preview], ['#code-preview-content', previewContent],
    ['#workspace', workspace], ['#screenshot', screenshot], ['#copy-page-source', copyPageSource], ['[data-language-toggle]', languageToggle], ['.choice-list', choiceList],
    ['#update-status', update], ['#update-message', updateMessage], ['#update-link', updateLink]
  ]);
  const clipboardWrites = [];
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
    runtime: {lastError: null, getManifest() { return {version: '0.1.10'}; }, sendMessage() {}},
    storage: {
      local: {
        get() {
          return Promise.resolve({
            hasSeenOnboarding: true,
            preferences: {language: 'zh'},
            isPicking: false,
            lastExtraction: {
              title: 'button · 160 × 48',
              sourceUrl: 'https://example.com/components/button',
              html: '<button class="stai-button">Save</button>',
              css: '.stai-button { color: white; }',
              interactions: [{type: 'drag', selector: '.stai-button__lens'}]
            }
          });
        },
        set() { return Promise.resolve(); }
      }
    },
    tabs: {query() { return Promise.resolve([{id: 42}]); }, sendMessage(_id, _message, callback) { callback(); }, create() { return Promise.resolve(); }}
  };

  vm.runInNewContext(source, {chrome, document, fetch: async () => ({ok: false}), window: {close() {}, setTimeout() {}}, navigator: {clipboard: {async writeText(value) { clipboardWrites.push(value); }}}});
  await new Promise((resolve) => setImmediate(resolve));
  await copyComponentPrompt.handlers.click();

  assert.match(clipboardWrites[0], /請將下列 UI 元件加入我目前的專案。/);
  assert.match(clipboardWrites[0], /只建立或修改這一個元件；不要重做整個頁面。/);
  assert.ok(clipboardWrites[0].includes('來源頁面：' + String.fromCharCode(10) + 'https://example.com/components/button'));
  assert.ok(clipboardWrites[0].includes('<button class="stai-button">Save</button>'));
  assert.equal(status.textContent, '已複製元件提示詞。貼到你的 AI 編程工具即可。');
});
