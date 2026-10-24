import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCssRule, cssObjectToText, rootClassFor, sanitizeMarkup } from '../src/extractor.js';

test('sanitizeMarkup removes executable markup and replaces source classes', () => {
  const markup = '<button class="btn x" onclick="alert(1)"><script>bad()</script><span class="label">Save</span></button>';

  assert.equal(
    sanitizeMarkup(markup, 'stai-button'),
    '<button class="stai-button"><span>Save</span></button>'
  );
});

test('cssObjectToText emits readable kebab-case CSS declarations', () => {
  const css = cssObjectToText({
    backgroundColor: 'rgb(1, 2, 3)',
    borderRadius: '12px',
    fontWeight: '700'
  });

  assert.equal(
    css,
    'background-color: rgb(1, 2, 3);\nborder-radius: 12px;\nfont-weight: 700;'
  );
});

test('rootClassFor creates stable portable component class names', () => {
  assert.equal(rootClassFor('button', 0), 'stai-button');
  assert.equal(rootClassFor('div', 2), 'stai-div-3');
});

test('buildCssRule scopes declarations to the generated class and pseudo state', () => {
  assert.equal(
    buildCssRule('stai-button', { backgroundColor: 'rgb(1, 2, 3)', borderRadius: '12px' }, ':hover'),
    '.stai-button:hover {\n  background-color: rgb(1, 2, 3);\n  border-radius: 12px;\n}'
  );
});
