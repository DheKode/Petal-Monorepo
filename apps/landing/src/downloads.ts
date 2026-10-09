// Single source for the landing page's release details (F15, L01 / #11).
// Fill in a platform's url, sizeLabel and sha256 only after that build has
// been installed and tested on a real device. Never add placeholder URLs:
// a null url renders a disabled "Not yet available" button.

export type PlatformId = 'android' | 'windows' | 'macos';

export interface PlatformDownload {
  id: PlatformId;
  name: string;
  fileType: string;
  requirement: string;
  url: string | null;
  sizeLabel: string | null;
  sha256: string | null;
  installNote: string;
}

export const release = {
  version: '0.1.0',
  status: 'Prototype',
};

export const downloads: readonly PlatformDownload[] = [
  {
    id: 'android',
    name: 'Android',
    fileType: '.apk',
    requirement: 'Android phone',
    url: null,
    sizeLabel: null,
    sha256: null,
    installNote: 'Installed directly from this page, not from the Play Store.',
  },
  {
    id: 'windows',
    name: 'Windows',
    fileType: '.exe',
    requirement: 'Windows, 64-bit',
    url: null,
    sizeLabel: null,
    sha256: null,
    installNote: 'Unsigned installer. Windows may show a SmartScreen warning.',
  },
  {
    id: 'macos',
    name: 'macOS',
    fileType: '.dmg',
    requirement: 'Apple Silicon Mac (M1 or later)',
    url: null,
    sizeLabel: null,
    sha256: null,
    installNote: 'Unsigned app. macOS will ask you to confirm before the first launch.',
  },
];

// Picks the visitor's platform from the user agent so the matching download
// can be shown first. Returns null when unsure; the page then lists all three.
export function detectPlatform(userAgent: string, maxTouchPoints = 0): PlatformId | null {
  const ua = userAgent.toLowerCase();
  if (ua.includes('android')) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return null;
  // iPadOS reports a Mac user agent but has touch support.
  if (ua.includes('mac os x') || ua.includes('macintosh')) return maxTouchPoints > 1 ? null : 'macos';
  if (ua.includes('windows')) return 'windows';
  return null;
}
