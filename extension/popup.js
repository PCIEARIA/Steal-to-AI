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
    picking: '正在選取。點一下擷取單一元件；Shift+點選多個元件，按 Enter 匯出；Esc 可取消。',
    noTab: '找不到可用的頁面。', normalSite: '請先開啟一般網頁，再試一次。',
    captured: '已選取元素，可複製程式碼。', selected: '已選取', copyPrompt: '可複製程式碼，或把「元件提示詞」交給你的 AI。', codePreview: '程式碼預覽', codePreviewHint: '將會完整複製', copied: '已複製 Clean HTML/CSS。', copy: '複製程式碼', copiedShort: '已複製', copyComponentPrompt: '複製元件提示詞', componentPromptCopied: '已複製元件提示詞。貼到你的 AI 編程工具即可。', componentPromptCopiedShort: '提示詞已複製',
    dynamic: '動態效果', dynamicHint: '輸出規則',
    smart: '智慧模式（預設）', smartDesc: '偵測到互動、動畫或偽元素才帶上',
    all: '全部帶上', allDesc: '盡量保留所有可取得的互動規則',
    static: '純靜態', staticDesc: '不帶動畫、狀態或過場',
    screenshot: '視覺參考截圖', saveScreenshot: '儲存選取區域截圖', screenshotDesc: '裁成 PNG，直接下載到 Downloads',
    ultimate: '究極模式', ultimateHint: '完整離線快照（HTML + CSS + 素材）', copyPageSource: '下載完整網站包', sourcePreparing: '正在封裝完整網站…', sourceCopied: '完整網站包已下載，可交給 AI 或離線開啟。', sourceCopyFailed: '無法封裝完整網站。',
    saved: 'PNG 已下載', footer: '來源腳本、事件與追蹤屬性不會被帶走。',
    updateAvailable: '發現 v{version} 新版本。', getUpdate: '前往更新',
    starPrompt: '覺得好用嗎？請給我一個 Star！', starPromptBody: '你的支持能幫助 Steal to AI 繼續改進。', starPromptAction: '前往 GitHub', starPromptDismiss: '稍後再說'
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
    picking: 'Picking is on. Click once for one component; Shift+click multiple components, then press Enter to export; Esc cancels.',
    noTab: 'No usable page is open.', normalSite: 'Open a normal website, then try again.',
    captured: 'Element selected and ready to copy.', selected: 'Selected', copyPrompt: 'Copy the code, or send a component prompt to your AI.', codePreview: 'Code preview', codePreviewHint: 'Full code will be copied', copied: 'Clean HTML/CSS copied.', copy: 'Copy code', copiedShort: 'Copied', copyComponentPrompt: 'Copy component prompt', componentPromptCopied: 'Component prompt copied. Paste it into your AI coding tool.', componentPromptCopiedShort: 'Prompt copied',
    dynamic: 'Dynamic effects', dynamicHint: 'export rules',
    smart: 'Smart (default)', smartDesc: 'Adds states, motion, or pseudo-elements only when found',
    all: 'Include all', allDesc: 'Keeps every accessible interaction rule',
    static: 'Static only', staticDesc: 'No motion, states, or transitions',
    screenshot: 'Visual reference', saveScreenshot: 'Save selected-area screenshot', screenshotDesc: 'Crop as PNG and download to Downloads',
    ultimate: 'Ultimate mode', ultimateHint: 'offline snapshot (HTML + CSS + assets)', copyPageSource: 'Download full page package', sourcePreparing: 'Packaging the complete page…', sourceCopied: 'Full page package downloaded. Open it offline or give it to AI.', sourceCopyFailed: 'Could not package the complete page.',
    saved: 'PNG downloaded', footer: 'Source scripts, events, and tracking attributes stay behind.',
    updateAvailable: 'Update v{version} is available.', getUpdate: 'Get update',
    starPrompt: 'Finding Steal to AI useful?', starPromptBody: 'A GitHub star helps keep the project improving.', starPromptAction: 'Open GitHub', starPromptDismiss: 'Later'
  }
};

