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

## Deploy (Cloudflare Pages: petal.necookie.dev)

Project `petal-landing` on Cloudflare Pages, custom domain `petal.necookie.dev`. Pages limits each file to 25 MiB, so the APK is split into parts at deploy time and `functions/download/[name].js` streams them back as one attachment (`/download/<name>.apk`, exact `Content-Length`). APKs are never committed.

```sh
pnpm --filter @petal/landing build
cd apps/landing
node scripts/stage-apk.mjs <path/to/app-release.apk> petal-ai-preview-0.1.0.apk   # prints size + SHA-256 for src/downloads.ts
npx wrangler@4.139.0 login                                                        # once
pnpm deploy
```

Verify after deploying: `curl -s https://petal.necookie.dev/download/<name>.apk | shasum -a 256` must equal the SHA-256 shown on the page.
