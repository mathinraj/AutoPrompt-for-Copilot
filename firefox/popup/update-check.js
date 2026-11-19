(() => {
  const LATEST_RELEASE_API = 'https://api.github.com/repos/mathinraj/AutoPrompt-for-Copilot/releases/latest';
  const STORE_URL = 'https://addons.mozilla.org/en-US/firefox/addon/autoprompt-for-copilot/';
  const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
  // GitHub releases go out when the build is submitted to the stores, but store
  // review takes time; wait this long before telling users to update.
  const RELEASE_GRACE_MS = 24 * 60 * 60 * 1000;

  const $ = id => document.getElementById(id);

  function parseVersion(tag) {
    const match = String(tag || '').match(/^v?(\d+(?:\.\d+)*)$/i);
    return match ? match[1] : null;
  }

  function compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  async function getLatestRelease() {
    const { updateCheck } = await browser.storage.local.get('updateCheck');
    if (updateCheck && Date.now() - updateCheck.checkedAt < CHECK_INTERVAL_MS) {
      return updateCheck.release;
    }

    try {
      const res = await fetch(LATEST_RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const version = parseVersion(data.tag_name);
      const release = version
        ? { version, publishedAt: Date.parse(data.published_at) || 0, url: data.html_url }
        : null;
      await browser.storage.local.set({ updateCheck: { checkedAt: Date.now(), release } });
      return release;
    } catch {
      return updateCheck ? updateCheck.release : null;
    }
  }

  async function checkForUpdate() {
    const current = browser.runtime.getManifest().version;
    const release = await getLatestRelease();
    if (!release || compareVersions(release.version, current) <= 0) return;
    if (Date.now() - release.publishedAt < RELEASE_GRACE_MS) return;

    const { dismissedUpdateVersion } = await browser.storage.local.get('dismissedUpdateVersion');
    if (dismissedUpdateVersion === release.version) return;

    $('update-text').textContent = `Version ${release.version} is available (you have ${current}).`;
    $('update-link').href = STORE_URL;

    const notes = $('update-notes');
    if (typeof release.url === 'string' && release.url.startsWith('https://github.com/')) {
      notes.href = release.url;
    } else {
      notes.classList.add('hidden');
    }

    $('update-dismiss').addEventListener('click', async () => {
      $('update-banner').classList.add('hidden');
      await browser.storage.local.set({ dismissedUpdateVersion: release.version });
    });

    $('update-banner').classList.remove('hidden');
  }

  checkForUpdate();
})();
