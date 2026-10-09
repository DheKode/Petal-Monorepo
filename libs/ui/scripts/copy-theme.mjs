import { cp, mkdir } from 'node:fs/promises';

const target = new URL('../dist/src/themes/generated/', import.meta.url);
await mkdir(target, { recursive: true });
await cp(new URL('../src/themes/generated/', import.meta.url), target, { recursive: true });
await cp(new URL('../src/styles/', import.meta.url), new URL('../dist/src/styles/', import.meta.url), { recursive: true });
