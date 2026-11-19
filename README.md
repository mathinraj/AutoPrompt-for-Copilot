# AutoPrompt for Copilot

A Chrome & Firefox browser extension that automates batch prompting on [Microsoft Copilot](https://copilot.microsoft.com), [M365 Copilot](https://m365.cloud.microsoft/chat) (including [copilot.cloud.microsoft](https://copilot.cloud.microsoft/chat)), [GitHub Copilot](https://github.com/copilot), and [Teams Copilot](https://teams.microsoft.com). Run a series of prompts — one after another — without any manual copy-paste.

## Features

- **Four-platform support** — Works on Microsoft Copilot, M365 Copilot, GitHub Copilot, and Teams Copilot.
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

Or install manually from the latest release: [v1.4.5 on GitHub](https://github.com/mathinraj/AutoPrompt-for-Copilot/releases/tag/V1.4.5)

1. Download and extract the release ZIP from the link above.
2. Open Chrome/Edge and go to `chrome://extensions`, or Firefox and go to `about:debugging`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the extracted folder.
5. The **AutoPrompt for Copilot** icon will appear in your toolbar.

## Usage

1. Open [copilot.microsoft.com](https://copilot.microsoft.com), [m365.cloud.microsoft/chat](https://m365.cloud.microsoft/chat), [copilot.cloud.microsoft](https://copilot.cloud.microsoft/chat), [github.com/copilot](https://github.com/copilot), or [Teams Copilot](https://teams.microsoft.com) in a tab.
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
│   ├── parser.js              # File parser for .txt / .csv / .json prompt files
│   └── update-check.js        # Shows a banner when a newer GitHub release exists
├── data/
│   └── prompts/
│       ├── index.json         # Built-in category list (name, file, count)
│       └── *.json             # One file per category, loaded on selection
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
| `host_permissions: copilot.microsoft.com, m365.cloud.microsoft/chat, copilot.cloud.microsoft, github.com/copilot, teams.microsoft.com, outlook.office.com` | Interact with the Copilot page DOM |

The popup also calls the public GitHub API (`api.github.com/repos/mathinraj/AutoPrompt-for-Copilot/releases/latest`) at most once a day to check for updates. No user data is sent, and no extra permission is needed because the GitHub API allows cross-origin requests.

## Update Notifications

When the popup opens, `popup/update-check.js` reads the latest published GitHub release (drafts and pre-releases are ignored) and compares its tag (`v1.4.5`, `V1.4.5`, or `1.4.5`) with the installed version. If the release is newer, the popup shows a banner with an **Update** link to the browser's store page and a **What's new** link to the release notes. Users can dismiss the banner; it reappears only for a later version.

- **Store review delay:** GitHub releases are published as soon as the build is submitted to the stores, but store review takes time. The banner therefore stays hidden until the release is **24 hours old** (`RELEASE_GRACE_MS`), and it reminds users that store updates can take a few days to arrive.
- **Caching:** the result is cached for 24 hours (`CHECK_INTERVAL_MS`). A failed check (offline, or GitHub's 60-requests-per-hour anonymous limit) falls back to the last cached result without blocking the popup.

**Releasing a new version:**

1. Bump `version` in `manifest.json` and `firefox/manifest.json`, then run `./package.sh`.
2. Upload the zips to the Chrome Web Store and Firefox Add-ons.
3. Publish a GitHub release whose tag matches the version (e.g. `v1.5.0`). Users on older versions will see the update banner one day later.

## Requirements

- Google Chrome (or any Chromium-based browser supporting Manifest V3), or Mozilla Firefox
- An active session on [copilot.microsoft.com](https://copilot.microsoft.com), [m365.cloud.microsoft/chat](https://m365.cloud.microsoft/chat), [copilot.cloud.microsoft](https://copilot.cloud.microsoft/chat), [github.com/copilot](https://github.com/copilot), or [Teams Copilot](https://teams.microsoft.com)

## Changelog

### v1.4.5

- **Faster popup:** built-in prompts are now split into one file per category (`data/prompts/`); the popup loads a small category index on open and fetches only the selected category, instead of parsing all 5,800+ prompts every time
- Loaded categories are cached for the rest of the popup session, so switching back is instant
- Shows a "Loading prompts..." placeholder while a category loads, and an error message (with retry on next selection) if it fails
- Quickly switching categories no longer risks showing a stale list from an earlier selection
- **Update notifications:** the popup checks the latest GitHub release (at most once a day) and shows a dismissible banner with store and release-notes links when a newer version is available; the banner waits one day after the release to allow for store review

### v1.4.0

- Added support for **Microsoft 365 Copilot Chat** on the new `copilot.cloud.microsoft` domain (e.g. `copilot.cloud.microsoft/chat`)
- Handled as M365 Copilot — reuses the same input, send-button, and response detection as `m365.cloud.microsoft/chat`
- Added `copilot.cloud.microsoft` to host permissions and content script matches (Chrome and Firefox)
- Updated popup tab finder, platform naming, and "Copilot tab not found" error message to include the new domain
### v1.3.0

- Added **Teams Copilot** support — now works on four Copilot platforms (Microsoft Copilot, M365 Copilot, GitHub Copilot, and Teams Copilot)
- Teams Copilot runs on `outlook.office.com` (Microsoft Teams web app); auto-detected via hostname
- Resilient input detection for Teams' Fluent UI editor (`#m365-chat-editor-target-element`) with retry logic for SPA rendering delays
- Uses `execCommand('insertText')` for proper Lexical/Fluent UI state management in Teams
- Updated popup tab finder, platform naming, and error messages for Teams

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
