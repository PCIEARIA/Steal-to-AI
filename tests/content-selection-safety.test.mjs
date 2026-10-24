import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function startPicker({sendMessage, cursor = 'none', computedValues = {}, computedStyle, clipboardWrites = []}) {
  const source = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');
  const listeners = new Map();
  let onMessage;
  class Element {}
  const documentElement = {
    append() {},
    outerHTML: '<html><body>Rendered fallback</body></html>',
    cloneNode() { return {outerHTML: '<html><body>Rendered snapshot</body></html>', querySelectorAll() { return []; }}; }
  };
  const document = {
    documentElement, doctype: {name: 'html'},
    body: {},
    styleSheets: [],
    createElement() { return {dataset: {}, style: {}, setAttribute() {}, addEventListener() {}, append() {}, remove() {}}; },
    querySelectorAll() { return []; },
    addEventListener(type, handler) { listeners.set(type, handler); },
    removeEventListener() {}
  };
  const chrome = {runtime: {
    sendMessage(message, callback) {
      sendMessage(message);
      if (message && message.type === 'STAI_DOWNLOAD_PAGE_SNAPSHOT') {
        const response = {ok: true, filename: 'steal-to-ai-example.html', omitted: []};
        if (callback) callback(response);
        return Promise.resolve(response);
      }
      return undefined;
    },
    onMessage: {addListener(listener) { onMessage = listener; }}
  }};
  vm.runInNewContext(source, {
    chrome,
    document,
    Element,
    Node: {TEXT_NODE: 3, ELEMENT_NODE: 1},
    CSSStyleRule: class {},
    getComputedStyle(element) {
      return {
        getPropertyValue(property) {
          return (computedStyle && computedStyle(element, property)) || computedValues[property] || (property === 'cursor' ? cursor : 'none');
        },
        animationName: 'none'
      };
    },
    window: {setTimeout() {}},
    location: {href: 'https://example.com/designs/launch'},
    requestAnimationFrame(callback) { callback(); },
    navigator: {clipboard: {async writeText(value) { clipboardWrites.push(value); }}}
  });
  onMessage({type: 'STAI_START_PICKING', preferences: {effectMode: 'smart'}}, {}, () => {});
  return {
    listeners, document, Element,
    dispatch(message) {
      return new Promise((resolve) => {
        const keepChannel = onMessage(message, {}, resolve);
        if (keepChannel !== true) resolve({ok: false});
      });
    }
  };
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

test('an empty decorative layer resolves to its nearest content-bearing parent component', async () => {
  const sent = [];
  const {listeners, Element} = await startPicker({sendMessage(message) { sent.push(message); }});
  function element(tagName, width, height, textContent = '') {
    const value = new Element();
    value.nodeType = 1;
    value.tagName = tagName;
    value.dataset = {};
    value.attributes = [];
    value.childNodes = [];
    value.textContent = textContent;
    value.closest = () => null;
    value.getBoundingClientRect = () => ({top: 20, left: 30, width, height});
    value.cloneNode = () => ({
      attributes: [], removeAttribute() {}, setAttribute() {}, appendChild() {}, outerHTML: '<div></div>'
    });
    return value;
  }
  const component = element('DIV', 300, 100, 'Launch project');
  const decoration = element('DIV', 210, 150);
  decoration.parentElement = component;

  listeners.get('pointermove')({target: decoration});
  listeners.get('click')({target: decoration, preventDefault() {}, stopImmediatePropagation() {}});

  assert.equal(sent.length, 1);
  assert.equal(sent[0].payload.title, 'div · 300 × 100');
  assert.equal(sent[0].payload.sourceUrl, 'https://example.com/designs/launch');
});

test('a wrapper containing an SVG defs-only filter resolves to its meaningful parent component', async () => {
  const sent = [];
  const {listeners, Element} = await startPicker({sendMessage(message) { sent.push(message); }});
  function element(tagName, width, height, textContent = '') {
    const value = new Element();
    value.nodeType = 1;
    value.tagName = tagName;
    value.dataset = {};
    value.attributes = [];
    value.childNodes = [];
    value.textContent = textContent;
    value.closest = () => null;
    value.getBoundingClientRect = () => ({top: 20, left: 30, width, height});
    value.cloneNode = () => ({
      attributes: [], removeAttribute() {}, setAttribute() {}, appendChild() {}, outerHTML: '<div></div>'
    });
    return value;
  }

  const component = element('DIV', 360, 180, 'Launch project');
  const filterSvg = element('SVG', 210, 150);
  filterSvg.querySelector = () => null;
  const filterLayer = element('DIV', 210, 150);
  filterLayer.querySelector = (selector) => selector.includes('svg') ? filterSvg : null;
  filterLayer.parentElement = component;

  listeners.get('click')({target: filterLayer, preventDefault() {}, stopImmediatePropagation() {}});

  assert.equal(sent.length, 1);
  assert.equal(sent[0].payload.title, 'div · 360 × 180');
});

test('a grabbed surface carries an AI interaction hint with its generated selector', async () => {
  const sent = [];
  const {listeners, Element} = await startPicker({sendMessage(message) { sent.push(message); }, cursor: 'grab'});
  const component = new Element();
  component.nodeType = 1;
  component.tagName = 'DIV';
  component.dataset = {};
  component.attributes = [];
  component.childNodes = [];
  component.textContent = 'Drag me';
  component.closest = () => null;
  component.getBoundingClientRect = () => ({top: 20, left: 30, width: 210, height: 150});
  component.cloneNode = () => ({
    attributes: [], removeAttribute() {}, setAttribute() {}, appendChild() {}, outerHTML: '<div></div>'
  });

  listeners.get('click')({target: component, preventDefault() {}, stopImmediatePropagation() {}});

  assert.equal(JSON.stringify(sent[0].payload.interactions), JSON.stringify([{type: 'drag', selector: '.stai-div'}]));
});

test('an extracted SVG-style filter keeps a renamed ID and rewrites its backdrop-filter reference', async () => {
  const sent = [];
  const {listeners, Element} = await startPicker({
    sendMessage(message) { sent.push(message); },
    computedValues: {'backdrop-filter': 'url("#liquid-filter")'}
  });
  const component = new Element();
  component.nodeType = 1;
  component.tagName = 'DIV';
  component.dataset = {};
  component.attributes = [{name: 'id', value: 'liquid-filter'}];
  component.childNodes = [];
  component.textContent = 'Glass';
  component.closest = () => null;
  component.getBoundingClientRect = () => ({top: 20, left: 30, width: 210, height: 150});
  component.cloneNode = () => {
    const attributes = [];
    return {
      attributes,
      removeAttribute(name) { const index = attributes.findIndex((attribute) => attribute.name === name); if (index >= 0) attributes.splice(index, 1); },
      setAttribute(name, value) { attributes.push({name, value}); },
      appendChild() {},
      get outerHTML() { return '<div ' + attributes.map((attribute) => attribute.name + '="' + attribute.value + '"').join(' ') + '></div>'; }
    };
  };

  listeners.get('click')({target: component, preventDefault() {}, stopImmediatePropagation() {}});

  assert.match(sent[0].payload.html, /id="stai-div-id-1"/);
  assert.match(sent[0].payload.css, /backdrop-filter: url\(#stai-div-id-1\);/);
});

test('a full-card absolute base layer resolves to its composite card instead of losing overlay effects', async () => {
  const sent = [];
  const {listeners, Element} = await startPicker({
    sendMessage(message) { sent.push(message); },
    computedStyle(element, property) {
      if (property !== 'position') return 'none';
      return element.role === 'card' ? 'relative' : 'absolute';
    }
  });
  function element(role, width, height, textContent = '') {
    const value = new Element();
    value.role = role;
    value.nodeType = 1;
    value.tagName = 'DIV';
    value.dataset = {};
    value.attributes = [];
    value.childNodes = [];
    value.children = [];
    value.textContent = textContent;
    value.closest = () => null;
    value.getBoundingClientRect = () => ({top: 20, left: 30, width, height});
    value.cloneNode = () => ({
      attributes: [], removeAttribute() {}, setAttribute() {}, appendChild() {}, outerHTML: '<div></div>'
    });
    return value;
  }
  const card = element('card', 766, 460);
  const baseLayer = element('base', 764, 458, 'Liquid glass');
  const imageLayer = element('image', 300, 360, '');
  const lensLayer = element('lens', 210, 150, '');
  baseLayer.parentElement = card;
  imageLayer.parentElement = card;
  lensLayer.parentElement = card;
  card.children = [baseLayer, imageLayer, lensLayer];
  card.childNodes = card.children;

  listeners.get('click')({target: baseLayer, preventDefault() {}, stopImmediatePropagation() {}});

  assert.equal(sent[0].payload.title, 'div · 766 × 460');
});

test('ultimate mode asks the background worker to download a rendered full-page package', async () => {
  const messages = [];
  const {dispatch} = await startPicker({sendMessage(message) { messages.push(message); }});

  const result = await dispatch({type: 'STAI_DOWNLOAD_PAGE_SNAPSHOT', language: 'en'});

  assert.equal(result.ok, true);
  assert.equal(messages.at(-1).type, 'STAI_DOWNLOAD_PAGE_SNAPSHOT');
  assert.equal(messages.at(-1).payload.sourceUrl, 'https://example.com/designs/launch');
  assert.match(messages.at(-1).payload.html, /Rendered snapshot/);
});
