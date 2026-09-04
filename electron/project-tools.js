const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const HISTORY_MAX = 30;

function historyPath(userDataDir) {
  return path.join(userDataDir, 'run-history.json');
}

function loadHistory(userDataDir) {
  const file = historyPath(userDataDir);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function saveHistoryEntry(userDataDir, entry) {
  const list = loadHistory(userDataDir);
  list.unshift({
    id: Date.now(),
    at: new Date().toISOString(),
    ...entry,
  });
  fs.writeFileSync(
    historyPath(userDataDir),
    JSON.stringify(list.slice(0, HISTORY_MAX), null, 2),
  );
}

function checkEnv(envPath) {
  const issues = [];
  const warnings = [];

  if (!fs.existsSync(envPath)) {
    issues.push(`Нет файла .env — создайте и заполните ключи:\n${envPath}`);
    return { ok: false, issues, warnings, envPath };
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const apiKey = content.match(/^CURSOR_API_KEY=(.+)$/m)?.[1]?.trim();
  if (!apiKey || apiKey === 'your_api_key_here') {
    issues.push('CURSOR_API_KEY не задан');
  }

  if (!content.match(/^GITHUB_TOKEN=/m)) {
    warnings.push('GITHUB_TOKEN не задан (push по HTTPS может не работать)');
  }

  if (!content.match(/^VERCEL_TOKEN=/m)) {
    warnings.push('VERCEL_TOKEN не задан (деплой на Vercel недоступен)');
  }

  return { ok: issues.length === 0, issues, warnings, envPath };
}

async function runProjectTests(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return { ran: false, ok: true, output: 'Нет package.json — тесты пропущены' };
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const scripts = pkg.scripts || {};
  const cmd = scripts['test:run']
    ? 'npm run test:run'
    : scripts.test
      ? 'npm test -- --run --passWithNoTests 2>/dev/null || npm test'
      : scripts['qa:patrol']
        ? 'npm run qa:patrol'
        : null;

  if (!cmd) {
    return { ran: false, ok: true, output: 'Скрипт тестов не найден — пропущено' };
  }

  try {
    const { stdout, stderr } = await execFileAsync('sh', ['-c', cmd], {
      cwd: projectPath,
      timeout: 120000,
      maxBuffer: 5 * 1024 * 1024,
    });
    const out = (stdout || stderr || '').trim();
    return { ran: true, ok: true, output: out.slice(-1500) };
  } catch (err) {
    const out = ((err.stdout || '') + (err.stderr || '') + (err.message || '')).trim();
    return { ran: true, ok: false, output: out.slice(-1500) };
  }
}

function saveLogToDesktop(logText, projectName) {
  const desktop = path.join(require('os').homedir(), 'Desktop');
  const safe = (projectName || 'project').replace(/[^\w.-]+/g, '_').slice(0, 40);
  const date = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const file = path.join(desktop, `DevAgent-${safe}-${date}.md`);
  fs.writeFileSync(file, logText, 'utf8');
  return file;
}

function syncSkills(kitDir, cursorDir) {
  const src = path.join(kitDir, '.cursor', 'skills', 'dev-agent');
  const dst = path.join(cursorDir, 'skills', 'dev-agent');
  const rulesSrc = path.join(kitDir, '.cursor', 'rules');
  const rulesDst = path.join(cursorDir, 'rules');

  if (!fs.existsSync(src)) {
    throw new Error(`Kit не найден: ${src}`);
  }

  fs.mkdirSync(path.join(cursorDir, 'skills'), { recursive: true });
  fs.mkdirSync(rulesDst, { recursive: true });

  fs.rmSync(dst, { recursive: true, force: true });
  fs.cpSync(src, dst, { recursive: true });

  for (const f of fs.readdirSync(rulesSrc)) {
    if (f.endsWith('.mdc')) {
      fs.copyFileSync(path.join(rulesSrc, f), path.join(rulesDst, f));
    }
  }

  const commands = path.join(kitDir, 'КОМАНДЫ.md');
  if (fs.existsSync(commands)) {
    fs.copyFileSync(commands, path.join(cursorDir, 'КОМАНДЫ.md'));
  }

  return `✅ Skills и rules обновлены в ${cursorDir}`;
}

async function deployVercel(projectPath, token) {
  if (!token) {
    throw new Error('Добавьте VERCEL_TOKEN в .env (vercel.com → Settings → Tokens)');
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      'npx',
      ['vercel', '--prod', '--yes', '--token', token],
      {
        cwd: projectPath,
        timeout: 300000,
        maxBuffer: 5 * 1024 * 1024,
        env: { ...process.env, VERCEL_TOKEN: token },
      },
    );
    return (stdout || stderr || 'Деплой завершён').trim().slice(-800);
  } catch (err) {
    const msg = ((err.stdout || '') + (err.stderr || '') + err.message).trim();
    if (msg.includes('ENOENT') || msg.includes('command not found')) {
      throw new Error('Vercel CLI не найден. Установите: npm i -g vercel');
    }
    throw new Error(msg.slice(-500));
  }
}

module.exports = {
  loadHistory,
  saveHistoryEntry,
  checkEnv,
  runProjectTests,
  saveLogToDesktop,
  syncSkills,
  deployVercel,
};
