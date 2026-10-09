// Device helper for the Android spike (needs `adb` on PATH or ANDROID_HOME set).
//   node tools/device.mjs info                 # record phone model, Android version, RAM, ABI
//   node tools/device.mjs push-model [file]    # copy the GGUF into the app-specific external dir and verify SHA-256
//   node tools/device.mjs bench [--seconds 180] [--out result.json]
//        # cold-start the app, sample memory every 500 ms, collect PETAL_BENCH log lines
// The default model file is the desktop spike's verified download.
import {execFileSync, spawn} from "node:child_process";
import {existsSync, writeFileSync} from "node:fs";
import os from "node:os";
import path from "node:path";

const PACKAGE = "dev.petal.spike";
const MODEL_FILE = "Qwen3-0.6B-Q4_K_M.gguf";
const MODEL_SHA256 = "ac2d97712095a558e31573f62f466a3f9d93990898b0ec79d7c974c1780d524a";
const adbPath = process.env.ANDROID_HOME
    ? path.join(process.env.ANDROID_HOME, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb")
    : "adb";

const adb = (...args) => execFileSync(adbPath, args, {encoding: "utf8", maxBuffer: 16 * 1024 * 1024}).trim();
const prop = (name) => adb("shell", "getprop", name);

const [command = "info", ...rest] = process.argv.slice(2);
const option = (name, fallback) => {
    const index = rest.indexOf(`--${name}`);
    return index >= 0 ? rest[index + 1] : fallback;
};

if (command === "info") {
    const memTotalKb = Number(adb("shell", "grep", "MemTotal", "/proc/meminfo").match(/(\d+)/)[1]);
    console.log(JSON.stringify({
        manufacturer: prop("ro.product.manufacturer"),
        model: prop("ro.product.model"),
        device: prop("ro.product.device"),
        android: prop("ro.build.version.release"),
        sdk: prop("ro.build.version.sdk"),
        build: prop("ro.build.display.id"),
        soc: prop("ro.soc.model") || prop("ro.board.platform") || prop("ro.hardware"),
        abi: prop("ro.product.cpu.abi"),
        memTotalMiB: Math.round(memTotalKb / 1024)
    }, null, 2));
} else if (command === "push-model") {
    const source = rest[0] ?? path.join(process.env.PETAL_MODELS_DIR || path.join(os.homedir(), ".cache", "petal", "models"), MODEL_FILE);
    if (!existsSync(source))
        throw new Error(`Model not found: ${source}. Run the desktop spike's fetch-model first.`);
    // Release builds are not debuggable, so `run-as` is unavailable; use the
    // app-specific external directory, which the app reads without permissions.
    const target = `/sdcard/Android/data/${PACKAGE}/files/${MODEL_FILE}`;
    console.log(`Pushing ${source}\n  to ${target}`);
    adb("shell", "mkdir", "-p", path.posix.dirname(target));
    adb("push", source, target);
    const onDevice = adb("shell", "sha256sum", target).split(/\s+/)[0];
    if (onDevice !== MODEL_SHA256)
        throw new Error(`SHA-256 on device ${onDevice} != expected ${MODEL_SHA256}`);
    console.log(`Verified on device: ${target}\n  sha256 ${onDevice}`);
} else if (command === "bench") {
    const seconds = Number(option("seconds", "180"));
    const out = option("out");
    adb("shell", "am", "force-stop", PACKAGE);
    adb("logcat", "-c");
    const logcat = spawn(adbPath, ["logcat", "-v", "time", "-s", "ReactNativeJS:V"]);
    const events = [];
    let buffer = "";
    logcat.stdout.on("data", (chunk) => {
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
            const match = line.match(/PETAL_BENCH (\{.*\})/);
            if (!match) continue;
            const event = JSON.parse(match[1]);
            events.push(event);
            console.log(event.event === "run"
                ? `${event.prompt} r${event.round}: TTFT ${event.firstTokenMs} ms, total ${event.totalMs} ms, ${event.outputTokens} tok (${event.tokensPerSecond} tok/s), reasoning chars ${event.reasoningChars}\n  ${event.text.replace(/\s+/g, " ").slice(0, 160)}`
                : JSON.stringify(event));
        }
    });

    const launchedAt = Date.now();
    adb("shell", "monkey", "-p", PACKAGE, "-c", "android.intent.category.LAUNCHER", "1");
    let peakPssKb = 0;
    let peakRssKb = 0;
    const deadline = launchedAt + seconds * 1000;
    while (Date.now() < deadline) {
        try {
            const meminfo = adb("shell", "dumpsys", "meminfo", PACKAGE);
            const pss = meminfo.match(/TOTAL PSS:\s+(\d+)/) ?? meminfo.match(/^\s*TOTAL\s+(\d+)/m);
            const rss = meminfo.match(/TOTAL RSS:\s+(\d+)/);
            if (pss) peakPssKb = Math.max(peakPssKb, Number(pss[1]));
            if (rss) peakRssKb = Math.max(peakRssKb, Number(rss[1]));
        } catch {
            // Process not up yet.
        }
        if (events.filter((event) => event.event === "run").length >= 4 || events.some((event) => event.event === "error"))
            break;
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    logcat.kill();

    const summary = {peakPssMiB: Math.round(peakPssKb / 1024), peakRssMiB: Math.round(peakRssKb / 1024), launchToLastEventMs: Date.now() - launchedAt};
    console.log(JSON.stringify(summary));
    if (out) writeFileSync(out, JSON.stringify({events, ...summary}, null, 2));
} else {
    console.error(`Unknown command "${command}"`);
    process.exitCode = 1;
}
