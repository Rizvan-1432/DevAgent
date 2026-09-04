const pathEl = document.getElementById('projectPath');
const logEl = document.getElementById('log');
const btnPick = document.getElementById('btnPick');
const btnStart = document.getElementById('btnStart');
const btnStartLabel = document.getElementById('btnStartLabel');
const btnStartSpinner = document.getElementById('btnStartSpinner');
const btnStop = document.getElementById('btnStop');
const btnSaveLog = document.getElementById('btnSaveLog');
const btnRollback = document.getElementById('btnRollback');
const btnSyncSkills = document.getElementById('btnSyncSkills');
const historySelect = document.getElementById('historySelect');
const customSection = document.getElementById('customSection');
const envBanner = document.getElementById('envBanner');
const envBannerText = document.getElementById('envBannerText');
const btnOpenEnv = document.getElementById('btnOpenEnv');
const btnOpenSettings = document.getElementById('btnOpenSettings');
const btnToggleSettings = document.getElementById('btnToggleSettings');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const settingsBody = document.getElementById('settingsBody');
const settingsSaved = document.getElementById('settingsSaved');
const cursorApiKeyEl = document.getElementById('cursorApiKey');
const githubTokenEl = document.getElementById('githubToken');
const vercelTokenEl = document.getElementById('vercelToken');
const progressBar = document.getElementById('progressBar');
const progressLabel = document.getElementById('progressLabel');
const progressFill = document.getElementById('progressFill');
const progressTimer = document.getElementById('progressTimer');
const progressHint = document.getElementById('progressHint');
const appStatus = document.getElementById('appStatus');
const appStatusText = document.getElementById('appStatusText');
const logLiveBadge = document.getElementById('logLiveBadge');
const diffModal = document.getElementById('diffModal');
const diffContent = document.getElementById('diffContent');
const diffFiles = document.getElementById('diffFiles');

let projectPath = '';
let pendingPush = null;
let running = false;
let runStartedAt = 0;
let timerInterval = null;
let heartbeatInterval = null;
let lastProgressLabel = 'Работаю';

function projectName() {
  if (!projectPath) return 'project';
  return projectPath.split(/[/\\]/).pop() || 'project';
}

function getMode() {
  const r = document.querySelector('input[name="mode"]:checked');
  return r ? r.value : 'check';
}

function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function setAppStatus(kind, text) {
  appStatus.className = `app-status ${kind}`;
  appStatusText.textContent = text;
}

function stopTimers() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function startTimers() {
  stopTimers();
  runStartedAt = Date.now();
  progressTimer.textContent = '0:00';
  timerInterval = setInterval(() => {
    progressTimer.textContent = formatElapsed(Date.now() - runStartedAt);
  }, 250);

  let ticks = 0;
  heartbeatInterval = setInterval(() => {
    if (!running) return;
    ticks += 1;
    // Soft heartbeat in log so user sees life even without agent events
    if (ticks % 4 === 0) {
      const line = `\n⏳ Ещё работаю… ${formatElapsed(Date.now() - runStartedAt)} · ${lastProgressLabel}\n`;
      // Avoid flooding: only append heartbeat if log is short or ends without recent heartbeat
      if (!logEl.textContent.includes('Ещё работаю…') || logEl.textContent.trim().endsWith(lastProgressLabel) === false) {
        // replace previous heartbeat line if present at end
        logEl.textContent = logEl.textContent.replace(/\n⏳ Ещё работаю…[^\n]*\n?$/, '') + line;
        logEl.scrollTop = logEl.scrollHeight;
      } else {
        logEl.textContent = logEl.textContent.replace(/\n⏳ Ещё работаю…[^\n]*\n?$/, line);
        logEl.scrollTop = logEl.scrollHeight;
      }
    }
  }, 3000);
}

