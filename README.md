# Steal to AI

**Steal the interface, not the screenshot.**

Steal to AI is a Chrome Manifest V3 extension that turns a visible webpage element into clean, portable HTML/CSS. Select a button, card, text block, or layout fragment, then paste the result into Cursor, Claude, Codex, ChatGPT, or your own project.

[Give the project a star on GitHub](https://github.com/PCIEARIA/Steal-to-AI)

## What it does

- Selects a visible DOM element directly from an ordinary webpage.
- Produces cleaned HTML plus computed CSS instead of a vague screenshot reference.
- Can preserve interaction rules and animation information, or export static-only CSS.
- Offers two focused exports for each selected UI component: direct HTML/CSS or an AI component prompt that tells an AI to add only that component to an existing project.
- Keeps SVG filter IDs and their `filter` / `backdrop-filter` references, so effects such as liquid-glass refraction and reflection remain portable.
- Adds an AI reconstruction instruction to every component export: ask whether liquid glass is needed first; when confirmed, use [liquid-glass-webgl](https://github.com/martin65536/liquid-glass-webgl) only as an implementation reference and adapt the necessary WebGL techniques into the user's existing project.
- Adds an explicit AI interaction hint when the selected component exposes a draggable surface.
- Promotes a full-size absolute base layer to its containing composite card, so overlaid effects are not left behind when selecting card text.
- Optionally saves a pixel-accurate PNG crop of the selected region to Downloads.
- Removes source scripts, event handlers, tracking attributes, and other page noise from the export.

## Install in Chrome

No build step, package manager, or Chrome Web Store upload is required. The installable extension is already in [`extension/`](extension/).

1. Download or clone this repository:

   ```bash
   git clone https://github.com/PCIEARIA/Steal-to-AI.git
   ```

2. Open `chrome://extensions` in Google Chrome.
3. Turn on **Developer mode**.
4. Select **Load unpacked**.
5. Choose `Steal-to-AI/extension` — **not** the repository root.
6. Pin **Steal to AI** from Chrome's Extensions menu.

You should now see **Steal to AI**, version `0.1.9`, enabled in the Extensions page. After source changes, open `chrome://extensions`, press Reload on the extension, then refresh the webpage you are testing.

## Quick install for AI coding agents

This repository is intentionally loadable without a build tool. If you are an AI agent helping someone install the project locally, use this checklist:

1. Clone or download the repository to a local folder the user can access.
2. Tell the user to open `chrome://extensions`, enable **Developer mode**, and click **Load unpacked**.
3. Select the exact local folder `<repository>/extension`.
4. Confirm that the extension card says **Steal to AI** and is enabled.
5. Open any normal `http` or `https` page and test the **開始選取** / **Start picking** button.

Chrome requires the person using the browser to approve loading an unpacked extension. Agents should never ask users to install arbitrary files or select a folder other than this repository's `extension/` directory.

### Copy-paste prompt for an AI agent

```text
Install the local Steal to AI Chrome extension for me. Do not build it and do not choose the repository root. In Chrome, open chrome://extensions, enable Developer mode, use Load unpacked, and select the project's extension folder. Then confirm that Steal to AI is enabled. After any source update, reload the extension and refresh the test webpage.
```

## Use it

1. Open a normal `http` or `https` webpage.
2. Open Steal to AI and choose your language on first launch.
3. Press **開始選取** / **Start picking**. The small panel closes before selection mode starts, so your next click is the element you want.
4. Hover to preview an element, then click once to capture it. Press `Esc` to cancel.
5. Reopen Steal to AI and choose **複製程式碼** / **Copy code** for direct HTML/CSS, or **複製元件提示詞** / **Copy component prompt** to copy a scoped instruction that tells your AI to add only the selected UI component to your existing project. You can also preview the generated code or change export settings.
6. For an AI that needs the complete page context, use **究極模式 → 下載完整網站包** / **Ultimate mode → Download full page package**. It downloads one offline HTML snapshot with the rendered DOM, accessible CSS, images, CSS background assets, and external JavaScript source preserved as inert reference text. Resources that cannot be fetched safely stay linked and are noted in the download notification.

Every component-code export starts with an AI instruction. Your AI must first ask whether the selected asset needs **liquid glass**. If you confirm it does, [liquid-glass-webgl](https://github.com/martin65536/liquid-glass-webgl) is only a technical reference: the AI should adapt the smallest needed WebGL techniques into your existing project, not copy the repository or replace your project's stack. Otherwise it should reconstruct only from the captured HTML/CSS that follows.

## Update checks

When the popup opens, Steal to AI checks the public extension manifest on GitHub. If a newer version is available, it shows the version and a **前往更新** / **Get update** button. The button opens the project page so you can fetch the latest `extension/` folder.

Because this is an unpacked developer install, Chrome still requires you to press **Reload** on `chrome://extensions` after replacing the local files. A Chrome Web Store install can update itself automatically after publication.

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
- A drag hint tells your AI to recreate pointer interaction, but the extension never copies a source site's event code directly.

## Development

```bash
npm test
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/demo/first-run.html` to preview the onboarding, or `http://127.0.0.1:4173/demo/` for the interactive picker demo.

## License

Copyright © 2026 PCIEARIA.

Licensed under the [GNU General Public License v3.0 only](LICENSE).
