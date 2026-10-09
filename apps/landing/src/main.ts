import '@petal/ui/fonts.css';
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
  const card = el('li', recommended ? 'download-card is-recommended' : 'download-card');
  const heading = el('div', 'download-card-heading');
  heading.append(el('h3', undefined, d.name));
  if (recommended) heading.append(el('p', 'card-tag', 'Your device'));
  card.append(heading);

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
const cta = document.querySelector('[data-primary-cta]');
if (cta && match?.url) cta.textContent = `Get Petal for ${match.name}`;

// A fictional marketing walkthrough. It holds no health data and writes nothing.
const reviewSteps = [
  {
    label: 'No record ≠ a missed tablet',
    title: '“I remember Saturday, but not Friday.”',
    copy: 'Friday, October 9 has no record. Do you remember taking tablet 13 that day?',
    status: 'No record',
  },
  {
    label: 'A proposed change, for you to review',
    title: '“I took it after dinner.”',
    copy: 'Petal proposes marking tablet 13 as taken. The exact time remains unknown. You review the change before anything is saved.',
    status: 'No record → Taken · time unknown',
  },
  {
    label: 'Your confirmation comes first',
    title: 'A clearer record. Still your decision.',
    copy: 'In the app, confirming saves the change and keeps an audit trail. Canceling changes nothing. Any guidance is reevaluated from the confirmed record.',
    status: 'After confirmation: Taken · time unknown',
  },
] as const;

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-review-step]')) {
  button.addEventListener('click', () => {
    const step = reviewSteps[Number(button.dataset.reviewStep)];
    if (!step) return;
    for (const other of document.querySelectorAll('[data-review-step]')) {
      other.setAttribute('aria-pressed', String(other === button));
    }
    for (const [selector, value] of [
      ['[data-review-label]', step.label], ['[data-review-title]', step.title],
      ['[data-review-copy]', step.copy], ['[data-review-status]', step.status],
    ]) {
      const node = document.querySelector(selector);
      if (node) node.textContent = value;
    }
  });
}
