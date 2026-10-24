import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function startPicker({sendMessage}) {
  const source = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');
  const listeners = new Map();
  let onMessage;
  class Element {}
  const documentElement = {append() {}};
  const document = {
    documentElement,
    body: {},
    styleSheets: [],
    createElement() { return {dataset: {}, style: {}, setAttribute() {}, addEventListener() {}, append() {}, remove() {}}; },
    addEventListener(type, handler) { listeners.set(type, handler); },
    removeEventListener() {}
  };
  const chrome = {runtime: {sendMessage, onMessage: {addListener(listener) { onMessage = listener; }}}};
  vm.runInNewContext(source, {
    chrome,
    document,
    Element,
    Node: {TEXT_NODE: 3, ELEMENT_NODE: 1},
    window: {setTimeout() {}},
    requestAnimationFrame(callback) { callback(); },
    navigator: {clipboard: {async writeText() {}}}
  });
  onMessage({type: 'STAI_START_PICKING', preferences: {effectMode: 'smart'}}, {}, () => {});
  return {listeners, document, Element};
}

test('blocked source elements are ignored instead of crashing the picker', async () => {
  const sent = [];
  const {listeners, Element} = await startPicker({sendMessage(message) { sent.push(message); }});
  const script = new Element();
  script.nodeType = 1;
  script.tagName = 'SCRIPT';
  script.dataset = {};
  script.closest = () => null;

  assert.doesNotThrow(() => listeners.get('click')({
    target: script,
    preventDefault() {},
    stopImmediatePropagation() {}
  }));
  assert.deepEqual(sent, []);
});

test('an invalidated extension context does not throw while cancelling selection', async () => {
  const {listeners} = await startPicker({sendMessage() { throw new Error('Extension context invalidated.'); }});

  assert.doesNotThrow(() => listeners.get('keydown')({
    key: 'Escape',
    preventDefault() {}
  }));
});
