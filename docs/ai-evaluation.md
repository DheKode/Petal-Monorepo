# Standalone AI context and validation prototype

Issue #9; TASKS A05/A08/A09/A10, A07/A11 boundary evaluation; PRD F06–F09/F16. Human owner @Necookie; implementation session current Codex Petal AI evaluation chat. Scope approved in chat: `scripts/ai-evaluation/**` and this document. Branch `codex/9-ai-context-validation`, starting commit f6cfad944c5237e8e1c51c9c9317341817853ce3. No app, shared package interface, manifest, lockfile or clinical corpus changes.

## What changed

`context.mjs` assembles a bounded date window, preserving scheduled dose identity separately from actual intake date, no-entry versus confirmed-missed/unsure, time precision and configured timezone. It calculates actual-intake counts in code, includes scoped transient conversation state, and retrieves at most three applicable reviewed passages by lexical matching/rule-linked IDs. Chat is not persisted. Apps must validate domain-shaped snapshots before calling it; the benchmark does so using existing `@petal/domain` schemas.

The current explanation path is deliberately constrained: deterministic routing builds statement choices, the model returns JSON statement IDs/style/citation IDs, validation checks complete expected coverage and permitted citations, and a renderer constructs the visible response. Arbitrary generated prose is never displayed. Invalid output, missing model or generation failure uses the same fixed response. This is an application-layer fix, not repaired model weights or unrestricted generative chat. The current plain/gentle statement texts are identical; style does not yet add fluency.

These are tracking-only statement templates, not medication protocols. Unsupported clinical questions receive bounded limits/referral. Production approved evidence is still empty. The synthetic passage unit tests verify retrieval gating and citation behavior, not clinical correctness. Positive evidence-grounded clinical answers and explanations of supported fixed clinical actions remain pending the evidence/rules owners. Code must not promote an unreviewed excerpt into clinical advice.

## Run without inference

Node 22+ and the repository's pinned pnpm are required. From repository root:

```sh
node --test scripts/ai-evaluation/*.test.mjs
python3 scripts/ai-evaluation/seed-sqlite.py --output-dir /path/to/fresh-output
```

Python uses only standard-library SQLite. Use a fresh output directory; the seed refuses to overwrite an existing fixture database. The seed produces 24 fictional scenarios, 672 scheduled doses, a SQLite file and SQL-derived `contexts.json`. It checks simulated confirmation/cancellation/audit and restart reads. Its small test schema is not Petal's production database schema. No real user health records or database binaries belong in Git.

## Run actual local models

First build the domain package with `pnpm --filter @petal/domain build`. Reuse the installed runtime from issue #3; this task installs no model/runtime dependency. Pass absolute paths; quote paths containing spaces. This command form works in macOS/Linux shells and PowerShell:

```sh
node scripts/ai-evaluation/benchmark.mjs --runtime-entry "/absolute/spike/node_modules/node-llama-cpp/dist/index.js" --domain-entry "/absolute/repo/packages/domain/dist/index.js" --fixtures "/absolute/fresh-output/contexts.json" --output "/absolute/fresh-output/gemma-results.json" --structured-only
```

The user selected **Gemma 3 1B IT Q4_K_M** on October 10, 2026. It is now the default family, filename and pinned hash. Models are loaded from `PETAL_MODELS_DIR` or the user cache under `.cache/petal/models`; `--model` can specify another local path to the same verified artifact. Qwen remains available only for explicit comparisons with `--family qwen3`. The model selector rejects a hash that does not match its chosen family. This changes the standalone runner and integration recommendation; app runtime settings are not yet wired here. Runtime pinned to node-llama-cpp 3.22.1 by #3. Both runs verify the model hash, use 2048 context, 180 output tokens, temperature 0 and fresh history per case. `forceAddSystemPrompt:true` and an initial-history assertion prevent Gemma's wrapper from silently omitting the system prompt. Inputs over the reserved context budget fail explicitly rather than silently dropping constraints. Current runner requests Metal/automatic GPU support; actual target-device adapters remain separate.

