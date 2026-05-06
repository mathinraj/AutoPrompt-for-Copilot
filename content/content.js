(() => {
  // --- Floating Overlay ---
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

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'ping') {
      sendResponse({ pong: true, url: location.href });
      return false;
    }

    if (msg.action === 'diagnose') {
      sendResponse(diagnosePage());
      return false;
    }

    if (msg.action === 'overlay') {
      if (msg.text) {
        showOverlay(msg.text);
      } else {
        hideOverlay();
      }
      sendResponse({ ok: true });
      return false;
    }

    if (msg.action === 'runPrompt') {
      runPrompt(msg.text).then(result => {
        sendResponse(result);
      });
      return true;
    }

    if (msg.action === 'waitForResponse') {
      waitForResponseToFinish().then(() => {
        sendResponse({ done: true });
      });
      return true;
    }
  });

  function diagnosePage() {
    const info = { url: location.href, title: document.title };

    const selectors = [
      'textarea', 'input[type="text"]', '[contenteditable="true"]',
      '[aria-label*="Message"]', '[aria-label*="message"]',
      '[aria-label*="Ask"]', '[aria-label*="ask"]',
      '[placeholder]', '[role="textbox"]',
      '#searchbox', '#user-input',
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
        }));
      }
    }

    const buttons = document.querySelectorAll('button');
    info.buttons = Array.from(buttons).slice(0, 20).map(b => ({
      text: (b.textContent || '').trim().slice(0, 40),
      aria: b.getAttribute('aria-label') || null,
    }));

    return info;
  }

  function findInput() {
    return document.querySelector('#userInput')
      || document.querySelector('textarea[placeholder*="Message"]')
      || document.querySelector('textarea[role="textbox"]')
      || document.querySelector('textarea');
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async function runPrompt(text) {
    const input = findInput();
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

  function waitForResponseToFinish() {
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
})();
