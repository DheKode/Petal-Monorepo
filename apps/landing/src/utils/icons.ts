import type {PlatformId} from '../downloads';

const paths: Record<PlatformId | 'download', readonly string[]> = {
  android: ['M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z', 'M10 5h4M11 19h2'],
  windows: ['M4 3h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z', 'M9 21h6M12 17v4'],
  macos: ['M5 3h14a1 1 0 0 1 1 1v12H4V4a1 1 0 0 1 1-1Z', 'M4 16l-2 4h20l-2-4M10 17h4'],
  download: ['M12 3v12m-5-5 5 5 5-5', 'M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4'],
};

/** Original static device/download outlines; visible text supplies the label. */
export function createDownloadIcon(kind: keyof typeof paths): SVGSVGElement {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'download-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const geometry of paths[kind]) {
    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('d', geometry);
    svg.append(path);
  }
  return svg;
}
