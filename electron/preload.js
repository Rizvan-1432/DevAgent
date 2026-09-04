const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('devAgent', {
  checkEnv: () => ipcRenderer.invoke('check-env'),
  getHistory: () => ipcRenderer.invoke('get-history'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  runAgent: (projectPath, mode, options) =>
    ipcRenderer.invoke('run-agent', { projectPath, mode, ...options }),
  stopAgent: () => ipcRenderer.invoke('stop-agent'),
  confirmPush: (opts) => ipcRenderer.invoke('confirm-push', opts),
  saveLog: (projectName) => ipcRenderer.invoke('save-log', { projectName }),
  rollbackCommit: (projectPath) => ipcRenderer.invoke('rollback-commit', { projectPath }),
  syncSkills: () => ipcRenderer.invoke('sync-skills'),
  openReport: (projectPath, mode) => ipcRenderer.invoke('open-report', { projectPath, mode }),
  openEnvFile: () => ipcRenderer.invoke('open-env-file'),
  getEnvSettings: () => ipcRenderer.invoke('get-env-settings'),
  saveEnvSettings: (payload) => ipcRenderer.invoke('save-env-settings', payload),
  onLog: (callback) => {
    ipcRenderer.on('agent-log', (_e, text) => callback(text));
  },
  onProgress: (callback) => {
    ipcRenderer.on('agent-progress', (_e, label) => callback(label));
  },
});
