import { defineConfig } from 'electron-vite';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';

// Everything is a devDependency, so electron-vite bundles it (including the
// compiled @petal/domain package and its zod dependency). The only node_modules
// the packaged app ships are the native runtime dependencies (@libsql/client,
// node-llama-cpp), which stay external.
export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        // The local AI worker runs in its own utility process (#9). node-llama-cpp is a native module, so it stays external.
        input: { index: resolve(__dirname, 'src/main/index.ts'), aiWorker: resolve(__dirname, 'src/main/aiWorker.ts') },
        external: ['node-llama-cpp'],
      },
    },
  },
  preload: {},
  renderer: {
    plugins: [react()],
  },
});
