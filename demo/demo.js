import { extractElement } from '../src/extractor.js';
import { startPicker } from '../src/picker.js';

const startButton = document.querySelector('#start-picker');
const copyButton = document.querySelector('#copy-code');
const status = document.querySelector('#status');
const codeOutput = document.querySelector('#code-output');
const resultTitle = document.querySelector('#result-title');
let generated = '';
let activePicker = null;

function setStatus(message) {
  status.textContent = message;
}

function renderExtraction(element) {
  const result = extractElement(element);
  generated = result.html + '\n\n<style>\n' + result.css + '\n</style>';
  resultTitle.textContent = result.title;
  codeOutput.textContent = generated;
  copyButton.disabled = false;
  setStatus('Captured ' + result.title + '. Ready to copy.');
}

function startPicking() {
  if (activePicker) activePicker.stop();
  setStatus('Pick an element on the preview. Press Esc to cancel.');
  startButton.textContent = 'Picking…';
  startButton.disabled = true;
  activePicker = startPicker({
    onPick(element) {
      activePicker = null;
      startButton.innerHTML = '<span aria-hidden="true">⌖</span> Start picking';
      startButton.disabled = false;
      renderExtraction(element);
    },
    onCancel() {
      activePicker = null;
      startButton.innerHTML = '<span aria-hidden="true">⌖</span> Start picking';
      startButton.disabled = false;
      setStatus('Selection cancelled.');
    }
  });
}

startButton.addEventListener('click', startPicking);

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(generated);
    copyButton.textContent = 'Copied';
    setStatus('Clean HTML/CSS copied to your clipboard.');
    window.setTimeout(() => { copyButton.textContent = 'Copy'; }, 1400);
  } catch {
    setStatus('Clipboard access was blocked. Select the code and copy it manually.');
  }
});

if (new URLSearchParams(window.location.search).has('startPicking')) startPicking();
