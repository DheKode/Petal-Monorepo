import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {expandHtmlPartials} from '../tooling/htmlPartials';

const root = fileURLToPath(new URL('../', import.meta.url));
const index = fileURLToPath(new URL('../index.html', import.meta.url));

test('homepage composes accessible static sections and all internal anchor targets', async () => {
  const files: string[] = [];
  const html = await expandHtmlPartials(await readFile(index, 'utf8'), index, root, (file) => files.push(file));
  assert.ok(!html.includes('@include'));
  assert.match(html, /<h1 id="hero-title">A little clarity/);
  assert.match(html, /<main id="main" tabindex="-1">/);
  assert.equal((html.match(/<section\b/g) ?? []).length, 5);
  const downloadSection = html.slice(html.indexOf('<section id="download"'), html.indexOf('</section>', html.indexOf('<section id="download"')));
  assert.match(downloadSection, /id="setup"/, 'installation instructions stay with the downloads');
  for (const platform of ['android', 'windows', 'macos']) assert.match(downloadSection, new RegExp(`id="setup-${platform}"`));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'section/control IDs remain unique');
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), `missing anchor ${match[1]}`);
  assert.equal(files.length, 11, 'layout, page and section partials are observed for reload');
});

test('includes reject paths outside the app and circular dependencies', async () => {
  await assert.rejects(expandHtmlPartials('<!-- @include ../outside.html -->', index, root), /inside the landing app/);
  await assert.rejects(expandHtmlPartials('<!-- @include ./index.html -->', index, root), /Circular HTML include/);
});
