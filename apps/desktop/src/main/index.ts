import { app, BrowserWindow, dialog, ipcMain, Menu, type IpcMainInvokeEvent } from 'electron';
import { join } from 'node:path';
import {
  IPC_APP_INFO, IPC_GET_STATE, IPC_SAVE_SETUP, IPC_RECORD_INTAKE, IPC_UNDO_INTAKE,
  type AppInfo, type RecordIntakeInput, type SetupInput,
} from '../shared/ipc';
import { SqliteStore } from './sqliteStore';
import { PetalService } from './service';
// Same artwork electron-builder uses for installers (build/icon.png); ?asset bundles it and returns its path.
import icon from '../../build/icon.png?asset';

// Name and data folder must be set before the first call to app.getPath('userData'). A --user-data-dir switch (used by
// tests) wins; unpackaged runs use a separate folder so development data never mixes with an installed app's.
app.setName('Petal');
if (!app.isPackaged && !app.commandLine.hasSwitch('user-data-dir')) {
  app.setPath('userData', join(app.getPath('appData'), 'Petal-dev'));
}

let store: SqliteStore | null = null;
let service: PetalService | null = null;
let mainWindow: BrowserWindow | null = null;

// One copy per data folder: two copies would write to the same database and fail each other's saves.
const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) app.quit();
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function requireService(): PetalService {
  if (!service) throw new Error('Storage is not open');
  return service;
}

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
handle(IPC_GET_STATE, () => requireService().getState());
handle(IPC_SAVE_SETUP, (input: SetupInput) => requireService().saveSetup(input));
handle(IPC_RECORD_INTAKE, (input: RecordIntakeInput) => requireService().recordIntake(input));
handle(IPC_UNDO_INTAKE, (doseId: string) => requireService().undoIntake(doseId));

app.whenReady().then(async () => {
  if (!hasInstanceLock) return;
  // No File/Edit/View/Window menu bar. macOS always shows a system menu bar and needs the Edit roles for
  // copy/paste shortcuts, so it keeps only the app and edit menus.
  Menu.setApplicationMenu(
    process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }]) : null,
  );
  try {
    store = await SqliteStore.open(join(app.getPath('userData'), 'petal.db'), app.getVersion());
    service = new PetalService(store);
  } catch (error) {
    // Never start with an empty in-memory fallback: the user would think their records were lost or keep logging into nothing.
    // Only the error code is logged (never record contents).
    const code = typeof (error as { code?: unknown })?.code === 'string' ? (error as { code: string }).code : 'unknown';
    console.error(`Petal could not open its data file (${code})`);
    dialog.showErrorBox(
      'Petal could not open its data file',
      code === 'unsupported-storage-version'
        ? 'This data file was created by a newer version of Petal, so this version will not open it. Nothing was changed or deleted.'
        : `Nothing was changed or deleted. Close other copies of Petal and try again. (Error: ${code})`,
    );
    app.quit();
    return;
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Let in-flight saves finish before the database is closed; otherwise the last tap could be lost on quit.
let closing = false;
app.on('before-quit', event => {
  if (closing || !service) return;
  closing = true;
  event.preventDefault();
  const pending = service;
  service = null;
  void pending.idle().finally(() => {
    store?.close();
    store = null;
    app.quit();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
