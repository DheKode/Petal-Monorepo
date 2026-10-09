import { petalTheme } from '../themes/generated/theme.mjs';

export type Space = keyof typeof petalTheme.semantic.space;
export type Insets = { top: number; right: number; bottom: number; left: number };

/** Large text gets the compact composition even on a wide display. */
export function resolveLayout(width: number, fontScale = 1) {
  const safeWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  const scale = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  const isWide = safeWidth / scale >= petalTheme.semantic.layout.wideBreakpoint;
  return {
    isWide,
    gutter: isWide ? petalTheme.semantic.layout.gutterWide : petalTheme.semantic.layout.gutterCompact,
    readingMax: petalTheme.semantic.layout.readingMax,
    contentMax: petalTheme.semantic.layout.contentMax,
  };
}
