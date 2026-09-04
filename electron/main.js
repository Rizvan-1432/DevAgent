const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const { getPrompt } = require('./prompts');
const {
  syncToGitHub,
  getDiffPreview,
  rollbackLastCommit,
  findReportFile,
  listChangedFiles,
} = require('./git-sync');
const {
  loadHistory,
  saveHistoryEntry,
  checkEnv,
  runProjectTests,
  saveLogToDesktop,
  syncSkills,
  deployVercel,
} = require('./project-tools');
const {
  initEnv,
  reloadEnv,
  readEnvVar,
  getEnvSettings,
  saveEnvSettings,
  isValidCursorApiKey,
  ensureSdkBinaries,
} = require('./env-config');
const { loadPrefs, savePrefs } = require('./prefs');
const { checkForUpdates } = require('./update-check');
const os = require('os');
const pkg = require('../package.json');

let mainWindow = null;
let sdkConfigured = false;
let activeAgent = null;
let cancelRequested = false;
let lastLogText = '';
let ENV_PATH = '';
let KIT_DIR = '';

function getAgentStoreDir() {
  const dir = path.join(app.getPath('userData'), 'agent-store');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function configureSdk() {
  if (sdkConfigured) return;
  const { Cursor, JsonlLocalAgentStore } = await import('@cursor/sdk');
  Cursor.configure({
    local: { store: new JsonlLocalAgentStore(getAgentStoreDir()) },
  });
  sdkConfigured = true;
}

async function validateCursorApiKey(apiKey) {
  const key = String(apiKey || '').trim();
  if (!key) {
    return { ok: false, error: 'Вставьте Cursor API Key' };
  }
  if (!isValidCursorApiKey(key)) {
    return {
      ok: false,
      error:
        'Формат ключа неверный. Нужен ключ с cursor.com → Settings → API Keys (обычно начинается с key_ или crsr_, длиннее 40 символов).',
    };
  }

  // Network probe
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let probe;
    try {
      probe = await fetch('https://api2.cursor.sh', { method: 'GET', signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!probe.ok && probe.status >= 500) {
      return { ok: false, error: 'Серверы Cursor временно недоступны. Попробуйте позже.' };
    }
  } catch {
    return {
      ok: false,
      error: 'Нет интернета или Cursor недоступен. Проверьте сеть / VPN.',
    };
  }

  ensureSdkBinaries(app.getPath('userData'));
  await configureSdk();
  const { Agent } = await import('@cursor/sdk');
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-agent-keycheck-'));

  try {
    const agent = await Agent.create({
      apiKey: key,
      model: { id: 'composer-2.5' },
      local: { cwd },
    });
    await disposeAgent(agent);
    return { ok: true, message: 'Ключ рабочий — можно запускать агента' };
  } catch (err) {
    const msg = err?.message || String(err);
    if (/invalid.*api.*key/i.test(msg)) {
      return {
        ok: false,
        error: 'Ключ отклонён Cursor (Invalid API Key). Создайте новый: cursor.com → Settings → API Keys.',
      };
    }
    if (/network request failed|fetch failed|ENOTFOUND|ETIMEDOUT/i.test(msg)) {
      return {
        ok: false,
        error: 'Сеть не дала проверить ключ. Проверьте интернет / VPN и попробуйте снова.',
      };
    }
    return { ok: false, error: msg };
  } finally {
    try {
      fs.rmSync(cwd, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 880,
    height: 820,
    minWidth: 600,
    minHeight: 640,
    title: 'Dev Agent',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
}

app.whenReady().then(() => {
  ENV_PATH = initEnv(app);
  KIT_DIR = getKitDir(app);
  ensureSdkBinaries(app.getPath('userData'));
  process.on('unhandledRejection', (reason) => {
    const msg = reason?.message || String(reason);
    if (msg.includes('rg') && msg.includes('ENOENT')) return;
    console.error('unhandledRejection', msg);
  });
  createWindow();
});

function getKitDir(app) {
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'dev-agent-kit');
  }
  return path.join(__dirname, '..', '..');
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

function send(channel, payload) {
  mainWindow?.webContents.send(channel, payload);
}

function sendLog(text) {
  lastLogText += text;
  send('agent-log', text);
}

function sendProgress(label) {
  send('agent-progress', label);
}

async function disposeAgent(agent) {
  try {
    if (typeof agent?.close === 'function') agent.close();
    if (agent && typeof agent[Symbol.asyncDispose] === 'function') {
      await agent[Symbol.asyncDispose]();
    }
  } catch (_) {
    /* ignore */
  }
  if (activeAgent === agent) activeAgent = null;
}

function progressFromEvent(event) {
  if (event.type === 'tool_call_started' || event.type === 'tool_call') {
    const name = event.toolCall?.name || event.name || event.tool || 'инструмент';
    return `⚙️ ${name}...`;
  }
  if (event.type === 'thinking') return '💭 Думаю...';
  return null;
}

async function runAgentCore({ projectPath, mode, customPrompt, maxFiles }) {
  cancelRequested = false;
  lastLogText = '';

  reloadEnv(ENV_PATH);
  const apiKey = readEnvVar(ENV_PATH, 'CURSOR_API_KEY');
  if (!apiKey || apiKey === 'your_api_key_here') {
    return {
      ok: false,
      error: 'Добавьте Cursor API Key в блоке «API-ключи» и нажмите «Сохранить ключи»',
    };
  }
  if (!isValidCursorApiKey(apiKey)) {
    return {
      ok: false,
      error:
        `Ключ Cursor выглядит неверным (${apiKey.length} символов). ` +
        'Нужен ключ из cursor.com → Settings → API Keys (обычно начинается с key_ или crsr_, длиннее 40 символов).',
    };
  }

  sendLog(`🔑 Ключ Cursor: ${apiKey.length} символов\n`);

  ensureSdkBinaries(app.getPath('userData'));

  await configureSdk();
  const { Agent } = await import('@cursor/sdk');
  const prompt = getPrompt(mode, { customPrompt, maxFiles, pushToGitHub: true });

  sendLog('🚀 Запуск Dev Agent...\n\n');
  sendProgress('Старт');

  const agent = await Agent.create({
    apiKey,
    model: { id: 'composer-2.5' },
    local: { cwd: projectPath },
  });
  activeAgent = agent;

  const run = await agent.send(prompt);

  for await (const event of run.stream()) {
    if (cancelRequested) {
      sendLog('\n\n⏹ Остановлено пользователем.\n');
      break;
    }

    const prog = progressFromEvent(event);
    if (prog) sendProgress(prog);

    if (event.type === 'assistant') {
      for (const block of event.message.content) {
        if (block.type === 'text' && block.text) {
          sendLog(block.text);
        }
      }
    }
  }

  const result = cancelRequested ? { status: 'cancelled' } : await run.wait();

  await disposeAgent(agent);

  if (result.status === 'error') {
    return { ok: false, error: 'Агент завершился с ошибкой', log: lastLogText };
  }

  if (cancelRequested) {
    return { ok: false, error: 'Остановлено', log: lastLogText };
  }

  return { ok: true, log: lastLogText };
}

ipcMain.handle('check-env', () => ({
  ...checkEnv(ENV_PATH),
  envPath: ENV_PATH,
}));

ipcMain.handle('open-env-file', async () => {
  const example = path.join(__dirname, '..', '.env.example');
  if (!fs.existsSync(ENV_PATH) && fs.existsSync(example)) {
    fs.mkdirSync(path.dirname(ENV_PATH), { recursive: true });
    fs.copyFileSync(example, ENV_PATH);
  }
  await shell.openPath(ENV_PATH);
  return { ok: true, envPath: ENV_PATH };
});

ipcMain.handle('get-env-settings', () => getEnvSettings(ENV_PATH));

ipcMain.handle('save-env-settings', (_e, payload = {}) => {
  try {
    const settings = saveEnvSettings(ENV_PATH, {
      cursorApiKey: payload.cursorApiKey,
      githubToken: payload.githubToken,
      vercelToken: payload.vercelToken,
    });
    return { ok: true, settings };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle('validate-api-key', async (_e, payload = {}) => {
  const incoming = String(payload.apiKey || '').trim();
  const apiKey = incoming || readEnvVar(ENV_PATH, 'CURSOR_API_KEY');
  return validateCursorApiKey(apiKey);
});

ipcMain.handle('get-onboarding-state', () => {
  const prefs = loadPrefs(app.getPath('userData'));
  const settings = getEnvSettings(ENV_PATH);
  return {
    done: Boolean(prefs.onboardingDone),
    hasCursorApiKey: settings.hasCursorApiKey,
    version: pkg.version,
  };
});

ipcMain.handle('complete-onboarding', (_e, payload = {}) => {
  const prefs = savePrefs(app.getPath('userData'), {
    onboardingDone: true,
    onboardingProjectPath: payload.projectPath || '',
  });
  return { ok: true, prefs };
});

ipcMain.handle('reset-onboarding', () => {
  savePrefs(app.getPath('userData'), { onboardingDone: false });
  return { ok: true };
});

ipcMain.handle('get-app-info', () => ({
  version: pkg.version,
  name: pkg.productName || 'Dev Agent',
  isPackaged: app.isPackaged,
}));

ipcMain.handle('check-updates', async () => {
  const prefs = loadPrefs(app.getPath('userData'));
  const result = await checkForUpdates({
    currentVersion: pkg.version,
    githubToken: readEnvVar(ENV_PATH, 'GITHUB_TOKEN'),
    skippedVersion: prefs.skippedUpdateVersion || '',
  });
  savePrefs(app.getPath('userData'), { lastUpdateCheckAt: new Date().toISOString() });
  return result;
});

ipcMain.handle('skip-update', (_e, payload = {}) => {
  const version = String(payload.version || '').trim();
  if (version) savePrefs(app.getPath('userData'), { skippedUpdateVersion: version });
  return { ok: true };
});

ipcMain.handle('open-external', async (_e, payload = {}) => {
  const url = String(payload.url || '').trim();
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    return { ok: false, error: 'Некорректный URL' };
  }
  await shell.openExternal(url);
  return { ok: true };
});

ipcMain.handle('get-history', () => loadHistory(app.getPath('userData')));

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Выберите папку проекта',
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});

ipcMain.handle('stop-agent', async () => {
  cancelRequested = true;
  if (activeAgent) await disposeAgent(activeAgent);
  return { ok: true };
});

ipcMain.handle('sync-skills', () => {
  try {
    const cursorDir = path.join(require('os').homedir(), '.cursor');
    return { ok: true, message: syncSkills(KIT_DIR, cursorDir) };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle('save-log', (_e, { projectName }) => {
  const file = saveLogToDesktop(lastLogText || 'Пустой лог', projectName);
  return { ok: true, file };
});

ipcMain.handle('rollback-commit', async (_e, { projectPath }) => {
  try {
    const msg = await rollbackLastCommit(projectPath);
    return { ok: true, message: msg };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle('open-report', async (_e, { projectPath, mode }) => {
  const report = findReportFile(projectPath, mode);
  if (!report) return { ok: false, error: 'Отчёт не найден' };
  await shell.openPath(report);
  return { ok: true, file: report };
});

ipcMain.handle('get-diff-preview', async (_e, { projectPath }) => {
  try {
    return { ok: true, ...(await getDiffPreview(projectPath)) };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle('confirm-push', async (_e, opts) => {
  const {
    projectPath,
    mode,
    deployVercel: doDeploy,
    maxFiles,
    requireTests,
  } = opts;

  const lines = [];

  if (requireTests) {
    sendLog('\n\n🧪 Тесты перед push...\n');
    sendProgress('Тесты');
    const tests = await runProjectTests(projectPath);
    sendLog(`${tests.output}\n`);
    if (tests.ran && !tests.ok) {
      return { ok: false, error: 'Тесты не прошли — push отменён' };
    }
  }

  try {
    sendLog('\n\n📤 Отправка на GitHub...\n');
    sendProgress('GitHub');
    const { log, pushed } = await syncToGitHub(projectPath, {
      mode,
      githubToken: readEnvVar(ENV_PATH, 'GITHUB_TOKEN'),
      maxFiles: maxFiles || 0,
    });
    sendLog(`${log}\n`);
    lines.push(log);

    if (doDeploy && pushed) {
      sendLog('\n🚀 Деплой на Vercel...\n');
      sendProgress('Vercel');
      const deployLog = await deployVercel(projectPath, readEnvVar(ENV_PATH, 'VERCEL_TOKEN'));
      sendLog(`${deployLog}\n`);
      lines.push(deployLog);
    }

    return { ok: true, log: lines.join('\n') };
  } catch (err) {
    const msg = err.message || String(err);
    sendLog(`\n⚠️ ${msg}\n`);
    return { ok: false, error: msg };
  }
});

ipcMain.handle('run-agent', async (_event, options) => {
  const {
    projectPath,
    mode = 'check',
    customPrompt,
    pushToGitHub,
    previewDiff,
    deployVercel: doDeploy,
    maxFiles = 25,
    requireTests = true,
    openReport,
  } = options;

  if (!projectPath) {
    return { ok: false, error: 'Сначала выберите папку проекта' };
  }

  const effectiveMode = mode === 'custom' ? 'custom' : mode;
  const startedAt = Date.now();

  try {
    if (pushToGitHub) {
      sendLog('📤 После работы — preview изменений' + (previewDiff ? '' : ' и push') + '\n\n');
    }

    const core = await runAgentCore({
      projectPath,
      mode: effectiveMode,
      customPrompt,
      maxFiles,
    });

    if (!core.ok) {
      saveHistoryEntry(app.getPath('userData'), {
        projectPath,
        mode: effectiveMode,
        ok: false,
        durationMs: Date.now() - startedAt,
      });
      return core;
    }

    let reportPath = null;
    if (openReport !== false) {
      reportPath = findReportFile(projectPath, effectiveMode);
      if (reportPath) {
        sendLog(`\n📄 Отчёт: ${path.basename(reportPath)}\n`);
        await shell.openPath(reportPath);
      }
    }

    const changed = await listChangedFiles(projectPath);
    const diffPreview = await getDiffPreview(projectPath);

    if (pushToGitHub && changed.length > 0) {
      if (previewDiff !== false) {
        sendLog('\n\n👀 Изменения готовы — подтвердите push в окне.\n');
        saveHistoryEntry(app.getPath('userData'), {
          projectPath,
          mode: effectiveMode,
          ok: true,
          filesChanged: changed.length,
          durationMs: Date.now() - startedAt,
          pendingPush: true,
        });
        return {
          ok: true,
          needsPushConfirm: true,
          diffPreview,
          reportPath,
          mode: effectiveMode,
          deployVercel: doDeploy,
          maxFiles,
          requireTests,
        };
      }

      if (requireTests) {
        sendLog('\n\n🧪 Тесты перед push...\n');
        sendProgress('Тесты');
        const tests = await runProjectTests(projectPath);
        sendLog(`${tests.output}\n`);
        if (tests.ran && !tests.ok) {
          return { ok: false, error: 'Тесты не прошли — push отменён' };
        }
      }

      sendLog('\n\n📤 Отправка на GitHub...\n');
      const { log } = await syncToGitHub(projectPath, {
        mode: effectiveMode,
        githubToken: readEnvVar(ENV_PATH, 'GITHUB_TOKEN'),
        maxFiles,
      });
      sendLog(`${log}\n`);

      if (doDeploy) {
        sendLog('\n🚀 Деплой на Vercel...\n');
        const deployLog = await deployVercel(projectPath, readEnvVar(ENV_PATH, 'VERCEL_TOKEN'));
        sendLog(`${deployLog}\n`);
      }
    }

    saveHistoryEntry(app.getPath('userData'), {
      projectPath,
      mode: effectiveMode,
      ok: true,
      filesChanged: changed.length,
      durationMs: Date.now() - startedAt,
    });

    sendLog('\n\n✅ Готово.\n');
    return {
      ok: true,
      reportPath,
      diffPreview,
      needsPushConfirm: false,
    };
  } catch (err) {
    const msg = err?.message || String(err);
    sendLog(`\n❌ Ошибка: ${msg}\n`);
    if (/invalid.*api.*key/i.test(msg)) {
      sendLog(
        '💡 Нужен новый CURSOR_API_KEY: cursor.com → Settings → API Keys.\n' +
          'GitHub и Vercel тут не помогут — это другой ключ.\n',
      );
    } else if (/network request failed|fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(msg)) {
      sendLog(
        '💡 Нет связи с серверами Cursor.\n' +
          'Проверьте интернет, VPN/прокси и что ключ настоящий (key_/crsr_, не короткий текст).\n' +
          'Ключ: cursor.com → Settings → API Keys → Create API Key.\n',
      );
    }
    return { ok: false, error: msg };
  }
});
