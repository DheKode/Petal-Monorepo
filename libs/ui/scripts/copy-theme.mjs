import { cp, mkdir } from 'node:fs/promises';

const target = new URL('../dist/src/themes/generated/', import.meta.url);
await mkdir(target, { recursive: true });
await cp(new URL('../src/themes/generated/', import.meta.url), target, { recursive: true });
await cp(new URL('../src/styles/', import.meta.url), new URL('../dist/src/styles/', import.meta.url), { recursive: true });
const fonts = new URL('../dist/src/styles/fonts/', import.meta.url);
await mkdir(fonts, { recursive: true });
for (const name of ['Geist-Variable.woff2', 'OFL.txt', 'README.md']) {
  await cp(new URL(`../../assets/fonts/geist-sans/${name}`, import.meta.url), new URL(name, fonts));
}
