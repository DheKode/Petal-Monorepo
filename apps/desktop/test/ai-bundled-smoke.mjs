// A12 (#15): install the exact DMG to a scratch folder first, then test that copy on a real Mac.
// node test/ai-bundled-smoke.mjs /absolute/Petal.app /tmp/petal-bundle-smoke fresh|restart|missing|corrupt
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, realpath, access } from 'node:fs/promises';
import { join, isAbsolute } from 'node:path';
const [app, folder, phase = 'fresh'] = process.argv.slice(2);
assert.ok(isAbsolute(app) && isAbsolute(folder) && folder.includes('petal-bundle-smoke'));
assert.ok(['fresh', 'restart', 'missing', 'corrupt'].includes(phase));
const unavailable = ['missing', 'corrupt'].includes(phase);
await mkdir(folder, { recursive: true });
await access(join(app, 'Contents/MacOS/Petal'));
const port = 20000 + Math.floor(Math.random() * 10000);
const child = spawn(join(app, 'Contents/MacOS/Petal'), [`--user-data-dir=${folder}`, `--remote-debugging-port=${port}`], { stdio: 'ignore' });
let socket;
let sequence = 0;
const pending = new Map();
try {
  let page;
  for (let i = 0; i < 120; i++) {
    assert.equal(child.exitCode, null, 'scratch app exited before the renderer opened');
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === 'page'); } catch {}
    if (page) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(page, 'installed app opens a renderer');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const data = JSON.parse(event.data);
    const entry = pending.get(data.id);
    if (entry) { pending.delete(data.id); clearTimeout(entry.timer); data.error ? entry.reject(data.error) : entry.resolve(data.result); }
  };
  function rpc(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout')); }, 150000);
      pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const response = await rpc('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    assert.equal(response.exceptionDetails, undefined, JSON.stringify(response.exceptionDetails));
    return response.result.value;
  }
  const info = await evaluate('window.petal.getAiModelInfo()');
  const appInfo = await evaluate('window.petal.getAppInfo()');
  assert.equal(await realpath(appInfo.dataFolder), await realpath(folder), 'test must address the scratch app');
  assert.equal(info.available, !unavailable);
  let state = await evaluate('window.petal.getState()');
  if (phase !== 'restart') {
    assert.equal(state.pack, null);
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const setup = await evaluate(`window.petal.saveSetup(${JSON.stringify({ usualTime: '21:00', timeZone: 'Asia/Manila', anchor: { kind: 'mid-pack', position: 12, date } })})`);
    assert.equal(setup.ok, true); state = setup.value;
  }
  const greeting = await evaluate('window.petal.askAi({question:"hi"})');
  assert.equal(greeting.value.mode, 'greeting'); assert.equal(greeting.value.fallback, false);
  const faq = await evaluate('window.petal.askAi({question:"What does an empty intake record mean?"})');
  assert.equal(faq.ok, true); assert.equal(faq.value.fallback, unavailable);
  assert.ok(faq.value.citations.length > 0);
  const history = await evaluate('window.petal.askAi({question:"Did I take my pill yesterday?"})');
  assert.equal(history.ok, true); assert.equal(history.value.fallback, unavailable);
  if (phase === 'restart') assert.equal(state.events[0].status, 'unsure');
  if (phase === 'fresh') {
    const doseId = state.doses[10].id;
    const proposal = await evaluate(`window.petal.previewAiCorrection(${JSON.stringify({ doseId, status: 'unsure' })})`);
    assert.equal(proposal.ok, true);
    const cancelled = await evaluate(`window.petal.discardAiCorrection(${JSON.stringify(proposal.value.token)})`);
    assert.equal(cancelled.ok, true);
    assert.equal((await evaluate('window.petal.getState()')).events.length, 0);
    const next = await evaluate(`window.petal.previewAiCorrection(${JSON.stringify({ doseId, status: 'unsure' })})`);
    const saved = await evaluate(`window.petal.confirmAiCorrection(${JSON.stringify(next.value.token)})`);
    assert.equal(saved.ok, true); assert.equal(saved.value.state.events[0].status, 'unsure');
  }
  await evaluate('[...document.querySelectorAll("nav button")].find(b=>b.textContent==="Ask Petal").click()');
  await new Promise(resolve => setTimeout(resolve, 1000));
  const controls = await evaluate('[...document.querySelectorAll("button")].map(b=>b.textContent)');
  assert.equal(controls.some(s=>s.includes('Choose recovery Gemma')), unavailable);
  const shot = await rpc('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(folder, `screen-${phase}.png`), Buffer.from(shot.data, 'base64'));
  await writeFile(join(folder, `report-${phase}.json`), JSON.stringify({ phase, info, greeting, faq, history, platform: process.platform, arch: process.arch }, null, 2));
  console.log(`${phase}: bundled selection, greeting, native/fallback answers, citations and persistence checks passed (${faq.value.generationMs} ms FAQ).`);
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ id: ++sequence, method: 'Page.close' }));
  await new Promise(resolve => setTimeout(resolve, 1500));
  socket?.close();
  for (const entry of pending.values()) clearTimeout(entry.timer);
  if (child.exitCode === null) child.kill('SIGKILL');
}