function showProgress(label, { indeterminate = true } = {}) {
  lastProgressLabel = label || 'Работаю';
  progressBar.classList.remove('hidden');
  progressLabel.textContent = lastProgressLabel;
  progressHint.textContent = 'Агент работает — подождите, это может занять несколько минут';
  progressBar.querySelector('.progress-track').classList.toggle('indeterminate', indeterminate);
  if (!indeterminate) {
    progressFill.style.width = '100%';
    progressFill.style.transform = 'none';
  } else {
    progressFill.style.width = '';
  }
}

function hideProgressSoon() {
  setTimeout(() => {
    if (!running) progressBar.classList.add('hidden');
  }, 1200);
}

function setRunning(isRunning) {
  running = isRunning;
  btnStart.disabled = isRunning;
  btnPick.disabled = isRunning;
  btnStop.disabled = !isRunning;
  btnRollback.disabled = isRunning;
  btnSyncSkills.disabled = isRunning;
  btnSaveSettings.disabled = isRunning;

  btnStart.classList.toggle('is-running', isRunning);
  btnStartLabel.textContent = isRunning ? 'Работаю' : 'Начать';
  btnStartSpinner.classList.toggle('hidden', !isRunning);
  logLiveBadge.classList.toggle('hidden', !isRunning);
  logEl.classList.toggle('is-running', isRunning);

  if (isRunning) {
    setAppStatus('running', 'Работает…');
    showProgress('Запуск…');
    startTimers();
  } else {
    stopTimers();
  }
}

function finishRun(ok) {
  const elapsed = formatElapsed(Date.now() - (runStartedAt || Date.now()));
  if (ok) {
    setAppStatus('done', `Готово · ${elapsed}`);
    showProgress(`Готово за ${elapsed}`, { indeterminate: false });
  } else {
    setAppStatus('error', `Ошибка · ${elapsed}`);
    showProgress(`Остановлено / ошибка · ${elapsed}`, { indeterminate: false });
  }
  hideProgressSoon();
  setTimeout(() => {
    if (!running) setAppStatus('idle', 'Готов');
  }, 5000);
}

function getOptions() {
  return {
    pushToGitHub: document.getElementById('pushGitHub').checked,
    previewDiff: document.getElementById('previewDiff').checked,
    deployVercel: document.getElementById('deployVercel').checked,
    requireTests: document.getElementById('requireTests').checked,
    maxFiles: Number(document.getElementById('maxFiles').value) || 25,
    customPrompt: document.getElementById('customPrompt').value.trim(),
    openReport: true,
  };
}

function setPill(el, ok, masked) {
  if (!el) return;
  if (ok) {
    el.textContent = masked ? `сохранён (${masked})` : 'сохранён';
    el.className = 'status-pill ok';
  } else {
    el.textContent = 'не задан';
    el.className = 'status-pill bad';
  }
}

async function loadApiSettings() {
  const s = await window.devAgent.getEnvSettings();
  setPill(document.getElementById('cursorStatus'), s.hasCursorApiKey, s.cursorApiKeyMasked);
  setPill(document.getElementById('githubStatus'), s.hasGithubToken, s.githubTokenMasked);
  setPill(document.getElementById('vercelStatus'), s.hasVercelToken, s.vercelTokenMasked);
  cursorApiKeyEl.placeholder = s.hasCursorApiKey
    ? `Сохранён: ${s.cursorApiKeyMasked} — вставьте новый, чтобы заменить`
    : 'Вставьте ключ Cursor…';
  githubTokenEl.placeholder = s.hasGithubToken
    ? `Сохранён: ${s.githubTokenMasked} — вставьте новый, чтобы заменить`
    : 'Опционально, для push…';
  vercelTokenEl.placeholder = s.hasVercelToken
    ? `Сохранён: ${s.vercelTokenMasked} — вставьте новый, чтобы заменить`
    : 'Опционально, для деплоя…';
  return s;
}

