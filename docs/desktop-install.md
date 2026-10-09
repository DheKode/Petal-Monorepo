# Petal desktop: install and demo data

Status: **prototype, Windows only.** The macOS build has not been made or tested (it must be built on a Mac so the matching database binary is included). Nothing here is signed.

## Build and install the Windows installer

```
pnpm install --frozen-lockfile
pnpm --filter @petal/desktop package:win
```

This produces `apps/desktop/release/Petal-Setup-0.1.0-x64.exe` (about 114 MB, per-user, no administrator rights). Run it; the app is installed under `%LOCALAPPDATA%\Programs\` and starts when the install finishes.

**The installer is not signed.** Windows SmartScreen will show "Windows protected your PC": choose **More info**, then **Run anyway**. Do not claim a signed or store-distributed build.

Where records live: `%APPDATA%\Petal\petal.db`. The file is plaintext (not encrypted). Uninstalling does not delete it.

What was and was not checked (Windows 11, October 10, 2026):
- The installer builds; a silent install (`/S`) installs; the installed app starts and shows its screen.
- **Not checked:** installing on a clean machine, the uninstaller (a silent uninstall did not remove the install folder in one test), upgrading over an older version, SmartScreen behavior, and macOS.
- **Known issues:** the install folder is named `@petaldesktop` (taken from the scoped package name; it should be `Petal`), and the installer starts the app right after install using the real data folder.

## Demo data (fictional, repeatable)

```
pnpm --filter @petal/desktop demo         reset the demo records and start the app on them
pnpm --filter @petal/desktop demo:seed    only create or reset the records (then start the app yourself)
```

The records live in `apps/desktop/.demo-data` (ignored by Git), never in your real data folder. The script only resets a folder it created itself (it leaves a `.petal-demo` marker), so it cannot overwrite real records; give it another folder with `--dir <folder>`. Close the app before running it again.

What it creates, relative to today so it works any day: a pack where today is tablet 12, usual time 21:00 in this computer's time zone; tablets 1 to 9 and 11 recorded; **tablet 10, the uncertain day, has no entry at all**; tablet 11, the day after, is remembered only roughly (taken about 21:30, approximate); tablet 4 is confirmed missed; tablet 6 is unsure; one spotting journal entry marked as a fictional demo entry. Open **Fix my history** to repair the uncertain day, then check the guidance panel and the change it made.

Everything is invented. Do not put real records in this folder.
