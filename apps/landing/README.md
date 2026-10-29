# Petal landing page — `@petal/landing`

Static download page for F15 / L01 ([#11](https://github.com/DheKode/Petal-Monorepo/issues/11)). Vite + plain TypeScript, no framework.

```sh
pnpm --filter @petal/landing dev       # http://127.0.0.1:5174
pnpm --filter @petal/landing build     # static site in apps/landing/dist/
pnpm --filter @petal/landing preview
pnpm --filter @petal/landing test
```

- **Styling** uses only `@petal/ui/theme.css` variables. Do not add raw colors or sizes in `src/styles/`; change the theme tokens instead.
- **Logo and favicons** come straight from `libs/assets/brands/` (horizontal primary lockup, rose symbol, rose circular icon PNGs). Do not copy or redraw them.
- **Geist Sans** uses the approved locally bundled `@petal/ui/fonts.css` export, so the page loads no third-party fonts. The shared typography task owns this export; the landing page consumes it.
- **Homepage** uses an illustrated split hero, two unequal feature panels, a fictional interactive history-review walkthrough, privacy information, and device-aware downloads. File details and platform setup steps use keyboard-accessible native disclosures. The walkthrough writes no records. Page-specific styling stays in `src/styles/` and derives visual values from shared tokens. The approved light palette remains fixed, including when the operating system uses dark mode; reduced motion disables smooth scrolling and press transforms.
- **Artwork loading** lives in `src/utils/assets.ts`. Explicit Vite URL imports serve the original `libs/assets` files in development and emit hashed assets in production. HTML uses `data-asset` names instead of relative paths that escape the Vite root. Reserve image dimensions, preserve transparent canvases and proportions, and lazy-load illustrations below the hero. JavaScript is required to register artwork and render device-aware download availability.
- **Downloads** live in `src/downloads.ts`. Each platform's `url` stays `null` (a disabled "Not yet available" button) until that build has been installed and tested on a real device. Then fill in `url`, `sizeLabel` and `sha256`. The tests reject a published link without an https URL, size and checksum.
- The build uses a relative base, so `dist/` works from any static host path, including GitHub Pages.

Still pending for L01: real tested release links, the final model-download size (DEC4), designer review, and checks on real devices.

## Deploy (Cloudflare Worker: petal.necookie.dev)

The page is served by the `petal-monorepo` Worker with static assets (`wrangler.jsonc`, `worker/index.js`) on the Custom Domain **petal.necookie.dev** (Cloudflare manages its DNS record and certificate). The older `petal-landing.dheyn-main.workers.dev` service is a separate legacy deployment, not the current custom-domain target.

### Where downloadable builds are stored

Builds are uploaded **with each deploy as Worker static assets**, never committed to Git. Static assets cap each file at 25 MiB, so `scripts/stage-download.mjs` splits a build into 24 MiB parts in `dist/downloads/` with a manifest. A build may use at most 49 parts: its manifest plus those parts must fit the default 50-subrequest budget. Oversized builds fail staging and oversized manifests return 503 before streaming begins. `GET /download/<name>` streams the parts back as one attachment with an exact `Content-Length`. The parts are not directly reachable, and unknown names return 404. Supported: `.apk`, `.exe`, `.dmg`.

### Publishing a tested build

Use the one-step command (rules in [AGENTS.md](AGENTS.md)):

```sh
pnpm --filter @petal/landing publish-build -- --platform android|windows|macos --file <path/to/build> --tested-on "<device, OS, date>"
```

If a published download is unavailable on the custom domain but its original
bytes remain on a verified recovery host, pass `--restage-origin https://<host>`.
This changes only where existing builds are recovered before deployment. Their
stored SHA-256 values must still match; visible URLs and final verification stay
on `petal.necookie.dev`. Never replace a checksum to accept an unknown artifact.
The October 30 Windows release recovered the original macOS installer from the
legacy `https://petal-landing.dheyn-main.workers.dev` origin this way.

Wrangler's pre-deploy build hook also verifies every staged published build and
restores missing/corrupt chunks from the live URL before uploading assets. This
protects downloads during automatic Workers Builds on a fresh checkout. An
unavailable or mismatched binary stops deployment instead of removing a working
download. The hook neither builds native apps nor changes their recorded hashes.

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

## Source organization

- `index.html`: document metadata and the application entry.
- `src/layouts/`: shared site shell (skip link, header, main, footer).
- `src/pages/`: page composition; `home.html` orders the homepage sections.
- `src/components/`: section markup and the download-card DOM renderer.
- `src/styles/`: base, layout, component, page and responsive CSS, imported in cascade order by `index.css`. Shared values still come from `@petal/ui`.
- `src/hooks/`: framework-neutral DOM initialization and event bindings; history review returns cleanup for hot reload. These are not React hooks.
- `src/utils/`: typed DOM creation and original artwork imports.
- `src/data/`: fictional walkthrough content. Release owners continue editing `src/downloads.ts` in place.
- `tooling/`: local Vite HTML-partial composition; no runtime template engine or new dependency.

HTML partials use `<!-- @include ./relative/file.html -->`, relative to the including file. Vite expands them before serving or building the document, so page copy remains static HTML. Editing a partial reloads the development page. Change section content in `components/`, section order in `pages/home.html`, and the shared shell in `layouts/site.html`.

## Navigation refinement

The header uses a 64px content row (56px on small screens) plus its border, quieter plum text links with a fine rose underline for hover/focus, and a 40px visible primary-action fill inside the shared 48px touch target. Its optical logo width is 144px on desktop and 128px on mobile; supplied outlines, proportions and clearspace are preserved. Hover effects apply only to fine pointers; keyboard focus remains visible and reduced motion disables transitions.

Study references: [Linear](https://linear.app/) for restrained link/action hierarchy and [Headspace](https://www.headspace.com/) for straightforward wellness navigation. This is original Petal styling using existing shared tokens, with no downloaded component or reference identity.

## Illustrated footer

The footer pairs an editorial message with Explore/Project links and a decorative crowd of women along the bottom edge. It has no repeated logo row, standalone download call to action or prototype disclaimer; prototype limits remain in the download section. The crowd is centered at 90% width on desktop for breathing room. The human-provided screenshots inform the composition only; all lettering, links, styling and generated people belong to Petal. Rose/plum/blush/soft-white UI colors, Geist Sans, spacing, focus and touch targets come from the existing shared theme.

The original transparent group artwork lives at `libs/assets/images/illustrations/groups/petal-group-women-together-v1.png`, with generation prompts and packaging metadata beside it. This landing-specific addition is kept separately from the earlier 16-asset gallery manifest. On narrow screens the text and links stack, while the center of the wide illustration becomes a closer view; its aspect ratio is preserved. The people are decorative, with `alt=""` and an inaccessible art wrapper, and do not imply a community feature or medical outcome. The repository link opens a new tab with a screen-reader notice.

## Hero refinement

The hero keeps the approved headline and original journaling character, with a shorter description of pack tracking, bleeding journaling and history review. Hero-specific type sizing, optical spacing and a bounded illustration canvas keep the composition balanced across desktop and mobile; a quieter leaf accent and unrotated blush ground support the character. The main action still uses the existing platform-aware label and links to the download section, with an inline SVG download symbol sized and stroked using shared icon tokens. The symbol is decorative and hidden from assistive technology. Other sections, release metadata and shared tokens are unchanged.

## Download and installation layout

Downloads use a full-width platform list instead of another illustrated split section. Published builds get a prominent row; pending platforms occupy compact rows with disabled buttons. Availability sorts first, followed by the detected device within each availability group. Device detection never creates a download URL or changes release metadata. Static device/download SVGs in `src/utils/icons.ts` use shared icon tokens and remain decorative.

File type and size sit beside the download action. Version and checksum remain accessible in native file-detail disclosures. Installation instructions are composed inside the download section from `components/setup.html`, with all existing `#setup` and platform anchor IDs preserved. Product scope, prototype limits, model setup and unsigned-build notes stay visible. No new illustration or UI dependency is needed for this utility-focused section.

### History, privacy and about layout

The history explanation sits beside its fictional walkthrough, with reserved space for all three states. On compact screens, the walkthrough precedes the decorative character. The privacy panel separates the default local behavior, optional sync, storage limits and website policy into readable rows. About uses smaller illustrations and a consistent text-first order. All surfaces, typography and spacing use the shared Petal theme.
