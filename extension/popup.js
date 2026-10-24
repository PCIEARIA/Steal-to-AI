const strings = {
  zh: {
    onboardingKicker: '將網頁細節帶去給 AI',
    onboardingTitle: '看見好設計，直接帶走它的語言。',
    onboardingBody: '選一個元件，Steal to AI 會整理成可貼到 AI 或專案的乾淨 HTML/CSS。',
    stepOne: '開始選取，回到你正在看的頁面。',
    stepTwo: '點選按鈕、卡片、文字或完整區塊。',
    stepThree: '重新開啟小窗，一鍵複製結果。',
    start: '開始使用', notNow: '稍後再說', capture: '開始選取',
    ready: '準備好了，挑一個你想帶走的元素。',
    picking: '正在選取。點頁面上的元素，Esc 可取消。',
    noTab: '找不到可用的頁面。', normalSite: '請先開啟一般網頁，再試一次。',
    captured: '已擷取，可直接複製。', copied: '已複製 Clean HTML/CSS。', copy: '複製', copiedShort: '已複製',
    dynamic: '動態效果', dynamicHint: '輸出規則',
    smart: '智慧模式（預設）', smartDesc: '偵測到互動、動畫或偽元素才帶上',
    all: '全部帶上', allDesc: '盡量保留所有可取得的互動規則',
    static: '純靜態', staticDesc: '不帶動畫、狀態或過場',
    screenshot: '視覺參考截圖', saveScreenshot: '儲存選取區域截圖', screenshotDesc: '裁成 PNG，直接下載到 Downloads',
    saved: 'PNG 已下載', footer: '來源腳本、事件與追蹤屬性不會被帶走。'
  },
  en: {
    onboardingKicker: 'Bring web details to AI',
    onboardingTitle: 'See good design. Bring its language with you.',
    onboardingBody: 'Pick a component and Steal to AI turns it into clean HTML/CSS for your AI or project.',
    stepOne: 'Start picking and return to the page you are viewing.',
    stepTwo: 'Select a button, card, line of text, or a whole block.',
    stepThree: 'Reopen this small panel and copy the result.',
    start: 'Start using', notNow: 'Not now', capture: 'Start picking',
    ready: 'Ready when you spot something worth keeping.',
    picking: 'Picking is on. Click an element, or press Esc to cancel.',
    noTab: 'No usable page is open.', normalSite: 'Open a normal website, then try again.',
    captured: 'Captured and ready to copy.', copied: 'Clean HTML/CSS copied.', copy: 'Copy', copiedShort: 'Copied',
    dynamic: 'Dynamic effects', dynamicHint: 'export rules',
    smart: 'Smart (default)', smartDesc: 'Adds states, motion, or pseudo-elements only when found',
    all: 'Include all', allDesc: 'Keeps every accessible interaction rule',
    static: 'Static only', staticDesc: 'No motion, states, or transitions',
    screenshot: 'Visual reference', saveScreenshot: 'Save selected-area screenshot', screenshotDesc: 'Crop as PNG and download to Downloads',
    saved: 'PNG downloaded', footer: 'Source scripts, events, and tracking attributes stay behind.'
  }
};

const defaults = {language: 'zh', effectMode: 'smart', screenshotMode: 'off'};
const start = document.querySelector('#start');
const copy = document.querySelector('#copy');
const status = document.querySelector('#status');
const title = document.querySelector('#title');
const resultDetail = document.querySelector('#result-detail');
const captureResult = document.querySelector('#capture-result');
const workspace = document.querySelector('#workspace');
const screenshot = document.querySelector('#screenshot');
const languageButtons = document.querySelectorAll('[data-language]');
const languageToggle = document.querySelector('[data-language-toggle]');
const effects = document.querySelectorAll('input[name="effectMode"]');
let preferences = {...defaults};
let resultText = '';

function normalizePreferences(value = {}) {
  return {
    language: value.language === 'en' ? 'en' : 'zh',
    effectMode: ['smart', 'all', 'static'].includes(value.effectMode) ? value.effectMode : 'smart',
    screenshotMode: value.screenshotMode === 'download' ? 'download' : 'off'
  };
}

function text(key) { return strings[preferences.language][key]; }

function renderCopy() {
  document.documentElement.lang = preferences.language === 'zh' ? 'zh-Hant' : 'en';
  document.querySelectorAll('[data-copy]').forEach((node) => { node.textContent = text(node.dataset.copy); });
  languageButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.language === preferences.language));
  languageToggle.textContent = preferences.language === 'zh' ? 'EN' : '中';
  document.querySelector('.choice-list').setAttribute('aria-label', text('dynamic'));
  if (!resultText) status.textContent = text('ready');
}

function renderPreferences() {
  effects.forEach((input) => { input.checked = input.value === preferences.effectMode; });
  screenshot.checked = preferences.screenshotMode === 'download';
  renderCopy();
}

async function persistPreferences() {
  await chrome.storage.local.set({preferences});
}

function showResult(payload) {
  if (!payload) return;
  resultText = payload.html + '\n\n<style>\n' + payload.css + '\n</style>';
  title.textContent = payload.title;
  resultDetail.textContent = payload.screenshotFileName ? text('saved') + ' · ' + payload.screenshotFileName : text('captured');
  captureResult.hidden = false;
  copy.disabled = false;
  status.textContent = text('captured');
}

function showWorkspace() { workspace.hidden = false; }

async function startPicking() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab || !tab.id) { status.textContent = text('noTab'); return; }

  await chrome.storage.local.set({isPicking: true});
  chrome.tabs.sendMessage(tab.id, {type: 'STAI_START_PICKING', preferences}, () => {
    if (chrome.runtime.lastError) {
      status.textContent = text('normalSite');
      chrome.storage.local.set({isPicking: false});
    }
  });
  status.textContent = text('picking');
}

async function setLanguage(language) {
  preferences.language = language;
  await persistPreferences();
  renderCopy();
}

chrome.storage.local.get(['lastExtraction', 'isPicking', 'hasSeenOnboarding', 'preferences']).then((state) => {
  preferences = normalizePreferences(state.preferences);
  renderPreferences();
  if (state.hasSeenOnboarding !== true) {
    chrome.runtime.sendMessage({type: 'STAI_OPEN_ONBOARDING'});
    window.close();
    return;
  }
  showWorkspace();
  showResult(state.lastExtraction);
  if (state.isPicking) status.textContent = text('picking');
});

start.addEventListener('click', startPicking);

languageButtons.forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.language)));
languageToggle.addEventListener('click', () => setLanguage(preferences.language === 'zh' ? 'en' : 'zh'));
effects.forEach((input) => input.addEventListener('change', async () => {
  preferences.effectMode = input.value;
  await persistPreferences();
}));
screenshot.addEventListener('change', async () => {
  preferences.screenshotMode = screenshot.checked ? 'download' : 'off';
  await persistPreferences();
});

copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(resultText);
    copy.textContent = text('copiedShort');
    status.textContent = text('copied');
    window.setTimeout(() => { copy.textContent = text('copy'); }, 1200);
  } catch {
    status.textContent = 'Clipboard access was blocked.';
  }
});
