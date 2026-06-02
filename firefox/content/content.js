(() => {
  function isGitHubCopilot() {
    return location.hostname === 'github.com' && location.pathname.startsWith('/copilot');
  }

  function isMicrosoftCopilot() {
    return location.hostname === 'copilot.microsoft.com';
  }

  function isM365Copilot() {
    return location.hostname === 'm365.cloud.microsoft' && location.pathname.startsWith('/chat');
  }

  let overlay = null;

  function getOverlay() {
    if (overlay && document.body.contains(overlay)) return overlay;
    overlay = document.createElement('div');
    overlay.id = '__autoprompt-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '12px',
      right: '12px',
      zIndex: '2147483647',
      background: '#0f172a',
      color: '#2dd4bf',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '13px',
      fontWeight: '600',
      padding: '8px 14px',
      borderRadius: '10px',
      border: '1px solid #1e293b',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      display: 'none',
      pointerEvents: 'none',
      transition: 'opacity 0.3s',
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function showOverlay(text) {
    const el = getOverlay();
    el.textContent = text;
    el.style.display = 'block';
    el.style.opacity = '1';
  }

  function hideOverlay() {
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  browser.runtime.onMessage.addListener((msg, sender) => {
    if (msg.action === 'ping') {
      return Promise.resolve({ pong: true, url: location.href });
    }

    if (msg.action === 'diagnose') {
      return Promise.resolve(diagnosePage());
    }

    if (msg.action === 'overlay') {
      if (msg.text) {
        showOverlay(msg.text);
      } else {
        hideOverlay();
      }
      return Promise.resolve({ ok: true });
    }

    if (msg.action === 'runPrompt') {
      return runPrompt(msg.text);
    }

    if (msg.action === 'waitForResponse') {
      return waitForResponseToFinish().then(() => ({ done: true }));
    }
  });

  function diagnosePage() {
    const info = { url: location.href, title: document.title, platform: getPlatform() };

    const selectors = [
      'textarea', 'input[type="text"]', '[contenteditable="true"]',
      '[aria-label*="Message"]', '[aria-label*="message"]',
      '[aria-label*="Ask"]', '[aria-label*="ask"]',
      '[placeholder]', '[role="textbox"]',
      '#searchbox', '#user-input', '#userInput',
      '#copilot-chat-textarea',
      '[data-testid="send-button"]',
    ];

    info.matches = {};
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        info.matches[sel] = Array.from(els).map(el => ({
          tag: el.tagName,
          id: el.id || null,
          cls: el.className?.toString()?.slice(0, 80) || null,
          aria: el.getAttribute('aria-label') || null,
          placeholder: el.getAttribute('placeholder') || null,
          role: el.getAttribute('role') || null,
          contentEditable: el.contentEditable || null,
        }));
      }
    }

    const buttons = document.querySelectorAll('button');
    info.buttons = Array.from(buttons).slice(0, 30).map(b => ({
      text: (b.textContent || '').trim().slice(0, 60),
      aria: b.getAttribute('aria-label') || null,
      testid: b.getAttribute('data-testid') || null,
    }));

    return info;
  }

  function getPlatform() {
    if (isGitHubCopilot()) return 'github';
    if (isM365Copilot()) return 'm365';
    if (isMicrosoftCopilot()) return 'microsoft';
    return 'unknown';
  }

  function findInputMicrosoft() {
    return document.querySelector('#userInput')
      || document.querySelector('textarea[placeholder*="Message"]')
      || document.querySelector('textarea[role="textbox"]')
      || document.querySelector('textarea');
  }

  function findInputGitHub() {
    return document.querySelector('#copilot-chat-textarea')
      || document.querySelector('textarea[placeholder*="Ask Copilot"]')
      || document.querySelector('textarea[placeholder*="Ask"]')
      || document.querySelector('textarea[placeholder*="Message"]')
      || document.querySelector('[role="textbox"][contenteditable="true"]')
      || document.querySelector('div[contenteditable="true"][data-placeholder]')
      || document.querySelector('textarea[role="textbox"]')
      || document.querySelector('textarea');
  }

  function findInputM365() {
    return document.querySelector('[role="textbox"][contenteditable="true"]')
      || document.querySelector('div[contenteditable="true"][data-placeholder]')
      || document.querySelector('#userInput')
      || document.querySelector('textarea[placeholder*="Message"]')
      || document.querySelector('textarea[placeholder*="message"]')
      || document.querySelector('textarea[aria-label*="Message"]')
      || document.querySelector('textarea[aria-label*="Ask"]')
      || document.querySelector('textarea[role="textbox"]')
      || document.querySelector('[contenteditable="true"]')
      || document.querySelector('textarea');
  }

  function findInput() {
    if (isGitHubCopilot()) return findInputGitHub();
    if (isM365Copilot()) return findInputM365();
    return findInputMicrosoft();
  }

  function findSubmitButtonGitHub() {
    return document.querySelector('button[data-testid="send-button"]')
      || document.querySelector('button[aria-label="Send"]')
      || document.querySelector('button[aria-label="send"]')
      || document.querySelector('button[aria-label*="Send"]')
      || document.querySelector('button[type="submit"]');
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function findSubmitButtonM365() {
    return document.querySelector('button[data-testid="send-button"]')
      || document.querySelector('button[aria-label="Send"]')
      || document.querySelector('button[aria-label="send"]')
      || document.querySelector('button[aria-label*="Send"]')
      || document.querySelector('button[type="submit"]');
  }

  async function runPrompt(text) {
    if (isGitHubCopilot()) {
      return runPromptGitHub(text);
    }
    if (isM365Copilot()) {
      return runPromptM365(text);
    }
    return runPromptMicrosoft(text);
  }

  function clearContentEditable(el) {
    el.focus();
    const sel = window.getSelection();
    sel.selectAllChildren(el);
    if (!sel.isCollapsed) {
      document.execCommand('delete', false, null);
    }
    el.innerHTML = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function insertViaExecCommand(el, text) {
    el.focus();
    return document.execCommand('insertText', false, text);
  }

  function insertViaClipboard(el, text) {
    el.focus();
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dt,
    });
    el.dispatchEvent(pasteEvent);
  }

  function insertViaInputEvent(el, text) {
    el.focus();
    const ev = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text,
    });
    el.dispatchEvent(ev);
  }

  async function runPromptM365(text) {
    const input = findInputM365();
    if (!input) {
      return { ok: false, error: 'Could not find input element on M365 Copilot page' };
    }

    try {
      input.focus();
      input.click();
      await sleep(300);

      const isContentEditable = input.contentEditable === 'true' ||
                                 input.getAttribute('contenteditable') === 'true';
      const isTextarea = input.tagName === 'TEXTAREA';

      if (isContentEditable) {
        clearContentEditable(input);
        await sleep(100);

        const inserted = insertViaExecCommand(input, text);

        if (!inserted || !input.textContent.trim()) {
          insertViaClipboard(input, text);
          await sleep(100);
        }

        if (!input.textContent.trim()) {
          insertViaInputEvent(input, text);
          await sleep(100);
        }

        if (!input.textContent.trim()) {
          input.innerHTML = '';
          const p = document.createElement('p');
          p.textContent = text;
          input.appendChild(p);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

      } else if (isTextarea) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        setter.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(100);
        setter.call(input, text);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }

      await sleep(500);

      const sendBtn = findSubmitButtonM365();
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
        return { ok: true };
      }

      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        bubbles: true, cancelable: true
      }));

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async function runPromptMicrosoft(text) {
    const input = findInputMicrosoft();
    if (!input) {
      return { ok: false, error: 'Could not find input element on the page' };
    }

    try {
      input.focus();
      input.click();
      await sleep(300);

      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(100);
      setter.call(input, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      await sleep(500);

      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        bubbles: true, cancelable: true
      }));

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async function runPromptGitHub(text) {
    const input = findInputGitHub();
    if (!input) {
      return { ok: false, error: 'Could not find GitHub Copilot input element on the page' };
    }

    try {
      input.focus();
      input.click();
      await sleep(300);

      const isContentEditable = input.contentEditable === 'true' ||
                                 input.getAttribute('contenteditable') === 'true';
      const isTextarea = input.tagName === 'TEXTAREA';

      if (isTextarea) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        setter.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(100);
        setter.call(input, text);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (isContentEditable) {
        input.textContent = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(100);
        input.textContent = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }

      await sleep(500);

      const sendBtn = findSubmitButtonGitHub();
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
        return { ok: true };
      }

      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        bubbles: true, cancelable: true
      }));

      await sleep(200);

      input.dispatchEvent(new KeyboardEvent('keypress', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        bubbles: true, cancelable: true
      }));
      input.dispatchEvent(new KeyboardEvent('keyup', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        bubbles: true, cancelable: true
      }));

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  function waitForResponseToFinish() {
    if (isGitHubCopilot()) {
      return waitForResponseGitHub();
    }
    if (isM365Copilot()) {
      return waitForResponseM365();
    }
    return waitForResponseMicrosoft();
  }

  function waitForResponseM365() {
    return new Promise(resolve => {
      let generating = false;
      let resolved = false;

      function done() {
        if (resolved) return;
        resolved = true;
        observer.disconnect();
        resolve();
      }

      const stopButtonSelectors = [
        'button[aria-label*="Stop"]',
        'button[aria-label*="stop"]',
        'button[data-testid="stop-button"]',
        'button[aria-label*="Cancel"]',
        'button[aria-label*="cancel"]',
      ].join(', ');

      const observer = new MutationObserver(() => {
        const stopBtn = document.querySelector(stopButtonSelectors);

        const sendBtn = document.querySelector('button[data-testid="send-button"]')
          || document.querySelector('button[aria-label*="Send"]');
        const sendDisabled = sendBtn && sendBtn.disabled;

        if (stopBtn || sendDisabled) {
          generating = true;
        } else if (generating) {
          done();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });

      setTimeout(done, 90000);
      setTimeout(() => {
        if (!generating && !resolved) done();
      }, 12000);
    });
  }

  function waitForResponseMicrosoft() {
    return new Promise(resolve => {
      let generating = false;
      let resolved = false;

      function done() {
        if (resolved) return;
        resolved = true;
        observer.disconnect();
        resolve();
      }

      const observer = new MutationObserver(() => {
        const stopBtn = document.querySelector(
          'button[aria-label*="Stop"], button[aria-label*="stop"]'
        );
        if (stopBtn) {
          generating = true;
        } else if (generating) {
          done();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });

      setTimeout(done, 60000);
      setTimeout(() => {
        if (!generating && !resolved) done();
      }, 10000);
    });
  }

  function waitForResponseGitHub() {
    return new Promise(resolve => {
      let generating = false;
      let resolved = false;

      function done() {
        if (resolved) return;
        resolved = true;
        observer.disconnect();
        resolve();
      }

      const stopButtonSelectors = [
        'button[aria-label*="Stop"]',
        'button[aria-label*="stop"]',
        'button[data-testid="stop-button"]',
        'button[aria-label*="Cancel"]',
        'button[aria-label*="cancel"]',
      ].join(', ');

      const observer = new MutationObserver(() => {
        const stopBtn = document.querySelector(stopButtonSelectors);

        const sendBtn = document.querySelector('button[data-testid="send-button"]')
          || document.querySelector('button[aria-label*="Send"]');
        const sendDisabled = sendBtn && sendBtn.disabled;

        if (stopBtn || sendDisabled) {
          generating = true;
        } else if (generating) {
          done();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });

      setTimeout(done, 90000);
      setTimeout(() => {
        if (!generating && !resolved) done();
      }, 12000);
    });
  }
})();
