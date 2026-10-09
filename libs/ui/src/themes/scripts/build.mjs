import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { compileTheme } from './compile.mjs';
import { createPreview } from './preview.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(await readFile(path.join(root, 'petal.tokens.json'), 'utf8'));
const compiled = compileTheme(source);
const { files, entries } = compiled;
const outputs = Object.entries(files).map(([name, content]) => [path.join(root, 'generated', name), content]);
outputs.push([path.resolve(root, '../../preview.html'), await createPreview(source, compiled)]);
const check = process.argv.includes('--check');
if (!check) await mkdir(path.join(root, 'generated'), { recursive: true });
for (const [output, content] of outputs) {
  if (check) {
    const existing = await readFile(output, 'utf8').catch(() => null);
    if (existing !== content) throw new Error(`${path.basename(output)} is stale or missing; run node libs/ui/src/themes/scripts/build.mjs`);
  } else await writeFile(output, content);
}
console.log(`${check ? 'Verified' : 'Generated'} ${Object.keys(files).length} exports and HTML preview from ${entries.size} tokens.`);
