# Petal — Product Requirements Document

Version: 1.0 | Date: October 9, 2026 | Status: Hackathon implementation specification

## 1. Product intent

Petal is a private, offline pill companion for adults using one supported Trust 28-tablet product. It helps users record intake, understand supported missed-dose guidance, reconstruct uncertain histories, and journal bleeding. A deterministic engine controls clinical actions; a local language model explains results using confirmed history and bundled evidence.

The SLC promise is: **“Record what happened, resolve what you can, and understand the supported next step without uploading your sensitive history.”**

This is a hackathon prototype, not a clinically validated product. Improved adherence and comprehension are hypotheses, not established outcomes.

## 2. Users and boundaries

- Primary: adults already using the supported Trust pack who need daily logging or help with late, missed, or uncertain intake.
- Included: new users starting their first pack, through minimalist setup and sourced educational FAQs.
- Mid-pack onboarding is required; remembered history may be partial.
- Product scope: the user-described Trust pack with 21 active tablets and 7 brown tablets. Exact ingredients, strengths, non-hormonal tablet contents, ordering, and leaflet must be verified before enabling product-specific clinical guidance. Color alone cannot identify a formulation.
- Other brands and regimens are unsupported in this release.
- New-user setup does not establish medical eligibility, prescribe initiation, or assert when protection begins. Those questions use approved educational material or referral.

## 3. Release scope

| Area | Hackathon release | Later |
| --- | --- | --- |
| Platforms | Android, Windows, macOS Apple Silicon | Intel Mac after testing; iOS |
| Distribution | Download landing page with APK and desktop installers | Store distribution and signed update pipeline |
| Storage | Local database; no account needed | Optional Clerk authentication and end-to-end encrypted Turso sync |
| Routine | Setup, pack view, timestamp logging, reminders, corrections | Additional pill products |
| Guidance | Verified limited rules, traceable results, uncertainty handling | Additional reviewed clinical scenarios |
| Chat | English-only local explanations, FAQs, proposed record corrections | Other languages |
| Bleeding | Bleeding/spotting journal; sourced FAQs; conditional pack-based estimate | Personalized prediction after validation |
| Portability | Versioned JSON export/import | CSV export and conflict-aware sync |

All three core experiences must work: daily logging, missed-dose understanding, and uncertain-history reconstruction. Reconstruction receives the demo spotlight. Do not claim a platform or feature works until its flow is tested.

## 4. Simple, lovable, complete

- Simple: one supported product; one-tap logging; a compact timeline; details revealed when needed.
- Lovable: gentle, discreet language and a companion designed by the team designer. No punitive streaks, wilting for missed doses, or protection badges.
- Complete: setup → record → correct/clarify → evaluate → explain → inspect evidence; data survives restart and can move through backup/import.

Visual design, mascot, colors, and animation belong to the designer. Requirements include readable text, adequate contrast, accessible touch targets, labeled controls, and no reliance on color alone.

## 5. Core journeys

### 5.1 Start tracking

1. Confirm the supported product against verified details.
2. Choose first pack or current pack.
3. Enter usual intake time, time zone, and pack start date or current scheduled tablet position/date.
4. Review the derived schedule before saving.
5. Add remembered intake optionally; unspecified history remains unknown.
6. Enable discreet notifications optionally and download the model when ready.

The app remains useful before the model download completes. If product verification is unavailable, show tracking-only mode with a visible limitation.

### 5.2 Daily logging

Today shows the scheduled tablet, scheduled time, recorded status, next reminder, and any unresolved history. “Taken now” saves actual intake time immediately, with undo/change-time access. “Taken earlier” opens a minimal date/time picker. “Confirmed missed” and “Unsure” are explicit alternatives.

Logging is associated with a scheduled dose identity, not just a calendar day. Two tablets taken on one day must be representable as separate dose events. A blank record is never automatically a confirmed miss.

### 5.3 Understand guidance

The engine receives normalized records and a verified pill profile. It returns fixed actions, missing facts, scope flags, rule ID/version, and evidence IDs. Show fixed guidance immediately; generate its explanation separately. Corrections trigger reevaluation.

### 5.4 Reconstruct uncertainty

User: “I remember Saturday but not Friday.” Petal queries relevant records, identifies unresolved facts, and asks a focused question. It proposes a correction with dose identity, date, time precision, and status. The user confirms before mutation. If memory remains uncertain, preserve it as uncertain and explain the limitation.

