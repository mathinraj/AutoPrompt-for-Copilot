browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    browser.tabs.create({ url: browser.runtime.getURL('landing/landing.html') });
  }
});

let queue = [];
let tabId = null;
let delay = 5;
let currentIndex = 0;
let isPaused = false;
let isRunning = false;
let popupPort = null;
let nextPromptAt = 0;

browser.runtime.onConnect.addListener((port) => {
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
  browser.tabs.sendMessage(tabId, { action: 'overlay', text }).catch(() => {});
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

async function ensureContentScript(tid) {
  try {
    const resp = await browser.tabs.sendMessage(tid, { action: 'ping' });
    if (resp && resp.pong) return true;
  } catch {}

  try {
    await browser.tabs.executeScript(tid, { file: 'content/content.js' });
    await new Promise(r => setTimeout(r, 500));
    const resp = await browser.tabs.sendMessage(tid, { action: 'ping' });
    if (resp && resp.pong) return true;
  } catch {}

  // Last resort: reload the tab so content scripts auto-inject, then retry
  try {
    sendToPopup({ action: 'batchError', error: 'Injecting content script — refreshing the Copilot tab...' });
    await browser.tabs.reload(tid);
    await new Promise(r => setTimeout(r, 3000));
    const resp = await browser.tabs.sendMessage(tid, { action: 'ping' });
    if (resp && resp.pong) return true;
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
    const result = await browser.tabs.sendMessage(tabId, {
      action: 'runPrompt',
      text: queue[currentIndex]
    });

    if (result && !result.ok) {
      sendToPopup({ action: 'batchError', error: result.error });
    }

    try {
      await browser.tabs.sendMessage(tabId, { action: 'waitForResponse' });
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
