import {detectPlatform, downloads, release} from '../downloads';
import {renderDownloadCard} from '../components/downloadCard';

export function initializeDownloads(): void {
  const detected = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
  const ordered = [...downloads].sort((a, b) => Number(b.id === detected) - Number(a.id === detected));
  document.querySelector('[data-download-list]')?.replaceChildren(...ordered.map((d) => renderDownloadCard(d, d.id === detected)));

  for (const node of document.querySelectorAll('[data-release-version]')) node.textContent = release.version;
  for (const node of document.querySelectorAll('[data-release-status]')) node.textContent = release.status;

  const match = downloads.find((d) => d.id === detected);
  const cta = document.querySelector('[data-primary-cta]');
  if (cta && match?.url) cta.textContent = `Get Petal for ${match.name}`;
}
