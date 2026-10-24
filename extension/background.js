function safePart(value) {
  return String(value || 'element').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'element';
}

function dataUrlFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Unable to encode PNG.'));
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function downloadSelectionCapture(windowId, capture, title) {
  const imageUrl = await chrome.tabs.captureVisibleTab(windowId, {format: 'png'});
  const image = await createImageBitmap(await (await fetch(imageUrl)).blob());
  const scale = Number(capture.scale) || 1;
  const x = Math.max(0, Math.round(capture.x * scale));
  const y = Math.max(0, Math.round(capture.y * scale));
  const width = Math.min(image.width - x, Math.max(1, Math.round(capture.width * scale)));
  const height = Math.min(image.height - y, Math.max(1, Math.round(capture.height * scale)));
  if (width <= 0 || height <= 0) throw new Error('The selected element is outside the visible area.');

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  context.drawImage(image, x, y, width, height, 0, 0, width, height);
  const png = await dataUrlFromBlob(await canvas.convertToBlob({type: 'image/png'}));
  const filename = 'steal-to-ai-' + safePart(title) + '-' + Date.now() + '.png';
  await chrome.downloads.download({url: png, filename, saveAs: false, conflictAction: 'uniquify'});
  return filename;
}

async function openOnboarding() {
  const [activeTab] = await chrome.tabs.query({active: true, currentWindow: true});
  const onboardingTab = await chrome.tabs.create({url: chrome.runtime.getURL('onboarding.html'), active: true});
  await chrome.storage.local.set({
    onboardingReturnTabId: activeTab && activeTab.id,
    onboardingTabId: onboardingTab && onboardingTab.id
  });
}

async function startPicking(tabId, preferences) {
  const message = {type: 'STAI_START_PICKING', preferences};
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    await chrome.scripting.executeScript({target: {tabId}, files: ['content.js']});
    await chrome.tabs.sendMessage(tabId, message);
  }
}

async function returnFromOnboarding(sender, preferences, shouldStartPicking) {
  const state = await chrome.storage.local.get(['onboardingReturnTabId', 'onboardingTabId']);
  const tabId = state.onboardingReturnTabId;
  if (!Number.isInteger(tabId)) return false;

  try {
    await chrome.tabs.update(tabId, {active: true});
    if (shouldStartPicking) {
      await chrome.storage.local.set({isPicking: true});
      await startPicking(tabId, preferences);
    }
  } catch {
    await chrome.storage.local.set({isPicking: false});
    if (Number.isInteger(state.onboardingTabId)) await chrome.tabs.update(state.onboardingTabId, {active: true});
    return false;
  }

  const onboardingTabId = state.onboardingTabId || (sender.tab && sender.tab.id);
  if (Number.isInteger(onboardingTabId)) await chrome.tabs.remove(onboardingTabId);
  await chrome.storage.local.set({onboardingReturnTabId: null, onboardingTabId: null});
  return true;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'STAI_OPEN_ONBOARDING') {
    openOnboarding().then(() => sendResponse({ok: true})).catch(() => sendResponse({ok: false}));
    return true;
  }

  if (message && message.type === 'STAI_START_PICKING_FROM_ONBOARDING') {
    returnFromOnboarding(sender, message.preferences, true).then((ok) => sendResponse({ok})).catch(() => sendResponse({ok: false}));
    return true;
  }

  if (message && message.type === 'STAI_DISMISS_ONBOARDING') {
    returnFromOnboarding(sender, null, false).then((ok) => sendResponse({ok})).catch(() => sendResponse({ok: false}));
    return true;
  }

  if (message && message.type === 'STAI_EXTRACTION') {
    const payload = {...message.payload};
    const capture = payload.capture;
    const language = message.language === 'en' ? 'en' : 'zh';
    delete payload.capture;
    chrome.storage.local.set({lastExtraction: payload, isPicking: false});

    if (sender.tab && Number.isInteger(sender.tab.id)) {
      chrome.tabs.sendMessage(sender.tab.id, {type: 'STAI_SHOW_CAPTURE_READY', title: payload.title, language}).catch(() => {});
    }

    if (capture && sender.tab && Number.isInteger(sender.tab.windowId)) {
      downloadSelectionCapture(sender.tab.windowId, capture, payload.title)
        .then((screenshotFileName) => chrome.storage.local.set({lastExtraction: {...payload, screenshotFileName}}))
        .catch(() => chrome.storage.local.set({lastExtraction: payload}));
    }
  }

  if (message && message.type === 'STAI_CANCELLED') chrome.storage.local.set({isPicking: false});
});
