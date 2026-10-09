export const IPC_APP_INFO = 'petal:app-info';

export interface AppInfo {
  appVersion: string;
  domainVersion: string;
  platform: string;
}

export interface PetalBridge {
  getAppInfo(): Promise<AppInfo>;
}
