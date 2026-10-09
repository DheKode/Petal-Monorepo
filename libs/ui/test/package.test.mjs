import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

test('a separate application can import the built root, web/native themes, CSS path, and token source', async () => {
  const consumer = await mkdtemp(path.join(tmpdir(), 'petal-ui-consumer-'));
  try {
    const scope = path.join(consumer, 'node_modules', '@petal');
    await mkdir(scope, { recursive: true });
    await symlink(fileURLToPath(new URL('../', import.meta.url)), path.join(scope, 'ui'), process.platform === 'win32' ? 'junction' : 'dir');
    const entry = path.join(consumer, 'consumer.mjs');
    await writeFile(entry, `
      import assert from 'node:assert/strict';
      import { readFile } from 'node:fs/promises';
      import { petalTheme, petalNativeTheme } from '@petal/ui';
      import { petalTheme as web, getPetalTheme } from '@petal/ui/theme';
      import { petalNativeTheme as native, getPetalNativeTheme } from '@petal/ui/theme/native';
      assert.equal(petalTheme, web);
      assert.equal(petalNativeTheme, native);
      assert.equal(web.semantic.color.action.primary, '#B83D70');
      assert.equal(native.semantic.type.body.lineHeight, 24);
      assert.equal(getPetalTheme({reduceMotion:true}).component.button.transition, 0);
      assert.equal(getPetalNativeTheme({reduceMotion:true}).component.button.transition, 0);
      const css = await readFile(new URL(import.meta.resolve('@petal/ui/theme.css')), 'utf8');
      assert(css.includes('--petal-color-action-primary'));
      const stylesUrl = new URL(import.meta.resolve('@petal/ui/styles.css'));
      const styles = await readFile(stylesUrl, 'utf8');
      for (const match of styles.matchAll(/@import '([^']+)'/g)) {
        const imported = await readFile(new URL(match[1], stylesUrl), 'utf8');
        assert(imported.length > 0);
      }
      const source = JSON.parse(await readFile(new URL(import.meta.resolve('@petal/ui/tokens.json')), 'utf8'));
      assert.equal(source.primitive.color.rose.$value.hex, '#B83D70');
      for (const group of ['components', 'hooks', 'layouts', 'icons']) {
        const webPath = import.meta.resolve('@petal/ui/' + group);
        const nativePath = import.meta.resolve('@petal/ui/' + group + '/native');
        assert(webPath.endsWith('/index.js'));
        assert(nativePath.endsWith('/index.native.js'));
      }
    `);
    const result = spawnSync(process.execPath, [entry], { cwd: consumer, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const nativeResolution = spawnSync(process.execPath, ['--conditions=react-native', '--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      for (const group of ['components','hooks','layouts','icons']) {
        assert(import.meta.resolve('@petal/ui/' + group).endsWith('/index.native.js'));
      }
    `], { cwd: consumer, encoding: 'utf8' });
    assert.equal(nativeResolution.status, 0, nativeResolution.stderr);
    const themeOnly = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import { registerHooks } from 'node:module';
      registerHooks({resolve(specifier, context, next) {
        if (/^react(?:-native|\\/|$)/.test(specifier) || specifier.startsWith('@animateicons') || specifier.startsWith('lucide')) throw new Error('Theme imported a framework: ' + specifier);
        return next(specifier, context);
      }});
      await import('@petal/ui');
      await import('@petal/ui/theme/native');
      await import('@petal/ui/utils');
      await import('@petal/ui/icons/catalog');
    `], { cwd: consumer, encoding: 'utf8' });
    assert.equal(themeOnly.status, 0, themeOnly.stderr);
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
});
