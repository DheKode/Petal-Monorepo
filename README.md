<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="libs/assets/brands/svg/petal-logo-horizontal-white.svg" />
    <img src="libs/assets/brands/svg/petal-logo-horizontal-primary.svg" alt="Petal" width="280" />
  </picture>

  <h1>A little clarity. Every day.</h1>
  <p>A private pill companion for daily records, uncertain memories, and a little more understanding.</p>

  <p>
    <img src="https://img.shields.io/badge/status-hackathon%20prototype-B83D70?style=flat-square" alt="Hackathon prototype" />
    <img src="https://img.shields.io/badge/core-local%20first-33252D?style=flat-square" alt="Local-first core" />
    <img src="https://img.shields.io/badge/TypeScript-shared%20logic-3178C6?style=flat-square" alt="TypeScript shared logic" />
    <img src="https://img.shields.io/badge/Node.js-22%2B-33252D?style=flat-square" alt="Node.js 22 or newer" />
    <img src="https://img.shields.io/badge/pnpm-11.25.0-33252D?style=flat-square" alt="pnpm 11.25.0" />
    <a href="https://github.com/DheKode/Petal-Monorepo/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/CI-GitHub%20Actions-33252D?style=flat-square" alt="GitHub Actions workflow" /></a>
  </p>

  <p>
    <a href="https://petal.necookie.dev">Website &amp; downloads</a> ·
    <a href="#getting-started">Getting started</a> ·
    <a href="#architecture">Architecture</a> ·
    <a href="PRD.md">Product requirements</a> ·
    <a href="https://github.com/orgs/DheKode/projects/1">Team Kanban &amp; agent assignments</a>
  </p>
  <p>Built by <strong>CodeBearers</strong> for the AppBuildersPH Hackathon.</p>
</div>

## Meet Petal

Petal helps someone record their pill intake, look back through a pack, journal bleeding or spotting, and clarify an uncertain entry without turning a guess into a fact. A blank day is different from a confirmed missed tablet. Approximate and unknown times stay approximate and unknown.

The spotlight journey is **record → clarify → preview → confirm → explain → inspect sources**. The user owns every remembered correction; the model cannot save one on its own.

This is a hackathon prototype for the **Trust 28-tablet pack**, not a clinically validated product or a substitute for a clinician or pharmacist. The [PRD](PRD.md) defines the scope. Clinical approval and actual-device verification are separate from compiling the code or displaying an answer.

### What is in the repository

- First-pack and current-pack setup, scheduled dose identities, intake records, corrections and audit history.
- Today and pack views, bleeding journaling, JSON backup workflows, and history-repair interfaces.
- Desktop local inference with the pinned Gemma artifact, constrained response validation, and fixed fallbacks.
- Android application sources and a browser-based mobile review runner; the current Android host is a Kotlin WebView with a SQLite bridge.
- A static illustrated landing page, original brand assets, shared design tokens, web and React Native UI foundations.
- Optional client-encrypted sync scaffolding and a separate development demo using fictional notes.

