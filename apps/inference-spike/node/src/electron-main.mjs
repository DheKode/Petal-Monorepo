// Usage: pnpm electron-smoke [-- --model <id>]
// Proves node-llama-cpp loads and generates inside an Electron main process
// (no window, no UI). Prints a JSON summary and exits non-zero on failure.
import {app} from "electron";
import {parseArgs} from "node:util";
import {getLlama, LlamaChatSession, QwenChatWrapper, GemmaChatWrapper} from "node-llama-cpp";
import {getCandidate, modelPath} from "./models.mjs";
import {verifyArtifact} from "./verify.mjs";

const {values: args} = parseArgs({args: process.argv.slice(2), options: {model: {type: "string"}}, strict: false});
const candidate = getCandidate(args.model);

async function run() {
    const file = modelPath(candidate);
    const verified = await verifyArtifact(file, candidate);
    if (!verified.ok)
        throw new Error(`Model not ready (${verified.reason})`);

    const loadStart = performance.now();
    const llama = await getLlama({gpu: "auto", build: "never", progressLogs: false});
    const model = await llama.loadModel({modelPath: file});
    const context = await model.createContext({contextSize: 2048});
    const loadMs = Math.round(performance.now() - loadStart);

    const session = new LlamaChatSession({
        contextSequence: context.getSequence(),
        chatWrapper: candidate.family === "qwen3" ? new QwenChatWrapper({thoughts: "discourage"}) : new GemmaChatWrapper()
    });

    let firstTokenMs = null;
    const start = performance.now();
    const text = await session.prompt("In one sentence, say hello to a fictional user named Ana and mention that this reply was generated on this device.", {
        maxTokens: 60,
        temperature: 0.7,
        budgets: {thoughtTokens: 0},
        onTextChunk(chunk) {
            if (firstTokenMs == null && chunk.trim() !== "")
                firstTokenMs = Math.round(performance.now() - start);
        }
    });

    const result = {
        ok: true,
        electron: process.versions.electron,
        electronNode: process.versions.node,
        chrome: process.versions.chrome,
        model: candidate.id,
        gpu: llama.gpu,
        llamaCppRelease: llama.llamaCppRelease.release,
        loadMs,
        firstTokenMs,
        totalMs: Math.round(performance.now() - start),
        text: text.trim()
    };

    await context.dispose();
    await model.dispose();
    await llama.dispose();
    return result;
}

app.whenReady()
    .then(run)
    .then((result) => {
        console.log(JSON.stringify(result, null, 2));
        app.exit(0);
    })
    .catch((error) => {
        console.error(JSON.stringify({ok: false, error: String(error?.stack ?? error)}, null, 2));
        app.exit(1);
    });
