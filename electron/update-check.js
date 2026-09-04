const pkg = require('../package.json');

const REPO = 'Rizvan-1432/DevAgent';
const RELEASES_URL = `https://github.com/${REPO}/releases`;

function parseVersion(v) {
  return String(v || '')
    .replace(/^v/i, '')
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0);
}

function isNewer(remote, local) {
  const a = parseVersion(remote);
  const b = parseVersion(local);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

function pickDmgAsset(assets = []) {
  const list = Array.isArray(assets) ? assets : [];
  const dmg =
    list.find((a) => /\.dmg$/i.test(a.name || '') && /arm64|aarch64/i.test(a.name || '')) ||
    list.find((a) => /\.dmg$/i.test(a.name || ''));
  return dmg
    ? {
        name: dmg.name,
        url: dmg.browser_download_url,
        size: dmg.size,
      }
    : null;
}

async function checkForUpdates({ currentVersion = pkg.version, githubToken = '', skippedVersion = '' } = {}) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'DevAgent-UpdateCheck',
  };
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers,
      signal: controller.signal,
    });

    if (res.status === 404) {
      return {
        ok: true,
        updateAvailable: false,
        currentVersion,
        message: 'Релизов на GitHub пока нет. Когда выложите Release — обновления появятся здесь.',
        releasesUrl: RELEASES_URL,
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        updateAvailable: false,
        currentVersion,
        error:
          'Нет доступа к релизам (репозиторий private). Добавьте GITHUB_TOKEN или сделайте репо публичным.',
        releasesUrl: RELEASES_URL,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        updateAvailable: false,
        currentVersion,
        error: `GitHub ответил ${res.status}`,
        releasesUrl: RELEASES_URL,
      };
    }

    const data = await res.json();
    const latestVersion = String(data.tag_name || data.name || '').replace(/^v/i, '');
    if (!latestVersion) {
      return {
        ok: true,
        updateAvailable: false,
        currentVersion,
        message: 'Не удалось определить версию релиза',
        releasesUrl: RELEASES_URL,
      };
    }

    const updateAvailable = isNewer(latestVersion, currentVersion);
    const skipped = skippedVersion && skippedVersion === latestVersion;

    return {
      ok: true,
      updateAvailable: updateAvailable && !skipped,
      skipped,
      currentVersion,
      latestVersion,
      releaseName: data.name || latestVersion,
      releaseNotes: String(data.body || '').slice(0, 1200),
      releaseUrl: data.html_url || RELEASES_URL,
      releasesUrl: RELEASES_URL,
      dmg: pickDmgAsset(data.assets),
      message: updateAvailable
        ? skipped
          ? `Версия ${latestVersion} пропущена`
          : `Доступна версия ${latestVersion}`
        : `У вас актуальная версия ${currentVersion}`,
    };
  } catch (err) {
    const msg = err?.name === 'AbortError' ? 'Таймаут проверки обновлений' : err.message || String(err);
    return {
      ok: false,
      updateAvailable: false,
      currentVersion,
      error: msg,
      releasesUrl: RELEASES_URL,
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  checkForUpdates,
  isNewer,
  RELEASES_URL,
  REPO,
};
