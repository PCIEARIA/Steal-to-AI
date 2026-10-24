function toKebabCase(property) {
  return property.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
}

export function cssObjectToText(styleObject) {
  return Object.entries(styleObject)
    .filter(([, value]) => value !== '' && value !== null && value !== undefined)
    .map(([property, value]) => toKebabCase(property) + ': ' + value + ';')
    .join('\n');
}

export function rootClassFor(tagName, index = 0) {
  const tag = String(tagName || 'component')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '') || 'component';

  return index === 0 ? 'stai-' + tag : 'stai-' + tag + '-' + (index + 1);
}

export function buildCssRule(className, styleObject, suffix = '') {
  const declarations = cssObjectToText(styleObject)
    .split('\n')
    .map((line) => '  ' + line)
    .join('\n');

  return '.' + className + suffix + ' {\n' + declarations + '\n}';
}

export function sanitizeMarkup(markup, rootClass) {
  const withoutScripts = String(markup)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+class\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  return withoutScripts.replace(
    /^(\s*<[a-z][\w:-]*)(\b[^>]*?)(\/?>)/i,
    '$1 class="' + rootClass + '"$2$3'
  );
}

const STYLE_PROPERTIES = [
  'box-sizing', 'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
  'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'overflow', 'overflow-x', 'overflow-y', 'opacity', 'visibility', 'pointer-events',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius',
  'background', 'background-color', 'background-image', 'background-position', 'background-repeat', 'background-size',
  'box-shadow', 'outline', 'color', 'font-family', 'font-size', 'font-style', 'font-weight',
  'line-height', 'letter-spacing', 'text-align', 'text-decoration', 'text-transform',
  'text-shadow', 'white-space', 'word-break', 'overflow-wrap', 'vertical-align',
  'list-style', 'cursor', 'transform', 'transform-origin', 'filter', 'backdrop-filter',
  'transition', 'animation', 'object-fit', 'object-position', 'flex', 'flex-direction',
  'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'align-items', 'align-self',
  'justify-content', 'justify-self', 'gap', 'row-gap', 'column-gap', 'grid-area',
  'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row', 'aspect-ratio'
];

const BLOCKED_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT']);

function readableStyle(element, pseudo = null) {
  const computed = window.getComputedStyle(element, pseudo);
  const result = {};

  for (const property of STYLE_PROPERTIES) {
    const value = computed.getPropertyValue(property).trim();
    if (value && value !== 'normal' && value !== 'none' && value !== 'auto' && value !== '0s') {
      result[property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    }
  }

  return result;
}

function copySafeAttributes(source, clone) {
  for (const attribute of Array.from(clone.attributes)) {
    clone.removeAttribute(attribute.name);
  }

  for (const attribute of Array.from(source.attributes)) {
    const name = attribute.name.toLowerCase();
    if (name === 'class' || name === 'id' || name === 'style' || name === 'nonce' || name.startsWith('on') || name.startsWith('data-')) {
      continue;
    }

    if (name === 'href' || name === 'src') {
      try {
        clone.setAttribute(attribute.name, new URL(attribute.value, document.baseURI).href);
      } catch {
        clone.setAttribute(attribute.name, attribute.value);
      }
      continue;
    }

    clone.setAttribute(attribute.name, attribute.value);
  }
}

function cloneTree(source, state, records, rootClass) {
  if (source.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(source.textContent || '');
  }

  if (source.nodeType !== Node.ELEMENT_NODE || BLOCKED_TAGS.has(source.tagName)) {
    return null;
  }

  const clone = source.cloneNode(false);
  copySafeAttributes(source, clone);

  const className = state.count === 0
    ? rootClass
    : rootClass + '__' + source.tagName.toLowerCase() + '-' + state.count;
  state.count += 1;
  clone.setAttribute('class', className);
  records.push({source, className});

  for (const child of Array.from(source.childNodes)) {
    const childClone = cloneTree(child, state, records, rootClass);
    if (childClone) clone.appendChild(childClone);
  }

  return clone;
}

function interactionRules(element, className) {
  const rules = [];
  const states = [':hover', ':focus', ':focus-visible', ':active', ':disabled'];

  for (const sheet of Array.from(document.styleSheets)) {
    let styleRules;
    try {
      styleRules = sheet.cssRules;
    } catch {
      continue;
    }

    for (const rule of Array.from(styleRules)) {
      if (!(rule instanceof CSSStyleRule)) continue;
      for (const selector of rule.selectorText.split(',')) {
        const normalized = selector.trim();
        const state = states.find((candidate) => normalized.includes(candidate));
        if (!state) continue;

        const baseSelector = normalized
          .replace(/:hover|:focus-visible|:focus|:active|:disabled/g, '')
          .replace(/::before|::after/g, '')
          .trim();
        if (!baseSelector) continue;

        try {
          if (!element.matches(baseSelector)) continue;
        } catch {
          continue;
        }

        const declarations = {};
        for (const property of Array.from(rule.style)) {
          declarations[property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = rule.style.getPropertyValue(property).trim();
        }
        if (Object.keys(declarations).length > 0) rules.push(buildCssRule(className, declarations, state));
      }
    }
  }

  return rules;
}

export function extractElement(element) {
  const rootClass = rootClassFor(element.tagName, 0);
  const records = [];
  const clone = cloneTree(element, {count: 0}, records, rootClass);
  const rules = [];

  for (const record of records) {
    rules.push(buildCssRule(record.className, readableStyle(record.source)));

    for (const pseudo of ['::before', '::after']) {
      const pseudoStyle = window.getComputedStyle(record.source, pseudo);
      const content = pseudoStyle.getPropertyValue('content').trim();
      if (content && content !== 'none' && content !== 'normal') {
        rules.push(buildCssRule(record.className, readableStyle(record.source, pseudo), pseudo));
      }
    }

    rules.push(...interactionRules(record.source, record.className));
  }

  const box = element.getBoundingClientRect();
  return {
    title: element.tagName.toLowerCase() + ' · ' + Math.round(box.width) + ' × ' + Math.round(box.height),
    html: clone.outerHTML,
    css: rules.join('\n\n'),
    rootClass
  };
}