const defaults = {language: 'zh', effectMode: 'smart', screenshotMode: 'off'};
const start = document.querySelector('#start');
const copy = document.querySelector('#copy');
const copyComponentPrompt = document.querySelector('#copy-component-prompt');
const status = document.querySelector('#status');
const title = document.querySelector('#title');
const resultDetail = document.querySelector('#result-detail');
const captureResult = document.querySelector('#capture-result');
const codePreview = document.querySelector('#code-preview');
const codePreviewContent = document.querySelector('#code-preview-content');
const workspace = document.querySelector('#workspace');
const screenshot = document.querySelector('#screenshot');
const copyPageSource = document.querySelector('#copy-page-source');
const languageButtons = document.querySelectorAll('[data-language]');
const languageToggle = document.querySelector('[data-language-toggle]');
const effects = document.querySelectorAll('input[name="effectMode"]');
const updateStatus = document.querySelector('#update-status');
const updateMessage = document.querySelector('#update-message');
const updateLink = document.querySelector('#update-link');
const starPrompt = document.querySelector('#star-prompt');
const starPromptLink = document.querySelector('#star-prompt-link');
const starPromptDismiss = document.querySelector('#star-prompt-dismiss');
const updateManifestUrl = 'https://raw.githubusercontent.com/PCIEARIA/Steal-to-AI/main/extension/manifest.json';
const updateRepoUrl = 'https://github.com/PCIEARIA/Steal-to-AI';
let preferences = {...defaults};
let resultText = '';
let lastPayload = null;
let codeCopyCount = 0;
const starPromptUrl = 'https://github.com/PCIEARIA/Steal-to-AI';
const companionSkillVersion = '0.1.1';
const companionSkillPrompt = 'Check whether the steal-to-ai-component skill is available in your environment and read its version field. This export requires version ' + companionSkillVersion + ' or newer. If the installed Skill meets that version, use it and continue without asking. If it is unavailable, has no version, or is older, ask the user once whether they want to install or update it from https://github.com/PCIEARIA/Steal-to-AI/tree/main/skills/steal-to-ai-component for a better component-integration workflow. If they decline or installation/update is unavailable, continue without blocking or asking again.';
const liquidGlassDecisionPrompt = "Ask the user first whether this asset needs a liquid-glass treatment. If yes, use https://github.com/martin65536/liquid-glass-webgl as an implementation reference. Before copying any code, ask whether the user owns the rights or has permission to copy and integrate the referenced code. If the user confirms, copy only the necessary component code, preserve required attribution and license notices, and comply with its license; do not copy the whole repository or replace their project stack. If not, adapt only the necessary techniques. If no, recreate the asset faithfully from the captured code below.";

function formatCode(payload) {
  const references = [
    '<!-- Companion skill instruction: ' + companionSkillPrompt + ' -->',
    '<!-- AI reconstruction instruction: ' + liquidGlassDecisionPrompt + ' -->'
  ];
  if (payload.sourceUrl) references.push('<!-- Source reference: ' + payload.sourceUrl + ' -->');
  const components = Array.isArray(payload.components) && payload.components.length ? payload.components : [payload];
  if (components.length > 1) references.push('<!-- Component bundle: ' + components.length + ' selected components. Keep their roles separate; do not rebuild the full source page. -->');
  const reference = references.length ? references.join('\n') + '\n\n' : '';
  const code = components.map((component, index) => {
    const componentReferences = [];
    for (const interaction of Array.isArray(component.interactions) ? component.interactions : []) {
      if (interaction && interaction.type === 'drag' && interaction.selector) {
        componentReferences.push('<!-- Interaction reference (inferred): ' + interaction.selector + ' is draggable. Recreate it with pointerdown, pointermove, and pointerup; keep it within the component bounds. -->');
      }
    }
    const label = components.length > 1 ? '<!-- Component ' + (index + 1) + ': ' + (component.title || 'selected component') + ' -->\n' : '';
    const interactions = componentReferences.length ? componentReferences.join('\n') + '\n' : '';
    return label + interactions + (component.html || '') + '\n\n<style>\n' + (component.css || '') + '\n</style>';
  }).join('\n\n');
  return reference + code;
}

function formatComponentPrompt(payload) {
  const code = formatCode(payload);
  if (preferences.language === 'zh') {
    return [
      '請將下列 UI 元件加入我目前的專案。',
      '規則：\n- 只建立或修改這一個元件；不要重做整個頁面。\n- 沿用我現有的技術棧、設計系統、檔案結構與元件規範。\n- 保留擷取到的外觀、尺寸比例、互動狀態與動畫。\n- 若外部圖片、字型或素材不能直接使用，請以本地可維護的方式重建。\n- 完成後告訴我修改了哪些檔案。',
      '元件：\n' + (payload.title || '已選取元件'),
      payload.sourceUrl ? '來源頁面：\n' + payload.sourceUrl : '',
      '擷取元件：\n' + code
    ].filter(Boolean).join('\n\n');
  }
  return [
    'Add the UI component below to my existing project.',
    'Rules:\n- Create or modify only this component; do not rebuild the whole page.\n- Follow my existing stack, design system, file structure, and component conventions.\n- Preserve the captured visual details, proportions, interactions, and motion.\n- Rebuild inaccessible external assets with maintainable local equivalents.\n- Tell me which files you changed when finished.',
    'Component:\n' + (payload.title || 'Selected component'),
    payload.sourceUrl ? 'Source page:\n' + payload.sourceUrl : '',
    'Captured component:\n' + code
  ].filter(Boolean).join('\n\n');
}

