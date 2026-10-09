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