async function loadEnvStatus() {
  const status = await window.devAgent.checkEnv();
  await loadApiSettings();
  if (status.ok && status.warnings.length === 0) {
    envBanner.classList.add('hidden');
    return;
  }
  envBanner.classList.remove('hidden');
  const parts = [];
  if (!status.ok) parts.push(...status.issues.map((i) => `❌ ${i}`));
  parts.push(...status.warnings.map((w) => `⚠️ ${w}`));
  envBannerText.textContent = parts.join(' · ');
  envBanner.classList.toggle('env-error', !status.ok);
}

btnOpenEnv.addEventListener('click', async () => {
  await window.devAgent.openEnvFile();
  setTimeout(loadEnvStatus, 1500);
});

btnOpenSettings.addEventListener('click', () => {
  settingsBody.classList.remove('hidden');
  document.getElementById('apiSettings').scrollIntoView({ behavior: 'smooth', block: 'start' });
  cursorApiKeyEl.focus();
});

btnToggleSettings.addEventListener('click', () => {
  const hidden = settingsBody.classList.toggle('hidden');
  btnToggleSettings.textContent = hidden ? 'Развернуть' : 'Свернуть';
});

btnSaveSettings.addEventListener('click', async () => {
  btnSaveSettings.disabled = true;
  settingsSaved.textContent = 'Сохраняю…';
  const result = await window.devAgent.saveEnvSettings({
    cursorApiKey: cursorApiKeyEl.value.trim(),
    githubToken: githubTokenEl.value.trim(),
    vercelToken: vercelTokenEl.value.trim(),
  });
  btnSaveSettings.disabled = false;
  if (!result.ok) {
    settingsSaved.textContent = `Ошибка: ${result.error || 'не удалось сохранить'}`;
    return;
  }
  cursorApiKeyEl.value = '';
  githubTokenEl.value = '';
  vercelTokenEl.value = '';
  settingsSaved.textContent = '✅ Сохранено — можно запускать';
  await loadEnvStatus();
  setTimeout(() => {
    settingsSaved.textContent = '';
  }, 4000);
});

async function loadHistory() {
  const items = await window.devAgent.getHistory();
  const paths = [...new Set(items.map((i) => i.projectPath).filter(Boolean))];
  if (paths.length === 0) {
    historySelect.classList.add('hidden');
    return;
  }
  historySelect.classList.remove('hidden');
  historySelect.innerHTML = '<option value="">— Недавние проекты —</option>';
  for (const p of paths.slice(0, 10)) {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p.split(/[/\\]/).pop() + ' — ' + p;
    historySelect.appendChild(opt);
  }
}

document.querySelectorAll('input[name="mode"]').forEach((el) => {
  el.addEventListener('change', () => {
    customSection.classList.toggle('hidden', getMode() !== 'custom');
  });
});

historySelect.addEventListener('change', () => {
  if (historySelect.value) {
    projectPath = historySelect.value;
    pathEl.value = projectPath;
  }
});

btnPick.addEventListener('click', async () => {
  const p = await window.devAgent.selectFolder();
  if (p) {
    projectPath = p;
    pathEl.value = p;
  }
});

window.devAgent.onLog((text) => {
  // Strip trailing heartbeat before real log arrives
  logEl.textContent = logEl.textContent.replace(/\n⏳ Ещё работаю…[^\n]*\n?$/, '');
  logEl.textContent += text;
  logEl.scrollTop = logEl.scrollHeight;
});

window.devAgent.onProgress((label) => {
  showProgress(label || 'Работаю…');
  setAppStatus('running', label || 'Работает…');
});

btnStop.addEventListener('click', async () => {
  await window.devAgent.stopAgent();
  setRunning(false);
  finishRun(false);
  logEl.textContent += '\n\n⏹ Остановлено.\n';
});

btnSaveLog.addEventListener('click', async () => {
  const r = await window.devAgent.saveLog(projectName());
  if (r.ok) logEl.textContent += `\n💾 Лог сохранён: ${r.file}\n`;
});

