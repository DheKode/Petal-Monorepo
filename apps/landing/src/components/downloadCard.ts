import {release, type PlatformDownload} from '../downloads';
import {el} from '../utils/dom';

export function renderDownloadCard(d: PlatformDownload, recommended: boolean): HTMLLIElement {
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
  const details = el('details', 'download-details');
  details.append(el('summary', undefined, 'File details'), meta);
  card.append(el('p', 'download-requirement', d.requirement), details);

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

