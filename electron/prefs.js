const fs = require('fs');
const path = require('path');

function prefsPath(userDataDir) {
  return path.join(userDataDir, 'prefs.json');
}

function loadPrefs(userDataDir) {
  try {
    return JSON.parse(fs.readFileSync(prefsPath(userDataDir), 'utf8'));
  } catch {
    return {};
  }
}

function savePrefs(userDataDir, patch = {}) {
  const next = { ...loadPrefs(userDataDir), ...patch, updatedAt: new Date().toISOString() };
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.writeFileSync(prefsPath(userDataDir), JSON.stringify(next, null, 2));
  return next;
}

module.exports = { loadPrefs, savePrefs };
