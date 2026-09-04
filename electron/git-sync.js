const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execFileAsync = promisify(execFile);

const SECRET_PATTERNS = [
  /^\.env$/,
  /^\.env\./,
  /\.pem$/,
  /credentials\.json$/,
  /secrets?\./i,
];

const MODE_COMMIT_PREFIX = {
  check: 'dev-agent: проверка и исправления',
  release: 'dev-agent: подготовка к релизу',
  status: 'dev-agent: обновление статуса',
  security: 'dev-agent: исправления безопасности',
  seo: 'dev-agent: SEO-оптимизация',
  'seo-content': 'dev-agent: SEO и контент',
  competitors: 'dev-agent: анализ конкурентов',
  content: 'dev-agent: улучшение контента',
  monitoring: 'dev-agent: мониторинг',
  translate: 'dev-agent: перевод',
  analytics: 'dev-agent: аналитика',
  custom: 'dev-agent: пользовательская задача',
};

const REPORT_FILES = {
  seo: 'SEO-ОТЧЁТ.md',
  'seo-content': 'SEO-ОТЧЁТ.md',
  competitors: 'КОНКУРЕНТЫ.md',
  content: 'КОНТЕНТ-ОТЧЁТ.md',
  monitoring: 'МОНИТОРИНГ.md',
  analytics: 'АНАЛИТИКА.md',
  status: 'СТАТУС.md',
};

async function runGit(cwd, args, extraEnv = {}) {
  const { stdout, stderr } = await execFileAsync('git', args, {
    cwd,
    env: { ...process.env, ...extraEnv },
    maxBuffer: 10 * 1024 * 1024,
  });
  return (stdout || stderr || '').trim();
}

function isSecretPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const base = normalized.split('/').pop() || normalized;
  return SECRET_PATTERNS.some((pattern) => pattern.test(base) || pattern.test(normalized));
}

async function isGitRepo(projectPath) {
  try {
    await runGit(projectPath, ['rev-parse', '--git-dir']);
    return true;
  } catch {
    return false;
  }
}

async function getOriginUrl(projectPath) {
  try {
    return await runGit(projectPath, ['remote', 'get-url', 'origin']);
  } catch {
    return null;
  }
}

async function getCurrentBranch(projectPath) {
  return runGit(projectPath, ['branch', '--show-current']);
}

async function listChangedFiles(projectPath) {
  const out = await runGit(projectPath, ['status', '--porcelain']);
  if (!out) return [];
  return out
    .split('\n')
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

function buildCommitMessage(mode) {
  const prefix = MODE_COMMIT_PREFIX[mode] || MODE_COMMIT_PREFIX.check;
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix} (${date})`;
}

function withTokenInHttpsUrl(url, token) {
  if (!token) return url;
  if (url.startsWith('https://')) {
    return url.replace(/^https:\/\//, `https://x-access-token:${token}@`);
  }
  if (url.startsWith('git@github.com:')) {
    const match = url.match(/^git@github\.com:(.+)$/);
    if (match) {
      return `https://x-access-token:${token}@github.com/${match[1]}`;
    }
  }
  return url;
}

async function getDiffPreview(projectPath) {
  const files = await listChangedFiles(projectPath);
  const safe = files.filter((f) => !isSecretPath(f));
  if (safe.length === 0) {
    return { files: [], stat: '', diff: '' };
  }

  let stat = '';
  let diff = '';
  try {
    stat = await runGit(projectPath, ['diff', '--stat', 'HEAD']);
    if (!stat) stat = await runGit(projectPath, ['diff', '--stat', '--cached']);
  } catch {
    stat = safe.map((f) => `  ${f}`).join('\n');
  }

  try {
    diff = await runGit(projectPath, ['diff', 'HEAD']);
    if (!diff) diff = await runGit(projectPath, ['diff', '--cached']);
    if (diff.length > 12000) {
      diff = `${diff.slice(0, 12000)}\n\n... (обрезано, полный diff в git)`;
    }
  } catch {
    diff = stat;
  }

  return { files: safe, stat, diff };
}

async function rollbackLastCommit(projectPath) {
  if (!(await isGitRepo(projectPath))) {
    throw new Error('Не git-репозиторий');
  }
  await runGit(projectPath, ['reset', '--hard', 'HEAD~1']);
  return '↩️ Последний коммит отменён (hard reset HEAD~1)';
}

async function syncToGitHub(projectPath, { mode, githubToken, maxFiles }) {
  const lines = [];

  if (!(await isGitRepo(projectPath))) {
    throw new Error(
      'Это не git-репозиторий. Сначала: git init && git remote add origin https://github.com/ВАШ/РЕПО.git',
    );
  }

  const origin = await getOriginUrl(projectPath);
  if (!origin) {
    throw new Error(
      'Нет привязки к GitHub (origin). Выполните в папке проекта:\ngit remote add origin https://github.com/ВАШ/РЕПО.git',
    );
  }

  const changed = await listChangedFiles(projectPath);
  const safeChanged = changed.filter((file) => !isSecretPath(file));
  const skippedSecrets = changed.filter((file) => isSecretPath(file));

  if (safeChanged.length === 0) {
    lines.push('ℹ️ Нет изменений для отправки на GitHub.');
    if (skippedSecrets.length > 0) {
      lines.push(`🔒 Пропущены секреты: ${skippedSecrets.join(', ')}`);
    }
    return { log: lines.join('\n'), pushed: false };
  }

  if (maxFiles && safeChanged.length > maxFiles) {
    throw new Error(
      `Слишком много файлов (${safeChanged.length} > ${maxFiles}). Подтвердите вручную или увеличьте лимит.`,
    );
  }

  await runGit(projectPath, ['add', '-A']);
  for (const file of changed.filter(isSecretPath)) {
    try {
      await runGit(projectPath, ['reset', 'HEAD', '--', file]);
    } catch {
      /* untracked */
    }
  }

  const staged = await runGit(projectPath, ['diff', '--cached', '--name-only']);
  if (!staged) {
    lines.push('ℹ️ После фильтрации секретов коммитить нечего.');
    return { log: lines.join('\n'), pushed: false };
  }

  const message = buildCommitMessage(mode);
  await runGit(projectPath, ['commit', '-m', message]);

  const branch = await getCurrentBranch(projectPath);
  const pushUrl = withTokenInHttpsUrl(origin, githubToken);

  if (githubToken) {
    await runGit(projectPath, ['push', pushUrl, `HEAD:${branch}`]);
  } else {
    await runGit(projectPath, ['push', '-u', 'origin', branch]);
  }

  lines.push(`✅ Отправлено на GitHub: ${branch}`);
  lines.push(`📝 Коммит: ${message}`);
  if (skippedSecrets.length > 0) {
    lines.push(`🔒 Не в коммите: ${skippedSecrets.join(', ')}`);
  }

  return { log: lines.join('\n'), pushed: true };
}

function findReportFile(projectPath, mode) {
  const name = REPORT_FILES[mode];
  if (!name) return null;
  const full = path.join(projectPath, name);
  return fs.existsSync(full) ? full : null;
}

module.exports = {
  syncToGitHub,
  isGitRepo,
  getOriginUrl,
  getDiffPreview,
  rollbackLastCommit,
  listChangedFiles,
  findReportFile,
  REPORT_FILES,
};
