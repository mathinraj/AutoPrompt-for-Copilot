# AutoPrompt for Copilot

A Chrome browser extension that automates batch prompting on [Microsoft Copilot](https://copilot.microsoft.com). Run a series of prompts — one after another — without any manual copy-paste.

## Features

- **Sample Mode** — Pick from built-in prompt categories (General Knowledge, Coding & Technology, Science & Research, Business & Productivity, and more). Select individual prompts via checkboxes.
- **Custom Mode** — Paste prompts directly (one per line) or upload a `.txt`, `.csv`, or `.json` file.
- **Configurable delay** — Choose a wait time between prompts (3 s, 5 s, 10 s, 15 s, or 30 s) to let Copilot finish responding before the next one fires.
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

> The extension is not yet published to the Chrome Web Store. Load it as an unpacked extension.

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the root folder of this repository.
5. The **AutoPrompt for Copilot** icon will appear in your toolbar.

## Usage

1. Open [copilot.microsoft.com](https://copilot.microsoft.com) in a tab.
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
| `host_permissions: copilot.microsoft.com` | Interact with the Copilot page DOM |

## Requirements

- Google Chrome (or any Chromium-based browser supporting Manifest V3)
- An active session on [copilot.microsoft.com](https://copilot.microsoft.com)