Each case captures constrained output and a separate **free-text diagnostic** using the new context. Only the constrained/validated path is eligible for delivery. Free-text diagnostics remain untrusted and expose the unresolved model failures. Logs/output files may contain fixture content: use fictional records only. No network requests or downloads are made by this runner, but airplane-mode operation of the actual app is not established here.

## Integration handoff

The app storage owner supplies a validated snapshot and enough history for the requested date range, including delayed intakes associated with older scheduled doses. This standalone builder cannot request more SQL history itself; its current date parser supports ISO dates and a recent/week window, not a full natural-language date resolver. It flags its 40-dose truncation rather than claiming complete history. Production adapters must query again or ask for a narrower range when history is unavailable.

Conversation state supplies a UI-selected `discussedDoseId`, pending preview, and app-reported saved/cancelled result. A pronoun such as “that one” without a selected dose triggers clarification. The model has no database write tools. Preview/confirm/cancel, audit writes, stale-proposal detection, transactional storage and regeneration after a correction remain the existing app adapter's responsibility. This prototype does not satisfy full A07 by itself.

Platform owners can adapt the context/selection/renderer flow to their inference wrapper. Do not show streamed raw tokens; stream only approved rendered statements after validation. Actual cancellation, Android/Windows inference, app restart, installers, Wi-Fi-off tests and complete UI integration remain outstanding. Do not mark issue #9 Done based on the standalone benchmark.

## Evaluation

The 24 original questions were already seen during development; this is a regression benchmark, not an independent release test. Report model free-text scores separately from application response scores and selection acceptance/fallback rates. Grading uses the previous safety/facts/usefulness/confirmation/citations rubric and is an agent's manual assessment, not qualified clinical review. >=75 is the user's threshold; any invented clinical verdict or personal fact blocks release regardless of average.

Additional unit fixtures use paraphrased questions, older dates, timezone boundary and malformed outputs. Those tests were written during implementation and are not a blind external evaluation. The fixture adapter preserves existing scenario records; model prompts never receive expected answers or rubric grades. Context now includes deterministic statement meanings, so free-text before/after is an application prompting comparison, not evidence of improved weights.

## Recorded result — October 10, 2026

See [the complete 24-case report](../scripts/ai-evaluation/results/REPORT.md), archived raw captures, explicit manual per-dimension grades and reproducible report scripts. Qwen free-text30→64/100 (8 critical failures); Gemma38→47 (13 critical failures). Validated renderer95/100 with0 observed critical failures; Qwen24/24 selections accepted, Gemma17/24 accepted plus7 fixed fallbacks. This passes the user's numerical threshold only for the bounded standalone tracking-response prototype. It does not pass full app/device/clinical release gates.

Separate quieter structured runs: Qwen median completion2.25s, Gemma2.34s on the recorded Mac. Internal JSON first-token timings are not visible-response streaming measurements. 26 standalone tests and132 existing workspace tests pass. The original24 questions are a development regression set; collect independent cases before a release claim.

Workflow exception: main changed its AGENTS.md to direct pushes during this run. The human-supplied instructions for this chat explicitly require isolation/PRs and prohibit an unapproved main push; those direct instructions take precedence. This work remains in its agreed isolated draft PR. No merge or direct main push was performed. Final workspace checks passed on top of main e2de334.

## Local RAG implementation — A11/F09

`scripts/ai-evaluation/rag.mjs` and `rag/corpus.json` add a dependency-free local FAQ pipeline: validated versioned corpus → keyword/phrase relevance search → up to three applicable passages → Gemma JSON selection → strict statement/citation validation → an extractive cited answer. It reuses the existing output validator and fixed fallback. Personal history stays in domain-shaped database context; no personal timestamps enter the reference index. No online search, embeddings service, user upload, database writes, package interface changes or medication-action rules are introduced.

FAQ prompts include the selected passages and product verification state, without unrelated intake dates or dose IDs. Personal-history prompts retain their separate authoritative record context. This benchmark selects FAQ mode with an explicit fixture flag; production intent routing is still pending. The answer text is the selected curated passage plus its applicability caveat and a publisher/evidence-ID citation. The model chooses constrained IDs, rather than freely writing clinical prose. This intentionally verifies retrieval and citation delivery; it does not demonstrate unconstrained medical reasoning. The benchmark separately captures raw free-text diagnostics, which must never be shown by an app.