btnRollback.addEventListener('click', async () => {
  if (!projectPath) return;
  if (!confirm('Отменить последний коммит? (hard reset)')) return;
  const r = await window.devAgent.rollbackCommit(projectPath);
  logEl.textContent += r.ok ? `\n${r.message}\n` : `\n⚠️ ${r.error}\n`;
});

btnSyncSkills.addEventListener('click', async () => {
  btnSyncSkills.disabled = true;
  const r = await window.devAgent.syncSkills();
  logEl.textContent += r.ok ? `\n${r.message}\n` : `\n⚠️ ${r.error}\n`;
  btnSyncSkills.disabled = false;
});

document.getElementById('btnCancelPush').addEventListener('click', () => {
  diffModal.close();
  pendingPush = null;
  logEl.textContent += '\n⏭ Push отменён пользователем.\n';
});

document.getElementById('btnConfirmPush').addEventListener('click', async () => {
  if (!pendingPush) return;
  diffModal.close();
  setRunning(true);
  showProgress('Отправка на GitHub…');
  const r = await window.devAgent.confirmPush(pendingPush);
  setRunning(false);
  if (!r.ok && r.error) {
    logEl.textContent += `\n⚠️ ${r.error}\n`;
    finishRun(false);
  } else {
    logEl.textContent += '\n\n✅ Готово.\n';
    finishRun(true);
  }
  pendingPush = null;
  loadHistory();
});

btnStart.addEventListener('click', async () => {
  const envNow = await window.devAgent.checkEnv();
  if (!envNow.ok) {
    settingsBody.classList.remove('hidden');
    btnToggleSettings.textContent = 'Свернуть';
    logEl.textContent = '⚠️ Сначала вставьте Cursor API Key в блоке «API-ключи» и нажмите «Сохранить ключи»';
    setAppStatus('error', 'Нет API-ключа');
    cursorApiKeyEl.focus();
    return;
  }
  if (!projectPath) {
    logEl.textContent = '⚠️ Сначала выберите папку проекта (кнопка «Выбрать» выше)';
    setAppStatus('error', 'Нет проекта');
    pathEl.focus();
    return;
  }
  if (getMode() === 'custom' && !document.getElementById('customPrompt').value.trim()) {
    logEl.textContent = '⚠️ Введите свою задачу';
    setAppStatus('error', 'Нет задачи');
    return;
  }

  setRunning(true);
  logEl.textContent = '🚀 Запуск…\n⏳ Подключаюсь к Cursor';
  showProgress('Подключение к Cursor…');

  const result = await window.devAgent.runAgent(projectPath, getMode(), getOptions());

  // remove heartbeat leftovers
  logEl.textContent = logEl.textContent.replace(/\n⏳ Ещё работаю…[^\n]*\n?$/g, '');

  if (!result.ok && result.error) {
    logEl.textContent += `\n⚠️ ${result.error}`;
    setRunning(false);
    finishRun(false);
    loadHistory();
    return;
  }

  if (result.needsPushConfirm && result.diffPreview) {
    setRunning(false);
    setAppStatus('running', 'Ждёт подтверждения push');
    showProgress('Проверьте изменения и подтвердите push', { indeterminate: false });
    progressFill.style.width = '100%';
    pendingPush = {
      projectPath,
      mode: result.mode,
      deployVercel: result.deployVercel,
      maxFiles: result.maxFiles,
      requireTests: result.requireTests,
    };
    diffContent.textContent = result.diffPreview.stat || result.diffPreview.diff || 'Нет diff';
    diffFiles.textContent = `Файлов: ${(result.diffPreview.files || []).length}`;
    diffModal.showModal();
    loadHistory();
    return;
  }

  setRunning(false);
  finishRun(true);
  loadHistory();
});

loadEnvStatus();
loadHistory();
setAppStatus('idle', 'Готов');
