import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('capture-ready message shows the selected element and the copy next step on the source page', async () => {
  const source = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');
  const appended = [];
  let onMessage;
  const document = {
    documentElement: {append(node) { appended.push(node); }},
    createElement() {
      return {
        dataset: {},
        style: {},
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener() {},
        remove() { this.removed = true; }
      };
    }
  };
  const chrome = {runtime: {onMessage: {addListener(listener) { onMessage = listener; }}}};

  vm.runInNewContext(source, {
    chrome,
    document,
    window: {setTimeout() {}},
    requestAnimationFrame(callback) { callback(); }
  });
  onMessage({type: 'STAI_SHOW_CAPTURE_READY', title: 'button · 120 × 40', language: 'en'}, {}, () => {});

  assert.equal(appended.length, 1);
  assert.equal(appended[0].dataset.staiOverlay, 'true');
  assert.equal(appended[0].attributes.role, 'status');
  assert.equal(appended[0].attributes['aria-live'], 'polite');
  assert.equal(appended[0].textContent, 'Captured button · 120 × 40. Open Steal to AI to copy your code.');
});
