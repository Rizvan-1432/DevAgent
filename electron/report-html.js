const fs = require('fs');
const path = require('path');
const { redactSecrets } = require('./errors-ru');

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mdLiteToHtml(text) {
  const lines = String(text || '').split(/\r?\n/);
  const out = [];
  let inList = false;
  for (const line of lines) {
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${escapeHtml(line.replace(/^\s*[-*]\s+/, ''))}</li>`);
      continue;
    }
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
    if (/^###\s+/.test(line)) out.push(`<h3>${escapeHtml(line.replace(/^###\s+/, ''))}</h3>`);
    else if (/^##\s+/.test(line)) out.push(`<h2>${escapeHtml(line.replace(/^##\s+/, ''))}</h2>`);
    else if (/^#\s+/.test(line)) out.push(`<h1>${escapeHtml(line.replace(/^#\s+/, ''))}</h1>`);
    else if (!line.trim()) out.push('<br/>');
    else out.push(`<p>${escapeHtml(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

function writeHtmlReport({ projectPath, mode, logText, compareText }) {
  const safeLog = redactSecrets(logText || 'Отчёт пуст');
  const projectName = path.basename(projectPath || 'project');
  const when = new Date().toLocaleString('ru-RU');
  const compareBlock = compareText
    ? `<section class="compare"><h2>Сравнение с прошлой проверкой</h2><pre>${escapeHtml(compareText)}</pre></section>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Отчёт Dev Agent — ${escapeHtml(projectName)}</title>
  <style>
    :root { --bg:#0f1117; --card:#171b26; --text:#e8eaf0; --muted:#94a3b8; --accent:#3b82f6; }
    body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--text); }
    .wrap { max-width: 860px; margin: 0 auto; padding: 32px 20px 60px; }
    header { border-bottom: 1px solid #243044; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { margin: 0 0 8px; font-size: 1.8rem; }
    .meta { color: var(--muted); font-size: 0.92rem; }
    .card { background: var(--card); border: 1px solid #243044; border-radius: 12px; padding: 20px; }
    pre { white-space: pre-wrap; word-break: break-word; font-size: 0.9rem; line-height: 1.5; }
    .actions { margin-top: 18px; display:flex; gap:10px; flex-wrap:wrap; }
    button, .btn { background: var(--accent); color:#fff; border:0; border-radius:8px; padding:10px 14px; font-weight:600; cursor:pointer; text-decoration:none; display:inline-block; }
    @media print {
      body { background:#fff; color:#111; }
      .card { border:1px solid #ddd; background:#fff; }
      .actions { display:none; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>Отчёт Dev Agent</h1>
      <div class="meta">Проект: <strong>${escapeHtml(projectName)}</strong> · Режим: ${escapeHtml(mode || 'check')} · ${escapeHtml(when)}</div>
    </header>
    <div class="actions">
      <button onclick="window.print()">Печать / сохранить PDF</button>
    </div>
    ${compareBlock}
    <section class="card">
      ${mdLiteToHtml(safeLog)}
    </section>
  </div>
</body>
</html>`;

  const outDir = path.join(projectPath || process.cwd());
  const file = path.join(outDir, `DEV-AGENT-ОТЧЁТ.html`);
  fs.writeFileSync(file, html, 'utf8');
  return file;
}

module.exports = { writeHtmlReport, mdLiteToHtml };