function normalizePreferences(value = {}) {
  return {
    language: value.language === 'en' ? 'en' : 'zh',
    effectMode: ['smart', 'all', 'static'].includes(value.effectMode) ? value.effectMode : 'smart',
    screenshotMode: value.screenshotMode === 'download' ? 'download' : 'off'
  };
}

function text(key) { return strings[preferences.language][key]; }

function format(key, values) {
  return text(key).replace(/\{(\w+)\}/g, (_match, name) => values[name] || '');
}

function isNewerVersion(remote, local) {
  const remoteParts = String(remote).split('.').map(Number);
  const localParts = String(local).split('.').map(Number);
  const length = Math.max(remoteParts.length, localParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (remoteParts[index] || 0) - (localParts[index] || 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}

async function checkForUpdate() {
  if (typeof fetch !== 'function') return;
  try {
    const response = await fetch(updateManifestUrl, {cache: 'no-store'});
    if (!response.ok) return;
    const remote = await response.json();
    const localVersion = chrome.runtime.getManifest().version;
    if (!isNewerVersion(remote.version, localVersion)) return;
    updateMessage.textContent = format('updateAvailable', {version: remote.version});
    updateLink.textContent = text('getUpdate');
    updateLink.hidden = false;
    updateStatus.hidden = false;
  } catch {}
}

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

function showStarPrompt() {
  if (starPrompt) starPrompt.hidden = false;
}

async function recordCodeCopy() {
  codeCopyCount += 1;
  await chrome.storage.local.set({codeCopyCount});
  if (codeCopyCount >= 76 && (codeCopyCount - 76) % 75 === 0) showStarPrompt();
}

async function persistPreferences() {
  await chrome.storage.local.set({preferences});
}

function showResult(payload) {
  if (!payload) return;
  lastPayload = payload;
  resultText = formatCode(payload);
  title.textContent = text('selected') + '：' + payload.title;
  resultDetail.textContent = payload.screenshotFileName
    ? text('copyPrompt') + ' ' + text('saved') + ' · ' + payload.screenshotFileName
    : text('copyPrompt');
  codePreviewContent.textContent = resultText;
  captureResult.hidden = false;
  codePreview.hidden = false;
  copy.disabled = false;
  copyComponentPrompt.disabled = false;
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
      return;
    }
    window.close();
  });
  status.textContent = text('picking');
}

async function copySource() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab || !tab.id) { status.textContent = text('noTab'); return; }

  copyPageSource.disabled = true;
  status.textContent = text('sourcePreparing');
  chrome.tabs.sendMessage(tab.id, {type: 'STAI_DOWNLOAD_PAGE_SNAPSHOT', language: preferences.language}, (response) => {
    copyPageSource.disabled = false;
    if (chrome.runtime.lastError) { status.textContent = text('normalSite'); return; }
    status.textContent = response && response.ok ? text('sourceCopied') : text('sourceCopyFailed');
  });
}

async function setLanguage(language) {
  preferences.language = language;
  await persistPreferences();
  renderCopy();
}

chrome.storage.local.get(['lastExtraction', 'isPicking', 'hasSeenOnboarding', 'preferences', 'codeCopyCount']).then((state) => {
  preferences = normalizePreferences(state.preferences);
  codeCopyCount = Number.isInteger(state.codeCopyCount) && state.codeCopyCount >= 0 ? state.codeCopyCount : 0;
  renderPreferences();
  if (state.hasSeenOnboarding !== true) {
    chrome.runtime.sendMessage({type: 'STAI_OPEN_ONBOARDING'});
    window.close();
    return;
  }
  showWorkspace();
  showResult(state.lastExtraction);
  if (state.isPicking) status.textContent = text('picking');
  checkForUpdate();
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

copyPageSource.addEventListener('click', copySource);

updateLink.addEventListener('click', () => chrome.tabs.create({url: updateRepoUrl}));
if (starPromptLink) starPromptLink.addEventListener('click', () => chrome.tabs.create({url: starPromptUrl}));
if (starPromptDismiss) starPromptDismiss.addEventListener('click', () => { starPrompt.hidden = true; });

copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(resultText);
    await recordCodeCopy();
    copy.textContent = text('copiedShort');
    status.textContent = text('copied');
    window.setTimeout(() => { copy.textContent = text('copy'); }, 1200);
  } catch {
    status.textContent = 'Clipboard access was blocked.';
  }
});

copyComponentPrompt.addEventListener('click', async () => {
  if (!lastPayload) return;
  try {
    await navigator.clipboard.writeText(formatComponentPrompt(lastPayload));
    copyComponentPrompt.textContent = text('componentPromptCopiedShort');
    status.textContent = text('componentPromptCopied');
    window.setTimeout(() => { copyComponentPrompt.textContent = text('copyComponentPrompt'); }, 1200);
  } catch {
    status.textContent = 'Clipboard access was blocked.';
  }
});
