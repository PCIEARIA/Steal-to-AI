(() => {
  const properties = [
    'box-sizing', 'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'width', 'min-width', 'max-width',
    'height', 'min-height', 'max-height', 'margin', 'padding', 'overflow', 'opacity', 'visibility', 'border', 'border-radius',
    'background', 'background-color', 'background-image', 'background-position', 'background-repeat', 'background-size', 'box-shadow',
    'color', 'font-family', 'font-size', 'font-style', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 'text-decoration',
    'text-transform', 'text-shadow', 'white-space', 'cursor', 'transform', 'transform-origin', 'filter', 'transition', 'animation',
    'object-fit', 'object-position', 'flex', 'flex-direction', 'flex-wrap', 'align-items', 'justify-content', 'gap', 'grid-template-columns',
    'grid-template-rows', 'grid-column', 'grid-row', 'aspect-ratio'
  ];
  const blocked = new Set(['SCRIPT', 'STYLE', 'LINK', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT']);
  const staticProperties = new Set(['transition', 'animation']);
  let activeStop = null;
  let captureToast = null;

  function camel(property) { return property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()); }
  function kebab(property) { return property.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase()); }
  function cssText(style) { return Object.entries(style).map(([name, value]) => '  ' + kebab(name) + ': ' + value + ';').join('\n'); }
  function rule(className, style, suffix = '') { return '.' + className + suffix + ' {\n' + cssText(style) + '\n}'; }
  function normalizedPreferences(value) {
    return {
      effectMode: ['smart', 'all', 'static'].includes(value && value.effectMode) ? value.effectMode : 'smart',
      screenshotMode: value && value.screenshotMode === 'download' ? 'download' : 'off'
    };
  }

  function sendRuntimeMessage(message) {
    try {
      const pending = chrome.runtime.sendMessage(message);
      if (pending && typeof pending.catch === 'function') pending.catch(() => {});
    } catch {}
  }

  async function copyCode(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}

    const field = document.createElement('textarea');
    field.value = text;
    Object.assign(field.style, {position: 'fixed', opacity: '0', pointerEvents: 'none'});
    document.documentElement.append(field);
    field.select();
    const copied = typeof document.execCommand === 'function' && document.execCommand('copy');
    field.remove();
    return copied;
  }

  function showCaptureReady(title, language, code) {
    if (captureToast) captureToast.remove();
    const toast = document.createElement('div');
    const message = document.createElement('span');
    const copyButton = document.createElement('button');
    const english = language === 'en';
    toast.dataset.staiOverlay = 'true';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    message.textContent = english
      ? 'Captured ' + title + '. Copy it now or reopen Steal to AI later.'
      : '已擷取 ' + title + '。現在可直接複製，或稍後開啟 Steal to AI。';
    copyButton.type = 'button';
    copyButton.textContent = english ? 'Copy code' : '複製程式碼';
    Object.assign(toast.style, {
      position: 'fixed', right: '18px', bottom: '18px', zIndex: '2147483647', maxWidth: '340px',
      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 11px 10px 14px', border: '1px solid rgba(215,255,100,.72)', borderRadius: '8px',
      color: '#f5f7f1', background: '#12151d', boxShadow: '0 14px 34px rgba(0,0,0,.28)',
      font: '700 12px/1.45 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      letterSpacing: '-.01em', opacity: '0', transform: 'translateY(8px)',
      transition: 'opacity .18s ease, transform .18s ease'
    });
    Object.assign(copyButton.style, {
      flex: '0 0 auto', border: '1px solid #d7ff64', borderRadius: '5px', padding: '7px 8px',
      color: '#10140d', background: '#d7ff64', font: '800 11px/1 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', cursor: 'pointer'
    });
    copyButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      const copied = await copyCode(code);
      copyButton.textContent = copied ? (english ? 'Copied' : '已複製') : (english ? 'Copy failed' : '無法複製');
    });
    toast.addEventListener('click', () => toast.remove());
    toast.append(message, copyButton);
    document.documentElement.append(toast);
    captureToast = toast;
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
    window.setTimeout(() => {
      if (captureToast === toast) captureToast = null;
      toast.remove();
    }, 8000);
  }

  function styleFor(element, pseudo, effectMode) {
    const computed = getComputedStyle(element, pseudo || null);
    const result = {};
    for (const property of properties) {
      if (effectMode === 'static' && staticProperties.has(property)) continue;
      const value = computed.getPropertyValue(property).trim();
      if (property === 'transition' && value === 'all 0s ease 0s') continue;
      if (property === 'animation' && value.startsWith('none ')) continue;
      if (value && value !== 'normal' && value !== 'none' && value !== 'auto' && value !== '0s') result[camel(property)] = value;
    }
    return result;
  }

  function copyAttributes(source, clone) {
    for (const attribute of Array.from(clone.attributes)) clone.removeAttribute(attribute.name);
    for (const attribute of Array.from(source.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name === 'class' || name === 'id' || name === 'style' || name === 'nonce' || name.startsWith('on') || name.startsWith('data-')) continue;
      if (name === 'href' || name === 'src') {
        try { clone.setAttribute(attribute.name, new URL(attribute.value, document.baseURI).href); } catch { clone.setAttribute(attribute.name, attribute.value); }
      } else clone.setAttribute(attribute.name, attribute.value);
    }
  }

  function cloneTree(source, rootClass, state, records) {
    if (source.nodeType === Node.TEXT_NODE) return document.createTextNode(source.textContent || '');
    if (source.nodeType !== Node.ELEMENT_NODE || blocked.has(source.tagName)) return null;
    const clone = source.cloneNode(false);
    copyAttributes(source, clone);
    const className = state.count === 0 ? rootClass : rootClass + '__' + source.tagName.toLowerCase() + '-' + state.count;
    state.count += 1;
    clone.setAttribute('class', className);
    records.push({source, className});
    for (const child of Array.from(source.childNodes)) {
      const next = cloneTree(child, rootClass, state, records);
      if (next) clone.appendChild(next);
    }
    return clone;
  }

  function interactionRules(element, className, effectMode) {
    if (effectMode === 'static') return [];
    const output = [];
    const states = effectMode === 'all'
      ? [':hover', ':focus-visible', ':focus', ':active', ':disabled', ':checked', ':visited']
      : [':hover', ':focus-visible', ':focus', ':active', ':disabled'];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const item of Array.from(rules)) {
        if (!(item instanceof CSSStyleRule)) continue;
        for (const selector of item.selectorText.split(',')) {
          const source = selector.trim();
          const state = states.find((candidate) => source.includes(candidate));
          if (!state) continue;
          const base = source.replace(/:hover|:focus-visible|:focus|:active|:disabled|:checked|:visited/g, '').replace(/::before|::after/g, '').trim();
          try { if (!base || !element.matches(base)) continue; } catch { continue; }
          const declarations = {};
          for (const property of Array.from(item.style)) {
            if (effectMode === 'static' && staticProperties.has(property)) continue;
            declarations[camel(property)] = item.style.getPropertyValue(property).trim();
          }
          if (Object.keys(declarations).length) output.push(rule(className, declarations, state));
        }
      }
    }
    return output;
  }

  function animationKeyframes(records, effectMode) {
    if (effectMode === 'static') return [];
    const names = new Set();
    for (const record of records) {
      const name = getComputedStyle(record.source).animationName;
      for (const item of name.split(',')) {
        const normalized = item.trim();
        if (normalized && normalized !== 'none') names.add(normalized);
      }
    }
    if (!names.size) return [];
    const keyframes = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const item of Array.from(rules)) {
        if (typeof CSSKeyframesRule !== 'undefined' && item instanceof CSSKeyframesRule && names.has(item.name)) keyframes.push(item.cssText);
      }
    }
    return keyframes;
  }

  function extract(element, preferences) {
    const rootClass = 'stai-' + element.tagName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const records = [];
    const clone = cloneTree(element, rootClass, {count: 0}, records);
    const rules = [];
    for (const record of records) {
      rules.push(rule(record.className, styleFor(record.source, null, preferences.effectMode)));
      if (preferences.effectMode !== 'static') {
        for (const pseudo of ['::before', '::after']) {
          const content = getComputedStyle(record.source, pseudo).getPropertyValue('content').trim();
          if (content && content !== 'none' && content !== 'normal') rules.push(rule(record.className, styleFor(record.source, pseudo, preferences.effectMode), pseudo));
        }
      }
      rules.push(...interactionRules(record.source, record.className, preferences.effectMode));
    }
    rules.push(...animationKeyframes(records, preferences.effectMode));
    const rect = element.getBoundingClientRect();
    const payload = {
      title: element.tagName.toLowerCase() + ' · ' + Math.round(rect.width) + ' × ' + Math.round(rect.height),
      html: clone.outerHTML,
      css: rules.join('\n\n')
    };
    if (preferences.screenshotMode === 'download') {
      payload.capture = {x: rect.left, y: rect.top, width: rect.width, height: rect.height, scale: window.devicePixelRatio};
    }
    return payload;
  }

  function startPicker(inputPreferences) {
    if (activeStop) activeStop();
    const preferences = normalizedPreferences(inputPreferences);
    let selected = null;
    const outline = document.createElement('div');
    const tooltip = document.createElement('div');
    outline.dataset.staiOverlay = 'true'; tooltip.dataset.staiOverlay = 'true';
    Object.assign(outline.style, {position: 'fixed', pointerEvents: 'none', zIndex: '2147483647', border: '2px solid #d7ff64', background: 'rgba(215,255,100,.11)', borderRadius: '4px', display: 'none', boxSizing: 'border-box'});
    Object.assign(tooltip.style, {position: 'fixed', pointerEvents: 'none', zIndex: '2147483647', display: 'none', padding: '6px 8px', borderRadius: '4px', background: '#12151d', color: '#d7ff64', font: '700 11px/1.2 ui-monospace, monospace'});
    document.documentElement.append(outline, tooltip);
    function targetOf(event) {
      const target = event.target;
      if (!(target instanceof Element) || target.dataset.staiOverlay || target.closest('[data-stai-overlay]')) return null;
      if (target === document.documentElement || target === document.body) return null;
      if (blocked.has(target.tagName)) return null;
      return target;
    }
    function stop() {
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('click', choose, true);
      document.removeEventListener('keydown', keydown, true);
      outline.remove(); tooltip.remove(); activeStop = null;
    }
    function move(event) {
      const target = targetOf(event); if (!target) return;
      selected = target;
      const box = target.getBoundingClientRect();
      Object.assign(outline.style, {display: 'block', top: box.top + 'px', left: box.left + 'px', width: box.width + 'px', height: box.height + 'px'});
      tooltip.textContent = target.tagName.toLowerCase() + ' · ' + Math.round(box.width) + ' × ' + Math.round(box.height);
      Object.assign(tooltip.style, {display: 'block', top: Math.max(8, box.top - 29) + 'px', left: Math.max(8, box.left) + 'px'});
    }
    function choose(event) {
      const target = targetOf(event) || selected; if (!target) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const payload = extract(target, preferences);
      stop();
      sendRuntimeMessage({type: 'STAI_EXTRACTION', payload, language: preferences.language});
    }
    function keydown(event) {
      if (event.key !== 'Escape') return;
      event.preventDefault(); stop(); sendRuntimeMessage({type: 'STAI_CANCELLED'});
    }
    document.addEventListener('pointermove', move, true);
    document.addEventListener('click', choose, true);
    document.addEventListener('keydown', keydown, true);
    activeStop = stop;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === 'STAI_START_PICKING') {
      startPicker(message.preferences);
      sendResponse({ok: true});
    }
    if (message && message.type === 'STAI_SHOW_CAPTURE_READY') {
      showCaptureReady(message.title || 'element', message.language, message.code || '');
      sendResponse({ok: true});
    }
  });
})();
