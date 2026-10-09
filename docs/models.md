# Local models and runtime: desktop spike results

Issue #3, TASKS.md **A02** (desktop llama.cpp) and **A03** (licence, provenance, pinned versions). Measured 2026-10-09 by `claude-code-inference-spike` for @Necookie. Spike code: [`apps/inference-spike/node`](../apps/inference-spike/node).

**Summary.** On the M1 MacBook Air, both PRD candidates load through llama.cpp (node-llama-cpp Node binding, Metal) and stream fresh text, both in plain Node and inside an Electron 44 main process. Warm load is 2–3 s and the first token arrives in under 1 s. Generation also succeeded with the process's network access denied. **Pending:** a human Wi-Fi-off run, especially for the Electron path, and anything on Windows. DEC3 and DEC5 are **not** decided here; see [Recommendations](#recommendations-not-decisions).

## Status of acceptance checks

| # | Check | Result |
| --- | --- | --- |
| 1 | Reproducible command loads the model and generates fresh text | **Pass** on M1 (Node and Electron main process) |
| 2 | Generation works with internet disconnected after setup | **Partial.** Node process: **pass** under a macOS sandbox that denied all network access (control `curl` failed). Electron: **pending**. Electron hangs under `sandbox-exec` even with nothing denied, so it needs the Wi-Fi-off run [below](#pending-human-offline-check-m1) |
| 3 | Hardware/OS, artifact, runtime, cold/warm start, TTFT, latency, memory | Recorded below |
| 4 | Setup, results, failures, limitations | This file |
| 5 | Windows portability | Requirements listed; **untested, no Windows support claimed** |

## Test hardware

| Field | Value |
| --- | --- |
| Machine | MacBook Air (M1, 2020), `MacBookAir10,1` |
| Chip | Apple M1: 8 CPU cores (4 performance + 4 efficiency), 7-core GPU |
| Memory | 8 GB unified |
| OS | macOS 26.6 (build 25G72) |
| Node.js | 26.5.0 (spike scripts); Electron's embedded Node 24.21.0 |
| pnpm | 11.25.0 (`npx pnpm@11.25.0`; corepack is not bundled with Node 26) |

## Runtime

| Component | Pinned version | Licence | Notes |
| --- | --- | --- | --- |
| [node-llama-cpp](https://github.com/withcatai/node-llama-cpp) | `3.22.1` (exact) | MIT | N-API binding, prebuilt binaries per platform via optional deps (`@node-llama-cpp/mac-arm64-metal`, `win-x64`, `win-x64-vulkan`, `win-x64-cuda`, `win-arm64`, …) |
| llama.cpp (bundled) | `ggml-org/llama.cpp` release `v0.5.0` (published 2026-09-23, commit `d2e54583`) | MIT | Reported at runtime by `llama.llamaCppRelease` |
| GPU backend used | Metal; all layers offloaded (Qwen 29/29, Gemma 27/27) | | `getLlama({gpu: "auto", build: "never"})`. Fails rather than compiling from source if no prebuilt binary matches |
| Electron (smoke test only) | `44.4.5` (Chromium 152.0.7977.130, Node 24.21.0) | MIT | Spike devDependency; the real app version belongs to #20 |

node-llama-cpp's `postinstall` (binary download/source build fallback) is **not** allowed in the spike's `pnpm-workspace.yaml`. The prebuilt platform package was sufficient.

## Model artifacts (A03)

Files live **outside Git** in `~/.cache/petal/models/` (Windows: `%USERPROFILE%\.cache\petal\models\`), overridable with `PETAL_MODELS_DIR`. URLs resolve a fixed Hugging Face commit. `fetch-model` writes to `*.partial`, checks size and SHA-256, deletes the partial file on mismatch, and renames the file into place only after it verifies.

| | Qwen3-0.6B Q4_K_M | Gemma 3 1B IT Q4_K_M |
| --- | --- | --- |
| File | `Qwen3-0.6B-Q4_K_M.gguf` | `gemma-3-1b-it-Q4_K_M.gguf` |
| Size | 396,705,472 bytes | 806,058,240 bytes |
| SHA-256 (verified locally) | `ac2d97712095a558e31573f62f466a3f9d93990898b0ec79d7c974c1780d524a` | `8ccc5cd1f1b3602548715ae25a66ed73fd5dc68a210412eea643eb20eb75a135` |
| Source | [`unsloth/Qwen3-0.6B-GGUF`](https://huggingface.co/unsloth/Qwen3-0.6B-GGUF) @ `50968a4468ef4233ed78cd7c3de230dd1d61a56b` | [`ggml-org/gemma-3-1b-it-GGUF`](https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF) @ `f9c28bcd85737ffc5aef028638d3341d49869c27` |
| Upstream weights | [`Qwen/Qwen3-0.6B`](https://huggingface.co/Qwen/Qwen3-0.6B) (Alibaba Qwen) | [`google/gemma-3-1b-it`](https://huggingface.co/google/gemma-3-1b-it) (Google) |
| Provenance | **Third-party quantization** (Unsloth). Qwen's own GGUF repo ([`Qwen/Qwen3-0.6B-GGUF`](https://huggingface.co/Qwen/Qwen3-0.6B-GGUF)) only offers `Q8_0` (639 MB) | **Conversion by the llama.cpp project org** (ggml-org), not Google. Google's first-party 4-bit file [`google/gemma-3-1b-it-qat-q4_0-gguf`](https://huggingface.co/google/gemma-3-1b-it-qat-q4_0-gguf) (1.0 GB, QAT Q4_0) is **gated** (HF login plus accepting the terms), so it was not used |
| Licence | Apache-2.0 (repo card and upstream `LICENSE`) | [Gemma Terms of Use](https://ai.google.dev/gemma/terms) (last modified 2026-04-01) plus [Gemma Prohibited Use Policy](https://ai.google.dev/gemma/prohibited_use_policy) |
| Gated download | No | No (mirror); yes (Google's official QAT file) |
| Thinking | Disabled: `QwenChatWrapper({thoughts: "discourage"})` pre-fills an empty think block (equivalent to `enable_thinking=false`), plus `budgets.thoughtTokens: 0`. **0 thought tokens** in every run | n/a |

### Redistribution conditions (to decide bundling vs. download, DEC4 / #15)

This is not legal advice. It summarises the published terms so the team can decide.

- **Qwen3-0.6B (Apache-2.0).** Redistribution allowed. Ship a copy of the licence and keep notices. The Unsloth quantization carries the same Apache-2.0 tag.
- **Gemma 3 (Gemma Terms §3.1).** Redistribution allowed only if we (1) include the §3.2 use restrictions as an enforceable provision in our terms and tell users about them, (2) give recipients a copy of the Gemma Terms, (3) mark modified files, and (4) ship a `NOTICE` file containing: *"Gemma is provided under and subject to the Gemma Terms of Use found at ai.google.dev/gemma/terms"*.
- **Gemma Prohibited Use Policy, relevant to Petal.** It restricts "unauthorized or unlicensed practice of any profession", including medical/health practice; "misleading claims of expertise or capability made particularly in sensitive areas" such as health; and "making automated decisions in domains that affect material or individual rights or well-being", such as healthcare. Petal's design (deterministic rules own the actions; the model only explains) is aligned with this, but a team member should read the policy before choosing Gemma for a health product.

## Results (M1 MacBook Air, Metal, context 2048, temperature 0.7, max 160 output tokens)

Prompts are fictional ([`prompts/fictional.json`](../apps/inference-spike/node/prompts/fictional.json)): `explain-result` (summarise known/unknown facts around an uncertain Friday, with a placeholder fixed action) and `clarify-friday` (ask one clarification question). No health records and no real clinical rules.

### Startup

| Measurement | Qwen3-0.6B | Gemma 3 1B |
| --- | --- | --- |
| **First load ever per executable** (Metal pipeline compile) | Node: **50.1 s** (runtime init 47.8 s); Electron: **38.8 s** | not observed (ran after the Node binary had already warmed Metal) |
| First run from a fresh clone (new binary path, Metal already warmed by another copy) | Node: 8.1 s (runtime init 6.2 s) | not measured |
| Warm load, Node: runtime + model + context (n) | **2.6–3.1 s** (3) | **2.3–3.3 s** (2) |
| Warm load, Electron main process | 1.8–2.0 s (2) | 2.2 s (1) |
| Process start → load start (includes SHA-256 check of the file) | 0.8–1.8 s | not split out (wall clock 21–24 s for 4 generations) |

"Cold" here means the first process to initialise Metal for that executable. The model file was already in the OS page cache (just downloaded/verified). A cold start after reboot has **not** been measured. The ~40 s first-run cost recurred once for Electron after Node had already paid it, so expect it on a user's first launch, and possibly after app updates.

### Generation (warm, all runs)

| Measurement | Qwen3-0.6B | Gemma 3 1B |
| --- | --- | --- |
| Time to first token: `explain-result` (median, range, n) | **665 ms** (433–1385, 7) | **462 ms** (423–2211, 4) |
| Time to first token: `clarify-friday` | **432 ms** (290–539, 7) | **296 ms** (281–306, 4) |
| Completion: `explain-result` | **1.6 s** (1.1–2.7), median 31 tokens / ~20 words | **8.1 s** (7.4–10.0), hit the 160-token cap; 86–100 words |
| Completion: `clarify-friday` | **1.3 s** (0.8–2.7), ~27 tokens | **0.8 s** (0.7–0.9), ~11 tokens |
| Decode speed (median) | ~20–24 tok/s | ~14–19 tok/s |
| Electron one-sentence prompt (warm): TTFT / total | 227–233 ms / 385–397 ms | 1703 ms / 2439 ms (1 run) |

These are well inside the PRD's provisional 5 s first-token / 20 s response goals on this Mac. Those goals target the Android phone, which this spike did not measure (A01).

### Memory

| Measurement | Qwen3-0.6B | Gemma 3 1B |
| --- | --- | --- |
| Peak RSS, sampled in-process every 25 ms | 743–930 MiB | 1050–1257 MiB |
| `/usr/bin/time -l` maximum resident set size | 744–940 MiB | 1050–1258 MiB |
| `/usr/bin/time -l` peak memory footprint | 481–488 MiB | 503 MiB |
| Metal allocation (`llama.getVramState().used`) | 897 MiB | 1313 MiB |

On Apple unified memory these figures overlap: RSS includes mmapped model pages, and the Metal number includes the offloaded weights plus KV cache. Treat **~0.9 GB (Qwen)** and **~1.3 GB (Gemma)** as the realistic resident cost at context 2048. A physical-footprint total for the whole Electron app was not measured.

### Observed output quality (indicative only; not the A04 benchmark)

Both models made factual errors on the fictional facts. This confirms the PRD/TASKS requirement that A08 output validation and deterministic fallback text are mandatory.

- **Qwen3-0.6B.** Short and mostly on task. It sometimes speculated beyond the facts (e.g. "if Friday was at 21:30"), once claimed it "doesn't know" a supplied evidence passage, and once concluded the answer "must be **not sure**" instead of asking. No thinking text leaked.
- **Gemma 3 1B.** Ignored the 80-word limit (hit the cap in 4/4 `explain-result` runs). It misstated which times were exact or approximate, and in 4/4 `clarify-friday` runs asked about **Saturday** instead of Friday.

## Reproduce

From a fresh clone (internet needed once, for install and download):

```sh
cd apps/inference-spike/node
npx pnpm@11.25.0 install --frozen-lockfile   # or `pnpm install --frozen-lockfile` if pnpm 11.25.0 is on PATH
npx pnpm@11.25.0 fetch-model qwen3-0.6b-q4km  # ~397 MB, verified by SHA-256
npx pnpm@11.25.0 fetch-model gemma3-1b-it-q4km  # optional, ~806 MB
```

Then, offline:

```sh
npx pnpm@11.25.0 verify-model qwen3-0.6b-q4km
node src/generate.mjs --model qwen3-0.6b-q4km --repeat 2 --json result.json
./node_modules/.bin/electron src/electron-main.mjs --model qwen3-0.6b-q4km   # Electron main-process smoke test
```

On Windows, use `node_modules\.bin\electron.cmd src\electron-main.mjs`. macOS-only extras used for the numbers above: `/usr/bin/time -l <command>` (peak memory), and `sandbox-exec -p '(version 1)(allow default)(deny network*)' node src/generate.mjs …` (network-denied run; does **not** work for Electron).

This directory is deliberately a separate pnpm workspace (own `pnpm-workspace.yaml` and lockfile) at `apps/inference-spike/node`. That path is not matched by the root `apps/*` glob, so nothing here touches the root lockfile.

## Pending: human offline check (M1)

Owner action. Until this runs, the Electron offline result is **pending**:

1. In the spike directory, confirm the model verifies: `npx pnpm@11.25.0 verify-model qwen3-0.6b-q4km` → `OK`.
2. Turn Wi-Fi off (Control Centre → Wi-Fi off) and unplug any Ethernet/USB tethering.
3. Confirm you are offline: `curl -sS -m 5 https://huggingface.co -o /dev/null` → must fail.
4. Run `node src/generate.mjs --repeat 1` and `./node_modules/.bin/electron src/electron-main.mjs`.
5. Record pass/fail and the printed summary (TTFT, totals) on issue #3, then turn Wi-Fi back on.

## Windows portability: requirements, untested

No Windows device was available to this session. **Windows is not claimed to work.** What A02's Windows acceptance needs:

1. **Hardware record.** VivoBook CPU, RAM, GPU and Windows build (S04 / `docs/hardware.md`).
2. **Install.** Node ≥ 22 and `pnpm install --frozen-lockfile` in `apps/inference-spike/node`. The lockfile already pins `@node-llama-cpp/win-x64` (CPU, ~31 MB), `win-x64-vulkan` (~74 MB), `win-x64-cuda` and `win-arm64`; pnpm installs only the matching ones.
3. **Backend selection.** `gpu: "auto"` tries CUDA, then Vulkan, then CPU. An integrated Intel/AMD GPU needs a current Vulkan driver. Otherwise expect CPU-only speed, which must be measured, not assumed. Record `gpu` and `gpuLayers` from the summary.
4. **Native-binary prerequisites.** Confirm the prebuilt `.node` loads on a clean machine (watch for a missing Microsoft Visual C++ runtime error). `build: "never"` makes a missing prebuilt fail loudly instead of trying to compile with MSVC/CMake.
5. **Paths.** Model directory resolves to `%USERPROFILE%\.cache\petal\models`. In the real app, use `app.getPath("userData")`. Paths with spaces should be tested; the spike scripts use `path.join` throughout.
6. **Offline.** Airplane mode on, then `node src\generate.mjs` and `node_modules\.bin\electron.cmd src\electron-main.mjs`.
7. **Measurements.** Same table as above. Peak memory from Task Manager or `Get-Process -Id <pid> | Select PeakWorkingSet64`, since `/usr/bin/time` is unavailable.
8. **Packaging (P02, later).** electron-builder must `asarUnpack` `node_modules/node-llama-cpp/**` and `node_modules/@node-llama-cpp/**`, and ship only the target platform's binary packages. The app is unsigned, so expect SmartScreen warnings and document them.

## Failures and limitations

- **Electron under `sandbox-exec` hangs.** It hangs with `deny network*`, with IP-only denial, and also with a fully permissive profile, so this is a nested-sandbox problem, not a network dependency. Offline proof for Electron therefore needs a real Wi-Fi-off run.
- **First-launch Metal compile of ~40–50 s** per executable. The app needs a "preparing on-device AI" state and must keep logging/guidance usable meanwhile (F16).
- **Quality.** Both small models produced factual slips on two short prompts. Measured runs are few (Qwen n=7 per prompt, Gemma n=4). Not a statistically meaningful benchmark and not a correctness evaluation.
- **Not measured:** cold start after reboot, repeated multi-turn stability beyond 2 rounds, a whole-app memory footprint, Windows, Android (A01).
- **llama.cpp load warning.** `control-looking token … '</s>' was not control-type` appears for both GGUFs. It is a metadata quirk that llama.cpp auto-corrects, with no observed effect on output.
- **SHA-256 check on every spike run** is part of the 0.8–1.8 s "process start → load start" for Qwen (alongside module loading) and roughly doubles for Gemma's file. The app should verify at download time and cache the result keyed by size and mtime.

## Recommendations (not decisions)

- **Runtime (DEC5 input).** node-llama-cpp 3.22.1 is viable for the Electron app on macOS Apple Silicon. Run it in the Electron main process or, preferably, an Electron `utilityProcess` so the UI stays responsive. Windows remains the open gate for DEC5.
- **Model (DEC3 input, pending A01/A04).** Lean towards **Qwen3-0.6B Q4_K_M**: half the size, Apache-2.0 with simple redistribution, tighter answers, and thinking reliably disabled. Gemma remains viable if the Android or quality benchmark favours it, but it brings Gemma Terms obligations and the health-related prohibited-use review. The decision belongs on #3 after A01 (Android) and A04.
- **Dependencies to coordinate at integration (for @Necookie, with Codex / #20).** When the desktop app adopts the runtime, `apps/desktop` would add `node-llama-cpp@3.22.1` (exact). With the hoisted node-linker it does not need its `postinstall` build script (prebuilt binaries suffice), so `allowBuilds` can leave it disabled. electron-builder needs the `asarUnpack` entries above. Nothing was changed in root files by this task.
