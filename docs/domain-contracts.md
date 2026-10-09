# Shared domain contracts v1

Issue #2, TASKS.md D01/D06-D08 and shared-package portion of S01. PRD sections 7, 9-11; F03-F06/F13-F14. Native app imports, storage/UI flows and reviewed clinical rules remain separate acceptance checks.

## Consume the package

Add `"@petal/domain": "workspace:*"` to the platform app manifest, then coordinate the root lockfile update. Run `pnpm --filter @petal/domain build` before compiling/running consumers. The package exports compiled ESM and TypeScript declarations, with no Node, browser storage, network or framework APIs in production code. It requires `Intl.DateTimeFormat` with IANA zones and `TextEncoder`; native adapters must supply supported implementations where needed.

```ts
import { BACKUP_VERSION, parseBackupJson, evaluateGuidance } from '@petal/domain';
```

Desktop/mobile agents may use `BACKUP_VERSION` as their shared-package import smoke value. Do not replace the package with a hello-world placeholder. No Metro/Honor/Windows integration test has been performed by this task.

## Entities and conventions

Schemas and inferred types cover PillProfile, Settings, Pack, ScheduledDose, IntakeEvent, AuditEntry, BleedingEntry, Evidence, GuidanceResult and GuidanceInput. IDs are opaque strings, not dates. Objects are strict: unrecognized fields fail rather than being silently stripped.

- Only Trust 28 is represented; an unverified profile can retain `unverified` tablet kinds and incomplete metadata. Verified metadata requires a complete 21 active / 7 non-hormonal map, ingredients, leaflet/evidence versions and applicable reviewed evidence references. Schema validation does **not** certify medical review or establish trust in imported metadata.
- Intake states are `taken`, `confirmed-missed`, and `unsure`. `no-entry` is derived from absence of a current event, never serialized as an invented miss. There is one current event per scheduled dose; corrections preserve its ID and append audit snapshots. Different scheduled doses may share an actual intake day.
- `actualAt` has an explicit offset (or Z); `timePrecision` is `exact`, `approximate` or `unknown`. Approximate timestamps remain approximate, never normalized to exact. Taken-with-unknown-time is valid. Confirmed-missed/unsure events have null actualAt and unknown precision.
- Schedule timestamps retain offsets, IANA zone and local date. Validation checks the local date in the stored schedule zone, calendar validity and record references. It does not generate schedules or decide travel/reminder rescheduling.
- Audit uses typed entity names and full prior/new snapshots (null for creation/deletion). Audit identity must match each snapshot. Deleted entities may remain only in the audit. Audit entries are not clinical facts independent of current records.
- Bleeding entries use start/end dates, spotting/bleeding category and optional intensity/note. No prediction or diagnosis is inferred.

## Guidance contract

`evaluateGuidance({profile, doses, events})` is a deliberately unsupported stub. It returns a fixed rule identifier/version, relevant event IDs, missing facts and `clinical-guidance-unverified`, with **no clinical actions or evidence citations**, even if the input claims a verified profile. It does not calculate thresholds, prescribe treatment or call an LLM.

Future approved rule implementations must retain this structured boundary and validate their fixtures independently of generated explanations. Only include relevant doses/events in evaluation context. `getIntakeState` distinguishes absent/unsure/missed/taken without changing records.

## Offline evidence

`@petal/domain/evidence.json` is currently an empty bundled corpus because reviewed sources have not been supplied under #4. `parseEvidenceCorpusJson` validates local JSON; `createEvidenceIndex` and `resolveEvidenceIds` resolve exact stored IDs and reject missing/duplicate citations. They never fetch external URLs. `schemas/evidence.schema.json` describes the interchange format.

Each passage includes publisher/title/URL/section, excerpt, publication and retrieval dates, supported profile IDs, version and review status. Fixtures are explicitly fictional, not source approval. Trusted bundled review manifests must remain separate from imported user backups; imported `reviewed` labels cannot authorize clinical branches.

## Backup v1

`BackupSchema` contains schema/app version, export timestamp, `encryption: none`, profiles, settings (nullable before onboarding), packs, scheduled doses, current intake events, complete audit, bleeding entries and evidence. Exclude auth/session credentials, encryption keys, model binaries and derived guidance. Plain JSON exports need the PRD sensitivity notice; encrypt the resulting JSON separately for optional cloud sync.

`parseBackupJson` checks UTF-8 size (maximum 1,500,000 bytes), JSON syntax, strict shapes, calendar/time precision, unique IDs/pack positions/current dose records, referential integrity, tablet kinds, evidence applicability and audit snapshots. `serializeBackup` validates and preserves uncertainty, offsets and the audit trail. `parseBackup` validates already-decoded objects; file/network adapters should use the bounded JSON entry point.

The published draft-2020-12 JSON Schema provides structural interchange validation. Applications **must additionally run parseBackup/parseBackupJson** for semantic and cross-record checks that JSON Schema cannot express. Regenerate schema with `pnpm --filter @petal/domain schema:generate`; tests reject drift.

These functions are pure validation/serialization, not an import operation. Platform adapters must additionally check supported product/version compatibility against their trusted configuration, preview replacement, create a recovery backup, receive explicit confirmation, replace durable records in one transaction and recompute guidance. Validation failure must leave current data intact. Local database/audit guarantees, confirmation UI and device persistence are not implemented here.

## Verification

Run `pnpm typecheck`, `pnpm test`, `pnpm build`. Tests cover complete round-trip, uncertain times, separate same-day doses, malformed/oversized/unsupported imports, secret-field rejection, broken references, audit corrections/deletion, profile metadata, unsupported guidance, offline evidence, and independent JSON Schema validation. Native adapters still require actual-device checks.
