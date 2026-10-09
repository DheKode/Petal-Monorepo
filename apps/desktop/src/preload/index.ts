import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_APP_INFO, IPC_GET_STATE, IPC_SAVE_SETUP, IPC_RECORD_INTAKE, IPC_UNDO_INTAKE, type PetalBridge,
} from '../shared/ipc';

const bridge: PetalBridge = {
  getAppInfo: () => ipcRenderer.invoke(IPC_APP_INFO),
  getState: () => ipcRenderer.invoke(IPC_GET_STATE),
  saveSetup: input => ipcRenderer.invoke(IPC_SAVE_SETUP, input),
  recordIntake: input => ipcRenderer.invoke(IPC_RECORD_INTAKE, input),
  undoIntake: doseId => ipcRenderer.invoke(IPC_UNDO_INTAKE, doseId),
};

contextBridge.exposeInMainWorld('petal', bridge);
