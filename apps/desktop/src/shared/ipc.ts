export const IPC_APP_INFO = 'petal:app-info';

export interface AppInfo {
  appVersion: string;
  /** Result of a @petal/domain call made in the main process; proves the package is bundled there. */
  domainCheck: string;
  platform: string;
}

export interface PetalBridge {
  getAppInfo(): Promise<AppInfo>;
}
