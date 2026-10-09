# Petal brand assets

The approved v2 identity is a single **folded petal** following the preserved custom lowercase **petal** wordmark. The designer selected this direction and approved the symbol enlarged by 25% from the first lockup study. The lettering is outlined artwork, independent of the Geist Mono UI font. These assets support designer work under U01/L01 / issues #11 and #53, PRD §4 and F15; they do not implement or verify an app screen.

## Choose an asset

| Treatment | Filename stem | Use |
| --- | --- | --- |
| Primary horizontal | `petal-logo-horizontal-primary` | Default logo on white or soft white |
| Stacked | `petal-logo-stacked-primary` | Compact compositions with vertical room |
| Wordmark | `petal-wordmark-plum` | Brand name where the symbol already appears |
| Folded petal | `petal-symbol-rose` | Recognizable brand accent without lettering |
| Circular icon | `petal-icon-circle-rose` | Avatars, shortcuts, and favicon artwork |
| Reversed | Any `*-white` logo, wordmark, or symbol | Deep plum or rose background |
| Monochrome | Any `*-rose`, `*-plum`, or `*-black` | One-color artwork and print |

Use `svg/` for scalable, editable vector artwork. Use `png/` for transparent raster exports. Each of the **21 variants** has both formats; the horizontal logos and wordmarks export at 2048 px wide, and the stacked logos, symbols, and circular icons at 1024 px wide. The rose circular icon also has 16, 32, 48, 180, 192, and 512 px square PNG exports. Exact dimensions and paths are in [manifest.json](manifest.json).

## Folder and naming convention

```text
libs/assets/brands/
  README.md
  manifest.json
  petal-logo-variations.svg
  petal-logo-variations.png
  svg/petal-{treatment}-{color}.svg
  png/petal-{treatment}-{color}.png
  png/petal-icon-circle-rose-{size}.png
  source/
    petal-logo-master.svg
    petal-logo-master.json
    petal-logo-approved-reference.png
    petal-logo-transparent-extraction.png
    petal-folded-symbol-reference.png
    petal-logo-approved-reference-v2.png
    export-assets.mjs
    trace-symbol.mjs
    verify-assets.mjs
    generation-notes.md
    archive/
      petal-logo-master-v1.json
      petal-logo-master-v1.svg
      wordmark-checksums-v1.json
```

Treatments are `logo-horizontal`, `logo-stacked`, `wordmark`, `symbol`, and `icon-circle`. Colors are `primary`, `rose`, `plum`, `black`, and `white`, where applicable. `primary` combines a rose folded petal with a deep plum wordmark. `icon-circle` uses a white petal on a solid rose, plum, or black disk; the area outside the disk is transparent. Canonical filenames are unchanged, so consumers receive the revised identity at the same paths. The manifest records version 2.

## Usage

- Preserve the aspect ratio, letter spacing, symbol cutout, and relative proportions. Scale the complete asset uniformly.
- Horizontal lockups read wordmark → symbol: the lettering is 644 × 274 units, the petal is approximately 202.6852 × 220, the clear gap is 34, and the petal starts 10 units below the lettering's top. The symbol's center stays at 120 units, above the p's descender. Stacked derivatives place the wordmark above the petal with both scaled uniformly to 65%.
- SVG and PNG logos include clearspace around the artwork. Keep that space free of text and controls. The circular icon is intentionally edge-to-edge within its square canvas.
- Prefer the horizontal logo at 160 px wide or larger and the stacked logo at 100 px wide or larger. Prefer standalone symbols and circular icons at 32 px or larger. These are initial handoff recommendations; verify legibility in the final screen and on the actual device. The 16 px export is for favicon use.
- Use the white version on a solid dark or rose surface. Do not place white artwork on a white surface. Black is a reproduction option, not a new UI palette token.
- Keep fills flat. Do not add gradients, textures, outlines, shadows, rotate the mark, or replace the lettering with typed text.
- SVGs contain paths and primitive geometry, with no embedded raster image, external asset, or font dependency. PNG backgrounds and letter counters are transparent.
- When the logo is a home link, give the link an accessible name such as `Petal home` and avoid duplicate announcements from the image. Decorative repetitions use empty alt text.
- Circular artwork is not a completed Android adaptive icon or Windows/macOS installer icon set. Apply the target platform's safe area and packaging requirements during app integration.

## Source and exports

The wordmark is preserved exactly from the v1 vector master; all eight standalone wordmark SVG/PNG files are byte-for-byte unchanged. The revised symbol is reconstructed from the approved original raster's alpha silhouette, with restrained curve smoothing. All variations use the same outlines. Fills are normalized to **Rose `#B83D70`**, **Deep plum `#33252D`**, **White `#FFFFFF`**, or reproduction **Black `#000000`**. The raster study has slight color variation; exported vectors and PNGs have solid fills. Historical v1 masters and references remain as provenance, rather than current product artwork.

The master JSON contains the shared outlines; the master SVG is the default horizontal logo. To regenerate exports, use an existing Sharp installation with Node.js:

```sh
node libs/assets/brands/source/export-assets.mjs --sharp "/absolute/path/to/sharp"
node libs/assets/brands/source/verify-assets.mjs --sharp "/absolute/path/to/sharp"
```

The scripts are cross-platform; use an absolute Windows path on Windows. If Sharp is already resolvable by Node, omit `--sharp`. No package manifest or app dependency was added for this handoff. Regeneration replaces this bundle's exported SVGs, PNGs, manifest, and variation sheet. The optional `trace-symbol.mjs` reconstructs the symbol from the retained reference; routine exports need only the versioned master. Verification checks native vector content, PNG rendering/transparency, dimensions, palette, approved-source silhouette fidelity, and unchanged wordmark checksums. App/device and installer/adaptive-icon packaging checks remain separate.

Review [petal-logo-variations.png](petal-logo-variations.png) for the complete catalog. The contact sheet is a presentation artifact; use individual files in products.