AI may help organize remembered information; it cannot recover forgotten facts or convert guesses into confirmed intake.

### 5.5 Bleeding journal

Record date, spotting/bleeding category, optional intensity, and optional note. Allow edits and deletion. Show entries on the timeline independently of dose adherence.

Expected bleeding is a **pack-based estimated window**, not a personalized cycle prediction. Implement only if reviewed evidence supports the displayed window for this product. Otherwise show the pack phase and an educational explanation without invented dates. Never label it guaranteed, a fertility window, or evidence of contraceptive effectiveness. Regimen changes invalidate stale estimates.

## 6. Functional requirements and acceptance

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| F01 | Product/setup | First-pack and mid-pack flows work; review schedule; retain unknown prior history |
| F02 | Pack view | Distinguish verified active/non-hormonal positions by labels; show current and next scheduled dose |
| F03 | Intake journal | Save scheduled/actual times and taken/missed/unsure states; separate same-day doses |
| F04 | Corrections | Undo/edit persists; previous values remain in a local audit trail; guidance recalculates |
| F05 | Guidance | Supported cases match approved fixtures; unsupported/incomplete cases show their limits |
| F06 | Traceability | Each result exposes rule version, relevant events, missing facts, and source passages |
| F07 | Local chat | Fresh history-aware response works with internet disconnected; model/runtime disclosed |
| F08 | Chat mutations | Preview and explicit confirmation precede every write; cancel changes nothing |
| F09 | RAG FAQs | Answer uses bundled approved passages; citations resolve offline; insufficient evidence produces an explicit limitation |
| F10 | Bleeding journal | Add/edit/delete persists after restart; no diagnosis inferred |
| F11 | Bleeding estimate | Display only with reviewed supporting evidence and clear uncertainty; otherwise show pack phase |
| F12 | Reminders | Local notifications use discreet text; permission denied state explained; schedule changes update reminders |
| F13 | Persistence | Records and settings survive restart without login or internet |
| F14 | Backup | Export complete versioned JSON; import preview and confirmation; invalid files leave current data intact |
| F15 | Landing page | Real APK/Windows/macOS download links, platform labels, version, setup instructions, and prototype status |
| F16 | Failure fallback | Model load/generation failure preserves logging, fixed guidance, and offline source access |

Desktop reminders must describe whether the app needs to remain running. Do not promise background notifications when the app is fully quit unless implemented and tested.

## 7. Clinical logic and evidence contract

This PRD defines engineering behavior, not a medication protocol. Do not derive treatment rules from this document alone.

Before implementing actions:

1. Obtain the exact Trust leaflet and verify the supported formulation/regimen.
2. Review relevant CDC guidance and reconcile it with the product leaflet; do not silently mix conflicting instructions.
3. Define approved rule branches and representative expected outputs with source metadata.
4. Document which scenarios are supported and which require referral.
5. Test clinical rule correctness separately from generated-language quality.

Required inputs include scheduled dose identity/time, actual time if known, active status, pack position, previous relevant intake, and uncertainty. Preserve approximate time precision; do not invent exact timestamps.

The engine must handle or explicitly flag consecutive misses, pack transitions, delayed new packs, unknown history, and circumstances outside approved scope. Initiation eligibility, pregnancy diagnosis, interactions, vomiting/diarrhea protocols, and emergency-contraception dosing are outside this release. Approved escalation text must distinguish time-sensitive questions when applicable.

No pregnancy probability, “safe to have sex” verdict, or individualized diagnosis. Unsupported questions receive bounded information and appropriate referral rather than fabricated certainty.

Each evidence item stores publisher, title, URL, section/page, excerpt, publication/update date if available, retrieval date, formulation applicability, version, and review status. Citations are assembled from stored evidence IDs, never invented by the model. Bundled excerpts remain readable offline; external URLs require internet.

## 8. Local AI and retrieval

### Candidates

- Gemma 3 1B IT, supported 4-bit artifact.
- Qwen3-0.6B, supported 4-bit artifact, thinking disabled.
- Select one after testing; neither has been validated for Petal or the target phone.
- No fine-tuning required for the hackathon. Verify model licensing, redistribution terms, artifact provenance, and runtime compatibility before packaging.

### Responsibilities

| Component | Authority |
| --- | --- |
| Structured database query | Personal intake facts and bleeding records |
| Deterministic rules | Timing calculations and approved clinical actions |
| Local retrieval | Relevant approved reference passages |
| Local LLM | Short explanation, bounded FAQ response, clarification/proposed correction |
| User confirmation | Authority to change remembered records |