[The source register and review handoff](../scripts/ai-evaluation/rag/RESEARCH.md) distinguishes original-page acquisition from the FDA search-index lead and the unverified pharmacy insert transcription. All external health content remains draft. Normal mode can retrieve only approved Petal product-contract passages; approved clinical evidence remains unavailable. Missing knowledge produces an explicit limitation, rather than attaching an unrelated citation.

Developer preview accepts only source-checked draft educational passages and prefixes every such response with a review warning. Clinical-action research, rejected entries and unmatched profiles remain excluded. A single review-status change is insufficient: human reviewer, review date and review type must also be recorded. Preview is for evaluation, not app release.

Run the 32 fictional questions (28 FAQ/scope cases plus four history regressions) using the existing local runtime and verified Gemma model:

```sh
node scripts/ai-evaluation/benchmark.mjs --runtime-entry "/absolute/spike/node_modules/node-llama-cpp/dist/index.js" --domain-entry "/absolute/repo/packages/domain/dist/index.js" --fixtures "scripts/ai-evaluation/rag/cases.json" --rag-corpus "scripts/ai-evaluation/rag/corpus.json" --research-preview --output "/absolute/fresh-output/gemma-rag-preview.json"
```

Omit `--research-preview` for normal approval-gated behavior. Include `--structured-only` to skip free-text diagnostics. Expected answers/categories are evaluation metadata and are not passed to the model. Runtime, model hash, budgets and system-context assertion remain unchanged. Android/Windows adapters, model packaging, actual-device airplane-mode tests and qualified evidence approval remain pending. The human explicitly authorized this task's checked commit to be pushed directly to main; this is a specific workflow exception to the earlier chat's PR-only instruction. The implementation still uses an isolated checkout and does not overwrite teammate app work.

Inspect a cited answer without loading Gemma (the same fixed model-failure fallback):

```sh
node scripts/ai-evaluation/rag/ask.mjs --question "Does the pill prevent STIs?" --research-preview
node scripts/ai-evaluation/rag/ask.mjs --question "What does an empty intake record mean?"
```

The generation grammar now requires exact expected statement/citation counts. The validator still checks ID identity, ordering, duplicates, missing citations and extra fields; counts alone do not establish correctness. Human evidence approvals bind the reviewed excerpt, source URL and passage version so a later content edit cannot retain its old approval accidentally.

## RAG benchmark result — October 10, 2026

[Full 32-case report and actual outputs](../scripts/ai-evaluation/rag/results/REPORT.md): raw Gemma diagnostic **69/100**, six critical cases; guarded extractive developer preview **95/100**, no observed critical delivered response in these fixtures. These are separate grades, not evidence of repaired weights or a clinical release pass. Required-array grammar and knowledge-only FAQ context improved constrained acceptance **19/32 → 32/32**; normal approval-gated mode also accepted **32/32**. All ten medical education questions retrieved their expected draft passage only in preview; none retrieved medical knowledge in normal mode. All 32 contexts match freshly queried fictional SQLite data.

Mac median structured completion: **1.16 seconds preview**, **0.93 seconds normal**; preview peak process RSS **1,229.4 MiB**. JSON token timing is not displayed chat latency, and process RSS is not total device/GPU memory. Main risks: raw pregnancy/regulatory/record hallucinations, tablet miscount, generic unsupported answers, incomplete FAQ intent routing, unreviewed external evidence and unavailable packaged Android/Windows app tests. Rebuild the report with `python3 scripts/ai-evaluation/rag/results/build-report.py`; grading rationale and captured initial/final/normal results are committed alongside it. Report regeneration asserts actual retrieved IDs, no record changes, warning/citation preservation and normal-mode review gating.

## Desktop integration: guarded history and RAG (A05–A11/W03, F06–F09/F16)

