import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const prompts = JSON.parse(await readFile(new URL('prompts.json', root), 'utf8'));
const archive = JSON.parse(await readFile(new URL('archive/characters-v1.json', root), 'utf8'));
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const families = { characters: 'Characters', companion: 'Blossom companion', objects: 'Everyday objects', abstract: 'Abstract compositions' };
const ids = new Set();
const hashes = new Set();
const validPath = path => /^(characters|companion|objects|abstract)\/petal-[a-z0-9-]+-v\d+\.png$/.test(path);
async function verifyPng(asset) {
  if (!validPath(asset.path)) throw new Error('Invalid asset path: ' + asset.path);
  const bytes = await readFile(new URL(asset.path, root));
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || bytes.readUInt32BE(16) !== asset.width || bytes.readUInt32BE(20) !== asset.height || bytes[25] !== 6) throw new Error('Unexpected RGBA PNG: ' + asset.path);
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256 || bytes.length !== asset.bytes) throw new Error('Asset changed; update manifest: ' + asset.path);
  if (asset.alphaExtrema[0] !== 0 || asset.alphaExtrema[1] < 254 || asset.transparentPixels <= 0) throw new Error('Missing verified transparency: ' + asset.path);
}
for (const asset of archive.assets) {
  await verifyPng(asset);
  if (archive.prompts.filter(prompt => prompt.assetId === asset.id && prompt.prompt && prompt.tool === 'built-in image_gen').length !== 1) throw new Error('Missing archived prompt: ' + asset.id);
}
for (const asset of manifest.assets) {
  if (ids.has(asset.id) || !families[asset.family] || !validPath(asset.path)) throw new Error('Invalid asset identity: ' + asset.id);
  ids.add(asset.id);
  if (hashes.has(asset.sha256)) throw new Error('Duplicate artwork: ' + asset.id);
  hashes.add(asset.sha256);
  await verifyPng(asset);
  if (asset.previousPath && !archive.assets.some(previous => previous.id === asset.id && previous.path === asset.previousPath)) throw new Error('Missing comparison source: ' + asset.id);
  if (prompts.assets.filter(prompt => prompt.assetId === asset.id && prompt.prompt && prompt.tool === 'built-in image_gen').length !== 1) throw new Error('Missing prompt: ' + asset.id);
}
if (prompts.assets.length !== manifest.assets.length || prompts.assets.some(prompt => !ids.has(prompt.assetId) || (prompt.styleReference && !manifest.assets.some(asset => asset.path === prompt.styleReference)))) throw new Error('Unexpected prompt or style reference.');
const theme = await readFile(new URL('../../../ui/src/themes/generated/theme.css', root), 'utf8');
await readFile(new URL('../../fonts/geist-mono/GeistMono-Variable.woff2', root));
await readFile(new URL('README.md', root));
const groups = Object.entries(families).map(([family, title]) => `<section data-family="${family}" aria-labelledby="heading-${family}"><h2 id="heading-${family}">${title}</h2><div class="grid">${manifest.assets.filter(asset => asset.family === family).map(asset => `<figure><div class="canvas"><img src="${esc(asset.path)}" width="${asset.width}" height="${asset.height}" alt="" loading="eager"></div><figcaption><h3>${esc(asset.title)}</h3><p>${esc(asset.description)}</p><a href="${esc(asset.path)}" download>${esc(asset.id)} ↗</a><small>${asset.width} × ${asset.height} · transparent PNG · proposal</small>${asset.previousPath ? `<details><summary>Compare with v1</summary><div class="canvas"><img src="${esc(asset.previousPath)}" width="${asset.width}" height="${asset.height}" alt="" loading="eager"></div><a href="${esc(asset.previousPath)}" download>Original v1 ↗</a></details>` : ''}</figcaption></figure>`).join('')}</div></section>`).join('\n');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Petal · Illustration collection</title>
<link rel="stylesheet" href="../../../ui/src/themes/generated/theme.css">
<style>
@font-face{font-family:Geist Mono;src:url('../../fonts/geist-mono/GeistMono-Variable.woff2') format('woff2');font-weight:100 900;font-display:swap}
*{box-sizing:border-box}body{margin:0;background:var(--petal-color-background);color:var(--petal-color-text-primary);font-family:Geist Mono,monospace;font-size:14px;line-height:1.6}main{max-width:1280px;margin:auto;padding:32px 24px}header{max-width:800px;margin-bottom:32px}.eyebrow{color:var(--petal-color-action-primary);font-size:12px}h1{font-size:32px;line-height:1.2;letter-spacing:-1px;margin:12px 0 16px}h2{font-size:20px;margin:32px 0 16px}h3{font-size:14px;margin:0 0 8px}p{margin:0 0 12px}.intro{color:var(--petal-color-text-secondary)}.tools{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:24px 0}.filters{display:flex;gap:8px;flex-wrap:wrap}button,select{font:inherit;min-height:var(--petal-size-touch-target);border:1px solid var(--petal-color-border-control);border-radius:var(--petal-radius-control);padding:10px 14px;color:var(--petal-color-text-primary);background:var(--petal-color-surface)}button{cursor:pointer}button[aria-pressed=true]{background:var(--petal-color-action-primary);color:var(--petal-color-text-on-action);border-color:var(--petal-color-action-primary)}button:focus-visible,select:focus-visible,a:focus-visible,summary:focus-visible{outline:2px solid var(--petal-color-focus);outline-offset:3px}.surface{display:flex;align-items:center;gap:12px}.count,small{font-size:12px;color:var(--petal-color-text-secondary)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px}figure{margin:0;border:1px solid var(--petal-color-border-subtle);border-radius:var(--petal-radius-container);overflow:hidden;background:var(--petal-color-surface)}.canvas{aspect-ratio:1;display:grid;place-items:center;background:#fff}.canvas img{width:100%;height:100%;object-fit:contain;display:block}body[data-surface=soft] .canvas{background:var(--petal-color-background)}body[data-surface=dark] .canvas{background:var(--petal-color-text-primary)}body[data-surface=grid] .canvas{background-color:#fff;background-image:linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%);background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0}figcaption{padding:16px}figcaption p{font-size:12px;color:var(--petal-color-text-secondary)}a{display:inline-flex;align-items:center;min-height:48px;color:var(--petal-color-action-primary);font-size:12px;overflow-wrap:anywhere}small{display:block}details{margin-top:12px}summary{cursor:pointer;min-height:48px;display:flex;align-items:center;font-size:12px;color:var(--petal-color-action-primary)}summary::before{content:"＋";margin-right:8px}details[open] summary::before{content:"−"}.note{margin-top:32px;max-width:800px;border-top:1px solid var(--petal-color-border-subtle);padding-top:24px}[hidden]{display:none!important}@media(max-width:520px){main{padding:24px 16px}h1{font-size:26px}.grid{grid-template-columns:1fr;gap:16px}.surface{flex-wrap:wrap}}
</style></head><body data-surface="white"><main><header><p class="eyebrow">PETAL / ILLUSTRATION STUDY</p><h1>Petal, illustrated.</h1><p class="intro">${manifest.assets.length} original illustrations for the moments around the core flow. Adult characters, a blossom companion proposal, everyday objects, and abstract forms.</p><p class="count">Design proposals · flat editorial direction · separate transparent assets</p></header>
<div class="tools"><div class="filters" role="group" aria-label="Filter illustration family"><button type="button" data-filter="all" aria-pressed="true">All</button>${Object.entries(families).map(([family, title]) => `<button type="button" data-filter="${family}" aria-pressed="false">${title}</button>`).join('')}</div><label class="surface">Preview surface <select id="surface"><option value="white">White</option><option value="soft">Soft white</option><option value="dark">Deep plum · alpha inspection</option><option value="grid">Transparency grid</option></select></label></div><p class="count" id="count" role="status">${manifest.assets.length} illustrations · all families</p>
${groups}
<footer class="note"><p>Gentle visual context, with meaning supplied by readable application text. Companion expressions never judge adherence or imply clinical protection. These are raster proposals, not medical diagrams or replacements for the approved logo.</p><p class="count">Generated with the built-in image generation tool. Exact prompts and asset hashes accompany the collection. All gallery resources are local; opening this HTML from the repository works offline.</p><a href="README.md">Usage and provenance ↗</a></footer></main>
<script>
const labels=${JSON.stringify(families)};const counts=${JSON.stringify(Object.fromEntries(Object.keys(families).map(family => [family, manifest.assets.filter(asset => asset.family === family).length])))};
for(const button of document.querySelectorAll('[data-filter]'))button.addEventListener('click',()=>{const family=button.dataset.filter;for(const item of document.querySelectorAll('[data-filter]'))item.setAttribute('aria-pressed',String(item===button));for(const section of document.querySelectorAll('[data-family]'))section.hidden=family!=='all'&&section.dataset.family!==family;document.querySelector('#count').textContent=(family==='all'?${manifest.assets.length}:counts[family])+' illustrations · '+(family==='all'?'all families':labels[family]);});
document.querySelector('#surface').addEventListener('change',event=>{document.body.dataset.surface=event.target.value;});
</script></body></html>\n`;
const target = new URL('preview.html', root);
for (const [, token] of html.matchAll(/var\((--petal-[a-z0-9-]+)\)/g)) {
  if (!theme.includes(token + ':')) throw new Error('Unknown gallery token: ' + token);
}
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8') !== html) throw new Error('Preview differs; rebuild it.');
  console.log('Verified ' + manifest.assets.length + ' asset references, dimensions, hashes, prompts and preview.');
} else {
  await writeFile(target, html);
  console.log('Built offline preview for ' + manifest.assets.length + ' illustrations.');
}
