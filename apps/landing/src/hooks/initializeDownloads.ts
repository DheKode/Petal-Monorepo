import {detectPlatform, downloads, release, type PlatformDownload, type PlatformId} from '../downloads';
import {renderDownloadCard} from '../components/downloadCard';

export function orderPlatformDownloads(items: readonly PlatformDownload[], detected: PlatformId | null): PlatformDownload[] {
  return [...items].sort((a, b) =>
    Number(Boolean(b.url)) - Number(Boolean(a.url)) || Number(b.id === detected) - Number(a.id === detected));
}

export function initializeDownloads(): void {
  const detected = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
  const ordered = orderPlatformDownloads(downloads, detected);
  document.querySelector('[data-download-list]')?.replaceChildren(...ordered.map((d) => renderDownloadCard(d, d.id === detected)));

  for (const node of document.querySelectorAll('[data-release-version]')) node.textContent = release.version;
  for (const node of document.querySelectorAll('[data-release-status]')) node.textContent = release.status;

  const match = downloads.find((d) => d.id === detected);
  const cta = document.querySelector('[data-primary-cta]');
  if (cta && match?.url) cta.textContent = `Get Petal for ${match.name}`;
}
