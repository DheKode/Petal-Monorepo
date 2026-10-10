import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4180,
    strictPort: true,
    fs: {
      allow: [fileURLToPath(new URL('../../../', import.meta.url))],
    },
  },
});
