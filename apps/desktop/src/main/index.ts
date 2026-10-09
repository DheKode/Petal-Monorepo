import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { DOMAIN_PACKAGE_VERSION } from '@petal/domain';
import { IPC_APP_INFO, type AppInfo } from '../shared/ipc';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    show: false,
    title: 'Petal',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  win.once('ready-to-show', () => win.show());

  // Petal is offline-first: never open new windows or navigate away from the bundled UI.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

ipcMain.handle(IPC_APP_INFO, (): AppInfo => ({
  appVersion: app.getVersion(),
  domainVersion: DOMAIN_PACKAGE_VERSION,
  platform: process.platform,
}));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
