const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function snapshotPath(userDataDir, projectPath) {
  const id = crypto.createHash('sha1').update(String(projectPath)).digest('hex').slice(0, 12);
  return path.join(userDataDir, 'snapshots', `${id}.json`);
}

function loadSnapshot(userDataDir, projectPath) {
  try {
    return JSON.parse(fs.readFileSync(snapshotPath(userDataDir, projectPath), 'utf8'));
  } catch {
    return null;
  }
}

function saveSnapshot(userDataDir, projectPath, payload) {
  const file = snapshotPath(userDataDir, projectPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        projectPath,
        at: new Date().toISOString(),
        ...payload,
      },
      null,
      2,
    ),
  );
}

function summarizeForCompare(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const issues = lines.filter((l) => /❌|⚠️|критич|уязвим|error|fail/i.test(l)).slice(0, 20);
  const fixes = lines.filter((l) => /✅|исправ|fixed|готово/i.test(l)).slice(0, 20);
  return { issues, fixes, lineCount: lines.length };
}

function buildCompareText(prev, nextSummary) {
  if (!prev) return 'Это первая проверка проекта — сравнения пока нет.';
  const prevSum = prev.summary || summarizeForCompare(prev.logText || '');
  const prevIssues = new Set(prevSum.issues || []);
  const nextIssues = new Set(nextSummary.issues || []);
  const gone = [...prevIssues].filter((x) => !nextIssues.has(x));
  const fresh = [...nextIssues].filter((x) => !prevIssues.has(x));
  const lines = [
    `Прошлая проверка: ${prev.at || '—'}`,
    `Было проблемных строк: ${(prevSum.issues || []).length}`,
    `Сейчас проблемных строк: ${(nextSummary.issues || []).length}`,
    '',
    gone.length ? `Ушло / исправлено:\n- ${gone.slice(0, 8).join('\n- ')}` : 'Явно исчезнувших старых пунктов не видно.',
    '',
    fresh.length ? `Новое:\n- ${fresh.slice(0, 8).join('\n- ')}` : 'Новых проблемных пунктов не найдено.',
  ];
  return lines.join('\n');
}

module.exports = {
  loadSnapshot,
  saveSnapshot,
  summarizeForCompare,
  buildCompareText,
};