These are implementation areas, not a checklist of completed device acceptance. Live ownership and verification stay on the [Project board](https://github.com/orgs/DheKode/projects/1), with the fixed plan in [TASKS.md](TASKS.md).

### Builds and platform boundaries

Use the [download page](https://petal.necookie.dev/#download) for published files, checksums and installation steps. [Release metadata](apps/landing/src/downloads.ts) is the source of truth for availability.

| Target | Current repository/distribution boundary |
| --- | --- |
| macOS Apple Silicon | A `0.1.0` DMG is listed on the landing page. The desktop build includes the verified Gemma 3 model. No Developer ID signing/notarization is claimed. |
| Windows x64 | Electron/NSIS build scripts and recorded installer smoke checks exist. No Windows download is currently listed; the latest AI integration still needs Windows verification. |
| Android | Kotlin/WebView APK sources and React mobile UI exist. No Android download is currently listed. Native inference integration and real-device acceptance remain separate checks. |
| iOS / Intel Mac | Outside this release's scope. |

## Getting started

### Prerequisites

- **Node.js 22 or newer** and **pnpm 11.25.0**, pinned by the root `packageManager` field.
- Git. The local core does **not** need Clerk, Turso, a cloud account, or server credentials.
- For Android packaging: **JDK 17**, Android SDK platform **34**, and the SDK/build tooling required by the Gradle project.
- For desktop packaging: build on the target OS so the matching SQLite and inference binaries are installed. Apple Silicon builds must be made on an Apple Silicon Mac.

```sh
git clone https://github.com/DheKode/Petal-Monorepo.git
cd Petal-Monorepo
pnpm install --frozen-lockfile
pnpm --filter @petal/domain build
pnpm --filter @petal/ui build
```

The two shared-package builds prepare the compiled exports used by the mobile review runner and other consumers. Desktop and landing scripts also rebuild their dependencies as needed.

If pnpm is not installed, install the pinned version using your Node package-manager tooling. Do not replace the lockfile or upgrade dependency versions to get started. Workspace install permissions are declared in [pnpm-workspace.yaml](pnpm-workspace.yaml).

### Choose an application

Run each development process in its own terminal.

| Application | Command from repository root | Where it opens |
| --- | --- | --- |
| Desktop | `pnpm dev:desktop` | Electron window |
| Mobile UI review | `pnpm dev:mobile` | `http://127.0.0.1:4180` |
| Landing page | `pnpm --filter @petal/landing dev` | `http://127.0.0.1:5174` |
| Optional sync API | `pnpm dev:sync` | `http://localhost:3001` after environment setup |
| Optional sync demo | `pnpm dev:sync-demo` | `http://localhost:5173` after environment setup |

The desktop scripts build their shared storage/domain/UI dependencies first. Restart the desktop development process after changing main-process code. The mobile review runner renders a phone frame and fictional demo state; it is **not** proof of Android installation, native inference or restart behavior.

### Desktop demo and packaging

```sh
# Reset fictional demo records and launch in an isolated demo data folder.
pnpm --filter @petal/desktop demo

# Build the application bundles.
pnpm --filter @petal/desktop build

# Produce an unpacked application on the current supported OS.
pnpm --filter @petal/desktop package:dir

# Produce a Windows x64 installer on Windows.
pnpm --filter @petal/desktop package:win
```

Bundles go to `apps/desktop/out/`; packaged output goes to `apps/desktop/release/`. Packaging requires the exact Gemma model described below, even though tracking development can run without it. Model files and generated installers must remain outside Git. See [desktop installation and fictional demo data](docs/desktop-install.md) for recorded Windows checks and demo safeguards; its older macOS status predates the bundled-model decision and the landing release metadata.

### Android preview and APK

```sh
pnpm --filter @petal/ui build
pnpm --filter @petal/domain build
pnpm --filter @petal/mobile build:preview
pnpm build:apk
```

The APK script uses `rm`, `cp`, `mkdir` and `./gradlew`: run it in **macOS/Linux or a compatible Unix shell**, not plain PowerShell. It builds the web UI into Android assets and writes `apps/mobile/release/petal-v0.1.0.apk`, with an additional copy at the repository root. The current release variant uses the **debug signing key**, not a production signing identity.

The shipped Android host loads the React web bundle through `WebViewAssetLoader` and exposes Kotlin SQLite operations. React Native components and the separate [React Native/llama.rn spike](apps/inference-spike/android/README.md) also exist, but they do not make this APK a verified React Native inference app. See the [mobile package notes](apps/mobile/README.md); some older descriptions there predate the WebView/SQLite implementation.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system map, folder organization, runtime/data flows and coding conventions.

| Path | Responsibility |
| --- | --- |
| [`apps/desktop`](apps/desktop) | Electron + React, renderer/preload/main boundaries, local storage, utility-process inference, packaging. |
| [`apps/mobile`](apps/mobile) | Mobile React UI, Vite review runner, Kotlin Android host and SQLite bridge. |
| [`apps/landing`](apps/landing/README.md) | Plain HTML/TypeScript + Vite marketing page and tested-build distribution. |
| [`apps/sync-api`](apps/sync-api) | Express + Clerk authorization + owner-scoped Turso ciphertext storage. |
| [`apps/sync-demo`](apps/sync-demo) | React development client for explicit opt-in sync with fictional notes. |
| [`apps/inference-spike`](apps/inference-spike/README.md) | Isolated desktop and React Native model/runtime experiments with separate nested workspaces. |
| [`packages/domain`](docs/domain-contracts.md) | TypeScript/Zod records, schedule derivation, validation, evidence IDs and versioned backup contracts. |
| [`packages/storage`](docs/storage.md) | Node/main-process local SQLite snapshots, revisions, audit and transactional replacement/recovery. |
| [`packages/encrypted-sync`](docs/encrypted-sync.md) | Portable client-side encryption and explicit-action snapshot sync. |
| [`libs/ui`](libs/ui/README.md) | `@petal/ui`: themes, components, icons, hooks, layouts, utilities and styles. |
| [`libs/assets`](libs/assets/README.md) | Versioned logo artwork, original illustrations, locally bundled fonts and provenance. |
| [`scripts/ai-evaluation`](docs/ai-evaluation.md) | Fictional regression fixtures, local context/retrieval, constrained output validation and reports. |

The root pnpm workspace covers `apps/*`, `packages/*` and `libs/*`. The deeper inference spike projects use their own lockfiles and installs.

### Authority and data flow

| Component | What it can decide |
| --- | --- |
| Structured records | The user's confirmed personal facts, dose identities and time precision. |
| Deterministic rules | Only reviewed, evidence-backed fixed actions; unsupported cases remain explicit. |
| Local retrieval | Applicable passages and stored evidence IDs, using lexical/rule-linked lookup rather than a remote embeddings service. |
| Local model | Constrained statement selection, explanations and clarification; no direct database write authority. |
| User confirmation | Whether a proposed correction or replacement import is saved. |

On desktop, React talks to a typed preload bridge; the main process owns SQLite and validated IPC. Local inference runs in a separate Electron utility process. The renderer must not import database or Node APIs directly. See [architecture decisions](docs/decisions.md) and [AI evaluation/integration](docs/ai-evaluation.md).

## Local AI and model setup

The approved model is **Gemma 3 1B IT, Q4_K_M** through llama.cpp / **node-llama-cpp 3.22.1** on desktop. The packaged desktop build bundles it outside the asar and verifies it before use. Tracking and fixed fallback responses remain available if the model is absent or fails verification.

| Artifact | Pinned value |
| --- | --- |
| File | `gemma-3-1b-it-Q4_K_M.gguf` |
| Size | `806,058,240` bytes |
| Quantization source | `ggml-org/gemma-3-1b-it-GGUF` |
| Source revision | `f9c28bcd85737ffc5aef028638d3341d49869c27` |
| SHA-256 | `8ccc5cd1f1b3602548715ae25a66ed73fd5dc68a210412eea643eb20eb75a135` |

To obtain the pinned artifact for development/packaging, use the isolated spike workspace. **Specify Gemma explicitly**: the original spike's default is still Qwen.

```sh
cd apps/inference-spike/node
pnpm install --frozen-lockfile
pnpm fetch-model gemma3-1b-it-q4km
pnpm verify-model gemma3-1b-it-q4km
cd ../../..
```

The cache defaults to `.cache/petal/models` under your user home directory, outside the repository. `PETAL_MODELS_DIR` overrides the cache directory; `PETAL_BUNDLE_MODEL` supplies an explicit GGUF path for desktop packaging. In desktop development, open **Ask Petal** and select the verified local artifact. The installed bundled build selects its included artifact automatically.

Qwen3-0.6B is retained for benchmark comparisons, not the selected product model. The Android spike uses `llama.rn`; the integrated mobile service exposes an engine interface, but no caller currently wires a real inference engine. Its hardcoded **“Gemma 4” / “ready”** labels do not demonstrate generation and differ from the approved Gemma 3 configuration.

The delivered desktop answer path validates model-selected statement/citation IDs and renders approved text; it does not display unrestricted raw medical prose. Chat turns are transient in the desktop service, not part of the durable JSON backup. Mobile conversation state is held in memory for screen changes. Detailed provenance, evaluation failures, fallback behavior and runtime measurements are in [models](docs/models.md) and [AI evaluation](docs/ai-evaluation.md).

## Offline use and internet requirements

| Activity | Internet needed? |
| --- | --- |
| Clone, dependency install, installer/model download | Yes, during setup. |
| Read/write local intake and bleeding records | No account or network required by the local core. |
| Desktop generation using an already verified local/bundled model | No remote inference required. |
| Read bundled reference passages or use fixed fallbacks | No; approved clinical corpus coverage is currently limited as described below. |
| Open external source URLs | Yes. |
| Optional Clerk sign-in and encrypted cloud sync | Yes, only for the separate opt-in sync path. |
| View the locally served landing/mobile preview | Local server required; not cloud inference. |

A network-denied test is different from a human Wi-Fi-off or airplane-mode demonstration. Do not infer Android or Windows offline-generation acceptance from M1 results.

## Privacy, storage and clinical limits

- **Local storage is plaintext.** Desktop records live in `petal.db` under Electron's `Petal-dev` development or `Petal` installed user-data directory. Android has a SQLite bridge; the web/mobile service also writes a localStorage snapshot. These stores and exported JSON backups are not encrypted at rest.
- **Backups contain sensitive records.** Desktop import validates and previews a replace-all operation, keeps a recovery snapshot, and commits transactionally after confirmation. Native Android behavior needs its own device verification; shared storage tests do not prove every platform adapter.
- **The shared clinical engine is still a stub.** `evaluateGuidance` returns unsupported with no fixed clinical actions, and [`approved.json`](packages/domain/evidence/approved.json) is empty. Reviewed leaflet/rule fixtures are still required before product-specific clinical guidance can be claimed.
- **Mobile templates need reconciliation.** The mobile UI/service includes hardcoded guidance and product-verification claims. Those templates are not evidence that the shared clinical approval gate passed; treat the mobile experience as a prototype pending that review.
- **No fertility or protection promises.** Personalized cycle prediction, pregnancy probabilities, diagnosis, additional pill products and unrestricted medical chat are outside scope. Bleeding journaling records observations; it does not establish contraceptive effectiveness.
- **Reminders are not a verified background guarantee.** Permission handling and actual notifications after backgrounding/quitting need target-device evidence. A toggle or notification preview alone is not sufficient.

### Optional encrypted sync

This extension is **separate from the native local core**. `apps/sync-demo` demonstrates fictional-note snapshots; native health-record sync integration and secure-key adapters are not claimed.

1. Copy `apps/sync-api/.env.example` to `apps/sync-api/.env.local`, and `apps/sync-demo/.env.example` to `apps/sync-demo/.env.local`.
2. Configure Clerk development keys, a Turso database/token, and the allowed development origin. Server secrets belong only in the API environment.
3. Run `pnpm db:migrate`, then `pnpm dev:sync` and `pnpm dev:sync-demo` in separate terminals.
4. Sign in with a test account, explicitly opt in, and privately save the recovery key before using fictional-note sync.

The client uses AES-256-GCM; the API stores ciphertext plus owner/revision metadata, not the recovery key. Signing in does not enable sync. Remote deployment requires HTTPS and operational review. See [complete setup, threat boundaries, conflicts and deletion semantics](docs/encrypted-sync.md). Never commit keys, tokens, real records, databases or model binaries.

## Verification and recorded performance

The root CI workflow runs the repository-wide checks on pushes to `main` and pull requests:

```sh
pnpm typecheck
pnpm test
pnpm build
```

For a focused change, run the affected package checks, for example:

```sh
pnpm --filter @petal/domain test
pnpm --filter @petal/storage test
pnpm --filter @petal/desktop test
pnpm --filter @petal/mobile test
pnpm --filter @petal/landing test
pnpm --filter @petal/ui test
node --test scripts/ai-evaluation/*.test.mjs
```

These commands are reproducible entry points, not a statement that this documentation pass reran them all. Platform acceptance additionally requires restart persistence, confirmation/cancellation, invalid-import safety, model failure fallback, actual offline generation, and installation on the real target device. The [PRD verification gates](PRD.md#13-verification-gates) define the required flows.

### Recorded M1 measurements

The desktop spike recorded an **M1 MacBook Air, 8 GB RAM, Metal, context 2048**, using fictional prompts. These are prior benchmark results, not universal app latency or Android/Windows measurements.

| Gemma 3 Q4_K_M measurement | Recorded result |
| --- | --- |
| Warm Node runtime + model + context load | 2.3–3.3 s, 2 runs |
| First token, history explanation | Median 462 ms; range 423–2211 ms, 4 runs |
| Explanation completion | Median 8.1 s; range 7.4–10.0 s, 160-token cap |
| Clarification completion | Median 0.8 s; range 0.7–0.9 s |
| Peak in-process RSS | 1050–1257 MiB |

The [complete measurements](docs/models.md) include startup costs, memory caveats, failures and disconnection limitations. The [24-case evaluation](docs/ai-evaluation.md) found critical failures in unconstrained model output; its bounded renderer/fallback results are a development regression benchmark, not independent clinical validation.

## Design, assets and acknowledgments

Petal uses an original folded-petal symbol after a custom outlined wordmark, a rose/white palette, and **Geist Sans**. The shared source is [`petal.tokens.json`](libs/ui/src/themes/petal.tokens.json); generated exports should not be edited directly.

```sh
node libs/ui/src/themes/scripts/build.mjs
node libs/ui/src/themes/scripts/build.mjs --check
pnpm --filter @petal/ui preview:components
```

Open [`libs/ui/preview.html`](libs/ui/preview.html) for the offline token catalog. Component review instructions are in the [UI package README](libs/ui/README.md).

| Material | Provenance / notes |
| --- | --- |
| Brand identity | Designer-approved Petal artwork; [SVG/PNG bundle and masters](libs/assets/brands/README.md). |
| Characters, abstract objects and group illustration | Original AI-generated raster assets refined under the designer's direction; [collection and prompt provenance](libs/assets/images/illustrations/README.md). |
| Typeface | Locally bundled Geist Sans with its SIL license and [source notes](libs/assets/fonts/geist-sans/README.md). |
| Icons | Lucide vocabulary, AnimateIcons web motion and native vector wrappers; [third-party notices](libs/ui/src/icons/THIRD_PARTY_NOTICES.md). |
| Design studies | Flo, Animata and other component references informed exploration; [DESIGN.md](DESIGN.md) separates references from original approved identity. |
| AI development tools | OpenAI Codex and Claude Code assisted coding, review and documentation. Codex's built-in image generation produced the illustration assets; retained prompts/source notes document that process. |
| Models and runtimes | Gemma 3 and Qwen comparison artifacts, llama.cpp bindings and evaluation scripts; provenance is recorded in [docs/models.md](docs/models.md). |

The repository does not currently include a root project license. Do not infer an MIT license for the entire codebase from dependency licenses. Model distribution has separate terms; desktop packaging includes the retained Gemma notices and license materials under `apps/desktop/build/`.

## Documentation and collaboration

| Document | Purpose |
| --- | --- |
| [PRD.md](PRD.md) | Authoritative product scope and F01–F16 acceptance criteria. |
| [TASKS.md](TASKS.md) | Fixed task breakdown and scope fence; not live progress. |
| [AGENTS.md](AGENTS.md) | Required ownership, coordination, verification and Git workflow. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Runtime boundaries, folder map, data flows and coding conventions. |
| [DESIGN.md](DESIGN.md) | Approved brand and design reference study. |
| [Technical decisions](docs/decisions.md) | Agreed architecture, UI and model-delivery decisions. |
| [Domain contracts](docs/domain-contracts.md) | Shared record, evidence and backup contracts. |
| [Storage](docs/storage.md) | SQLite confirmation, import, audit and recovery behavior. |
| [Local AI evaluation](docs/ai-evaluation.md) | Context, retrieval, output checks and measured limitations. |
| [Landing and build publishing](apps/landing/README.md) | Page structure and safe distribution of tested installers. |

Before implementation, claim a bounded issue with a human owner and one named agent/session. Coordinate shared interfaces, follow [AGENTS.md](AGENTS.md), and use the [Kanban](https://github.com/orgs/DheKode/projects/1) for live handoffs. The current repository workflow uses direct commits to `main`; do not create task branches or PRs unless the human explicitly changes that instruction.

## CodeBearers

<div align="center">
  <p>
    <strong>Jeremy Garin</strong> · <a href="https://github.com/emperuna">@emperuna</a><br />
    <strong>Francis Mistica</strong> · <a href="https://github.com/Kiko915">@Kiko915</a><br />
    <strong>Dheyn Michael Orlanda</strong> · <a href="https://github.com/Necookie">@Necookie</a><br />
    <strong>Janvher Lucas Sarmiento</strong> · <a href="https://github.com/jnvhr">@jnvhr</a>
  </p>
  <p><em>At your pace. On your device.</em></p>
</div>
