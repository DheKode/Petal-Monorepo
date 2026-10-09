import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_APP_INFO, IPC_GET_STATE, IPC_SAVE_SETUP, IPC_RECORD_INTAKE, IPC_UNDO_INTAKE, IPC_RECORD_BATCH,
  IPC_BACKUP_EXPORT, IPC_BACKUP_PICK_IMPORT, IPC_BACKUP_CONFIRM_IMPORT, IPC_BACKUP_CANCEL_IMPORT, IPC_SAVE_BLEEDING, IPC_DELETE_BLEEDING, IPC_CHANGE_USUAL_TIME, type PetalBridge,
} from '../shared/ipc';
import { AI_ASK, AI_CANCEL, AI_CONFIRM, AI_DISCARD, AI_MODEL_INFO, AI_MODEL_PICK, AI_PREVIEW } from '../shared/ai';

const bridge: PetalBridge = {
  getAppInfo: () => ipcRenderer.invoke(IPC_APP_INFO),
  getState: () => ipcRenderer.invoke(IPC_GET_STATE),
  saveSetup: input => ipcRenderer.invoke(IPC_SAVE_SETUP, input),
  recordIntake: input => ipcRenderer.invoke(IPC_RECORD_INTAKE, input),
  undoIntake: doseId => ipcRenderer.invoke(IPC_UNDO_INTAKE, doseId),
  recordIntakeBatch: inputs => ipcRenderer.invoke(IPC_RECORD_BATCH, inputs),
  saveBleeding: input => ipcRenderer.invoke(IPC_SAVE_BLEEDING, input),
  deleteBleeding: id => ipcRenderer.invoke(IPC_DELETE_BLEEDING, id),
  changeUsualTime: usualTime => ipcRenderer.invoke(IPC_CHANGE_USUAL_TIME, usualTime),
  exportBackup: () => ipcRenderer.invoke(IPC_BACKUP_EXPORT),
  pickImport: () => ipcRenderer.invoke(IPC_BACKUP_PICK_IMPORT),
  confirmImport: token => ipcRenderer.invoke(IPC_BACKUP_CONFIRM_IMPORT, token),
  cancelImport: token => ipcRenderer.invoke(IPC_BACKUP_CANCEL_IMPORT, token),
  askAi: input => ipcRenderer.invoke(AI_ASK, input),
  cancelAi: () => ipcRenderer.invoke(AI_CANCEL),
  getAiModelInfo: () => ipcRenderer.invoke(AI_MODEL_INFO),
  pickAiModel: () => ipcRenderer.invoke(AI_MODEL_PICK),
  previewAiCorrection: input => ipcRenderer.invoke(AI_PREVIEW, input),
  confirmAiCorrection: token => ipcRenderer.invoke(AI_CONFIRM, token),
  discardAiCorrection: token => ipcRenderer.invoke(AI_DISCARD, token),
};

contextBridge.exposeInMainWorld('petal', bridge);
