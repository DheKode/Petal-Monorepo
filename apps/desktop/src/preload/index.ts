import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_APP_INFO, IPC_GET_STATE, IPC_SAVE_SETUP, IPC_RECORD_INTAKE, IPC_UNDO_INTAKE, IPC_RECORD_BATCH,
  IPC_BACKUP_EXPORT, IPC_BACKUP_PICK_IMPORT, IPC_BACKUP_CONFIRM_IMPORT, IPC_BACKUP_CANCEL_IMPORT, type PetalBridge,
} from '../shared/ipc';

const bridge: PetalBridge = {
  getAppInfo: () => ipcRenderer.invoke(IPC_APP_INFO),
  getState: () => ipcRenderer.invoke(IPC_GET_STATE),
  saveSetup: input => ipcRenderer.invoke(IPC_SAVE_SETUP, input),
  recordIntake: input => ipcRenderer.invoke(IPC_RECORD_INTAKE, input),
  undoIntake: doseId => ipcRenderer.invoke(IPC_UNDO_INTAKE, doseId),
  recordIntakeBatch: inputs => ipcRenderer.invoke(IPC_RECORD_BATCH, inputs),
  exportBackup: () => ipcRenderer.invoke(IPC_BACKUP_EXPORT),
  pickImport: () => ipcRenderer.invoke(IPC_BACKUP_PICK_IMPORT),
  confirmImport: token => ipcRenderer.invoke(IPC_BACKUP_CONFIRM_IMPORT, token),
  cancelImport: token => ipcRenderer.invoke(IPC_BACKUP_CANCEL_IMPORT, token),
};

contextBridge.exposeInMainWorld('petal', bridge);
