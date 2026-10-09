import { contextBridge, ipcRenderer } from 'electron';
import { IPC_APP_INFO, type PetalBridge } from '../shared/ipc';

const bridge: PetalBridge = {
  getAppInfo: () => ipcRenderer.invoke(IPC_APP_INFO),
};

contextBridge.exposeInMainWorld('petal', bridge);
