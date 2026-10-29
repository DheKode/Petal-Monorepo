# Petal desktop: install and demo data

Status: **prototype, Windows only.** The macOS build has not been made or tested (it must be built on a Mac so the matching database binary is included). Nothing here is signed.

## Build and install the Windows installer

```
pnpm install --frozen-lockfile
pnpm --filter @petal/desktop package:win
```

This produces `apps/desktop/release/Petal-Setup-0.1.0-x64.exe` (about 114 MB, per-user, no administrator rights). Run it; the app is installed under `%LOCALAPPDATA%\Programs\petal` and does **not** start by itself, so the first launch is the user's choice (it opens on the real data folder).

**The installer is not signed.** Windows SmartScreen will show "Windows protected your PC": choose **More info**, then **Run anyway**. Do not claim a signed or store-distributed build.

Where records live: `%APPDATA%\Petal\petal.db`. The file is plaintext (not encrypted). Uninstalling does not delete it.

What was and was not checked (Windows 11, October 10, 2026):
- The installer builds; a silent install (`/S`) installs into `...\Programs\petal` without starting the app or touching the real data folder; the installed app starts and shows its screen; the uninstaller (silent) removed the app and its registry entry once, and keeps the records file on purpose.
- **Not checked:** installing on a clean machine, upgrading over an older version, SmartScreen behavior, the interactive (non-silent) install and uninstall, shortcuts, and macOS. One earlier uninstall test, run while the app was still open, did not remove the folder: close Petal before uninstalling.
- **Known issue:** the install folder is lower-case `petal` (it is named after the package, now overridden to a plain name); the app and window are still called Petal.

## Demo data (fictional, repeatable)

```
pnpm --filter @petal/desktop demo         reset the demo records and start the app on them
pnpm --filter @petal/desktop demo:seed    only create or reset the records (then start the app yourself)
```

The records live in `apps/desktop/.demo-data` (ignored by Git), never in your real data folder. The script only resets a folder it created itself (it leaves a `.petal-demo` marker), so it cannot overwrite real records; give it another folder with `--dir <folder>`. Close the app before running it again.

What it creates, relative to today so it works any day: a pack where today is tablet 12, usual time 21:00 in this computer's time zone; tablets 1 to 9 and 11 recorded; **tablet 10, the uncertain day, has no entry at all**; tablet 11, the day after, is remembered only roughly (taken about 21:30, approximate); tablet 4 is confirmed missed; tablet 6 is unsure; one spotting journal entry marked as a fictional demo entry. Open **Fix my history** to repair the uncertain day, then check the guidance panel and the change it made.

Everything is invented. Do not put real records in this folder.

## Windows release verification — October 30, 2026

P02 / #12, source `a5cf78c`, tested on an Acer Predator PH315-55, Intel Core i5-12500H,
8 GB RAM, Windows 11 Home Single Language 10.0.26300. This is different hardware
from the plan's VivoBook; no VivoBook check is claimed.

- Frozen install, full workspace typecheck and tests, desktop production build,
  and `pnpm --filter @petal/desktop package:win` passed.
- Built-Electron `ai-electron-smoke.cjs`: first phase passed 13 checks; restart
  passed 5. Fresh CPU Gemma generation, reviewed citations, native cancellation
  and worker recovery, correction preview/cancellation/confirmation, and persisted
  unknown/approximate times worked with fictional records. Initial native answer
  took 32.9 seconds while packaging also ran; after restart it took 16.4 seconds.
  These timings are not target-device acceptance or disconnected-network proof.
- The missing-model phase passed 2 checks, including a useful fixed history
  answer. The harness now isolates the model lookup from `.model-bundle` and
  waits for Chromium to paint before taking its screenshot.
- Generated `release/Petal-Setup-0.1.0-x64.exe`: 1,190,242,521 bytes, SHA-256
  `204637e002116da0f58476bcf8c12039787979b4f6ee0e091ce37ebc3c052b40`.
  It contains the pinned Gemma model and Windows native dependencies; the older
  114 MB size above predates bundled inference. Build outputs remain ignored.
- Authenticode status: `NotSigned`. Attempting silent installation was rejected
  by Windows: "An Application Control policy has blocked this file." This is
  separate from the older SmartScreen warning described above. No security
  policy was changed and no installation success is claimed.

**Build not published: device test pending.** The Windows download remains
disabled. Next steps are to configure the owner's trusted code-signing identity,
rebuild/sign, install the exact resulting EXE on the release test device, verify
the installed core flow and restart, then run the existing `publish-build`
command and verify the live checksum. Source-build smoke tests do not replace
installed-executable verification. No Windows offline-generation claim is made.
