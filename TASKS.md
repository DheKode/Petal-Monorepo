# Petal — Hackathon Plan and Scope Fence

Derived from `PRD.md`. The PRD is the source of truth for scope. This file is the **fixed plan**: what's in and out of scope, how work breaks down, the order of work, and the cut order.

**Live status is not tracked here.** Owners, progress, blockers and handoffs live in the GitHub issues and the Project board (see `AGENTS.md`). Each task below points to the issue that tracks it. Put the task ID (e.g. `A07`) in the issue checklist and commit messages so work can be traced.

**Code freeze: October 10, 2026, 10:00 AM Asia/Manila.** Target times assume work starts ~23:00 Oct 9.

## Rules for humans and agents

1. **Only build what is listed here.** If work isn't covered by a task below, don't build it. Raise it on the relevant issue and get the team to agree before changing scope. Record the agreement in `docs/decisions.md`, then update this file.
2. Work **P0 before P1, and P1 before P2.** P2 gets cut first. Never trade a P0 for a P2.
3. A task is done when its **acceptance check passes on a real device or test**, not when it compiles. Never claim a flow that hasn't been tested.
4. If an open decision (§1) blocks a task, ask on its issue. Don't silently pick an option.

Priority: **P0** must ship · **P1** should ship · **P2** only if time remains

---

## 0. Out of scope: do not build

Agents: refuse or flag requests that fall in this list, even small ones.

