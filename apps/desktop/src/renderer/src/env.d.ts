/// <reference types="vite/client" />
import type { PetalBridge } from '../../shared/ipc';

declare global {
  interface Window {
    petal: PetalBridge;
  }
}
