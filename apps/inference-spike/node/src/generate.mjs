// Usage: pnpm generate [--model <id>] [--prompt <id>|all] [--repeat <n>]
//                      [--max-tokens <n>] [--gpu auto|false] [--json <file>]
// Loads a verified local GGUF, streams fresh replies to the fictional prompts
// and reports load time, time to first token, completion latency and memory.
// Makes no network calls: it fails if the model file is missing.
import {readFile, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";
import {getLlama, LlamaChatSession, QwenChatWrapper, GemmaChatWrapper} from "node-llama-cpp";
import {getCandidate, modelPath} from "./models.mjs";
import {verifyArtifact} from "./verify.mjs";

const {values: args} = parseArgs({
    options: {
        model: {type: "string"},
        prompt: {type: "string", default: "all"},
        repeat: {type: "string", default: "2"},
        "max-tokens": {type: "string", default: "160"},
        gpu: {type: "string", default: "auto"},
        "skip-verify": {type: "boolean", default: false},
        json: {type: "string"}
    }
});

const here = path.dirname(fileURLToPath(import.meta.url));
const promptFile = JSON.parse(await readFile(path.join(here, "..", "prompts", "fictional.json"), "utf8"));
const candidate = getCandidate(args.model);
const file = modelPath(candidate);
const ms = (start) => Math.round(performance.now() - start);

let peakRss = process.memoryUsage().rss;
const sampler = setInterval(() => {
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
}, 25);

if (!args["skip-verify"]) {
    const verified = await verifyArtifact(file, candidate);
    if (!verified.ok)
        throw new Error(`Model not ready (${verified.reason}). Run: pnpm fetch-model ${candidate.id}`);
}

const processStartToLoadStart = Math.round(performance.now());
const loadStart = performance.now();
const llama = await getLlama({gpu: args.gpu === "false" ? false : "auto", build: "never", progressLogs: false});
const runtimeMs = ms(loadStart);
const modelStart = performance.now();
const model = await llama.loadModel({modelPath: file});
const modelMs = ms(modelStart);
const contextStart = performance.now();
const context = await model.createContext({contextSize: 2048});
const contextMs = ms(contextStart);
const loadMs = ms(loadStart);

const chatWrapper = candidate.family === "qwen3"
    ? new QwenChatWrapper({thoughts: "discourage"})
    : new GemmaChatWrapper();

const sequence = context.getSequence();
const selected = args.prompt === "all"
    ? promptFile.prompts
    : promptFile.prompts.filter((prompt) => prompt.id === args.prompt);
if (selected.length === 0)
    throw new Error(`Unknown prompt "${args.prompt}"`);

const runs = [];
for (let round = 1; round <= Number(args.repeat); round++) {
    for (const prompt of selected) {
        await sequence.clearHistory();
        const session = new LlamaChatSession({contextSequence: sequence, chatWrapper, systemPrompt: promptFile.system, autoDisposeSequence: false});
        let firstTokenMs = null;
        let tokens = 0;
        let thoughtTokens = 0;
        const start = performance.now();

        process.stdout.write(`\n--- [${candidate.id}] ${prompt.id} round ${round} ---\n`);
        const text = await session.prompt(prompt.text, {
            maxTokens: Number(args["max-tokens"]),
            temperature: 0.7,
            budgets: {thoughtTokens: 0},
            onResponseChunk(chunk) {
                if (chunk.type === "segment" && chunk.segmentType === "thought") {
                    thoughtTokens += chunk.tokens.length;
                    return;
                }
                if (firstTokenMs == null && chunk.text.trim() !== "")
                    firstTokenMs = ms(start);
                tokens += chunk.tokens.length;
                process.stdout.write(chunk.text);
            }
        });
        const totalMs = ms(start);
        session.dispose({disposeSequence: false});
        process.stdout.write("\n");

        runs.push({
            prompt: prompt.id,
            round,
            firstTokenMs,
            totalMs,
            outputTokens: tokens,
            thoughtTokens,
            tokensPerSecond: Number((tokens / (totalMs / 1000)).toFixed(1)),
            words: text.trim().split(/\s+/).filter(Boolean).length,
            text
        });
    }
}

clearInterval(sampler);
peakRss = Math.max(peakRss, process.memoryUsage().rss);
const vram = llama.gpu === false ? null : await llama.getVramState();

const report = {
    timestamp: new Date().toISOString(),
    host: {platform: process.platform, arch: process.arch, osRelease: os.release(), cpu: os.cpus()[0]?.model, totalMemBytes: os.totalmem(), node: process.version},
    runtime: {nodeLlamaCpp: "3.22.1", llamaCppRelease: llama.llamaCppRelease, gpu: llama.gpu, supportsGpuOffloading: llama.supportsGpuOffloading},
    model: {id: candidate.id, file, sha256: candidate.sha256, gpuLayers: model.gpuLayers, trainContextSize: model.trainContextSize},
    contextSize: context.contextSize,
    timingsMs: {processStartToLoadStart, runtime: runtimeMs, model: modelMs, context: contextMs, load: loadMs},
    memory: {peakRssBytes: peakRss, gpuUsedBytes: vram?.used ?? null},
    runs
};

console.log("\n=== Summary ===");
console.log(`runtime: node-llama-cpp 3.22.1, llama.cpp ${report.runtime.llamaCppRelease.release}, gpu=${report.runtime.gpu}, gpuLayers=${model.gpuLayers}`);
console.log(`load: ${loadMs} ms (runtime ${runtimeMs}, model ${modelMs}, context ${contextMs})`);
for (const run of runs)
    console.log(`${run.prompt} r${run.round}: TTFT ${run.firstTokenMs} ms, total ${run.totalMs} ms, ${run.outputTokens} tok (${run.tokensPerSecond} tok/s), thought tokens ${run.thoughtTokens}`);
console.log(`peak RSS (sampled): ${(peakRss / 2 ** 20).toFixed(0)} MiB; GPU used: ${vram == null ? "n/a" : (vram.used / 2 ** 20).toFixed(0) + " MiB"}`);

if (args.json)
    await writeFile(args.json, JSON.stringify(report, null, 2));

await context.dispose();
await model.dispose();
await llama.dispose();
