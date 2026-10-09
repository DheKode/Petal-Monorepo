// Usage: pnpm fetch-model [candidate-id]
// Downloads the pinned artifact to a .partial file, verifies size and sha256,
// then renames it into place. Re-running skips an already verified file.
import {createWriteStream} from "node:fs";
import {mkdir, rename, rm} from "node:fs/promises";
import {Readable} from "node:stream";
import {pipeline} from "node:stream/promises";
import {downloadUrl, getCandidate, modelPath, modelsDir} from "./models.mjs";
import {verifyArtifact} from "./verify.mjs";

const candidate = getCandidate(process.argv[2]);
const target = modelPath(candidate);

const existing = await verifyArtifact(target, candidate);
if (existing.ok) {
    console.log(`Already present and verified: ${target}\n  ${existing.reason}`);
    process.exit(0);
}

await mkdir(modelsDir(), {recursive: true});
const partial = `${target}.partial`;
const url = downloadUrl(candidate);
console.log(`Downloading ${candidate.title}\n  from ${url}\n  to   ${target}`);

const response = await fetch(url);
if (!response.ok || response.body == null)
    throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);

let received = 0;
let lastReport = 0;
const progress = new TransformStream({
    transform(chunk, controller) {
        received += chunk.byteLength;
        if (received - lastReport >= 32 * 1024 * 1024 || received === candidate.sizeBytes) {
            lastReport = received;
            process.stdout.write(`  ${(received / 1e6).toFixed(0)} / ${(candidate.sizeBytes / 1e6).toFixed(0)} MB\n`);
        }
        controller.enqueue(chunk);
    }
});

await pipeline(Readable.fromWeb(response.body.pipeThrough(progress)), createWriteStream(partial));

const result = await verifyArtifact(partial, candidate);
if (!result.ok) {
    await rm(partial, {force: true});
    throw new Error(`Integrity check failed, partial file removed: ${result.reason}`);
}

await rename(partial, target);
console.log(`Verified and saved: ${target}\n  ${result.reason}`);
