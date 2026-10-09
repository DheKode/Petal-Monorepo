import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import '@fontsource/geist-mono/600.css';
import '@petal/ui/theme.css';
import './style.css';
import {detectPlatform, downloads, release, type PlatformDownload} from './downloads';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function renderCard(d: PlatformDownload, recommended: boolean): HTMLLIElement {
  const card = el('li', recommended ? 'card download-card is-recommended' : 'card download-card');
  if (recommended) card.append(el('p', 'card-tag', 'Your device'));
  card.append(el('h3', undefined, d.name));

  const meta = el('dl', 'meta');
  const rows: [string, string][] = [
    ['File', d.fileType],
    ['Version', release.version],
    ['Works on', d.requirement],
    ['Size', d.sizeLabel ?? 'Not yet published'],
  ];
  for (const [term, value] of rows) meta.append(el('dt', undefined, term), el('dd', undefined, value));
  card.append(meta);

  if (d.url) {
    const link = el('a', 'button button-primary', `Download ${d.fileType}`);
    link.href = d.url;
    link.setAttribute('download', '');
    link.setAttribute('aria-label', `Download Petal ${release.version} for ${d.name} (${d.fileType})`);
    card.append(link);
    if (d.sha256) card.append(el('p', 'checksum', `SHA-256: ${d.sha256}`));
  } else {
    const pending = el('button', 'button button-disabled', 'Not yet available');
    pending.type = 'button';
    pending.disabled = true;
    pending.setAttribute('aria-label', `Petal for ${d.name} is not yet available`);
    card.append(pending);
  }
  card.append(el('p', 'card-note', d.installNote));
  return card;
}

const detected = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
const ordered = [...downloads].sort((a, b) => Number(b.id === detected) - Number(a.id === detected));
document.querySelector('[data-download-list]')?.replaceChildren(...ordered.map((d) => renderCard(d, d.id === detected)));

for (const node of document.querySelectorAll('[data-release-version]')) node.textContent = release.version;
for (const node of document.querySelectorAll('[data-release-status]')) node.textContent = release.status;

const match = downloads.find((d) => d.id === detected);
const cta = document.querySelector<HTMLAnchorElement>('[data-primary-cta]');
if (cta && match) cta.textContent = `Download for ${match.name}`;
