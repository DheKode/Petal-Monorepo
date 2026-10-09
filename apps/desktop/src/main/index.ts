import {AiService} from './aiService';
import {AiRuntime} from './aiRuntime';
import {AI_ASK,AI_CANCEL,AI_MODEL_INFO,AI_MODEL_PICK,AI_PREVIEW,AI_CONFIRM,AI_DISCARD,type AiQuestion,type AiCorrection} from '../shared/ai';
import { app, BrowserWindow, dialog, ipcMain, Menu, type IpcMainInvokeEvent } from 'electron';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { MAX_BACKUP_BYTES } from '@petal/domain';
import {
  IPC_APP_INFO, IPC_GET_STATE, IPC_SAVE_SETUP, IPC_RECORD_INTAKE, IPC_UNDO_INTAKE, IPC_RECORD_BATCH, IPC_SAVE_BLEEDING, IPC_DELETE_BLEEDING,
  IPC_BACKUP_EXPORT, IPC_BACKUP_PICK_IMPORT, IPC_BACKUP_CONFIRM_IMPORT, IPC_BACKUP_CANCEL_IMPORT,
  type AppInfo, type BleedingInput, type ExportOutcome, type PickImportOutcome, type RecordIntakeInput, type Result, type SetupInput,
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

// Log only the kind of failure, never its message: an unexpected error's text can quote the data it was handling
// (a JSON parse error, for example, repeats part of the input). Electron's default handler would print and show it all.
function reportUnexpected(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  console.error(`Petal hit an unexpected error (${name})`);
  return name;
}
process.on('uncaughtException', error => {
  const name = reportUnexpected(error);
  if (app.isReady()) {
    dialog.showErrorBox('Petal hit an unexpected error', `Petal will close. Your saved records were not changed. (Error: ${name})`);
  }
  app.exit(1);
});
process.on('unhandledRejection', reason => {
  reportUnexpected(reason);
});

let store: SqliteStore | null = null;
let service: PetalService | null = null;
let mainWindow: BrowserWindow | null = null;
let ai:AiService|null=null;
let aiRuntime:AiRuntime|null=null;
function requireAi():AiService {if(!ai)throw new Error('AI service not ready');return ai;}
function requireRuntime():AiRuntime {if(!aiRuntime)throw new Error('AI runtime not ready');return aiRuntime;}

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
    ai?.close();
    aiRuntime?.dispose();
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

handle(AI_ASK,(input:AiQuestion)=>requireAi().ask(input));
handle(AI_CANCEL,()=>requireAi().cancel());
handle(AI_MODEL_INFO,()=>requireRuntime().info());
handle(AI_PREVIEW,(input:AiCorrection)=>requireAi().preview(input));
handle(AI_CONFIRM,(token:string)=>requireAi().confirm(token));
handle(AI_DISCARD,(token:string)=>requireAi().discard(token));
handle(AI_MODEL_PICK,async()=>{
  if(!mainWindow)return {ok:false,message:'The window is not available.'};
  const chosen=await dialog.showOpenDialog(mainWindow,{title:'Choose your downloaded Gemma 3 1B IT Q4_K_M model',properties:['openFile'],filters:[{name:'GGUF model',extensions:['gguf']}]});
  if(chosen.canceled||!chosen.filePaths[0])return {ok:true,value:await requireRuntime().info()};
  requireAi().cancel();
  try{await requireRuntime().select(chosen.filePaths[0]);return {ok:true,value:await requireRuntime().info()};}
  catch{return {ok:false,message:'That file could not be verified as the supported Gemma artifact. Your records were not changed.'};}
});

handle(IPC_APP_INFO, (): AppInfo => ({ appVersion: app.getVersion(), platform: process.platform, dataFolder: app.getPath('userData') }));
handle(IPC_GET_STATE, () => requireService().getState());
handle(IPC_SAVE_SETUP, (input: SetupInput) => requireService().saveSetup(input));
handle(IPC_RECORD_INTAKE, (input: RecordIntakeInput) => requireService().recordIntake(input));
handle(IPC_UNDO_INTAKE, (doseId: string) => requireService().undoIntake(doseId));
handle(IPC_RECORD_BATCH, (inputs: RecordIntakeInput[]) => requireService().recordIntakeBatch(inputs));
handle(IPC_SAVE_BLEEDING, (input: BleedingInput) => requireService().saveBleeding(input));
handle(IPC_DELETE_BLEEDING, (id: string) => requireService().deleteBleeding(id));

const jsonFilter = [{ name: 'Petal backup (JSON)', extensions: ['json'] }];

/** The user picks the destination in a system dialog; the renderer never supplies or sees a path. */
handle(IPC_BACKUP_EXPORT, async (): Promise<Result<ExportOutcome>> => {
  const win = mainWindow;
  if (!win) return { ok: false, message: 'The window is not available.' };
  const made = await requireService().exportBackup();
  if (!made.ok) return made;
  const day = new Date().toISOString().slice(0, 10);
  const chosen = await dialog.showSaveDialog(win, {
    title: 'Save Petal backup',
    defaultPath: join(app.getPath('documents'), `petal-backup-${day}.json`),
    filters: jsonFilter,
  });
  if (chosen.canceled || !chosen.filePath) return { ok: true, value: { canceled: true } };
  try {
    // The system dialog already asked the user to confirm replacing an existing file.
    await writeFile(chosen.filePath, made.value.json, 'utf8');
  } catch {
    return { ok: false, message: 'The backup could not be saved to that location. Try another folder.' };
  }
  const fileName = basename(chosen.filePath);
  return { ok: true, value: { canceled: false, fileName, sensitivityNotice: made.value.sensitivityNotice } };
});

handle(IPC_BACKUP_PICK_IMPORT, async (): Promise<Result<PickImportOutcome>> => {
  const win = mainWindow;
  if (!win) return { ok: false, message: 'The window is not available.' };
  const chosen = await dialog.showOpenDialog(win, { title: 'Choose a Petal backup', properties: ['openFile'], filters: jsonFilter });
  const path = chosen.filePaths[0];
  if (chosen.canceled || !path) return { ok: true, value: { canceled: true } };
  let json: string;
  try {
    // Check the size before reading so a huge file is never loaded into memory.
    if ((await stat(path)).size > MAX_BACKUP_BYTES) {
      return { ok: false, message: 'That file is too large to be a Petal backup. Your records were not changed.' };
    }
    json = await readFile(path, 'utf8');
  } catch {
    return { ok: false, message: 'That file could not be read. Your records were not changed.' };
  }
  const preview = await requireService().previewImport(json);
  return preview.ok ? { ok: true, value: { canceled: false, preview: preview.value } } : preview;
});

handle(IPC_BACKUP_CONFIRM_IMPORT, (token: string) => requireService().confirmImport(token));
handle(IPC_BACKUP_CANCEL_IMPORT, (token: string) => requireService().cancelImport(token));

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
    aiRuntime=new AiRuntime(app.getPath('userData'));
    ai=new AiService(store,aiRuntime);
    // Model verification runs off the startup path; tracking is immediately available.
    void aiRuntime.initialize();
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
  ai?.close();
  aiRuntime?.dispose();
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
