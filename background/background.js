// Open the landing page on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('landing/landing.html') });
  }
});

let queue = [];
let tabId = null;
let delay = 5;
let currentIndex = 0;
let isPaused = false;
let isRunning = false;
let popupPort = null;
let nextPromptAt = 0; // timestamp when next prompt fires

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'autoprompt') return;
  popupPort = port;

  port.onMessage.addListener((msg) => {
    switch (msg.action) {
      case 'startBatch':
        queue = msg.prompts;
        delay = msg.delay;
        tabId = msg.tabId;
        currentIndex = 0;
        isPaused = false;
        isRunning = true;
        nextPromptAt = 0;
        sendToPopup({ action: 'stateUpdate', ...getState() });
        startExecution();
        break;

      case 'pauseBatch':
        isPaused = true;
        nextPromptAt = 0;
        sendOverlay('Batch paused');
        sendToPopup({ action: 'stateUpdate', ...getState() });
        break;

      case 'resumeBatch':
        isPaused = false;
        sendToPopup({ action: 'stateUpdate', ...getState() });
        runNext();
        break;

      case 'stopBatch':
        isRunning = false;
        isPaused = false;
        queue = [];
        currentIndex = 0;
        nextPromptAt = 0;
        sendOverlay(null);
        sendToPopup({ action: 'stateUpdate', ...getState() });
        break;

      case 'getState':
        sendToPopup({ action: 'stateUpdate', ...getState() });
        break;
    }
  });

  port.onDisconnect.addListener(() => {
    if (popupPort === port) popupPort = null;
  });

  sendToPopup({ action: 'stateUpdate', ...getState() });
});

function getState() {
  const secondsLeft = nextPromptAt > 0
    ? Math.max(0, Math.ceil((nextPromptAt - Date.now()) / 1000))
    : 0;
  return { isRunning, isPaused, currentIndex, total: queue.length, secondsLeft, delay };
}

function sendToPopup(msg) {
  try {
    if (popupPort) popupPort.postMessage(msg);
  } catch {}
}

function sendOverlay(text) {
  if (!tabId) return;
  try {
    chrome.tabs.sendMessage(tabId, { action: 'overlay', text });
  } catch {}
}

setInterval(() => {
  if (isRunning && !isPaused && nextPromptAt > 0) {
    const state = getState();
    sendToPopup({ action: 'tick', ...state });
    if (state.secondsLeft > 0) {
      sendOverlay(`Batch ${currentIndex} / ${queue.length}  ·  Next in ${state.secondsLeft}s`);
    }
  }
}, 1000);

function waitForTabComplete(tid, timeoutMs = 15000) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; chrome.tabs.onUpdated.removeListener(listener); resolve(false); }
    }, timeoutMs);
    function listener(updatedId, info) {
      if (updatedId === tid && info.status === 'complete' && !settled) {
        settled = true;
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function pingTab(tid) {
  try {
    const resp = await chrome.tabs.sendMessage(tid, { action: 'ping' });
    if (resp && resp.pong) return true;
  } catch {}
  return false;
}

async function ensureContentScript(tid) {
  if (await pingTab(tid)) return true;

  // Try programmatic injection
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tid },
      files: ['content/content.js']
    });
    await new Promise(r => setTimeout(r, 500));
    if (await pingTab(tid)) return true;
  } catch {}

  // Last resort: reload the tab, wait for it to fully load, then retry with backoff
  try {
    sendToPopup({ action: 'batchError', error: 'Injecting content script — refreshing the Copilot tab...' });
    await chrome.tabs.reload(tid);
    await waitForTabComplete(tid, 15000);
    await new Promise(r => setTimeout(r, 1500));
    if (await pingTab(tid)) return true;

    // Retry injection after reload in case manifest content_scripts didn't fire
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tid },
        files: ['content/content.js']
      });
      await new Promise(r => setTimeout(r, 500));
      if (await pingTab(tid)) return true;
    } catch {}
  } catch {}

  return false;
}

async function startExecution() {
  try {
    const alive = await ensureContentScript(tabId);
    if (!alive) {
      sendToPopup({
        action: 'batchError',
        error: 'Content script not ready. Please manually refresh the Copilot tab (Ctrl+R) and click Start again.'
      });
      isRunning = false;
      return;
    }
    await runNext();
  } catch (err) {
    sendToPopup({ action: 'batchError', error: 'Setup failed: ' + err.message });
    isRunning = false;
  }
}

async function runNext() {
  if (!isRunning || isPaused) return;

  nextPromptAt = 0;

  if (currentIndex >= queue.length) {
    isRunning = false;
    sendOverlay('Batch complete!');
    setTimeout(() => sendOverlay(null), 3000);
    sendToPopup({ action: 'stateUpdate', ...getState() });
    sendToPopup({ action: 'batchDone', total: queue.length });
    return;
  }

  sendToPopup({ action: 'stateUpdate', ...getState() });
  sendToPopup({ action: 'promptProgress', current: currentIndex, total: queue.length });
  sendOverlay(`Running prompt ${currentIndex + 1} of ${queue.length}...`);

  try {
    const result = await chrome.tabs.sendMessage(tabId, {
      action: 'runPrompt',
      text: queue[currentIndex]
    });

    if (result && !result.ok) {
      sendToPopup({ action: 'batchError', error: result.error });
    }

    try {
      await chrome.tabs.sendMessage(tabId, { action: 'waitForResponse' });
    } catch {}

  } catch (err) {
    sendToPopup({ action: 'batchError', error: err.message });
  }

  currentIndex++;

  if (currentIndex >= queue.length) {
    isRunning = false;
    nextPromptAt = 0;
    sendOverlay('Batch complete!');
    setTimeout(() => sendOverlay(null), 3000);
    sendToPopup({ action: 'stateUpdate', ...getState() });
    sendToPopup({ action: 'batchDone', total: queue.length });
    return;
  }

  if (!isPaused && isRunning) {
    nextPromptAt = Date.now() + delay * 1000;
    sendToPopup({ action: 'stateUpdate', ...getState() });
    setTimeout(runNext, delay * 1000);
  }
}
