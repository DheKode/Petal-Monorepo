# Petal illustration collection

Original raster illustration proposals for U01/L01 / PRD §4 and F15. Human designer @emperuna requested characters and abstract objects; Codex generates the artwork with the built-in image generation tool. Flo's design-system article is a study reference for consistency across illustration and UI, not a source of copied characters or artwork.

## Art direction

Flat, modern editorial illustration: expressive rounded silhouettes, minimal facial detail and restrained internal lines. Rose, blush, soft white, white, deep plum, and muted plum anchor the collection to Petal's approved identity. Natural skin tones belong to the artwork only; no UI token changes. Transparent backgrounds allow use on Petal surfaces. The briefs request solid fills without shadows, gradients, grain, embedded text, or UI screenshots. Generated raster fills and edges have small color variations; these are not color-normalized vector masters.

The first collection contains six adult characters, two blossom companion poses, four everyday objects, and four abstract compositions. The companion is a proposal distinct from the approved logo. It never wilts, judges missed doses, or implies protection. All imagery is illustrative rather than a medical diagram or instruction.

### Character distinction

The designer flagged repetitive silhouettes in the original standing characters. The refinement changes reading, reminders, and organizing beyond their props: body shape, hair, clothing, and action each contribute to recognition at small sizes. Welcome, journaling, and reflecting remain the style anchors.

| Character | Silhouette and action | Distinguishing details |
| --- | --- | --- |
| Welcome · v1 | Tall, upright, one hand waving | High bun, open rose overshirt, blush trousers |
| Journaling · v1 | Seated on a stool, writing across the lap | Rounded curls, muted-plum blouse, rose trousers |
| Reflecting · v1 | Seated on the floor, bent knees, hand near chin | Bob, white blouse, rose trousers |
| Reading · v2 | Compact, fuller seated figure, book on lap | Short afro, round glasses, long white skirt |
| Reminders · v2 | Side-facing step, checking a wristwatch | Pixie cut, rose shirt dress |
| Organizing · v2 | Low kneeling figure, sorting pages at a table | Low ponytail, blush jumpsuit over white T-shirt |

These differences are artwork choices, not indicators of a person's health or recorded status. Keep the shared palette, rounded shapes, and restrained faces consistent while varying people and poses. Do not use a single character body with interchangeable props for future subjects.

## Usage

Treat assets as decorative alongside readable application text. Web decorative images use `alt=""`; meaningful use needs a contextual description. Native consumers set decorative images inaccessible and verify rendering/scaling on device. Keep the full canvas, preserve aspect ratio and alpha, and avoid stretching. Do not use illustration state in place of recorded-status labels or fixed guidance.

Review every asset on white and soft-white surfaces before selecting it for a screen. Flat shapes may need a dark backdrop to inspect alpha edges. Final designer selection, app integration, native packaging, and device accessibility review remain separate.

## Files and provenance

The [offline gallery](preview.html), [manifest](manifest.json), and [exact prompt log](prompts.json) accompany 16 active 1254 × 1254 RGBA PNGs (7,899,462 bytes combined) in collection version 0.2.0. Three additional v1 character files remain for comparison; their original metadata and exact prompts are preserved in [the v1 archive](archive/characters-v1.json). Names describe subject and pose, without dates or inferred clinical states. Generation output is raster even when its appearance resembles vector artwork. No third-party artwork is bundled.

| Folder | Subjects | Count |
| --- | --- | --- |
| `characters/` | Welcome, journaling, reflecting, reading, reminders, organizing | 6 |
| `companion/` | Blossom hello and thinking poses | 2 |
| `objects/` | Journal, calendar, clock, folder | 4 |
| `abstract/` | Petal orbit, ribbon loop, leaf cluster, pebble stack | 4 |

Each filename follows `petal-{family-subject}-v{revision}.png`, such as `characters/petal-character-welcome-v1.png` or `characters/petal-character-reading-v2.png`. Stable subject IDs in the manifest identify the active revision; revised entries also provide `previousPath` for comparison. Manifest paths are relative to this directory. The manifest records dimensions, full transparency extrema, transparent pixel counts, content bounds at alpha ≥ 128, SHA-256 hashes, and proposal status. Preserve the supplied padding rather than cropping to those measured bounds.

Codex used the built-in `image_gen` tool. Characters use the original welcome asset as their style reference; the thinking companion uses the hello companion as its edit reference. The prompt log preserves those references, exact submitted prompts, operations, and source output filenames. Retrying the same prompt can produce different artwork. The [Flo design-system article](https://medium.com/flo-health/flo-design-system-part-1-1eb8b731a48c) informed the study of illustration/UI consistency; its artwork was not used as a generation reference.

## Review and validation

Open `preview.html` from the checkout for an offline review. Filter by family and switch between white, soft white, deep plum, and a transparency grid. Revised characters include a keyboard-accessible “Compare with v1” disclosure and original-download link. Deep plum is an alpha inspection surface; plum details have limited contrast there. The gallery supplies captions outside the images and uses the existing Petal theme and local Geist Mono font.

Rebuild or check with Node.js 22 or newer, from the repository root:

```sh
node libs/assets/images/illustrations/scripts/build-preview.mjs
node libs/assets/images/illustrations/scripts/build-preview.mjs --check
```

The script checks active and archived PNG signatures, dimensions, RGBA format, content hashes, prompt coverage, comparison references, local references, and deterministic gallery output. Alpha statistics were measured from the source PNGs during packaging. Browser review covers the gallery and visual edges; it does not certify native rendering, final screen sizes, animation, or actual-device accessibility. Designer selection and application placement remain pending.
