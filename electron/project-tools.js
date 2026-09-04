const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const { isValidCursorApiKey } = require('./env-config');

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
  } else if (!isValidCursorApiKey(apiKey)) {
    issues.push('CURSOR_API_KEY имеет неверный формат');
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

function resolveSkillsSource(kitDir) {
  const candidates = [
    path.join(kitDir, 'skills', 'dev-agent'),
    path.join(kitDir, '.cursor', 'skills', 'dev-agent'),
    path.join(__dirname, '..', 'kit', 'skills', 'dev-agent'),
    path.join(require('os').homedir(), '.cursor', 'skills', 'dev-agent'),
  ];
  for (const src of candidates) {
    if (fs.existsSync(src)) return src;
  }
  return null;
}

function resolveRulesSource(kitDir, skillsSrc) {
  const candidates = [
    path.join(kitDir, 'rules'),
    path.join(kitDir, '.cursor', 'rules'),
    path.join(__dirname, '..', 'kit', 'rules'),
  ];
  // If skills came from ~/.cursor, rules may already be there — optional
  if (skillsSrc && skillsSrc.includes(`${path.sep}.cursor${path.sep}skills`)) {
    candidates.push(path.join(require('os').homedir(), '.cursor', 'rules'));
  }
  for (const src of candidates) {
    if (fs.existsSync(src)) return src;
  }
  return null;
}

function syncSkills(kitDir, cursorDir) {
  const src = resolveSkillsSource(kitDir);
  const dst = path.join(cursorDir, 'skills', 'dev-agent');
  const rulesDst = path.join(cursorDir, 'rules');

  if (!src) {
    throw new Error(
      'Kit не найден. Переустановите Dev Agent 2.2+ или положите skills в ~/.cursor/skills/dev-agent',
    );
  }

  fs.mkdirSync(path.join(cursorDir, 'skills'), { recursive: true });
  fs.mkdirSync(rulesDst, { recursive: true });

  // Don't delete destination if source === destination
  const same = path.resolve(src) === path.resolve(dst);
  if (!same) {
    fs.rmSync(dst, { recursive: true, force: true });
    fs.cpSync(src, dst, { recursive: true });
  }

  const rulesSrc = resolveRulesSource(kitDir, src);
  if (rulesSrc && path.resolve(rulesSrc) !== path.resolve(rulesDst)) {
    for (const f of fs.readdirSync(rulesSrc)) {
      if (f.endsWith('.mdc')) {
        fs.copyFileSync(path.join(rulesSrc, f), path.join(rulesDst, f));
      }
    }
  }

  const commandCandidates = [
    path.join(kitDir, 'КОМАНДЫ.md'),
    path.join(kitDir, '.cursor', 'КОМАНДЫ.md'),
    path.join(__dirname, '..', 'kit', 'КОМАНДЫ.md'),
  ];
  for (const commands of commandCandidates) {
    if (fs.existsSync(commands)) {
      fs.copyFileSync(commands, path.join(cursorDir, 'КОМАНДЫ.md'));
      break;
    }
  }

  return `✅ Skills и rules обновлены в ${cursorDir}\nИсточник: ${src}`;
}

/** Copy bundled kit into userData so packaged .app has a local kit. */
function ensureKitInstalled(userDataDir) {
  const target = path.join(userDataDir, 'dev-agent-kit');
  const bundled = path.join(__dirname, '..', 'kit');
  const marker = path.join(target, 'skills', 'dev-agent', 'SKILL.md');
  if (fs.existsSync(marker)) return target;

  if (fs.existsSync(path.join(bundled, 'skills', 'dev-agent'))) {
    fs.mkdirSync(target, { recursive: true });
    fs.cpSync(bundled, target, { recursive: true });
    return target;
  }

  // Last resort: mirror from global ~/.cursor
  const globalSkills = path.join(require('os').homedir(), '.cursor', 'skills', 'dev-agent');
  if (fs.existsSync(globalSkills)) {
    fs.mkdirSync(path.join(target, 'skills'), { recursive: true });
    fs.cpSync(globalSkills, path.join(target, 'skills', 'dev-agent'), { recursive: true });
    return target;
  }

  return target;
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
  ensureKitInstalled,
  deployVercel,
};
