import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { compileTheme } from './compile.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(await readFile(path.join(root, 'petal.tokens.json'), 'utf8'));
const { files, entries } = compileTheme(source);
const check = process.argv.includes('--check');
if (!check) await mkdir(path.join(root, 'generated'), { recursive: true });
for (const [name, content] of Object.entries(files)) {
  const output = path.join(root, 'generated', name);
  if (check) {
    const existing = await readFile(output, 'utf8').catch(() => null);
    if (existing !== content) throw new Error(`${name} is stale or missing; run node libs/ui/src/themes/scripts/build.mjs`);
  } else await writeFile(output, content);
}
console.log(`${check ? 'Verified' : 'Generated'} ${files ? Object.keys(files).length : 0} exports from ${entries.size} tokens.`);
