const fs = require('fs');
const path = require('path');
const os = require('os');

const DESKTOP_DEV_ENV = path.join(
  os.homedir(),
  'Desktop',
  'II Agents',
  'dev-agent-app',
  '.env',
);

function bundledExamplePath() {
  return path.join(__dirname, '..', '.env.example');
}

function devEnvPath() {
  return path.join(__dirname, '..', '.env');
}

/**
 * Resolves .env location. Packaged .app uses Application Support, not the .app bundle.
 */
function isValidCursorApiKey(value) {
  const v = String(value || '').trim().replace(/^["']|["']$/g, '');
  if (v.length < 40) return false;
  // Real Cursor user API keys look like key_... or crsr_...
  return /^(key_|crsr_)[A-Za-z0-9_-]+$/.test(v);
}

function fileHasKey(filePath, name) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(new RegExp(`^${name}=(.*)$`, 'm'));
    if (!match) return false;
    const val = match[1].trim().replace(/^["']|["']$/g, '');
    if (!val) return false;
    if (name === 'CURSOR_API_KEY') return isValidCursorApiKey(val);
    return true;
  } catch {
    return false;
  }
}

function initEnv(app) {
  let envPath;

  if (app.isPackaged) {
    envPath = path.join(app.getPath('userData'), '.env');
    fs.mkdirSync(app.getPath('userData'), { recursive: true });

    // Prefer desktop .env only if it actually has a Cursor key.
    // Never overwrite a working Application Support .env with an empty template.
    if (fileHasKey(DESKTOP_DEV_ENV, 'CURSOR_API_KEY')) {
      if (
        !fs.existsSync(envPath) ||
        fs.statSync(DESKTOP_DEV_ENV).mtimeMs >= fs.statSync(envPath).mtimeMs
      ) {
        fs.copyFileSync(DESKTOP_DEV_ENV, envPath);
      }
    } else if (!fs.existsSync(envPath) && fs.existsSync(bundledExamplePath())) {
      fs.copyFileSync(bundledExamplePath(), envPath);
    }
  } else {
    envPath = devEnvPath();
    if (!fs.existsSync(envPath) && fs.existsSync(bundledExamplePath())) {
      fs.copyFileSync(bundledExamplePath(), envPath);
    }
  }

  require('dotenv').config({ path: envPath });
  return envPath;
}

/** Reload .env from disk (after user edits in TextEdit). */
function reloadEnv(envPath) {
  delete process.env.CURSOR_API_KEY;
  delete process.env.GITHUB_TOKEN;
  delete process.env.VERCEL_TOKEN;
  require('dotenv').config({ path: envPath, override: true });
}

/** Read one variable directly from .env (bypasses stale process.env). */
function readEnvVar(envPath, name) {
  syncDesktopEnvIfNewer(envPath);
  if (!fs.existsSync(envPath)) return '';
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(new RegExp(`^${name}=(.*)$`, 'm'));
  if (!match) return '';
  return match[1].trim().replace(/^["']|["']$/g, '');
}

function syncDesktopEnvIfNewer(targetPath) {
  if (!fileHasKey(DESKTOP_DEV_ENV, 'CURSOR_API_KEY')) return;
  try {
    if (
      !fs.existsSync(targetPath) ||
      fs.statSync(DESKTOP_DEV_ENV).mtimeMs > fs.statSync(targetPath).mtimeMs
    ) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(DESKTOP_DEV_ENV, targetPath);
    }
  } catch {
    /* ignore */
  }
}

function maskSecret(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (v.length <= 8) return '••••••••';
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}

function getEnvSettings(envPath) {
  syncDesktopEnvIfNewer(envPath);
  const cursor = readEnvVar(envPath, 'CURSOR_API_KEY');
  const github = readEnvVar(envPath, 'GITHUB_TOKEN');
  const vercel = readEnvVar(envPath, 'VERCEL_TOKEN');
  return {
    envPath,
    cursorApiKeyMasked: maskSecret(cursor),
    githubTokenMasked: maskSecret(github),
    vercelTokenMasked: maskSecret(vercel),
    hasCursorApiKey: Boolean(cursor),
    hasGithubToken: Boolean(github),
    hasVercelToken: Boolean(vercel),
  };
}

function upsertEnvLine(content, name, value) {
  const line = `${name}=${value}`;
  const re = new RegExp(`^${name}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  const trimmed = content.replace(/\s*$/, '');
  return trimmed ? `${trimmed}\n${line}\n` : `${line}\n`;
}

/**
 * Save API keys from UI. Empty string = keep existing. null/undefined ignored.
 * Writes to envPath and mirrors to desktop .env when packaged.
 */
function saveEnvSettings(envPath, updates = {}) {
  const keys = ['CURSOR_API_KEY', 'GITHUB_TOKEN', 'VERCEL_TOKEN'];
  const map = {
    CURSOR_API_KEY: updates.cursorApiKey,
    GITHUB_TOKEN: updates.githubToken,
    VERCEL_TOKEN: updates.vercelToken,
  };

  fs.mkdirSync(path.dirname(envPath), { recursive: true });
  let content = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, 'utf8')
    : fs.existsSync(bundledExamplePath())
      ? fs.readFileSync(bundledExamplePath(), 'utf8')
      : 'CURSOR_API_KEY=\nGITHUB_TOKEN=\nVERCEL_TOKEN=\n';

  for (const name of keys) {
    const next = map[name];
    if (next === undefined || next === null) continue;
    const trimmed = String(next).trim();
    // Empty keeps previous value (so password fields can stay blank to mean "unchanged")
    if (trimmed === '') continue;
    if (name === 'CURSOR_API_KEY' && !isValidCursorApiKey(trimmed)) {
      throw new Error(
        'Неверный Cursor API Key. Ключ должен начинаться с key_ или crsr_ и быть длиннее 40 символов. Скопируйте его заново: cursor.com → Settings → API Keys.',
      );
    }
    content = upsertEnvLine(content, name, trimmed);
  }

  fs.writeFileSync(envPath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');

  // Keep desktop copy in sync for dual-run (npm start + .app)
  try {
    fs.mkdirSync(path.dirname(DESKTOP_DEV_ENV), { recursive: true });
    fs.copyFileSync(envPath, DESKTOP_DEV_ENV);
  } catch {
    /* ignore */
  }

  reloadEnv(envPath);
  return getEnvSettings(envPath);
}

function getKitDir(app) {
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'dev-agent-kit');
  }
  return path.join(__dirname, '..', '..');
}

/**
 * Cursor SDK needs `rg` (ripgrep). Paths with spaces ("II Agents",
 * "Application Support") break spawn. Always use ~/.dev-agent/bin.
 */
function ensureSdkBinaries(_userDataDir) {
  // Must NOT contain spaces — SDK spawn fails otherwise.
  const binDir = path.join(os.homedir(), '.dev-agent', 'bin');
  fs.mkdirSync(binDir, { recursive: true });

  const candidates = [
    path.join(__dirname, '..', 'node_modules', '@cursor', 'sdk-darwin-arm64', 'bin'),
    path.join(__dirname, '..', 'node_modules', '@cursor', 'sdk-darwin-x64', 'bin'),
    path.join(__dirname, '..', 'node_modules', '.bin'),
  ];

  const names = ['rg', 'cursorsandbox'];
  let sourceDir = null;

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'rg'))) {
      sourceDir = dir;
      break;
    }
  }

  if (!sourceDir) {
    // Fall back to system/Cursor.app rg if present
    const cursorRg =
      '/Applications/Cursor.app/Contents/Resources/app/node_modules/@vscode/ripgrep/bin/rg';
    if (fs.existsSync(cursorRg)) {
      const dest = path.join(binDir, 'rg');
      if (!fs.existsSync(dest)) fs.copyFileSync(cursorRg, dest);
      try {
        fs.chmodSync(dest, 0o755);
      } catch {
        /* ignore */
      }
    }
  } else {
    for (const name of names) {
      const src = path.join(sourceDir, name);
      const dest = path.join(binDir, name);
      if (!fs.existsSync(src)) continue;
      try {
        const real = fs.realpathSync(src);
        fs.copyFileSync(real, dest);
        fs.chmodSync(dest, 0o755);
      } catch {
        /* ignore */
      }
    }
  }

  // Also fix local node_modules/.bin/rg (replace symlink with real binary)
  const localBin = path.join(__dirname, '..', 'node_modules', '.bin');
  const localRg = path.join(localBin, 'rg');
  const goodRg = path.join(binDir, 'rg');
  if (fs.existsSync(goodRg) && fs.existsSync(localBin)) {
    try {
      try {
        fs.unlinkSync(localRg);
      } catch {
        /* ignore */
      }
      fs.copyFileSync(goodRg, localRg);
      fs.chmodSync(localRg, 0o755);
    } catch {
      /* ignore */
    }
  }

  process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH || ''}`;
  return binDir;
}

module.exports = {
  initEnv,
  reloadEnv,
  readEnvVar,
  syncDesktopEnvIfNewer,
  getEnvSettings,
  saveEnvSettings,
  isValidCursorApiKey,
  ensureSdkBinaries,
  getKitDir,
  DESKTOP_DEV_ENV,
};
