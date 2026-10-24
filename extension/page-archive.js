(() => {
  const MAX_RESOURCE_BYTES = 12 * 1024 * 1024;
  const MAX_TOTAL_BYTES = 48 * 1024 * 1024;

  function escapeAttribute(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function getAttribute(tag, name) {
    const expression = new RegExp('\\s' + name + '\\s*=\\s*(?:\"([^\"]*)\"|\'([^\']*)\'|([^\\s>]+))', 'i');
    const match = tag.match(expression);
    return match ? (match[1] ?? match[2] ?? match[3] ?? '') : '';
  }

  function setAttribute(tag, name, value) {
    const expression = new RegExp('(\\s' + name + '\\s*=\\s*)(?:\"[^\"]*\"|\'[^\']*\'|[^\\s>]+)', 'i');
    if (!expression.test(tag)) return tag;
    return tag.replace(expression, '$1\"' + escapeAttribute(value) + '\"');
  }

  function absoluteUrl(value, baseUrl) {
    try { return new URL(value, baseUrl).href; } catch { return null; }
  }

  function shouldInline(value) {
    return Boolean(value) && !/^(?:data:|blob:|javascript:|mailto:|tel:|#)/i.test(value.trim());
  }

  function base64(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunk = 0x8000;
    for (let start = 0; start < bytes.length; start += chunk) {
      binary += String.fromCharCode(...bytes.subarray(start, Math.min(start + chunk, bytes.length)));
    }
    return btoa(binary);
  }

  async function replaceAsync(value, expression, replacer) {
    const matches = Array.from(value.matchAll(expression));
    if (!matches.length) return value;
    let output = '';
    let cursor = 0;
    for (const match of matches) {
      output += value.slice(cursor, match.index);
      output += await replacer(...match);
      cursor = match.index + match[0].length;
    }
    return output + value.slice(cursor);
  }

  function makeState() {
    return {
      totalBytes: 0,
      omitted: [],
      textCache: new Map(),
      dataCache: new Map(),
      cssStack: new Set()
    };
  }

  async function fetchText(url, state) {
    if (state.textCache.has(url)) return state.textCache.get(url);
    const task = (async () => {
      const response = await fetch(url, {credentials: 'include', cache: 'no-store'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    })();
    state.textCache.set(url, task);
    return task;
  }

  async function fetchDataUrl(url, state) {
    if (state.dataCache.has(url)) return state.dataCache.get(url);
    const task = (async () => {
      const response = await fetch(url, {credentials: 'include', cache: 'no-store'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.arrayBuffer();
      if (data.byteLength > MAX_RESOURCE_BYTES || state.totalBytes + data.byteLength > MAX_TOTAL_BYTES) {
        throw new Error('resource exceeds archive size limit');
      }
      state.totalBytes += data.byteLength;
      const type = response.headers.get('content-type') || 'application/octet-stream';
      return 'data:' + type.split(';')[0] + ';base64,' + base64(data);
    })();
    state.dataCache.set(url, task);
    return task;
  }

  function recordOmission(state, url, error) {
    if (!state.omitted.some((item) => item.url === url)) state.omitted.push({url, reason: String(error && error.message || error || 'unavailable')});
  }

  async function inlineCssUrls(css, baseUrl, state) {
    return replaceAsync(css, /url\(\s*(['\"]?)([^)'\"]+)\1\s*\)/gi, async (match, quote, raw) => {
      const value = raw.trim();
      if (!shouldInline(value)) return match;
      const url = absoluteUrl(value, baseUrl);
      if (!url) return match;
      try { return 'url(\"' + await fetchDataUrl(url, state) + '\")'; }
      catch (error) { recordOmission(state, url, error); return match; }
    });
  }

  async function inlineCss(css, baseUrl, state) {
    const importsInlined = await replaceAsync(css, /@import\s+(?:url\(\s*)?(['\"])([^'\"]+)\1\s*\)?\s*;/gi, async (match, quote, raw) => {
      const url = absoluteUrl(raw.trim(), baseUrl);
      if (!url || state.cssStack.has(url)) return match;
      try {
        state.cssStack.add(url);
        const imported = await fetchText(url, state);
        return await inlineCss(imported, url, state);
      } catch (error) {
        if (url) recordOmission(state, url, error);
        return match;
      } finally { if (url) state.cssStack.delete(url); }
    });
    return inlineCssUrls(importsInlined, baseUrl, state);
  }

  async function inlineStylesheets(html, baseUrl, state) {
    let output = await replaceAsync(html, /<link\b[^>]*>/gi, async (tag) => {
      const rel = getAttribute(tag, 'rel');
      const href = getAttribute(tag, 'href');
      if (!/\bstylesheet\b/i.test(rel) || !href) return tag;
      const url = absoluteUrl(href, baseUrl);
      if (!url) return tag;
      try {
        state.cssStack.add(url);
        const css = await inlineCss(await fetchText(url, state), url, state);
        return '<style data-stai-source=\"' + escapeAttribute(url) + '\">' + css.replace(/<\/style/gi, '<\\/style') + '</style>';
      } catch (error) {
        recordOmission(state, url, error);
        return tag;
      } finally { state.cssStack.delete(url); }
    });
    return replaceAsync(output, /<style\b[^>]*>([\s\S]*?)<\/style>/gi, async (tag, css) => {
      const inlined = await inlineCss(css, baseUrl, state);
      return tag.replace(css, inlined);
    });
  }

  async function inlineScriptSources(html, baseUrl, state) {
    return replaceAsync(html, /<script\b[^>]*\bsrc\s*=\s*(?:\"([^\"]+)\"|\'([^\']+)\'|([^\s>]+))[^>]*>\s*<\/script>/gi, async (tag, doubleQuoted, singleQuoted, bare) => {
      const raw = doubleQuoted ?? singleQuoted ?? bare ?? '';
      const url = absoluteUrl(raw, baseUrl);
      if (!url) return tag;
      try {
        const code = await fetchText(url, state);
        return '<script type=\"text/plain\" data-stai-source=\"' + escapeAttribute(url) + '\">' + code.replace(/<\/script/gi, '<\\/script') + '</script>';
      } catch (error) {
        recordOmission(state, url, error);
        return tag;
      }
    });
  }

  async function inlineTagAssets(html, baseUrl, state) {
    let output = await replaceAsync(html, /<(img|source|video|audio|track|link)\b[^>]*>/gi, async (tag) => {
      const tagName = /^<([a-z]+)/i.exec(tag)[1].toLowerCase();
      const rel = getAttribute(tag, 'rel');
      const candidates = ['img', 'source', 'video', 'audio', 'track'].includes(tagName)
        ? ['src', 'poster']
        : (/\b(?:icon|apple-touch-icon|manifest)\b/i.test(rel) ? ['href'] : []);
      let next = tag;
      for (const name of candidates) {
        const raw = getAttribute(next, name);
        if (!shouldInline(raw)) continue;
        const url = absoluteUrl(raw, baseUrl);
        if (!url) continue;
        try { next = setAttribute(next, name, await fetchDataUrl(url, state)); }
        catch (error) { recordOmission(state, url, error); }
      }
      const srcset = getAttribute(next, 'srcset');
      if (srcset) {
        const parts = srcset.split(',').map((part) => part.trim()).filter(Boolean);
        const rewritten = [];
        for (const part of parts) {
          const [raw, descriptor] = part.split(/\s+/, 2);
          const url = shouldInline(raw) ? absoluteUrl(raw, baseUrl) : null;
          if (!url) { rewritten.push(part); continue; }
          try { rewritten.push((await fetchDataUrl(url, state)) + (descriptor ? ' ' + descriptor : '')); }
          catch (error) { recordOmission(state, url, error); rewritten.push(part); }
        }
        next = setAttribute(next, 'srcset', rewritten.join(', '));
      }
      return next;
    });
    return replaceAsync(output, /\sstyle=(['\"])([\s\S]*?)\1/gi, async (match, quote, css) => ' style=' + quote + await inlineCssUrls(css, baseUrl, state) + quote);
  }

  async function buildOfflineSnapshot({html, sourceUrl}) {
    const state = makeState();
    const baseUrl = sourceUrl || 'about:blank';
    let snapshot = String(html || '');
    snapshot = await inlineStylesheets(snapshot, baseUrl, state);
    snapshot = await inlineScriptSources(snapshot, baseUrl, state);
    snapshot = await inlineTagAssets(snapshot, baseUrl, state);
    const header = '<!-- Steal to AI offline page snapshot. Source: ' + escapeAttribute(baseUrl) + '. External scripts are preserved as inert text for safe AI reference. -->\n';
    return {html: header + snapshot, omitted: state.omitted};
  }

  self.StaiPageArchive = {buildOfflineSnapshot};
})();
