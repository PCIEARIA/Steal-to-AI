import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultPreferences, normalizePreferences } from '../src/preferences.js';

test('default preferences use smart dynamics and no screenshot download', () => {
  assert.deepEqual(defaultPreferences(), {
    language: 'zh',
    effectMode: 'smart',
    screenshotMode: 'off'
  });
});

test('normalizePreferences keeps supported choices and rejects unknown values', () => {
  assert.deepEqual(
    normalizePreferences({language: 'en', effectMode: 'all', screenshotMode: 'download'}),
    {language: 'en', effectMode: 'all', screenshotMode: 'download'}
  );
  assert.deepEqual(
    normalizePreferences({language: 'jp', effectMode: 'explode', screenshotMode: 'yes'}),
    defaultPreferences()
  );
});
