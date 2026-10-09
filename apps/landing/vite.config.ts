import {defineConfig} from 'vite';
// Relative base so the build works from any static host path (e.g. GitHub Pages).
export default defineConfig({base:'./',server:{port:5174,strictPort:true}});
