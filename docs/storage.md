# Local SQLite storage adapter

`@petal/storage` implements the bounded Node/main-process portion of #6: D05, M01, K01/K02, PRD F03/F04/F13/F14. It consumes `@petal/domain` without changing that contract. Android needs its own compatible native SQLite driver; this Node package must never be imported into a renderer or React Native bundle.

The pinned existing `@libsql/client` 0.18.0 driver is used only with an absolute local file path. No credentials, sync URL, replication, accounts or network calls are used. Storage is **plaintext, not encrypted at rest**. Keep the database in the platform's private app-data directory; never commit it or include records in error/console logs.

## Interface and confirmation

```ts
import { LocalStore } from '@petal/storage';
const store = await LocalStore.open(absoluteDatabasePath);
const snapshot = await store.read(); // revision + complete validated durable records
const exported = await store.exportJson(); // JSON, plaintext label, sensitivity notice
const preview = await store.previewImport(importedJson);
// Show preview.backup, record counts, plaintext sensitivity notice and replace-all warning.
// Only after the user explicitly accepts that preview:
const { recoveryId } = await store.confirm(preview.token);
// Cancellation instead: store.cancel(preview.token), with no writes.
const previousJson = await store.recoveryJson(recoveryId!);
store.close();
```

`previewIntakeCorrection(event, 'manual' | 'chat')` stages a creation/correction and returns the actual prior/new records. Show those records before chat confirmation; `confirm(token)` commits that exact immutable proposal and its audit entry. Manual logging can use the same interface with the user's explicit logging action. Preserve event ID, scheduled dose ID and creation timestamp when editing. `unsure`, no-entry, approximate and unknown times retain their distinct meanings.

A preview token is local to the open store, expires after five minutes, is single-use, and is invalidated by cancellation, confirmation attempts, or closing. A successful write increments the database revision. Any preview based on an older revision fails, even if another process/connection changed the file. Returned preview objects are copies; changing them does not change staged writes. Maximum 64 live previews per open instance.

The app's privileged main process must own the store. UI IPC must expose specific read/preview/confirm/cancel operations, validate payloads and the sender, and never expose arbitrary SQL, file paths or a raw database object. Renderer confirmation events must correspond to a visible user-approved preview. A token does not itself prove a human clicked confirmation.

## Persistence, audit, import, and recovery

SQLite stores one complete validated JSON snapshot and its revision in `petal_state`, plus durable recovery snapshots in `petal_recovery`. This deliberately simple bounded representation preserves all domain entities and graph validation atomically; indexed per-entity journal queries are not implemented. `user_version=1` identifies this storage schema independently of JSON backup version. Newer storage schemas are rejected without downgrading.

Before import staging, parse and validate file size, JSON/schema version, dates, supported product, identity, references and evidence applicability using domain validation. Confirmation obtains a write transaction, checks the current revision, writes a complete pre-import recovery copy, appends import-origin audit entries for created/changed/deleted auditable entities, revalidates final size and graph, and replaces the snapshot. All writes commit together or roll back together. A recovery row exists before replacement inside the transaction and is durable with the successful replacement; failed imports leave no partial recovery row.

Import is explicit **replace-all**, not merge. Incoming audit history replaces current audit history, with new import audits appended. The previous complete history remains in the recovery backup. Recover by previewing and confirming `recoveryJson(id)` like any import; recovery never silently replaces data. Recovery snapshots are retained until a future explicit retention/deletion policy is implemented and may grow disk usage. Exports/imports and audit-enriched final snapshots are capped at the domain's 1.5 MB limit; large histories can be rejected safely rather than truncated.

Guidance is never persisted as authoritative data. `guidance(profileId)` derives a fresh result from the current snapshot after corrections/import. Clinical guidance remains disabled by the domain stub pending reviewed evidence/rules under #4/#5. Imported metadata does not enable clinical actions.

## Verification and remaining acceptance

Run `pnpm --filter @petal/storage test`, `pnpm --filter @petal/storage typecheck`, and `pnpm --filter @petal/storage build`. Tests use fictional records and real temporary SQLite files, including a fresh child process with no auth environment, reopening, backup round-trip, audit corrections, no-entry and same-day identities, cancellation, malformed/oversized imports, stale/replayed tokens, and a trigger-induced write failure that verifies complete rollback.

This is an adapter implementation, not a finished native app flow. Android consumption, Electron native-driver packaging/runtime, Windows persistence, app-level setup/logging/import previews, and restart behavior on each target still require integration/device verification. No tested Electron/Android compatibility or installer claim is made here. No model, clinical rule, reminder, or remote sync changes are included.

## Follow-ups from the PR #28 review (issue #37), October 10, 2026

**New operations.** All follow the same preview, show, confirm pattern; a preview writes nothing, is single-use, expires after five minutes, and `confirm(token)` commits exactly what was previewed together with its audit entry.

| Operation | Does | Audit entry |
| --- | --- | --- |
| `previewIntakeRemoval(doseId, origin)` | removes the current intake event of a dose; unknown dose is `unknown-entry` | prior set, new value `null` |
| `previewBleedingEntry(entry, origin)` | creates or edits a bleeding or spotting entry, matched by `id`; validated with `BleedingEntrySchema` | prior (or `null`), new |
| `previewBleedingRemoval(id, origin)` | deletes a bleeding or spotting entry; unknown id is `unknown-entry` | prior set, new value `null` |

`Preview.kind` is now `'import' | 'correction' | 'bleeding'`. Intake changes appear in `preview.changes`; bleeding changes appear in the new `preview.bleedingChanges` (always present, empty for other kinds). Nothing in storage predicts, infers or diagnoses from bleeding entries.

**Error codes** (all `StorageError`, message `Petal storage: <code>`, never record contents). New codes: `too-large` (a preview or confirm would exceed the 1.5 MB snapshot limit, now caught at **preview** time), `too-many-previews` (the 64-live-preview cap), `unknown-recovery`, `unknown-profile`, `unknown-entry`. `invalid-preview` now means only an unknown, cancelled, expired or already-used token. A malformed event or bleeding entry is `invalid-correction`; a raw `ZodError` is never thrown.

**Opening.** The schema version check and the table setup now run in one write transaction, so a file that was moved to a newer schema is never touched or downgraded, and a new file is stamped version 1 exactly once.

**Package exports** now include a `default` condition, so CommonJS tools (such as the desktop test runner) can `require('@petal/storage')` without `--conditions=import`.

**Caller responsibilities (not enforced here).** `previewIntakeCorrection` does not apply the domain's intake rules (`applyIntake`: no future times, deterministic event IDs, identical re-entry is a no-op). The app must call `applyIntake` first, as the desktop does. An identical re-submission would otherwise bump the revision and add an audit entry.

**Known limits of the SQLite driver on Windows, measured on October 10, 2026 (Node 22, `@libsql/client` 0.18.0):**
- `busy_timeout=5000` does apply to the write transactions: a second writer waited the full timeout and then failed with `SQLITE_BUSY`.
- After a failed attempt to take the write lock, that connection reports "SQL statements in progress" and cannot start another transaction until it is reopened. A failed `confirm` therefore uses up its preview and the caller must start again from a fresh preview (this is why the preview is not kept for a retry).
- The database file stays locked for one to two seconds after `close()`. Tests clean up temp folders on a best-effort basis.
- Several clients taking a write lock at the same moment on a new file were very slow (about 11 s for the first) and the others failed. The app never does this (single-instance lock, one connection).
