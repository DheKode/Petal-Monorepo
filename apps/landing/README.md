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
- **Geist Sans** uses the approved locally bundled `@petal/ui/fonts.css` export, so the page loads no third-party fonts. The shared typography task owns this export; the landing page consumes it.
- **Homepage** uses an illustrated split hero, two unequal feature panels, a fictional interactive history-review walkthrough, privacy information, and device-aware downloads. File details and platform setup steps use keyboard-accessible native disclosures. The walkthrough writes no records. Page-specific styling stays in `src/style.css` and derives visual values from shared tokens. The approved light palette remains fixed, including when the operating system uses dark mode; reduced motion disables smooth scrolling and press transforms.
- **Artwork loading** lives in `src/assets.ts`. Explicit Vite URL imports serve the original `libs/assets` files in development and emit hashed assets in production. HTML uses `data-asset` names instead of relative paths that escape the Vite root. Reserve image dimensions, preserve transparent canvases and proportions, and lazy-load illustrations below the hero. JavaScript is required to register artwork and render device-aware download availability.
- **Downloads** live in `src/downloads.ts`. Each platform's `url` stays `null` (a disabled "Not yet available" button) until that build has been installed and tested on a real device. Then fill in `url`, `sizeLabel` and `sha256`. The tests reject a published link without an https URL, size and checksum.
- The build uses a relative base, so `dist/` works from any static host path, including GitHub Pages.

Still pending for L01: real tested release links, the final model-download size (DEC4), designer review, and checks on real devices.

## Deploy (Cloudflare Worker: petal.necookie.dev)

The page is served by the `petal-landing` Worker with static assets (`wrangler.jsonc`, `worker/index.js`) on the Custom Domain **petal.necookie.dev** (Cloudflare manages its DNS record and certificate). Also reachable at `petal-landing.dheyn-main.workers.dev`.

### Where downloadable builds are stored

Builds are uploaded **with each deploy as Worker static assets**, never committed to Git. Static assets cap each file at 25 MiB, so `scripts/stage-download.mjs` splits a build into <20 MiB parts in `dist/downloads/` with a manifest. `GET /download/<name>` streams the parts back as one attachment with an exact `Content-Length`. The parts are not directly reachable, and unknown names return 404. Supported: `.apk`, `.exe`, `.dmg`.

### Publishing a tested build

Use the one-step command (rules in [AGENTS.md](AGENTS.md)):

```sh
pnpm --filter @petal/landing publish-build -- --platform android|windows|macos --file <path/to/build> --tested-on "<device, OS, date>"
```

Manual equivalent:


1. Install and test the build on a real device (see `src/downloads.ts`).
2. Build and stage it (repeat step 2's second line per platform):
   ```sh
   pnpm --filter @petal/landing build
   cd apps/landing && node scripts/stage-download.mjs <path/to/build> petal-0.1.0.apk
   ```
   It prints `url`, `sizeLabel` and `sha256`.
3. Put those three values in that platform's entry in `src/downloads.ts`, then rebuild and stage again. `vite build` clears `dist/`.
4. Deploy: `npx wrangler@4.139.0 login` (once), then `pnpm deploy` from `apps/landing`.
5. Verify: `curl -s https://petal.necookie.dev/download/<name> | shasum -a 256` must equal the SHA-256 shown on the page.

Every deploy must include **all** currently published builds, because a deploy replaces all assets. Keep the build files somewhere safe outside Git.
