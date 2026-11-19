<div align="center">

<img src="icons/icon128.png" alt="AutoPrompt for Copilot" width="96" height="96">

# AutoPrompt for Copilot

**Run batches of prompts on Copilot, one after another, hands-free.**<br>
No copy-paste. Pick from 5,700+ built-in prompts or bring your own.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/nkbdadodgidleldhealhlhndjcanhboo?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white&color=0d9488)](https://chromewebstore.google.com/detail/nkbdadodgidleldhealhlhndjcanhboo)
[![Firefox Add-ons](https://img.shields.io/amo/v/autoprompt-for-copilot?label=Firefox%20Add-ons&logo=firefoxbrowser&logoColor=white&color=0d9488)](https://addons.mozilla.org/en-US/firefox/addon/autoprompt-for-copilot/)
[![Latest release](https://img.shields.io/github/v/release/mathinraj/AutoPrompt-for-Copilot?label=Release&color=0d9488)](https://github.com/mathinraj/AutoPrompt-for-Copilot/releases/latest)

[Website](https://auto-prompt-for-copilot.vercel.app) · [What's New](https://auto-prompt-for-copilot.vercel.app/changelog.html) · [Send Feedback](https://auto-prompt-for-copilot.vercel.app/#feedback)

</div>

---

## Supported Platforms

| Platform | Where it runs |
|----------|---------------|
| Microsoft Copilot | [copilot.microsoft.com](https://copilot.microsoft.com) |
| Microsoft 365 Copilot | [m365.cloud.microsoft/chat](https://m365.cloud.microsoft/chat) and [copilot.cloud.microsoft](https://copilot.cloud.microsoft/chat) |
| GitHub Copilot | [github.com/copilot](https://github.com/copilot) |
| Teams Copilot | [teams.microsoft.com](https://teams.microsoft.com) and [outlook.office.com](https://outlook.office.com) |

## Features

- 📚 **5,700+ built-in prompts:** general knowledge, coding, science, business, math, and large 1,000-question sets. Tick the ones you want.
- ✍️ **Your own prompts:** paste them one per line, or import a `.txt`, `.csv`, or `.json` file. Save prompt sets to reuse later.
- ⏱️ **Adjustable pace:** wait anywhere from 0.1 to 300 seconds between prompts.
- ⏯️ **Full control:** pause, resume, or stop at any time, or start from any prompt number.
- 📊 **Live progress:** a progress bar and countdown in the popup, plus an overlay on the Copilot page showing which prompt is running.
- 🔔 **Update notices:** a small banner in the popup lets you know when a new version is out.

## Installation

**From your browser's store (recommended):**

- **Chrome:** [Chrome Web Store](https://chromewebstore.google.com/detail/nkbdadodgidleldhealhlhndjcanhboo)
- **Firefox:** [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/autoprompt-for-copilot/)

<details>
<summary><b>Install manually from GitHub</b></summary>

1. Download the ZIP for your browser from the [latest release](https://github.com/mathinraj/AutoPrompt-for-Copilot/releases/latest) and extract it.
2. **Chrome:** open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select the extracted folder.<br>
   **Firefox:** open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select `manifest.json` in the extracted folder.
3. Pin **AutoPrompt for Copilot** to your toolbar.

</details>

## How to Use

1. Open Copilot on any [supported platform](#supported-platforms) and sign in.
2. Click the **AutoPrompt** icon in your toolbar.
3. Choose **Sample** to pick built-in prompts, or **Custom** to paste or import your own.
4. Set the delay between prompts, and optionally the prompt number to start from.
5. Click **Start**.

AutoPrompt types and sends each prompt in the Copilot tab, waits for the answer, then moves on to the next one.

## Importing Prompts

| Format | What to put in the file |
|--------|-------------------------|
| `.txt` | One prompt per line |
| `.csv` | One prompt per row. An optional `prompt`, `query`, or `question` header is supported. |
| `.json` | An array of strings, an array of objects with a `prompt`, `query`, or `question` key, or `{ "prompts": [...] }` |

## Privacy

AutoPrompt runs entirely in your browser. It has no account, no analytics, and doesn't send your prompts or Copilot's answers anywhere.

- It only works on the Copilot sites listed above, where it needs access to type prompts and detect answers.
- Prompt sets you save are kept in your browser's local storage.
- Once a day, it asks GitHub for the latest version number to show update notices. Nothing about you is sent.

## Feedback

Found a bug or have an idea? [Send feedback on the website](https://auto-prompt-for-copilot.vercel.app/#feedback). Every message is read.

<div align="center">
<br>
Built by <a href="https://www.linkedin.com/in/mathinraj/">Mathinraj</a> 💚
</div>
