# Landing page and downloads: agent instructions

Applies to `apps/landing` (https://petal.necookie.dev) and to **every agent that produces an Android, Windows or macOS build**. Root [AGENTS.md](../../AGENTS.md) still applies.

## When you produce a new app build, update the download button

After you build a new `.apk` (`apps/mobile`), `.exe` or `.dmg` (`apps/desktop`), publish it in the same task:

1. **Test it first.** Install the exact file on a real target device: the Honor phone for Android, the VivoBook for Windows, the M1 Mac for macOS. Launch it and run the core flow you changed. If you cannot test on the device, **stop**: leave the button as it is and record "build not published: device test pending" on your issue. Never publish an untested build, an emulator-only build, or a build for a different app.
2. **Publish it with one command** from the repo root:
   ```sh
   pnpm --filter @petal/landing publish-build -- --platform android --file <path/to/app-release.apk> --tested-on "HONOR X8a (CRT-LX2), Android 14, 2026-10-10"
   ```
   Use `--platform windows` with the `.exe` and `--platform macos` with the `.dmg`. The command:
   - updates that platform's `url`, `sizeLabel` and `sha256` in `src/downloads.ts`
   - runs the landing tests and builds the page
   - re-stages the other platforms' published builds from the live site, after checking their SHA-256
   - deploys the Cloudflare Worker
   - verifies the live SHA-256 of every build

   If anything fails before the deploy, it restores `src/downloads.ts` and publishes nothing. `--dry-run` does everything except deploy.
3. **Commit `src/downloads.ts`** on your task branch and paste the printed table (platform, file, size, SHA-256, tested-on device) into your PR and issue. That table is the evidence the button points at a tested build.
4. **Check the page.** Open https://petal.necookie.dev and confirm the button now downloads the new file.

## Rules

- **Never commit build files.** Builds live only as deployed Worker static assets. They are split into parts under 20 MiB, because Cloudflare allows 25 MiB per file, and streamed back as one file from `/download/<name>`.
- **A deploy replaces every asset.** Only deploy with `publish-build` (or the manual steps in [README.md](README.md)), so the already-published builds are carried over. If re-staging a published build fails its SHA-256 check, stop and report it; do not deploy without it.
- **Label builds honestly.** A build published for a platform must be the Petal app for that platform. Test builds or previews need a clearly different `name`/`installNote` in `src/downloads.ts`, agreed with the human owner first. Keep the existing unsigned-installer notes.
- **File names** default to `petal-<release.version>.<apk|exe|dmg>`. Bump `release.version` in `src/downloads.ts` when the app version changes. Use `--name` only for agreed exceptions.
- **Credentials.** Deploying needs access to the owner's Cloudflare account (@Necookie): run `npx wrangler@4.139.0 login`, or set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` with a token the owner gives you. Never commit or print a token. If you have no access, hand the tested file and the `--tested-on` details to the owner and record that on the issue.
- **Scope.** Publishing a build touches only `apps/landing/src/downloads.ts` and the deployment. Do not change the page design, the Worker, or other apps as part of a build update.
