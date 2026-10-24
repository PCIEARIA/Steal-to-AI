# Steal to AI

**Steal the interface, not the screenshot.**

Steal to AI is a Chrome Manifest V3 extension that turns a visible webpage element into clean, portable HTML/CSS. Select a button, card, text block, or layout fragment, then paste the result into Cursor, Claude, Codex, ChatGPT, or your own project.

[Give the project a star on GitHub](https://github.com/PCIEARIA/Steal-to-AI)

## What it does

- Selects a visible DOM element directly from an ordinary webpage.
- Produces cleaned HTML plus computed CSS instead of a vague screenshot reference.
- Can preserve interaction rules and animation information, or export static-only CSS.
- Optionally saves a pixel-accurate PNG crop of the selected region to Downloads.
- Removes source scripts, event handlers, tracking attributes, and other page noise from the export.

## Install in Chrome

1. Download or clone this repository.
2. Open `chrome://extensions` in Google Chrome.
3. Turn on **Developer mode**.
4. Select **Load unpacked**.
5. Choose the repository's `extension` folder.
6. Pin **Steal to AI** from Chrome's Extensions menu.

After source changes, open `chrome://extensions` and press Reload on the extension.

## Use it

1. Open a normal `http` or `https` webpage.
2. Open Steal to AI and choose your language on first launch.
3. Press **開始使用** / **Start using**. The onboarding tab closes and selection mode starts on your original tab.
4. Hover to preview an element, then click to capture it. Press `Esc` to cancel.
5. Reopen Steal to AI and press **複製** / **Copy** to put the HTML/CSS on your clipboard.

## Export modes

| Mode | What is exported |
| --- | --- |
| Smart | Adds hover, focus, active, animation, and pseudo-element details only when available. |
| Include all | Tries to retain every accessible interaction rule. |
| Static only | Omits animation, transitions, and interactive states. |

## Screenshot reference

Enable **儲存選取區域截圖** / **Save selected-area screenshot** in the compact panel to download a PNG crop of the visible selected area to Chrome's default Downloads folder.

## Limits

- Chrome internal pages, the Chrome Web Store, PDFs, browser-native controls, canvas pixels, and closed shadow DOM cannot be selected.
- Cross-origin iframe interiors are excluded.
- Image URLs remain remote URLs; they are not embedded or downloaded.
- Steal to AI reproduces presentation HTML/CSS. It intentionally does not copy source-site JavaScript behaviour, analytics, event handlers, or credentials.

## Development

```bash
npm test
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/demo/first-run.html` to preview the onboarding, or `http://127.0.0.1:4173/demo/` for the interactive picker demo.

## License

Copyright © 2026 PCIEARIA.

Licensed under the [GNU General Public License v3.0 only](LICENSE).
