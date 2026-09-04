const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  saveSnapshot,
  loadSnapshot,
  summarizeForCompare,
  buildCompareText,
} = require('../electron/compare');

test('compare detects gone issues', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmp-'));
  const project = '/tmp/demo-project';
  saveSnapshot(dir, project, {
    logText: '❌ XSS на форме\n⚠️ Медленная страница',
    summary: summarizeForCompare('❌ XSS на форме\n⚠️ Медленная страница'),
  });
  const prev = loadSnapshot(dir, project);
  const next = summarizeForCompare('✅ Форма исправлена\nВсё ок');
  const text = buildCompareText(prev, next);
  assert.match(text, /Ушло|исправлено|XSS/i);
});