Retrieve only relevant events and roughly 1–3 evidence passages. Start with a short runtime-supported context budget and approximately 50–100-word responses. Stream output and support cancel. Do not send the entire journal by default.

For a small corpus, local lexical retrieval plus rule-linked passages is acceptable; embeddings are optional if integration time and hardware permit. Disclose the actual retrieval method. Stored personal timestamps must not depend on semantic retrieval.

Keep clinical action text outside free-form generation. Constrain the model to the supplied facts and passages; reject inconsistent output and show a deterministic explanation. Automated validation is a safeguard, not proof of clinical correctness.

Treat user text and retrieved passages as data, not instructions that can override the app contract. Out-of-scope questions must not invoke unrestricted medical chat.

### Download lifecycle

First-run model download shows size, progress, cancel/retry, integrity verification, and insufficient-storage errors. Load a local verified artifact on subsequent launches. Tracking/fixed guidance work before download; local generated chat works offline after setup.

## 9. Technical direction

Implementation recommendation, subject to an immediate native-inference spike:

- Shared TypeScript domain package: records, validation, schedule logic, approved rules, evidence contracts, backup schema.
- Android: React Native with a native build and a compatible llama.cpp binding; not an Expo Go-only implementation.
- Desktop: Electron + React/Vite with a compatible local llama.cpp runtime or packaged sidecar.
- Landing page: static React/Vite or plain HTML; download distribution only, no health records.
- Local SQLite adapters for Android and desktop; avoid forcing identical UI or native integrations across platforms.
- Shared versioned bundled evidence and rule definitions.

Confirm runtime support for the chosen quantized artifact on both architectures before building the full chat UI. Pin working dependency versions. Core inference must execute on the demonstrated user device, not a remote home server.

## 10. Data model

| Entity | Essential fields |
| --- | --- |
| PillProfile | ID, product/formulation, regimen, tablet map, leaflet/evidence version, verification state |
| Settings | usual time, IANA time zone, notification preference, locale, model configuration |
| Pack | ID, profile ID, start date, schedule version, transition state |
| ScheduledDose | ID, pack ID, position, active status, scheduled timestamp/local date |
| IntakeEvent | ID, dose ID, status, actual timestamp nullable, time precision, origin, created/updated time |
| AuditEntry | ID, entity ID, prior/new values, timestamp, manual/chat/import origin |
| BleedingEntry | ID, date/range, category, intensity nullable, note nullable |
| Evidence | ID, source metadata, passage, applicability, review/version metadata |
| GuidanceResult | rule/version, relevant event IDs, fixed actions, missing facts, flags, evidence IDs |

Store timestamps with offsets and time-zone context. Changing reminder time must not rewrite historical times. Prevent accidental duplicate confirmation; do not forbid legitimate same-day intake for different scheduled doses. Do not advance the pack solely because a button was tapped; retain dose identity and approved schedule adjustments.

Chat persistence is optional and must be declared; the complete backup covers durable user records, setup, settings, and audit entries. Recompute derived guidance after import.

## 11. Privacy and portability

No login, health-data upload, remote inference, or sensitive telemetry in the core release. Remove sensitive records from console/crash logs. Explain local storage and whether at-rest encryption is implemented; do not advertise encryption that has not been verified.

JSON backups include schema/app version and export time. Provide a sensitivity notice and label encryption status. Recommended initial import mode: replace current records after preview and explicit confirmation; create a recovery backup first. Validate schema, identifiers, dates, file size, and supported profile compatibility in a transaction. No silent merge or partial replacement.

### Roadmap: optional encrypted sync

Clerk supplies authentication; Turso stores encrypted records behind an authorized service. Neither alone provides end-to-end encryption. Require client-side encryption, keys unavailable to the backend, a user-controlled device-link/recovery flow, authorization isolation, conflict resolution, deletion semantics, and clear metadata disclosure. Never place privileged database credentials in clients. Local operation remains possible without signing in.

## 12. Hardware and performance validation

| Target | Available validation device |
| --- | --- |
| Android | Honor phone, Helio G99, 8 GB RAM; exact model/OS to record |
| macOS | M1 MacBook Air; record RAM/OS |
| Windows | ASUS VivoBook; record CPU/RAM/OS |

Provisional goals, not measured claims: first streamed text within 5 seconds; short response within 20 seconds on the test phone. Logging and navigation should remain responsive during inference. Measure cold/warm startup, time to first token, completion latency, peak memory, output length, and repeated-turn stability.

