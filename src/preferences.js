const EFFECT_MODES = new Set(['smart', 'all', 'static']);
const SCREENSHOT_MODES = new Set(['off', 'download']);
const LANGUAGES = new Set(['zh', 'en']);

export function defaultPreferences() {
  return {language: 'zh', effectMode: 'smart', screenshotMode: 'off'};
}

export function normalizePreferences(input = {}) {
  const defaults = defaultPreferences();
  return {
    language: LANGUAGES.has(input.language) ? input.language : defaults.language,
    effectMode: EFFECT_MODES.has(input.effectMode) ? input.effectMode : defaults.effectMode,
    screenshotMode: SCREENSHOT_MODES.has(input.screenshotMode) ? input.screenshotMode : defaults.screenshotMode
  };
}
