import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function startPicker({sendMessage, cursor = 'none', computedValues = {}}) {
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
    CSSStyleRule: class {},
    getComputedStyle() { return {getPropertyValue(property) { return computedValues[property] || (property === 'cursor' ? cursor : 'none'); }, animationName: 'none'}; },
    window: {setTimeout() {}},
    location: {href: 'https://example.com/designs/launch'},
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
