(() => {
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const sc = ScrollCraft.mount(document.body);
  const actById = id => sc.acts.find(a => a.el.id === id);
  const runAct = actById('run');
  const panAct = actById('platforms');

  // --- Install button: label and store for the visitor's browser ----------
  const STORES = {
    chrome:  { label: 'Add to Chrome',  icon: 'fa-chrome',          href: 'https://chromewebstore.google.com/detail/nkbdadodgidleldhealhlhndjcanhboo' },
    edge:    { label: 'Add to Edge',    icon: 'fa-edge',            href: 'https://chromewebstore.google.com/detail/nkbdadodgidleldhealhlhndjcanhboo' },
    firefox: { label: 'Add to Firefox', icon: 'fa-firefox-browser', href: 'https://addons.mozilla.org/en-US/firefox/addon/autoprompt-for-copilot/' },
  };
  const ua = navigator.userAgent;
  const store = /Firefox\//.test(ua) ? STORES.firefox : /Edg\//.test(ua) ? STORES.edge : STORES.chrome;
  document.querySelectorAll('[data-install]').forEach(a => {
    a.href = store.href;
    a.querySelector('[data-install-label]').textContent = store.label;
    const icon = a.querySelector('[data-install-icon]');
    icon.classList.remove('fa-chrome');
    icon.classList.add(store.icon);
  });

  // --- The demo batch: the extension's real "Business & Productivity" sample
  // prompts (data/prompts/business-productivity.json). The answers are sample
  // answers written for this page, and the page labels them as such.
  // Lines starting with "- " render as bullets; "Term: text" bolds the term.
  const DEMO = [
    {
      prompt: 'What are the best project management methodologies?',
      answer: [
        'It depends on how predictable the work is. The most widely used:',
        '- Scrum: short sprints with a fixed goal, good when requirements change often.',
        '- Kanban: a visual board that limits work in progress, good for a steady stream of requests.',
        '- Waterfall: sequential phases, good when scope is fixed and changes are costly.',
        'Many teams blend them, for example Scrum planning with a Kanban board.',
      ],
    },
    {
      prompt: 'How to build a strong company culture in a remote team?',
      answer: [
        'Make the unwritten rules written:',
        '- Document: values, decisions and how work gets done, so nobody relies on hallway conversations.',
        '- Default to async: share updates in writing and keep meetings for discussion and connection.',
        '- Make room for people: regular informal time, like virtual coffee or team rituals.',
        '- Recognise: call out good work publicly and often.',
      ],
    },
    {
      prompt: 'What are effective strategies for time management?',
      answer: [
        'A few that hold up well:',
        '- Prioritise: sort tasks by importance, not urgency, for example with the Eisenhower matrix.',
        '- Time-block: reserve calendar slots for focused work and protect them.',
        '- Batch: handle email and small requests in set windows instead of all day.',
        '- Review weekly: break big projects into next actions and check what moved.',
      ],
    },
    {
      prompt: 'Explain the lean startup methodology',
      answer: [
        'Lean startup is a way to build products by testing assumptions quickly instead of planning everything up front.',
        'Its core loop is Build, Measure, Learn: ship a minimum viable product (MVP), measure how real customers use it, then decide whether to persevere or pivot.',
        'Eric Ries popularised it in his 2011 book The Lean Startup.',
      ],
    },
    {
      prompt: 'What are the key metrics for a SaaS business?',
      answer: [
        'The ones most teams track:',
        '- MRR and ARR: monthly or annual recurring revenue.',
        '- Churn: the share of customers or revenue lost each period.',
        '- CAC: what it costs to acquire a customer.',
        '- LTV: the revenue a customer brings over their lifetime. A common rule of thumb is an LTV to CAC ratio of about 3:1.',
        '- Net revenue retention: growth from existing customers after churn.',
      ],
    },
  ];
  const PROMPTS = DEMO.map(d => d.prompt);
  const segmentsOf = lines => lines.map(line => {
    const bullet = line.startsWith('- ');
    const text = bullet ? line.slice(2) : line;
    const colon = bullet ? text.indexOf(': ') : -1;
    return { bullet, words: text.split(' '), termWords: colon > 0 ? text.slice(0, colon + 1).split(' ').length : 0 };
  });

  const plist = $('plist');
  const thread = $('thread');
  const threadEmpty = $('thread-empty');
  const composer = $('composer');
  const composerText = $('composer-text');
  const composerSend = $('composer-send');
  const overlay = $('ap-overlay');
  const tip = $('tip');
  const progress = $('progress');
  const progressLabel = $('progress-label');
  const progressBar = $('progress-bar');
  const countdown = $('countdown');
  const status = $('status');
  const btn = { start: $('btn-start'), pause: $('btn-pause'), resume: $('btn-resume'), stop: $('btn-stop') };
  const delaySelect = $('delay');

  PROMPTS.forEach((text, i) => {
    const li = document.createElement('li');
    li.className = 'pitem';
    li.innerHTML = `<input type="checkbox" id="pp-${i}" checked><label for="pp-${i}"></label>`;
    li.querySelector('label').textContent = text;
    li.querySelector('label').title = text;
    plist.appendChild(li);
  });
  const boxes = [...plist.querySelectorAll('input')];
  const items = [...plist.children];

  let batch = [];      // indexes into PROMPTS, in run order
  let exchanges = [];  // { me, ai } per batch entry
  let lastKey = '';

  function buildBatch() {
    batch = boxes.map((b, i) => (b.checked ? i : -1)).filter(i => i >= 0);
    $('sel-count').textContent = batch.length;
    exchanges.forEach(x => { x.me.remove(); x.ai.remove(); });
    exchanges = batch.map(i => {
      const me = document.createElement('p');
      me.className = 'msg msg--me';
      me.textContent = PROMPTS[i];
      const ai = document.createElement('div');
      ai.className = 'msg msg--ai';
      me.hidden = ai.hidden = true;
      thread.append(me, ai);
      const segs = segmentsOf(DEMO[i].answer);
      return { me, ai, segs, total: segs.reduce((s, g) => s + g.words.length, 0), shown: null };
    });
    lastKey = '';
  }
  plist.addEventListener('change', e => {
    // Selection is fixed once the batch has started, as in the extension.
    if (plist.classList.contains('is-locked')) { e.target.checked = !e.target.checked; return; }
    buildBatch();
  });
  buildBatch();

  // Timeline, in run-act progress.
  const START = 0.06, RUN0 = 0.1, RUN1 = 0.9;

  let lastScrollAt = performance.now();
  let manualPause = false, frozenP = 0;
  let currentItem = -1;

  addEventListener('scroll', () => { lastScrollAt = performance.now(); }, { passive: true });

  const show = (el, on) => { el.hidden = !on; };
  const setStatus = (text, ok) => {
    status.hidden = !text;
    status.textContent = text || '';
    status.classList.toggle('is-success', !!ok);
  };
  const setOverlay = text => {
    if (text) overlay.textContent = text;
    overlay.classList.toggle('is-on', !!text);
  };
  const setComposer = (text, typing, sendState) => {
    if (text) {
      composerText.textContent = text;
      if (typing) composerText.insertAdjacentHTML('beforeend', '<span class="composer__caret"></span>');
    } else {
      composerText.innerHTML = '<span class="composer__placeholder">Message Copilot</span>';
    }
    composer.classList.toggle('is-typing', !!typing);
    composerSend.classList.toggle('is-ready', sendState >= 1);
    composerSend.classList.toggle('is-pressed', sendState === 2);
  };
  // words: -1 shows the thinking dots; otherwise the first `words` words stream in.
  const setAi = (x, words) => {
    words = Math.min(words, x.total);
    if (x.shown === words) return;
    x.shown = words;
    if (words < 0) {
      x.ai.innerHTML = '<span class="dots" aria-label="Copilot is answering"><i></i><i></i><i></i></span>';
      return;
    }
    const body = document.createElement('div');
    body.className = 'msg__body';
    let left = words, list = null;
    for (const seg of x.segs) {
      if (left <= 0) break;
      const take = Math.min(left, seg.words.length);
      left -= take;
      const el = document.createElement(seg.bullet ? 'li' : 'p');
      if (seg.termWords) {
        const strong = document.createElement('strong');
        strong.textContent = seg.words.slice(0, Math.min(take, seg.termWords)).join(' ');
        el.appendChild(strong);
        if (take > seg.termWords) el.append(' ' + seg.words.slice(seg.termWords, take).join(' '));
      } else el.textContent = seg.words.slice(0, take).join(' ');
      if (seg.bullet) {
        if (!list) { list = document.createElement('ul'); body.appendChild(list); }
        list.appendChild(el);
      } else { list = null; body.appendChild(el); }
    }
    if (words < x.total) {
      const lastBlock = body.lastElementChild;
      const lastLine = lastBlock?.tagName === 'UL' ? lastBlock.lastElementChild : lastBlock;
      const cursor = document.createElement('span');
      cursor.className = 'msg__cursor';
      lastLine?.append(cursor);
    }
    x.ai.replaceChildren(body);
  };
  const markItem = i => {
    items.forEach((li, k) => {
      const pos = batch.indexOf(k);
      li.classList.toggle('is-current', i >= 0 && pos === i);
      li.classList.toggle('is-done', i >= 0 && pos > -1 && pos < i);
    });
    if (i !== currentItem && i >= 0 && batch[i] !== undefined) {
      const li = items[batch[i]];
      plist.scrollTop = li.offsetTop - plist.clientHeight / 2 + li.offsetHeight / 2;
    }
    currentItem = i;
  };
  const delaySeconds = () => parseFloat(delaySelect.value) || 1;

  function render(p, paused) {
    const n = batch.length;
    let phase, i = -1, f = 0;
    if (p < START) phase = 'ready';
    else if (n === 0) phase = 'empty';
    else if (p < RUN0) phase = 'starting';
    else if (p < RUN1) {
      phase = 'running';
      const t = clamp((p - RUN0) / (RUN1 - RUN0), 0, 0.99999) * n;
      i = Math.floor(t);
      f = t - i;
    } else phase = 'done';

    // Within one prompt: type, send, think, stream the answer, count down.
    const T_TYPE = 0.22, T_SEND = 0.27, T_THINK = 0.36, T_STREAM = 0.86;
    const len = i >= 0 ? PROMPTS[batch[i]].length : 0;
    const typed = phase === 'running' && f < T_TYPE ? Math.ceil(len * (f / T_TYPE)) : 0;
    const sub = phase !== 'running' ? '' : f < T_TYPE ? 't' : f < T_SEND ? 's' : f < T_THINK ? 'w' : f < T_STREAM ? 'a' : 'c';
    const cur = phase === 'running' ? exchanges[i] : null;
    const streamed = sub === 'a' ? Math.max(1, Math.ceil(cur.total * ((f - T_THINK) / (T_STREAM - T_THINK)))) : 0;
    const secs = sub === 'c' ? Math.max(1, Math.ceil(delaySeconds() * (1 - (f - T_STREAM) / (1 - T_STREAM)))) : 0;
    const key = [phase, i, sub, typed, streamed, secs, paused ? 1 : 0, p > 0.97 ? 1 : 0, n, delaySelect.value].join('|');
    if (key === lastKey) return;
    lastKey = key;

    const running = phase === 'starting' || phase === 'running';
    plist.classList.toggle('is-locked', phase !== 'ready' && phase !== 'empty');
    tip.classList.toggle('is-away', phase !== 'ready');

    show(btn.start, !running);
    btn.start.disabled = n === 0;
    show(btn.pause, running && !paused);
    show(btn.resume, running && paused);
    show(btn.stop, running);

    show(progress, phase !== 'ready' && phase !== 'empty');
    show(threadEmpty, phase === 'ready' || phase === 'empty' || phase === 'starting');

    // thread
    exchanges.forEach((x, k) => {
      const done = phase === 'done' || (phase === 'running' && k < i);
      const isCur = phase === 'running' && k === i;
      const sent = isCur && f >= T_SEND;
      x.me.hidden = !(done || sent);
      x.ai.hidden = !(done || sent);
      if (done || (isCur && sub === 'c')) setAi(x, x.total);
      else if (sent) setAi(x, sub === 'w' ? -1 : streamed);
    });

    if (phase === 'running') {
      const text = PROMPTS[batch[i]];
      if (sub === 't') setComposer(text.slice(0, typed), true, f > T_TYPE * 0.7 ? 1 : 0);
      else if (sub === 's') setComposer(text, false, 2);
      else setComposer('', false, 0);
    } else setComposer('', false, 0);

    const doneCount = phase === 'done' ? n : phase === 'running' ? i + (sub === 'c' ? 1 : 0) : 0;
    progressLabel.textContent = `${doneCount} / ${n} prompts`;
    progressBar.style.transform = `scaleX(${n ? doneCount / n : 0})`;
    show(countdown, sub === 'c' && i < n - 1 && !paused);
    if (secs) countdown.textContent = `Next in ${secs}s`;

    markItem(phase === 'running' ? i : phase === 'done' ? n : -1);

    // status line and page overlay, in the extension's own words
    if (phase === 'ready') { setStatus(''); setOverlay(''); }
    else if (phase === 'empty') { setStatus('No prompts to run. Add or select prompts first.'); setOverlay(''); }
    else if (paused) { setStatus('Paused.'); setOverlay('Batch paused'); }
    else if (phase === 'starting') { setStatus('Starting...'); setOverlay(''); }
    else if (phase === 'running') {
      setStatus(`Running prompt ${i + 1} of ${n}...`);
      setOverlay(sub === 'c' && i < n - 1 ? `Batch ${i + 1} / ${n}  ·  Next in ${secs}s` : `Running prompt ${i + 1} of ${n}...`);
    } else {
      setStatus(`Done! ${n} prompts completed.`, true);
      setOverlay(p > 0.97 ? '' : 'Batch complete!');
    }
  }

  // Signature: the visitor's scroll is the batch. Stop scrolling mid-run and
  // it pauses, exactly like pressing Pause; scroll again and it resumes.
  const AUTO_PAUSE_MS = 1400;
  function runPaused(p) {
    if (manualPause) return true;
    const inRun = p >= START && p < RUN1 && batch.length > 0;
    return inRun && performance.now() - lastScrollAt > AUTO_PAUSE_MS && !document.hidden;
  }

  const actTravel = () => Math.max(1, runAct.el.offsetHeight - innerHeight);
  const actTop = () => runAct.el.getBoundingClientRect().top + scrollY;

  btn.start.addEventListener('click', () => {
    manualPause = false;
    scrollTo({ top: actTop() + (RUN0 + 0.004) * actTravel(), behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  btn.pause.addEventListener('click', () => { manualPause = true; frozenP = runAct.p; lastKey = ''; });
  btn.resume.addEventListener('click', () => {
    if (manualPause) { manualPause = false; lastScrollAt = performance.now(); lastKey = ''; return; }
    const slot = (RUN1 - RUN0) / Math.max(1, batch.length);
    scrollBy({ top: slot * actTravel(), behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  btn.stop.addEventListener('click', () => {
    manualPause = false;
    scrollTo({ top: actTop(), behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  delaySelect.addEventListener('change', () => { lastKey = ''; });

  // --- Pointer depth on the hero: page, popup and light move apart ---------
  const viewport = $('viewport');
  let px = 0, py = 0, tx = 0, ty = 0;
  if (finePointer && !reduceMotion) {
    viewport.addEventListener('pointermove', e => {
      const r = viewport.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    viewport.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
  }

  // --- Phone: keep the newest chat line above the popup sheet --------------
  const popupWrap = $('popup-wrap');
  const head = document.querySelector('.copilot__head');
  const setSheet = () => {
    viewport.style.setProperty('--sheet-h', popupWrap.offsetHeight + 'px');
    viewport.style.setProperty('--head-h', head.offsetHeight + 'px');
  };
  const sizes = new ResizeObserver(setSheet);
  sizes.observe(popupWrap);
  sizes.observe(head);
  setSheet();

  // --- Tabs and address bar follow the page --------------------------------
  const SECTIONS = ['run', 'controls', 'platforms', 'prompts'];
  const tabs = new Map([...document.querySelectorAll('[data-tab]')].map(t => [t.dataset.tab, t]));
  const PLATFORM_URLS = [...document.querySelectorAll('.pwin')].map(w => w.dataset.domain);
  const omnibox = $('omnibox-url');
  let activeTab = 'run';
  function updateChrome() {
    const probe = scrollY + innerHeight * 0.4;
    let current = SECTIONS[0];
    SECTIONS.forEach(id => {
      const el = $(id);
      if (el.getBoundingClientRect().top + scrollY <= probe) current = id;
    });
    if (current !== activeTab) {
      tabs.get(activeTab)?.removeAttribute('aria-current');
      const tab = tabs.get(current);
      tab?.setAttribute('aria-current', 'true');
      activeTab = current;
      // Narrow screens scroll the tab strip; keep the active tab in it.
      const strip = tab?.parentElement;
      if (strip && strip.scrollWidth > strip.clientWidth) {
        strip.scrollTo({ left: tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }
    let url = 'copilot.microsoft.com';
    if (current === 'platforms') url = PLATFORM_URLS[clamp(Math.round(panAct.p * (PLATFORM_URLS.length - 1)), 0, PLATFORM_URLS.length - 1)];
    if (current === 'prompts') url = 'auto-prompt-for-copilot.vercel.app';
    if (omnibox.textContent !== url) omnibox.textContent = url;
  }

  // --- One loop for the page's own behaviour ------------------------------
  function frame() {
    const p = manualPause ? frozenP : runAct.p;
    render(p, runPaused(runAct.p));
    if (finePointer && !reduceMotion) {
      px += (tx - px) * 0.08; py += (ty - py) * 0.08;
      viewport.style.setProperty('--px', px.toFixed(3));
      viewport.style.setProperty('--py', py.toFixed(3));
    }
    updateChrome();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // --- Close: the visitor's own prompts, through the extension's parser ----
  const textarea = $('custom-prompts');
  const customStatus = $('custom-status');
  const preview = $('custom-preview');
  const copyBtn = $('copy-prompts');
  const next = $('custom-next');
  const NEXT_DEFAULT = next.textContent;
  let parsed = [];

  function showParsed(list, message) {
    parsed = list;
    preview.innerHTML = '';
    list.slice(0, 6).forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      li.title = text;
      preview.appendChild(li);
    });
    if (list.length > 6) {
      const li = document.createElement('li');
      li.className = 'more';
      li.textContent = `and ${list.length - 6} more`;
      preview.appendChild(li);
    }
    customStatus.className = 'custom__status' + (list.length ? ' is-ok' : '');
    customStatus.textContent = message || (list.length ? `${list.length} prompt${list.length === 1 ? '' : 's'} loaded` : 'Nothing loaded yet.');
    copyBtn.disabled = list.length === 0;
    next.textContent = list.length
      ? `Ready: ${list.length} prompt${list.length === 1 ? '' : 's'}. Add AutoPrompt to your browser, open Copilot, and paste them into Custom mode. Then press Start.`
      : NEXT_DEFAULT;
  }
  const parseError = (name, err) => {
    showParsed([]);
    customStatus.className = 'custom__status is-error';
    customStatus.textContent = `Couldn't read ${name}: ${err.message}`;
  };
  function loadFileText(content, name) {
    try {
      const list = PromptParser.parseFile(content, name);
      textarea.value = list.join('\n');
      showParsed(list, `${list.length} prompt${list.length === 1 ? '' : 's'} loaded from ${name}`);
    } catch (err) { parseError(name, err); }
  }

  textarea.addEventListener('input', () => showParsed(PromptParser.fromText(textarea.value)));

  const fileInput = $('file-input');
  const readFile = file => {
    if (!file) return;
    $('file-name').textContent = file.name;
    const reader = new FileReader();
    reader.onload = e => loadFileText(e.target.result, file.name);
    reader.onerror = () => parseError(file.name, new Error('the file could not be opened'));
    reader.readAsText(file);
  };
  fileInput.addEventListener('change', () => readFile(fileInput.files[0]));

  const drop = $('drop');
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, () => drop.classList.remove('is-over')));
  drop.addEventListener('drop', e => { e.preventDefault(); readFile(e.dataTransfer.files[0]); });

  const EXAMPLES = {
    txt: { name: 'example.txt', body: 'Summarise this week\'s release notes\nWrite three subject lines for a launch email\nExplain the difference between SQL and NoSQL\nList five questions to ask in a design review' },
    csv: { name: 'example.csv', body: 'id,prompt\n1,What are best practices for REST API design?\n2,"Compare React, Vue, and Angular for frontend development"\n3,What is the SOLID principle in software engineering?\n4,What are microservices and when should you use them?' },
    json: { name: 'example.json', body: '{ "prompts": [\n  "What are the top 5 AI trends in 2026?",\n  { "prompt": "Explain quantum computing in simple terms" },\n  { "question": "How does blockchain technology work?" }\n] }' },
  };
  document.querySelectorAll('[data-example]').forEach(b => b.addEventListener('click', () => {
    const ex = EXAMPLES[b.dataset.example];
    $('file-name').textContent = ex.name;
    loadFileText(ex.body, ex.name);
  }));

  copyBtn.addEventListener('click', async () => {
    const label = copyBtn.innerHTML;
    try {
      await navigator.clipboard.writeText(parsed.join('\n'));
      copyBtn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Copied';
    } catch {
      textarea.focus();
      textarea.select();
      copyBtn.textContent = 'Press Ctrl+C to copy';
    }
    setTimeout(() => { copyBtn.innerHTML = label; }, 1800);
  });

  // --- Feedback side panel --------------------------------------------------
  const panel = $('feedback');
  const scrim = $('side-scrim');
  const openBtn = $('open-feedback');
  let returnFocus = null;

  function openPanel(from) {
    if (!panel.hidden) return;
    returnFocus = from || document.activeElement;
    panel.hidden = false;
    scrim.hidden = false;
    openBtn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      panel.classList.add('is-open');
      $('fb-email').focus({ preventScroll: true });
    });
  }
  function closePanel() {
    if (panel.hidden) return;
    panel.classList.remove('is-open');
    openBtn.setAttribute('aria-expanded', 'false');
    scrim.hidden = true;
    setTimeout(() => { panel.hidden = true; }, reduceMotion ? 0 : 280);
    if (location.hash === '#feedback') history.replaceState(null, '', location.pathname + location.search);
    if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
  }
  openBtn.addEventListener('click', () => (panel.hidden ? openPanel(openBtn) : closePanel()));
  $('close-feedback').addEventListener('click', closePanel);
  scrim.addEventListener('click', closePanel);
  document.querySelectorAll('[data-open-feedback]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openPanel(a); }));
  addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });
  const checkHash = () => { if (location.hash === '#feedback') openPanel(openBtn); };
  addEventListener('hashchange', checkHash);
  checkHash();

  const EMAILJS_SERVICE_ID  = 'service_em2o2a6';
  const EMAILJS_TEMPLATE_ID = 'template_6595ut4';
  const EMAILJS_PUBLIC_KEY  = 'R2Yro3gG1FbXS9fJm';
  const fbStatus = $('fb-status');
  const sendBtn = $('btn-send-feedback');
  const showFb = (text, ok) => { fbStatus.hidden = false; fbStatus.textContent = text; fbStatus.className = 'fb__status ' + (ok ? 'is-ok' : 'is-error'); };

  $('fb-form').addEventListener('submit', async e => {
    e.preventDefault();
    const message = $('fb-message').value.trim();
    if (message.length < 10) { showFb('Please write at least 10 characters.', false); return; }
    sendBtn.disabled = true;
    const label = sendBtn.innerHTML;
    sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Sending';
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            from_email: $('fb-email').value.trim() || 'Not provided',
            category: $('fb-category').value,
            message: '[Auto Prompt] ' + message,
            timestamp: new Date().toISOString(),
            version: '1.4.7',
          },
        }),
      });
      if (!res.ok) throw new Error('Status ' + res.status);
      showFb('Thank you! Your feedback has been sent.', true);
      $('fb-email').value = '';
      $('fb-message').value = '';
      $('fb-category').value = 'feature';
    } catch {
      showFb('Failed to send. Please try again later.', false);
    }
    sendBtn.disabled = false;
    sendBtn.innerHTML = label;
  });
})();
