let currentMode = 'sample';
let sampleData = null;
let currentPrompts = [];
let isRunning = false;
let isPaused = false;
let currentIndex = 0;
let totalPrompts = 0;
const $ = id => document.getElementById(id);

const port = browser.runtime.connect({ name: 'autoprompt' });

port.onMessage.addListener((msg) => {
  switch (msg.action) {
    case 'stateUpdate':
      applyState(msg);
      break;
    case 'tick':
      updateCountdown(msg.secondsLeft);
      break;
    case 'promptProgress':
      currentIndex = msg.current;
      totalPrompts = msg.total;
      updateProgress(msg.current, msg.total);
      showStatus(`Running prompt ${msg.current + 1} of ${msg.total}...`, 'info');
      break;
    case 'batchDone':
      isRunning = false;
      updateCountdown(0);
      updateProgress(msg.total, msg.total);
      showIdleUI();
      showStatus(`Done! ${msg.total} prompts completed.`, 'success');
      break;
    case 'batchError':
      showStatus(`Error: ${msg.error}`, 'error');
      break;
  }
});

function updateCountdown(seconds) {
  const el = $('countdown');
  if (seconds > 0) {
    el.textContent = `Next in ${seconds}s`;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

$('btn-sample').addEventListener('click', () => switchMode('sample'));
$('btn-custom').addEventListener('click', () => switchMode('custom'));

function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  $(`btn-${mode}`).classList.add('active');
  $('panel-sample').classList.toggle('active', mode === 'sample');
  $('panel-custom').classList.toggle('active', mode === 'custom');
}

async function loadSamplePrompts() {
  const res = await fetch(browser.runtime.getURL('data/sample-prompts.json'));
  sampleData = await res.json();

  const select = $('category-select');
  sampleData.categories.forEach((cat, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });

  renderPromptList(0);
}

$('category-select').addEventListener('change', (e) => {
  renderPromptList(parseInt(e.target.value));
});

function renderPromptList(catIndex) {
  const list = $('prompt-list');
  const prompts = sampleData.categories[catIndex].prompts;
  list.innerHTML = '';

  prompts.forEach((prompt, i) => {
    const item = document.createElement('div');
    item.className = 'prompt-item';
    item.innerHTML = `
      <input type="checkbox" checked data-index="${i}" class="sample-check">
      <span title="${prompt}">${prompt}</span>
    `;
    list.appendChild(item);
  });

  updateSampleCount();
}

$('prompt-list').addEventListener('change', updateSampleCount);

function updateSampleCount() {
  const checked = document.querySelectorAll('.sample-check:checked').length;
  $('sample-count').textContent = checked;
}

function getSelectedSamplePrompts() {
  const catIndex = parseInt($('category-select').value);
  const prompts = sampleData.categories[catIndex].prompts;
  const checked = document.querySelectorAll('.sample-check:checked');
  return Array.from(checked).map(cb => prompts[parseInt(cb.dataset.index)]);
}

$('file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  $('file-name').textContent = file.name;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const prompts = PromptParser.parseFile(ev.target.result, file.name);
      $('custom-prompts').value = prompts.join('\n');
      updateCustomCount();
    } catch (err) {
      showStatus(`Failed to parse file: ${err.message}`, 'error');
    }
  };
  reader.readAsText(file);
});

$('custom-prompts').addEventListener('input', updateCustomCount);

function updateCustomCount() {
  const lines = $('custom-prompts').value.split('\n').filter(l => l.trim().length > 0);
  $('custom-count').textContent = lines.length;
}

function getCustomPrompts() {
  return $('custom-prompts').value
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

$('delay-select').addEventListener('change', (e) => {
  $('custom-delay').classList.toggle('hidden', e.target.value !== 'custom');
});

function getDelay() {
  const val = $('delay-select').value;
  if (val === 'custom') {
    const custom = parseInt($('custom-delay-input').value);
    return (isNaN(custom) || custom < 1) ? 5 : Math.min(custom, 300);
  }
  return parseInt(val);
}

$('btn-save-prompts').addEventListener('click', saveCustomPrompts);
$('btn-load-prompts').addEventListener('click', toggleSavedPanel);
$('btn-close-saved').addEventListener('click', () => {
  $('saved-prompts-panel').classList.add('hidden');
});

async function saveCustomPrompts() {
  const prompts = getCustomPrompts();
  if (prompts.length === 0) {
    showStatus('No prompts to save.', 'error');
    return;
  }

  const name = prompt('Name for this prompt set:', `My Prompts (${prompts.length})`);
  if (!name) return;

  const result = await browser.storage.local.get('savedPrompts');
  const savedPrompts = result.savedPrompts || [];
  savedPrompts.push({
    id: Date.now(),
    name: name.trim(),
    prompts,
    date: new Date().toLocaleDateString()
  });
  await browser.storage.local.set({ savedPrompts });
  showStatus(`Saved "${name.trim()}" (${prompts.length} prompts).`, 'success');
  renderSavedPrompts(savedPrompts);
  $('saved-prompts-panel').classList.remove('hidden');
}

async function toggleSavedPanel() {
  const panel = $('saved-prompts-panel');
  if (!panel.classList.contains('hidden')) {
    panel.classList.add('hidden');
    return;
  }
  const result = await browser.storage.local.get('savedPrompts');
  const savedPrompts = result.savedPrompts || [];
  renderSavedPrompts(savedPrompts);
  panel.classList.remove('hidden');
}

function renderSavedPrompts(list) {
  const container = $('saved-prompts-list');
  if (list.length === 0) {
    container.innerHTML = '<div class="saved-empty">No saved prompts yet</div>';
    return;
  }
  container.innerHTML = list.map(item => `
    <div class="saved-item" data-id="${item.id}">
      <div class="saved-item-info" data-id="${item.id}">
        <span class="saved-item-name">${item.name}</span>
        <span class="saved-item-meta">${item.prompts.length} prompts · ${item.date}</span>
      </div>
      <div class="saved-item-actions">
        <button class="saved-item-btn load" data-id="${item.id}" title="Load">▶</button>
        <button class="saved-item-btn delete" data-id="${item.id}" title="Delete">🗑</button>
      </div>
    </div>
  `).join('');
}

$('saved-prompts-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('.saved-item-btn');
  const info = e.target.closest('.saved-item-info');
  if (!btn && !info) return;

  const id = parseInt((btn || info).dataset.id);
  const result = await browser.storage.local.get('savedPrompts');
  const savedPrompts = result.savedPrompts || [];
  const item = savedPrompts.find(s => s.id === id);

  if (btn && btn.classList.contains('delete')) {
    const updated = savedPrompts.filter(s => s.id !== id);
    await browser.storage.local.set({ savedPrompts: updated });
    renderSavedPrompts(updated);
    showStatus('Deleted.', 'info');
    return;
  }

  if (item) {
    $('custom-prompts').value = item.prompts.join('\n');
    updateCustomCount();
    $('saved-prompts-panel').classList.add('hidden');
    showStatus(`Loaded "${item.name}" (${item.prompts.length} prompts).`, 'success');
  }
});