The desktop integration adds **Ask Petal** without changing the deterministic guidance engine. The main process queries its actual SQLite state for every question, builds bounded context, and retrieves at most three applicable reviewed passages from the versioned local corpus. Draft medical passages and research-preview mode are unavailable in the app. Each displayed citation includes the readable bundled excerpt, publisher, section, version, review state, retrieval date and online URL.

Gemma 3 1B IT Q4_K_M runs through pinned `node-llama-cpp@3.22.1` in an Electron utility process. Native binaries are external and unpacked for packaging. Choose the already downloaded GGUF through the system picker; its exact size and SHA-256 must match the pinned artifact. The local model selection persists separately from health records in `ai-model.json`. No model weights, local databases, or machine-specific paths are committed. This is a manual local-artifact setup, **not completion of the first-run download lifecycle (#15)** or model redistribution review. The worker uses local prebuilt binaries and never downloads a runtime/model during generation.

The model selects supplied statement IDs under a JSON grammar. Its raw text never appears in chat. Complete output is validated before display; useful fixed responses remain available before model setup or after model/worker failure. Cancellation terminates the worker and never mutates records. Answers made stale by concurrent record changes are withheld. This version shows a generation status and complete validated answer; **it does not stream unvalidated model tokens**. Progressive validated delivery/streaming acceptance remains open.

Chat corrections use a selected scheduled dose and a separate review form. Remembered times are approximate or unknown; typing “confirm” in chat does not save anything. Main-process storage holds a single-use immutable preview. Only **Confirm change** applies the storage transaction with a `chat` audit origin; cancel changes nothing. Expired, superseded, replayed and stale previews are rejected. Guidance derives again from the saved state. Conversation turns are bounded and transient, cleared on screen closure/restart; they never become confirmed personal facts.

The worker runs one request at a time and replies only after disposing that request's context, so an immediate follow-up question queues instead of being dropped. The first request after a worker starts may take up to 120 seconds (it loads and re-hashes the weights); later requests time out after 30 seconds and fall back to the fixed response. A remembered time is entered in the schedule's time zone, never the device's; a time that a daylight-saving change skipped or repeated is refused rather than guessed, and the user can choose another time or leave it unknown.

Real-app smoke (built Electron, renderer → preload → main → utility process → Gemma, fictional data): `apps/desktop/test/ai-electron-smoke.cjs` with phases `first`, `restart` and `missing` (usage in the file header). On the M1 Mac, October 10, 2026: all phases passed. First native answer about 5.5–6.1 s after the model loads; FAQ, withheld-medical and urgent answers about 1.0–1.3 s; three back-to-back answers all accepted; the real chat and correction forms previewed, cancelled (no change) and confirmed an approximate time; model choice and corrections survived restart; a removed model file gave useful fixed answers. The restart phase also passed with outbound IP traffic denied by a macOS `sandbox-exec` profile (Electron's own sandbox disabled for that run). That is a stand-in for disconnection, **not** an airplane-mode run.

Packaged macOS check (unsigned `package:dir` build, same day): `node-llama-cpp`'s `mac-arm64-metal` binary and `@libsql` load from `app.asar.unpacked`; a question asked immediately after launch got a native answer (about 4.7 s; 26.8 s on the very first launch of a fresh build), and the app quit normally with no worker left running. An earlier build answered a question asked within the first second or two with the fixed response, because the remembered model was still being re-verified; generation now waits for that check. Not checked: DMG install, Windows (the Windows runtime package is installed only when dependencies are installed on Windows, so the installer must be built there) and Android.

Development setup after installing workspace dependencies:

```sh
pnpm --filter @petal/desktop dev
# Complete setup, open Ask Petal, and choose the verified Gemma GGUF.
```

The standalone source research and benchmark remain separate from clinical approval. All product-specific clinical actions and bleeding predictions stay disabled until #4/#5 evidence and rule review are completed. Android has a separate inference spike and no integrated tracking app in this change; Windows requires a new native/runtime and packaged-app check of this integration. Existing desktop redesign PR #57 must preserve its shell/navigation and mount the independent Chat component in its Ask Petal destination.
