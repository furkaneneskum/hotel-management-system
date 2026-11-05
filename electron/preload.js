'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('atalifeDesktop', {
  savePdf: name => ipcRenderer.invoke('atalife:save-pdf', String(name || 'rapor.pdf')),
  saveFile: (name, content) => ipcRenderer.invoke('atalife:save-file', String(name || 'dosya.txt'), String(content || '')),
});
