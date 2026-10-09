# Petal landing page — `@petal/landing`

Static download page for F15 / L01 ([#11](https://github.com/DheKode/Petal-Monorepo/issues/11)). Vite + plain TypeScript, no framework.

```sh
pnpm --filter @petal/landing dev       # http://127.0.0.1:5174
pnpm --filter @petal/landing build     # static site in apps/landing/dist/
pnpm --filter @petal/landing preview
pnpm --filter @petal/landing test
```

- **Styling** uses only `@petal/ui/theme.css` variables. Do not add raw colors or sizes in `src/style.css`; change the theme tokens instead.
- **Logo and favicons** come straight from `libs/assets/brands/` (horizontal primary lockup, rose symbol, rose circular icon PNGs). Do not copy or redraw them.
- **Geist Mono** is bundled from `@fontsource/geist-mono`, so the page loads no third-party fonts.
- **Downloads** live in `src/downloads.ts`. Each platform's `url` stays `null` (a disabled "Not yet available" button) until that build has been installed and tested on a real device. Then fill in `url`, `sizeLabel` and `sha256`. The tests reject a published link without an https URL, size and checksum.
- The build uses a relative base, so `dist/` works from any static host path, including GitHub Pages.

Still pending for L01: real tested release links, the final model-download size (DEC4), designer review, and checks on real devices.
