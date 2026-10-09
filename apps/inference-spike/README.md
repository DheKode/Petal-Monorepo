# Desktop local-inference spike

Throwaway proof for issue #3 (TASKS A02–A03): llama.cpp via `node-llama-cpp` loading Qwen3-0.6B / Gemma 3 1B Q4 GGUFs on desktop, in Node and in an Electron main process. Setup, results, licensing and Windows requirements: [`docs/models.md`](../../docs/models.md).

`node/` is its own pnpm workspace with its own lockfile, so it stays out of the root workspace until integration is agreed. Model files are downloaded to `~/.cache/petal/models` (or `PETAL_MODELS_DIR`) and never committed. Prompts are fictional and contain no clinical rules.
