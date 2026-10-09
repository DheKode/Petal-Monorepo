import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

// Everything is a devDependency, so electron-vite bundles it (including the
// compiled @petal/domain package and its zod dependency) and the packaged app
// ships no node_modules.
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react()],
  },
});
