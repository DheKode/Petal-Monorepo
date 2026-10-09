import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { join } from 'node:path';
import {
  IPC_APP_INFO, IPC_GET_STATE, IPC_SAVE_SETUP, IPC_RECORD_INTAKE, IPC_UNDO_INTAKE,
  type AppInfo, type RecordIntakeInput, type SetupInput,
} from '../shared/ipc';
import { MemoryStore } from './store';
import { PetalService } from './service';
// Same artwork electron-builder uses for installers (build/icon.png); ?asset bundles it and returns its path.
import icon from '../../build/icon.png?asset';

// Temporary non-persistent store until the SQLite adapter (#6) is merged; see store.ts.
const service = new PetalService(new MemoryStore());
let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    show: false,
    title: 'Petal',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  mainWindow = win;
  win.on('closed', () => {
    mainWindow = null;
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

/** Only the app window may call the main process. */
function handle<A extends unknown[], R>(channel: string, fn: (...args: A) => R): void {
  ipcMain.handle(channel, (event: IpcMainInvokeEvent, ...args: unknown[]) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error('Untrusted caller');
    return fn(...(args as A));
  });
}

handle(IPC_APP_INFO, (): AppInfo => ({ appVersion: app.getVersion(), platform: process.platform }));
handle(IPC_GET_STATE, () => service.getState());
handle(IPC_SAVE_SETUP, (input: SetupInput) => service.saveSetup(input));
handle(IPC_RECORD_INTAKE, (input: RecordIntakeInput) => service.recordIntake(input));
handle(IPC_UNDO_INTAKE, (doseId: string) => service.undoIntake(doseId));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
