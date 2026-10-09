// Pinned candidate artifacts. URLs resolve a fixed Hugging Face commit, and
// sha256 values are the repository's LFS object IDs at that commit.
// Model binaries are never committed; they live in modelsDir().
import os from "node:os";
import path from "node:path";

export const candidates = {
    "qwen3-0.6b-q4km": {
        title: "Qwen3-0.6B Q4_K_M (thinking disabled)",
        family: "qwen3",
        file: "Qwen3-0.6B-Q4_K_M.gguf",
        repo: "unsloth/Qwen3-0.6B-GGUF",
        revision: "50968a4468ef4233ed78cd7c3de230dd1d61a56b",
        sizeBytes: 396705472,
        sha256: "ac2d97712095a558e31573f62f466a3f9d93990898b0ec79d7c974c1780d524a",
        license: "Apache-2.0 (base weights: Qwen/Qwen3-0.6B)",
        upstream: "https://huggingface.co/Qwen/Qwen3-0.6B"
    },
    "gemma3-1b-it-q4km": {
        title: "Gemma 3 1B IT Q4_K_M",
        family: "gemma3",
        file: "gemma-3-1b-it-Q4_K_M.gguf",
        repo: "ggml-org/gemma-3-1b-it-GGUF",
        revision: "f9c28bcd85737ffc5aef028638d3341d49869c27",
        sizeBytes: 806058240,
        sha256: "8ccc5cd1f1b3602548715ae25a66ed73fd5dc68a210412eea643eb20eb75a135",
        license: "Gemma Terms of Use + Gemma Prohibited Use Policy",
        upstream: "https://huggingface.co/google/gemma-3-1b-it"
    }
};

export const defaultCandidate = "qwen3-0.6b-q4km";

export function getCandidate(id = defaultCandidate) {
    const candidate = candidates[id];
    if (candidate == null)
        throw new Error(`Unknown model "${id}". Known: ${Object.keys(candidates).join(", ")}`);

    return {id, ...candidate};
}

export function downloadUrl(candidate) {
    return `https://huggingface.co/${candidate.repo}/resolve/${candidate.revision}/${candidate.file}`;
}

// Outside the repository on every platform; override with PETAL_MODELS_DIR.
export function modelsDir() {
    return process.env.PETAL_MODELS_DIR || path.join(os.homedir(), ".cache", "petal", "models");
}

export function modelPath(candidate) {
    return path.join(modelsDir(), candidate.file);
}