$('btn-start').addEventListener('click', startBatch);
$('btn-pause').addEventListener('click', pauseBatch);
$('btn-resume').addEventListener('click', resumeBatch);
$('btn-stop').addEventListener('click', stopBatch);

async function findCopilotTab() {
  const allTabs = await browser.tabs.query({});
  return allTabs.find(t => t.url && (
    t.url.includes('copilot.microsoft.com') ||
    t.url.includes('m365.cloud.microsoft/chat') ||
    (t.url.includes('github.com/copilot') && !t.url.includes('github.com/copilot-'))
  )) || null;
}

function getCopilotPlatformName(tab) {
  if (tab && tab.url) {
    if (tab.url.includes('github.com/copilot')) return 'GitHub Copilot';
    if (tab.url.includes('m365.cloud.microsoft/chat')) return 'M365 Copilot';
  }
  return 'Microsoft Copilot';
}

async function startBatch() {
  currentPrompts = currentMode === 'sample'
    ? getSelectedSamplePrompts()
    : getCustomPrompts();

  if (currentPrompts.length === 0) {
    showStatus('No prompts to run. Add or select prompts first.', 'error');
    return;
  }

  const tab = await findCopilotTab();
  if (!tab) {
    showStatus('Copilot tab not found. Open copilot.microsoft.com, m365.cloud.microsoft/chat, or github.com/copilot in a tab first.', 'error');
    return;
  }

  isRunning = true;
  isPaused = false;
  currentIndex = 0;
  totalPrompts = currentPrompts.length;

  showRunningUI();
  updateProgress(0, totalPrompts);
  showStatus('Starting...', 'info');

  port.postMessage({
    action: 'startBatch',
    prompts: currentPrompts,
    delay: getDelay(),
    tabId: tab.id
  });
}

function pauseBatch() {
  isPaused = true;
  updateCountdown(0);
  port.postMessage({ action: 'pauseBatch' });
  $('btn-pause').classList.add('hidden');
  $('btn-resume').classList.remove('hidden');
  showStatus('Paused.', 'info');
}

function resumeBatch() {
  isPaused = false;
  port.postMessage({ action: 'resumeBatch' });
  $('btn-resume').classList.add('hidden');
  $('btn-pause').classList.remove('hidden');
  showStatus('Resumed...', 'info');
}

function stopBatch() {
  isRunning = false;
  isPaused = false;
  updateCountdown(0);
  port.postMessage({ action: 'stopBatch' });
  showIdleUI();
  showStatus('Stopped.', 'info');
}

function applyState(state) {
  isRunning = state.isRunning;
  isPaused = state.isPaused;
  currentIndex = state.currentIndex;
  totalPrompts = state.total;

  if (isRunning) {
    showRunningUI();
    updateProgress(currentIndex, totalPrompts);
    updateCountdown(state.secondsLeft || 0);
    if (isPaused) {
      updateCountdown(0);
      $('btn-pause').classList.add('hidden');
      $('btn-resume').classList.remove('hidden');
      showStatus('Paused.', 'info');
    } else {
      $('btn-pause').classList.remove('hidden');
      $('btn-resume').classList.add('hidden');
      showStatus(`Running prompt ${currentIndex + 1} of ${totalPrompts}...`, 'info');
    }
  } else {
    showIdleUI();
    updateCountdown(0);
    if (totalPrompts > 0 && currentIndex >= totalPrompts) {
      $('progress-section').classList.remove('hidden');
      updateProgress(totalPrompts, totalPrompts);
      showStatus(`Done! ${totalPrompts} prompts completed.`, 'success');
    }
  }
}

function showRunningUI() {
  $('btn-start').classList.add('hidden');
  $('btn-pause').classList.remove('hidden');
  $('btn-stop').classList.remove('hidden');
  $('btn-resume').classList.add('hidden');
  $('progress-section').classList.remove('hidden');
}

function showIdleUI() {
  $('btn-start').classList.remove('hidden');
  $('btn-pause').classList.add('hidden');
  $('btn-stop').classList.add('hidden');
  $('btn-resume').classList.add('hidden');
}

function updateProgress(current, total) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  $('progress-bar').style.width = `${pct}%`;
  $('progress-label').textContent = `${current} / ${total} prompts`;
}

function showStatus(text, type) {
  const el = $('status');
  el.textContent = text;
  el.className = `status ${type}`;
  el.classList.remove('hidden');
}

loadSamplePrompts();
