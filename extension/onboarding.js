const copy = {
  zh: { kicker: '將網頁細節帶去給 AI', title: '看見好設計，直接帶走它的語言。', body: '選一個元件，Steal to AI 會整理成可貼到 AI 或專案的乾淨 HTML/CSS。', stepOne: '開始選取你想要的東西。', stepTwo: '點選按鈕、卡片、文字或完整區塊。', stepThree: '偷給你的 AI。', start: '開始使用', starting: '正在開啟選取模式…', startFailed: '無法在這個頁面選取。請先開啟一般網站後再試。', githubNote: '這個專案保持開源；你的支持能讓它繼續變好。', githubStar: '喜歡這個工具？給我一顆 Star', footer: 'Clean HTML/CSS · your browser, your reference' },
  en: { kicker: 'Bring web details to AI', title: 'See good design. Bring its language with you.', body: 'Pick a component and Steal to AI turns it into clean HTML/CSS for your AI or project.', stepOne: 'Start picking what you want to recreate.', stepTwo: 'Select a button, card, line of text, or a complete block.', stepThree: 'Steal it for your AI.', start: 'Start using', starting: 'Opening picker…', startFailed: 'This page cannot be picked. Open a regular website and try again.', githubNote: 'This project stays open source. Your support keeps it improving.', githubStar: 'Enjoying it? Give it a star', footer: 'Clean HTML/CSS · your browser, your reference' }
};
let preferences = {language: 'zh', effectMode: 'smart', screenshotMode: 'off'};
const gate = document.querySelector('#language-gate');
const welcome = document.querySelector('#welcome-content');
const start = document.querySelector('#start');
const startStatus = document.querySelector('#start-status');

function render() {
  document.documentElement.lang = preferences.language === 'zh' ? 'zh-Hant' : 'en';
  document.querySelectorAll('[data-copy]').forEach((element) => { element.textContent = copy[preferences.language][element.dataset.copy]; });
  document.querySelectorAll('[data-language]').forEach((button) => button.classList.toggle('is-active', button.dataset.language === preferences.language));
}

function revealWelcome() {
  gate.classList.add('is-leaving');
  window.setTimeout(() => {
    gate.hidden = true;
    welcome.hidden = false;
    welcome.classList.add('is-visible');
    render();
  }, 260);
}

async function persist() { await chrome.storage.local.set({preferences}); }

chrome.storage.local.get('preferences').then(({preferences: saved}) => {
  if (saved && saved.language === 'en') preferences.language = 'en';
  if (saved && ['smart', 'all', 'static'].includes(saved.effectMode)) preferences.effectMode = saved.effectMode;
  if (saved && saved.screenshotMode === 'download') preferences.screenshotMode = 'download';
  render();
});

document.querySelectorAll('[data-language]').forEach((button) => button.addEventListener('click', async () => {
  preferences.language = button.dataset.language;
  await persist();
  render();
  if (gate && !gate.hidden) revealWelcome();
}));

start.addEventListener('click', async () => {
  start.disabled = true;
  start.textContent = copy[preferences.language].starting;
  startStatus.hidden = true;
  await chrome.storage.local.set({hasSeenOnboarding: true, preferences});
  try {
    const response = await chrome.runtime.sendMessage({type: 'STAI_START_PICKING_FROM_ONBOARDING', preferences});
    if (response && response.ok) return;
  } catch {}
  await chrome.storage.local.set({hasSeenOnboarding: false});
  start.disabled = false;
  start.textContent = copy[preferences.language].start;
  startStatus.textContent = copy[preferences.language].startFailed;
  startStatus.hidden = false;
});
