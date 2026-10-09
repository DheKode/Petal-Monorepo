import { defineConfig } from 'electron-vite';
import {resolve} from 'node:path';
import react from '@vitejs/plugin-react';

// Everything is a devDependency, so electron-vite bundles it (including the
// compiled @petal/domain package and its zod dependency) and the packaged app
// ships no node_modules.
export default defineConfig({
  main: {build:{rollupOptions:{input:{index:resolve(__dirname,'src/main/index.ts'),aiWorker:resolve(__dirname,'src/main/aiWorker.ts')},external:['node-llama-cpp']}}},
  preload: {},
  renderer: {
    plugins: [react()],
  },
});