Benchmark both candidates on identical history/FAQ prompts. Select on grounded correctness and acceptable latency, not fluency alone. If neither meets the goals, reduce context/output or scope and report measured limitations. No general 6 GB compatibility claim until tested.

## 13. Verification gates

- Logging persists after restart; offline date/time correction works.
- Approved clinical fixtures cover exact threshold boundaries, multiple missed doses, inactive tablets, delayed pack start, and incomplete history, or explicitly verify unsupported handling.
- No-entry and confirmed-missed states remain distinct.
- Approximate/unknown times never become fabricated exact times.
- Chat correction requires confirmation; cancellation leaves records unchanged.
- Fixed actions remain correct when AI is disabled or fails.
- AI tests cover factual history questions, relevant/irrelevant FAQ retrieval, ambiguous dates, unsupported diagnoses, conflicting prompts, and attempts to override guidance.
- JSON round-trip preserves user data; malformed imports do not damage current records.
- Local reminders tested on the Honor device, including denied permissions and app background state.
- Airplane-mode demo includes fresh generation, source access, and restart persistence.
- Windows and macOS installers tested on the available devices; disclose unsigned packaging and installation steps honestly.

Clinical evidence gaps cannot be hidden by a disclaimer. Disable affected guidance branches until verified; use clearly fictional demo records.

## 14. Build priorities and team coordination

Four teammates may work across the stack; workstreams are temporary ownership of deliverables, not permanent roles.

1. First integration gate: model loads and responds locally on Android and desktop; choose viable runtime/model.
2. Parallel workstreams: shared data/rules/evidence, Android shell/logging/reminders, desktop shell/backup, designer-led UI plus landing/demo assets.
3. Agree early on event schemas, guidance result contract, evidence IDs, and backup format.
4. Integrate the complete logging → clarification → confirmation → guidance → explanation flow before visual polish.
5. Add bleeding journal, approved pack estimate, backup/import, and installer checks.
6. Freeze features with time reserved for recording, README, public repository, and submission.

Trim optional animation, embeddings, and broad chat before sacrificing persistence, verified guidance, or actual local inference. Cloud sync is explicitly deferred. If cross-platform packaging fails, state exactly which targets work instead of listing broken downloads.

## 15. Demo and submission

Spotlight story: a fictional user has an uncertain Friday entry. With internet disconnected, show today's logging, ask Petal to clarify the history, confirm a correction, and inspect updated fixed guidance plus a fresh locally generated explanation and its evidence. Restart to demonstrate persistence if time permits.

Five-minute pitch: clear user/problem, working offline flow, architecture/traceability, measured model performance and limitations, product close. Prepare for three minutes of Q&A.

Per the supplied briefing, submission/code freeze is October 10, 2026 at 10:00 AM Asia/Manila. Submit public GitHub repository, reproducible setup instructions, demo video/social URL, team names, models/runtimes/frameworks, existing assets/code, AI development tools, and explicit local-versus-internet dependencies. Verify all checklist items against the briefing before the single submission.

Judge-facing evidence: usefulness from the complete user journey; local AI from fresh offline generation; technical execution from persistence, correction, tested rules, and fallback; innovation from private traceable history explanations; product quality from the focused usable demo.

## 16. Open validation items

- Exact Trust leaflet/formulation not yet inspected; obtain and verify before clinical branch activation.
- CDC/local source corpus and pack-based bleeding window require review; no window chosen in this PRD.
- Model selection and G99 latency/memory are unmeasured.
- Exact Android model/OS and Windows hardware remain to be recorded.
- Installer signing and reminder background behavior depend on completed builds.

## 17. Source basis

- Supplied Petal concept paper: `Petal_Concept_Paper-2(3).pdf`.
- Supplied AppBuildersPH participant briefing: `AppBuildersPH-Hackathon-2026-Participant-Briefing(7).pdf`.
- User-approved scope and decisions in this conversation through October 9, 2026.
- Clinical references to acquire/review: exact Trust product leaflet, applicable CDC contraception guidance, and other authoritative formulation-relevant sources. This document does not certify that review is complete.
- Model/runtime candidates: https://ai.google.dev/gemma/docs/core/model_card_3 ; https://huggingface.co/Qwen/Qwen3-0.6B ; https://github.com/mybigday/llama.rn . Verify current compatibility and terms during implementation.
