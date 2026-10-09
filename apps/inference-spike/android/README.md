# Android inference spike (React Native CLI + llama.rn)

Standalone proof for issue #3 / TASKS A01 (and the S02 "runs on the Honor phone" check): a React Native 0.86.3 app that loads Qwen3-0.6B Q4_K_M with llama.rn 0.12.9 and streams fresh replies to fictional prompts. Results and setup live in [`docs/models.md`](../../../docs/models.md).

It is its own pnpm workspace (hoisted `node_modules` for Metro) outside the root `apps/*` glob, so it does not touch the root lockfile. It moves to `apps/mobile` when integration with `@petal/domain` is agreed.

```sh
npx pnpm@11.25.0 install --frozen-lockfile      # also fetches llama.rn's verified prebuilt JNI libs
npx pnpm@11.25.0 android                        # release build, arm64 only, installs on the USB-connected phone
node tools/device.mjs info                      # record the phone
node tools/device.mjs push-model                # copy + verify the GGUF (download it with the desktop spike's fetch-model)
node tools/device.mjs bench --out result.json   # cold start, TTFT/latency, peak memory
```
