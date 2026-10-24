import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

test('offline page archive inlines styles, assets, and stores external scripts without running them', async () => {
  const source = await readFile(new URL('../extension/page-archive.js', import.meta.url), 'utf8');
  const bytes = new Uint8Array([137, 80, 78, 71]);
  const context = {
    self: {},
    URL,
    TextEncoder,
    btoa(value) { return Buffer.from(value, 'binary').toString('base64'); },
    fetch: async (url) => {
      if (url === 'https://example.com/site.css') return {
        ok: true,
        headers: {get(name) { return name === 'content-type' ? 'text/css' : null; }},
        async text() { return 'body { background: url(\"/hero.png\"); color: #123456; }'; }
      };
      if (url === 'https://example.com/hero.png') return {
        ok: true,
        headers: {get(name) { return name === 'content-type' ? 'image/png' : null; }},
        async arrayBuffer() { return bytes.buffer; }
      };
      if (url === 'https://example.com/app.js') return {
        ok: true,
        headers: {get(name) { return name === 'content-type' ? 'text/javascript' : null; }},
        async text() { return 'window.booted = true;'; }
      };
      throw new Error('Unexpected URL: ' + url);
    }
  };
  vm.runInNewContext(source, context);

  const snapshot = await context.self.StaiPageArchive.buildOfflineSnapshot({
    sourceUrl: 'https://example.com/demo',
    html: '<!doctype html><html><head><link rel=\"stylesheet\" href=\"/site.css\"></head><body><img src=\"/hero.png\"><script src=\"/app.js\"></script></body></html>'
  });

  assert.match(snapshot.html, /<style data-stai-source=\"https:\/\/example\.com\/site\.css\">/);
  assert.match(snapshot.html, /background: url\(\"data:image\/png;base64,iVBORw==\"\)/);
  assert.match(snapshot.html, /<img src=\"data:image\/png;base64,iVBORw==\">/);
  assert.match(snapshot.html, /<script type=\"text\/plain\" data-stai-source=\"https:\/\/example\.com\/app\.js\">window\.booted = true;<\/script>/);
  assert.match(snapshot.html, /Steal to AI offline page snapshot/);
  assert.equal(snapshot.omitted.length, 0);
});
