'use strict';

const { app, BrowserWindow, Menu, protocol, net, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const ICON = path.join(ROOT, 'assets', 'app-icon.ico');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'atalife',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'ATA LİFE GUEST HOUSE',
    backgroundColor: '#F5F2EA',
    icon: ICON,
    autoHideMenuBar: true,
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.webContents.on('did-fail-load', (_event, code, description) => {
    console.error('Sayfa yuklenemedi', code, description);
  });
  win.loadURL('atalife://app/index.html');
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.atalife.guesthouse');
  protocol.handle('atalife', (request) => {
    const url = new URL(request.url);
    let rel = decodeURIComponent(url.pathname);
    if (rel.startsWith('/')) rel = rel.slice(1);
    if (!rel) rel = 'index.html';
    const filePath = path.resolve(ROOT, rel);
    const rootPrefix = ROOT.toLowerCase().endsWith(path.sep) ? ROOT.toLowerCase() : `${ROOT.toLowerCase()}${path.sep}`;
    if (!filePath.toLowerCase().startsWith(rootPrefix) && filePath.toLowerCase() !== ROOT.toLowerCase()) {
      return new Response('Forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
  Menu.setApplicationMenu(null);

  ipcMain.handle('atalife:save-pdf', async (event, name) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Raporu PDF olarak kaydet',
      defaultPath: path.join(app.getPath('documents'), path.basename(name)),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (canceled || !filePath) return { ok: false };
    const data = await event.sender.printToPDF({ printBackground: true, pageSize: 'A4', margins: { marginType: 'default' } });
    fs.writeFileSync(filePath, data);
    return { ok: true, filePath };
  });

  ipcMain.handle('atalife:save-file', async (event, name, content) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const ext = path.extname(name).replace('.', '') || 'txt';
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Dosyayı kaydet',
      defaultPath: path.join(app.getPath('documents'), path.basename(name)),
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
    if (canceled || !filePath) return { ok: false };
    fs.writeFileSync(filePath, content, 'utf8');
    return { ok: true, filePath };
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('second-instance', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.on('window-all-closed', () => {
  app.quit();
});
