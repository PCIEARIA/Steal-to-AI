import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('capture-ready message shows the selected element and the copy next step on the source page', async () => {
  const source = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');
  const appended = [];
  const copied = [];
  let onMessage;
  const document = {
    documentElement: {append(node) { appended.push(node); }},
    createElement(tagName) {
      return {
        tagName,
        dataset: {},
        style: {},
        attributes: {},
        children: [],
        handlers: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        append(...nodes) { this.children.push(...nodes); },
        addEventListener(type, handler) { this.handlers[type] = handler; },
        remove() { this.removed = true; }
      };
    }
  };
  const chrome = {runtime: {onMessage: {addListener(listener) { onMessage = listener; }}}};

  vm.runInNewContext(source, {
    chrome,
    document,
    window: {setTimeout() {}},
    navigator: {clipboard: {async writeText(value) { copied.push(value); }}},
    requestAnimationFrame(callback) { callback(); }
  });
  const code = '<button>Run</button>\n\n<style>button { color: red; }</style>';
  onMessage({type: 'STAI_SHOW_CAPTURE_READY', title: 'button · 120 × 40', language: 'en', code}, {}, () => {});

  assert.equal(appended.length, 1);
  assert.equal(appended[0].dataset.staiOverlay, 'true');
  assert.equal(appended[0].attributes.role, 'status');
  assert.equal(appended[0].attributes['aria-live'], 'polite');
  assert.equal(appended[0].children.length, 2);
  assert.equal(appended[0].children[0].textContent, 'Captured button · 120 × 40. Copy it now or reopen Steal to AI later.');
  const copyButton = appended[0].children[1];
  assert.equal(copyButton.textContent, 'Copy code');
  await copyButton.handlers.click({stopPropagation() {}});
  assert.deepEqual(copied, [code]);
});
