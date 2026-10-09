# Petal brand assets

The approved identity is a three-petal **open blossom** with a custom lowercase **petal** wordmark. The lettering is outlined artwork, independent of the Geist Mono UI font. These assets support designer work under U01 / issue #11 and PRD §4; they do not implement or verify an app screen.

## Choose an asset

| Treatment | Filename stem | Use |
| --- | --- | --- |
| Primary horizontal | `petal-logo-horizontal-primary` | Default logo on white or soft white |
| Stacked | `petal-logo-stacked-primary` | Compact compositions with vertical room |
| Wordmark | `petal-wordmark-plum` | Brand name where the blossom already appears |
| Blossom | `petal-symbol-rose` | Recognizable brand accent without lettering |
| Circular icon | `petal-icon-circle-rose` | Avatars, shortcuts, and favicon artwork |
| Reversed | Any `*-white` logo, wordmark, or symbol | Deep plum or rose background |
| Monochrome | Any `*-rose`, `*-plum`, or `*-black` | One-color artwork and print |

Use `svg/` for scalable, editable vector artwork. Use `png/` for transparent raster exports. Each of the **21 variants** has both formats; the horizontal logos and wordmarks export at 2048 px wide, and the stacked logos, symbols, and circular icons at 1024 px wide. The rose circular icon also has 16, 32, 48, 180, 192, and 512 px square PNG exports. Exact dimensions and paths are in [manifest.json](manifest.json).

## Folder and naming convention

```text
lib/brand/petal/
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
    export-assets.mjs
    generation-notes.md
```

Treatments are `logo-horizontal`, `logo-stacked`, `wordmark`, `symbol`, and `icon-circle`. Colors are `primary`, `rose`, `plum`, `black`, and `white`, where applicable. `primary` combines a rose blossom with a deep plum wordmark. `icon-circle` uses a white blossom on a solid rose, plum, or black disk; the area outside the disk is transparent.

## Usage

- Preserve the aspect ratio, letter spacing, blossom gaps, and relative proportions. Scale the complete asset uniformly.
- SVG and PNG logos include clearspace around the artwork. Keep that space free of text and controls. The circular icon is intentionally edge-to-edge within its square canvas.
- Prefer the horizontal logo at 160 px wide or larger and the stacked logo at 100 px wide or larger. Prefer standalone blossoms and circular icons at 32 px or larger. These are initial handoff recommendations; verify legibility in the final screen and on the actual device. The 16 px export is for favicon use.
- Use the white version on a solid dark or rose surface. Do not place white artwork on a white surface. Black is a reproduction option, not a new UI palette token.
- Keep fills flat. Do not add gradients, textures, outlines, shadows, rotate the mark, or replace the lettering with typed text.
- SVGs contain paths and primitive geometry, with no embedded raster image, external asset, or font dependency. PNG backgrounds and letter counters are transparent.
- When the logo is a home link, give the link an accessible name such as `Petal home` and avoid duplicate announcements from the image. Decorative repetitions use empty alt text.
- Circular artwork is not a completed Android adaptive icon or Windows/macOS installer icon set. Apply the target platform's safe area and packaging requirements during app integration.

## Source and exports

The vector master was traced from the approved reference's upper horizontal logo, retaining its custom lettering and blossom silhouette. All variations use the same outlines. Fills were normalized to **Rose `#B83D70`**, **Deep plum `#33252D`**, **White `#FFFFFF`**, or reproduction **Black `#000000`**. The original raster has slight texture; exported vectors and PNGs have solid fills. The transparent ImageGen extraction is retained as supporting source material, rather than substituted for the approved outline reference.

The master JSON contains the shared outlines; the master SVG is the default horizontal logo. To regenerate exports, use an existing Sharp installation with Node.js:

```sh
node lib/brand/petal/source/export-assets.mjs --sharp "/absolute/path/to/sharp"
```

The script is cross-platform; use an absolute Windows path on Windows. If Sharp is already resolvable by Node, omit `--sharp`. No package manifest or app dependency was added for this handoff. Regeneration replaces this bundle's exported SVGs, PNGs, manifest, and variation sheet.

Review [petal-logo-variations.png](petal-logo-variations.png) for the complete catalog. The contact sheet is a presentation artifact; use individual files in products.
