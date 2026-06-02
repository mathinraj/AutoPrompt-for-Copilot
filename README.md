# AutoPrompt for Copilot

A Chrome & Firefox browser extension that automates batch prompting on [Microsoft Copilot](https://copilot.microsoft.com), [M365 Copilot](https://m365.cloud.microsoft/chat), and [GitHub Copilot](https://github.com/copilot). Run a series of prompts — one after another — without any manual copy-paste.

## Features

- **Three-platform support** — Works on Microsoft Copilot, M365 Copilot, and GitHub Copilot.
- **Sample Mode** — Pick from built-in prompt categories with 5700+ prompts across General Knowledge, Coding & Technology, Science, Math, and more. Select individual prompts via checkboxes.
- **Custom Mode** — Paste prompts directly (one per line) or upload a `.txt`, `.csv`, or `.json` file.
- **Configurable delay** — Choose from 0.1 s to 30 s between prompts, or set a custom delay. Sub-second options for rapid-fire batches.
- **Jump to prompt** — Start from any prompt number in a batch (e.g., resume from prompt #150).
- **Pause / Resume / Stop** — Full playback controls so you can intervene mid-batch.
- **Live progress** — Progress bar, prompt counter, and a live countdown ticker while the batch is running.
- **Page overlay** — A status overlay on the Copilot tab shows which prompt is active and how long until the next one.

## Supported File Formats (Custom Mode)

| Format | Expected structure |
|--------|--------------------|
| `.txt` | One prompt per line |
| `.csv` | Optional `prompt` / `query` / `question` header column; last column value used per row |
| `.json` | Array of strings, array of objects with `prompt`/`query`/`question` keys, or `{ "prompts": [...] }` |

## Installation

Install from your browser's extension store:

| Browser | Link |
|---------|------|
| Chrome | [Chrome Web Store](https://chromewebstore.google.com/detail/nkbdadodgidleldhealhlhndjcanhboo) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/autoprompt-for-copilot/) |
| Edge | Coming soon |

Or install manually from the latest release: [v1.2.0 on GitHub](https://github.com/mathinraj/AutoPrompt-for-Copilot/releases/tag/V1.2.0)

1. Download and extract the release ZIP from the link above.
2. Open Chrome/Edge and go to `chrome://extensions`, or Firefox and go to `about:debugging`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the extracted folder.
5. The **AutoPrompt for Copilot** icon will appear in your toolbar.

## Usage

1. Open [copilot.microsoft.com](https://copilot.microsoft.com), [m365.cloud.microsoft/chat](https://m365.cloud.microsoft/chat), or [github.com/copilot](https://github.com/copilot) in a tab.
2. Click the **AutoPrompt** extension icon.
3. Choose **Sample** or **Custom** mode and select/enter your prompts.
4. Set the desired delay between prompts.
5. Click **Start**.

The extension will automatically type and submit each prompt in the Copilot tab, waiting the configured delay between each one. Use **Pause**, **Resume**, or **Stop** at any time.

## Project Structure

```
copilot-batch-search/
│
│── Extension (load this folder as unpacked extension)
│
├── manifest.json              # Extension manifest (Manifest V3)
├── background/
│   └── background.js          # Service worker — batch orchestration & state
├── content/
│   └── content.js             # Content script — interacts with the Copilot page DOM
├── popup/
│   ├── popup.html             # Extension popup UI
│   ├── popup.js               # Popup logic (mode switching, controls, progress)
│   ├── popup.css              # Popup styles
│   └── parser.js              # File parser for .txt / .csv / .json prompt files
├── data/
│   └── sample-prompts.json    # Built-in prompt categories
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── logo.svg               # Brand logo (source)
├── landing/
│   ├── landing.html           # Post-install welcome page
│   └── landing.css
│
│── Marketing Site (deployed to Vercel)
│
├── site/
│   ├── index.html             # Public website (auto-prompt-for-copilot.vercel.app)
│   ├── style.css
│   ├── robots.txt
│   ├── sitemap.xml
│   └── (favicons & OG image)
│
└── README.md
```

## Permissions

| Permission | Reason |
|------------|--------|
| `storage` | Persist batch state across popup open/close |
| `tabs` | Find the active Copilot tab to target |
| `scripting` | Inject the content script if not already loaded |
| `host_permissions: copilot.microsoft.com, m365.cloud.microsoft/chat, github.com/copilot` | Interact with the Copilot page DOM |

## Requirements

- Google Chrome (or any Chromium-based browser supporting Manifest V3), or Mozilla Firefox
- An active session on [copilot.microsoft.com](https://copilot.microsoft.com), [m365.cloud.microsoft/chat](https://m365.cloud.microsoft/chat), or [github.com/copilot](https://github.com/copilot)

## Changelog

### v1.2.0

- Added **M365 Copilot** support (`m365.cloud.microsoft/chat`) — now works on three Copilot platforms
- **Jump to prompt** — start a batch from any prompt number (e.g., resume from #150)
- **Sub-second delays** — configurable delay as low as 0.1s; default changed from 5s to 1s
- **5700+ built-in prompts** — added Math Questions (250), Questions Set 1–5 (1000 each)
- Firefox extension support with matching feature parity
- Optimized prompt list rendering for large batches (1000+ prompts)

### v1.1.0

- Added **GitHub Copilot** support (`github.com/copilot`) alongside the existing Microsoft Copilot support
- Platform-aware input detection — automatically adapts to each site's DOM (textarea, contenteditable, or send button)
- Platform-aware response detection — monitors stop/cancel buttons and disabled send state on GitHub Copilot
- Extended timeouts for GitHub Copilot (90 s max, 12 s initial) to accommodate longer responses
- Updated popup tab finder to detect both Copilot platforms
- Updated landing page, marketing site, and README to reflect dual-platform support

### v1.0.0

- Initial release with Microsoft Copilot (`copilot.microsoft.com`) support
- Sample and Custom prompt modes
- File upload support (.txt, .csv, .json)
- Configurable delay, pause/resume/stop controls
- Live progress bar and page overlay
