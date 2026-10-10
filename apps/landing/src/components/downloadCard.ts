import {release, type PlatformDownload} from '../downloads';
import {el} from '../utils/dom';
import {createDownloadIcon} from '../utils/icons';

export function renderDownloadCard(d: PlatformDownload, recommended: boolean): HTMLLIElement {
  const card = el('li', `download-card${d.url ? ' is-available' : ''}${recommended ? ' is-recommended' : ''}`);
  const identity = el('div', 'download-identity');
  const symbol = el('span', 'download-device');
  symbol.append(createDownloadIcon(d.id));
  const copy = el('div');
  const heading = el('div', 'download-card-heading');
  heading.append(el('h3', undefined, d.name));
  if (recommended) heading.append(el('p', 'card-tag', 'Your device'));
  copy.append(heading, el('p', 'download-requirement', d.requirement));
  identity.append(symbol, copy);
  card.append(identity);

  const action = el('div', 'download-action');
  action.append(el('p', 'download-file', d.url ? `${d.fileType} · ${d.sizeLabel}` : 'Build not yet published'));

  const meta = el('dl', 'meta');
  const rows: [string, string][] = [
    ['File', d.fileType],
    ['Version', release.version],
    ['Size', d.sizeLabel ?? 'Not yet published'],
  ];
  for (const [term, value] of rows) meta.append(el('dt', undefined, term), el('dd', undefined, value));
  const details = el('details', 'download-details');
  details.append(el('summary', undefined, d.sha256 ? 'File details & checksum' : 'File details'), meta);
  if (d.sha256) details.append(el('p', 'checksum', `SHA-256: ${d.sha256}`));

  if (d.url) {
    const link = el('a', 'button button-primary');
    link.append(el('span', undefined, `Download for ${d.name}`), createDownloadIcon('download'));
    link.href = d.url;
    link.setAttribute('download', '');
    link.setAttribute('aria-label', `Download Petal ${release.version} for ${d.name} (${d.fileType})`);
    action.append(link);
  } else {
    const pending = el('button', 'button button-disabled', 'Not yet available');
    pending.type = 'button';
    pending.disabled = true;
    pending.setAttribute('aria-label', `Petal for ${d.name} is not yet available`);
    action.append(pending);
  }
  card.append(action, el('p', 'card-note', d.installNote), details);
  return card;
}

