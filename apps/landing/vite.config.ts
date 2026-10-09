import {defineConfig} from 'vite';
import {htmlPartials} from './tooling/htmlPartials';
// Relative base so the build works from any static host path (e.g. GitHub Pages).
export default defineConfig({base:'./',plugins:[htmlPartials()],server:{port:5174,strictPort:true}});