- Required accounts/login and plaintext cloud health-data storage. Optional Clerk login and client-encrypted Turso snapshot sync are explicitly approved under X01; they never gate local use.
- Remote/cloud inference, or any network call carrying plaintext user records or chat text
- Analytics, telemetry, or crash reporting that includes record contents
- Pill brands, products or regimens other than the one Trust 28-tablet pack
- iOS, Intel Mac, app-store distribution, signed auto-update
- Languages other than English
- Fine-tuning a model
- Personalized cycle/period prediction, fertility windows, pregnancy probability, "safe to have sex" verdicts, diagnoses
- Clinical guidance for: whether someone can start the pill, drug interactions, vomiting/diarrhea, emergency-contraception dosing, when protection begins
- CSV export, merge-on-import, and automatic record-level cloud merging. X01 uses explicit snapshot conflict review.
- Streaks, scores, punishment visuals (wilting), "protected" badges
- General-purpose medical chat. Out-of-scope questions get a bounded reply plus a referral.
- Clinical rules written from the PRD, memory or the AI model. Rules come **only** from the verified leaflet/CDC review (C01–C03, #4).

---

## Approved extension: X01 optional encrypted sync

User explicitly requested this extension on October 9 and selected pnpm workspaces + Express, overriding the earlier sync deferral. Track ownership, progress and remaining app access in [#17](https://github.com/DheKode/Petal-Monorepo/issues/17). This is P1 and must not become a dependency of the offline P0 flow.

| ID | Pri | Task | Acceptance check | Issue |
| --- | --- | --- | --- | --- |
| X01 | P1 | Optional Clerk identity, owner-scoped Turso ciphertext API, shared client encryption, recovery-key workflow and development sync UI | Crypto/auth/account isolation/conflict/deletion tests pass; Turso schema applied; live Clerk sign-in and platform integration verified separately before being claimed | #17 |

DEC1: pnpm workspaces approved by the user. X01 bootstraps workspace configuration but does not complete S01-S03 or prove Metro/native builds. DEC2 retains `apps/mobile`, `apps/desktop`, `apps/landing`, and `packages/domain`; X01 adds `apps/sync-api`, `apps/sync-demo` (development only), and `packages/encrypted-sync`. See `docs/decisions.md` and `docs/encrypted-sync.md` for boundaries and limitations.

---

## 1. Decisions to lock in the first hour

Record each outcome in `docs/decisions.md` and on the linked issue.

| ID | Decision | Options / recommendation | Issue |
| --- | --- | --- | --- |
| DEC1 | Package manager and workspaces | npm or pnpm workspaces. Check that Metro (React Native's bundler) resolves the shared package first. | #2 |
| DEC2 | Repo layout | `apps/mobile` (React Native), `apps/desktop` (Electron + Vite), `apps/landing`, `packages/domain` (shared TypeScript). `lib/` unused unless agreed. | #2 |
| DEC3 | Model | Gemma 3 1B IT Q4 vs Qwen3-0.6B Q4 (thinking off). Choose by A01 result, not preference. | #3 |
| DEC4 | Model delivery | Download on first run (PRD) vs bundled with the app. Demo devices are prepared beforehand either way. | #15 |
| DEC5 | Desktop chat in scope? | Decided at Gate 1. If the AI doesn't run offline on desktop by then, desktop = logging, guidance and backup only. | #3 |
| DEC6 | Chat history persistence | Recommend **not persisted**; declare it in the README. | #9 |
| DEC7 | "Taken now" with several doses due | Recommend: attach to the earliest unresolved scheduled dose and show which before saving, with an option to pick another. | #5 |
| DEC8 | Time zone change / travel | Recommend: keep scheduled times in the setup zone; show a notice if the device zone differs; no automatic rescheduling. | #5 |
| DEC9 | Late/missed thresholds | **Cannot be decided here.** Come only from C02. Until then, the guidance UI shows "not yet verified". | #4 |

---

## 2. Tasks by gate

Gates are in dependency order. Later gates can start early on mocks, but per `AGENTS.md`, mocks must be disclosed and replaced before a flow is claimed to work.

### Gate 0: Foundation (target 00:00)

| ID | Pri | Task | Acceptance check | Issue |
| --- | --- | --- | --- | --- |
| S01 | P0 | Lock DEC1–DEC2; set up workspaces, TypeScript config, shared `packages/domain` | Mobile and desktop apps both import a hello-world export from `packages/domain` and build | #2 |
| S02 | P0 | Scaffold `apps/mobile` (React Native CLI / native build, **not** Expo Go) | Runs on the Honor phone | #2 |
| S03 | P0 | Scaffold `apps/desktop` (Electron + React/Vite) | Window opens on Windows; same build tested on the M1 Mac | #2 |
| S04 | P0 | Record test hardware: Honor model/OS/RAM, M1 RAM/OS, VivoBook CPU/RAM/OS | Written to `docs/hardware.md` | #12 |
| S05 | P1 | Document the real install/build/test commands in `AGENTS.md` | Fresh clone builds by following them | #2 |
| C01 | P0 | Get the exact Trust leaflet; verify formulation, tablet order, 21 active + 7 inactive, and what the brown tablets contain | Leaflet stored in `docs/sources/`; findings in `docs/clinical-review.md` | #4 |

### Gate 1: AI runs offline (hard checkpoint 02:00)

| ID | Pri | Task | Acceptance check | Issue |
| --- | --- | --- | --- | --- |
| A01 | P0 | llama.rn on Android: load a Q4 build of a candidate model and stream a reply | Airplane mode on the Honor phone, fresh reply streams; time to first token and peak memory recorded | #3 |
| A02 | P0 | llama.cpp on desktop (Node binding or bundled helper process) | Offline reply on Windows; M1 if possible. **Decides DEC5.** | #3 |
| A03 | P0 | Verify the chosen model's license, redistribution terms and file source; pin versions | Written to `docs/models.md` | #3 |
| A04 | P1 | Benchmark the second model on the same prompts (only if A01 finished early) | Numbers in `docs/models.md`; DEC3 recorded | #3 |

### Gate 2: Domain core (target 03:00)

| ID | Pri | Task | Acceptance check | Issue |
| --- | --- | --- | --- | --- |
| D01 | P0 | Types for every PRD §10 entity | Compile and are shared by both apps | #2 |
| D02 | P0 | Schedule derivation for first-pack and mid-pack setups: positions, active/inactive status, timestamps with time zones | Unit tests: first pack, mid-pack, pack change | #5 |
| D03 | P0 | Intake states taken / confirmed missed / unsure / **no entry**; time precision exact/approximate/unknown | Tests: blank ≠ missed; approximate never becomes exact | #5 |
| D04 | P0 | Every entry tied to a scheduled dose ID; two doses on one day kept separate; same dose can't be confirmed twice by accident (DEC7) | Tests for both cases | #5 |
| D05 | P0 | Corrections write an audit log (manual/chat/import origin) and recalculate guidance | Edit → AuditEntry with old and new values; guidance result changes | #5, #6 |
| D06 | P0 | Rules engine **contract**: records + pill profile in; fixed actions, missing facts, scope flags, rule ID/version, evidence IDs out | Contract types plus a stub returning "unsupported / not yet verified" | #2 |
| D07 | P0 | Evidence store format (PRD §7 fields), bundled as JSON | Loads offline; citations resolve by ID | #2 |
| D08 | P0 | Backup format v1: schema/app version, export time, all records, settings, audit log | JSON schema plus round-trip test | #2 |

### Gate 3: Clinical rules (target 04:00, in parallel with Gate 2)

| ID | Pri | Task | Acceptance check | Issue |
| --- | --- | --- | --- | --- |
| C02 | P0 | Check the leaflet against CDC guidance; list supported vs referral-only scenarios; record thresholds (DEC9) | `docs/clinical-review.md` lists each rule branch with its source quote | #4 |
| C03 | P0 | Approved test cases: threshold edges, one missed active pill, several missed in a row, missed inactive pill, delayed new pack, incomplete history, out-of-scope cases | Fixtures in `packages/domain`, each tied to a source | #4 |
| D09 | P0 | Implement only the rule branches C02 approved; flag everything else unsupported | All C03 fixtures pass | #5 |
| D10 | P0 | Gather and bundle approved evidence excerpts | Every branch's evidence IDs resolve offline | #4 |

**If C01/C02 can't be finished:** keep guidance branches disabled and say so in the app, README and pitch. Never fill the gap with invented rules.

### Gate 4: Android core flow (target 06:00)

| ID | Pri | Task | Acceptance check | Issue |
| --- | --- | --- | --- | --- |
| M01 | P0 | SQLite storage for all entities (F13) | Data survives killing and restarting the app, with no internet | #6 |
| M02 | P0 | Setup (F01): confirm product → first or current pack → usual time, time zone, start date/position → review schedule → optional past entries | Both setup paths work; unspecified history stays unknown | #7 |
| M03 | P0 | Today screen + logging (F03): Taken now (undo / change time), Taken earlier, Confirmed missed, Unsure; shows unresolved history | Every state saved with its dose ID | #7 |
| M04 | P0 | Pack view (F02): active/inactive tablets labeled with text, not only color; current and next dose | Matches the verified pill map | #7 |
| M05 | P0 | Guidance panel (F05/F06): fixed actions shown immediately; expandable rule version, related entries, missing facts, source excerpts | Updates after a correction | #7 |
| M06 | P0 | Edit/undo with audit log (F04) | Survives restart; guidance recalculates | #7 |
| M07 | P1 | Local reminders (F12): discreet wording, explanation if permission is denied, rescheduled when the usual time changes | Tested on Honor: allowed, denied, app in background | #7 |
| M08 | P1 | Tracking-only mode when the product can't be verified | Limitation shown clearly; guidance hidden | #7 |

### Gate 5: AI features (target 07:00)

| ID | Pri | Task | Acceptance check | Issue |
| --- | --- | --- | --- | --- |
| A05 | P0 | Context builder: only the relevant entries plus 1–3 evidence passages; never the whole journal | Unit-tested prompt assembly | #9 |
| A06 | P0 | Explanation of a guidance result in ~50–100 words, streamed with a cancel button; rule actions never come from the model | Offline on the phone; cancel works | #9 |
| A07 | P0 | **History repair (spotlight):** find unresolved facts → one focused question → propose a correction (dose ID, date, time precision, status) → preview → confirm or cancel (F08) | Cancel changes nothing; confirm writes an AuditEntry with chat origin; uncertain memories stay uncertain | #9 |
| A08 | P0 | Output check: reject replies that contradict the supplied facts or cite IDs that weren't supplied; fall back to a fixed explanation | Tests: conflicting prompt, guidance override attempt, made-up citation | #9 |
| A09 | P0 | Prompt-injection safety: user text and passages treated as data; out-of-scope questions get a bounded reply plus referral | Tests: diagnosis request, "ignore your rules" | #9 |
| A10 | P0 | Fallback (F16): model load/generation failure leaves logging, fixed guidance and offline sources working | Delete or corrupt the model file → app still usable | #9 |
| A11 | P1 | FAQ answers (F09): keyword search over approved passages, offline citations, explicit message when evidence is insufficient | Relevant and irrelevant FAQ tests | #9 |
| A12 | P1 | Model download screen: size, progress, cancel/retry, file check, low-storage error (skip if DEC4 = bundled) | Interrupted download recovers | #15 |

### Gate 6: Supporting features (target 08:00)

| ID | Pri | Task | Acceptance check | Issue |
| --- | --- | --- | --- | --- |
| B01 | P1 | Bleeding journal (F10): date, category, optional intensity and note; edit/delete; on the timeline separately from pill entries | Survives restart; no diagnosis anywhere | #10 |
| B02 | P1 | Pack phase display (F11 fallback): pack phase plus an educational note, **no dates** | Never labeled guaranteed, fertile, or proof of effectiveness | #10 |
| B03 | P2 | Pack-based bleeding window: **only** if C02 produced reviewed evidence supporting it | Otherwise stays cut | #10 |
| K01 | P1 | Export (F14): full versioned JSON with a sensitivity notice and its encryption status labeled | Round-trip test passes | #6 |
| K02 | P1 | Import: preview → recovery backup → confirm → replace everything in one transaction; recalculate guidance | Malformed, too-large or incompatible file → current data untouched | #6 |
| K03 | P1 | Remove sensitive data from console and crash logs | Grep the logs after a full flow | #14 |
| K04 | P1 | Privacy screen: data stays on device; at-rest encryption status stated honestly | Claims nothing unverified | #14 |

### Gate 7: Desktop (only after Android P0s pass)

| ID | Pri | Task | Acceptance check | Issue |
| --- | --- | --- | --- | --- |
| W01 | P1 | Desktop SQLite storage + setup + logging + guidance, reusing `packages/domain` | Survives restart on Windows | #8 |
| W02 | P1 | Desktop backup/import (K01/K02 behavior) | Round-trip between desktop and Android | #6 |
| W03 | P2 | Desktop chat (only if DEC5 = yes) | Offline reply on Windows/M1 | #9 |
| W04 | P2 | Desktop reminders, with text saying whether the app must stay running | No promises of notifications when fully quit | #8 |

### Gate 8: Ship (target 09:00, hard stop 10:00)

| ID | Pri | Task | Acceptance check | Issue |
| --- | --- | --- | --- | --- |
| U01 | P0 | Designer UI pass on the core flow: readable text, contrast, touch targets, labeled controls, no meaning carried by color alone | Checked on the phone | #11 |
| P01 | P0 | Android APK build | Installs on a clean device | #12 |
| P02 | P1 | Windows/macOS installers; unsigned status and install steps stated honestly | Tested on the VivoBook / M1; broken targets not listed | #12 |
| L01 | P1 | Landing page (F15): real download links, platform labels, version, setup steps, prototype status; no health data | Every link downloads a working build | #11 |
| R01 | P0 | README: setup steps, models/runtimes/frameworks, what needs internet vs works offline, AI tools used, existing code/assets, team names, measured performance and limits | Fresh clone works by following it | #13 |
| V01 | P0 | Demo with fictional data: airplane mode → today's logging → repair the uncertain Friday entry → confirm → updated guidance + fresh AI explanation + sources → restart | Recorded video | #13 |
| V02 | P0 | 5-minute pitch + Q&A prep: user/problem, offline flow, architecture/traceability, measured numbers and limits | Run through once with a timer | #13 |
| V03 | P0 | Submission: public repo, video/social URL, every item in the briefing checklist | Checked against the briefing PDF **before** the single submission | #13 |

---

## 3. Final checks before freeze (PRD §13)

- Logging survives restart; offline date/time correction works
- Test cases cover threshold edges, several missed pills, inactive tablets, delayed pack start, incomplete history, or those cases are explicitly flagged unsupported
- No-entry and confirmed-missed stay distinct
- Approximate/unknown times are never turned into exact times
- Chat corrections need confirmation; cancel leaves records unchanged
- Fixed actions stay correct with the AI disabled or failing
- AI tests: factual history questions, relevant/irrelevant FAQs, ambiguous dates, diagnosis requests, conflicting prompts, attempts to override guidance
- JSON round-trip preserves data; a malformed import doesn't damage records
- Reminders tested on Honor: permission denied, app in background
- Airplane-mode demo: fresh AI reply, source access, persistence after restart
- Desktop installers tested on real devices, or left out of every claim

## 4. Cut order when behind schedule

Cut from the top first. Never cut persistence, verified guidance (or honestly disabled guidance), real on-device AI, or chat confirmation.

1. B03 bleeding window
2. W03 desktop chat → W04 → W02 → W01 (Android-only demo is acceptable)
3. A04 second-model benchmark
4. Animation and companion motion
5. A11 FAQ chat (keep cited sources in the guidance panel)
6. A12 download screen (use a bundled model)
7. L01 landing page reduced to a GitHub release page
8. B01/B02 bleeding journal
