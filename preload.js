const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronBridge', {
  scrollWebview: (wcId, dir) => ipcRenderer.invoke('wv-scroll', wcId, dir),
});
