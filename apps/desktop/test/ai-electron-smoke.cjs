/* Real built Electron smoke for Ask Petal (#9): renderer -> preload -> main SQLite/AI -> native utility process -> Gemma.
   Fictional data only. Build first (`pnpm --filter @petal/desktop build`), then run from apps/desktop:

     electron test/ai-electron-smoke.cjs --user-data-dir=<scratch folder containing "petal-ai-smoke"> \
       --petal-model=<absolute path of the verified Gemma GGUF> --petal-phase=<first|restart|missing>

   first   (fresh folder) setup, no-model fallback, invalid-file pick, model pick, native answers, fast consecutive
           questions, IPC preview/cancel/confirm, native cancellation, and the real chat and correction forms.
   restart (same folder as "first") model selection and corrections survive an app restart; cold first native answer.
   missing (fresh folder) a remembered model that no longer exists falls back to useful fixed answers.

   Writes report-<phase>.json (and screen-<phase>.png) into the scratch folder. Never point it at a real Petal folder. */
const { app, BrowserWindow, dialog } = require('electron');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { mkdirSync, writeFileSync } = require('node:fs');

const folder = app.commandLine.getSwitchValue('user-data-dir');
const model = app.commandLine.getSwitchValue('petal-model');
const phase = app.commandLine.getSwitchValue('petal-phase') || 'first';
if (!folder || !folder.includes('petal-ai-smoke')) throw new Error('Use a petal-ai-smoke scratch folder');
if (!['first', 'restart', 'missing'].includes(phase)) throw new Error('Unknown phase');
mkdirSync(folder, { recursive: true });
// Keep these no-model/recovery tests independent of a developer's .model-bundle.
// The production main/renderer still load from out/; only the app-owned model
// lookup uses this empty fixture root. Restart verifies the remembered selection.
app.setAppPath(folder);
if (phase === 'missing') writeFileSync(join(folder, 'ai-model.json'), JSON.stringify({ version: 1, path: join(folder, 'moved-away.gguf') }) + '\n');

let pickResult = model;
dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [pickResult] });
require('../out/main/index.js');

const report = { phase, checks: [], answers: [], platform: process.platform, arch: process.arch };
const done = name => report.checks.push(name);
const save = () => writeFileSync(join(folder, `report-${phase}.json`), JSON.stringify(report, null, 2) + '\n');

function waitForWindow() {
  return new Promise(resolve => {
    const timer = setInterval(() => {
      const win = BrowserWindow.getAllWindows()[0];
      if (win && !win.webContents.isLoading()) { clearInterval(timer); resolve(win); }
    }, 100);
  });
}

// Runs in the renderer: helpers to drive the real React forms like a user would.
const DOM_HELPERS = `
  window.__smoke = {
    section: () => document.querySelector('section[aria-labelledby="ask-petal-heading"]'),
    button: text => [...window.__smoke.section().querySelectorAll('button')].find(b => b.textContent.trim() === text),
    set(el, value) {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    },
    waitFor(check, ms = 120000) {
      return new Promise((resolve, reject) => {
        const started = Date.now();
        const timer = setInterval(() => {
          let value; try { value = check(); } catch { value = null; }
          if (value) { clearInterval(timer); resolve(value); }
          else if (Date.now() - started > ms) { clearInterval(timer); reject(new Error('timed out waiting in renderer')); }
        }, 50);
      });
    },
  };
  true;
`;

// Ask Petal is its own page in the main navigation.
const OPEN_ASK = `window.__smoke.waitFor(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Ask Petal'), 10000)
  .then(() => { [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Ask Petal').click(); return true; })`;

async function ask(evaluate, question, extra = {}) {
  const started = Date.now();
  const result = await evaluate(`window.petal.askAi(${JSON.stringify({ question, ...extra })})`);
  assert.equal(result.ok, true, `${question}: ${result.message ?? ''}`);
  report.answers.push({ question, wallMs: Date.now() - started, ...result.value });
  return result.value;
}

app.whenReady().then(async () => {
  try {
    const win = await waitForWindow();
    const evaluate = code => win.webContents.executeJavaScript(code);
    await evaluate(DOM_HELPERS);
    await evaluate(OPEN_ASK);
    await evaluate(`window.__smoke.waitFor(() => window.__smoke.section(), 10000).then(() => true)`);
    assert.equal(await evaluate('typeof window.petal.askAi'), 'function');
    done('real renderer mounts Ask Petal; preload exposes AI methods');

    let state = await evaluate('window.petal.getState()');
    if (phase !== 'restart') {
      assert.equal(state.pack, null, 'fresh folder expected');
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const result = await evaluate(`window.petal.saveSetup({usualTime:'21:00',timeZone:'Asia/Manila',anchor:{kind:'mid-pack',position:12,date:'${today}'}})`);
      assert.equal(result.ok, true);
      state = result.value;
    }
    const yesterdayDose = state.doses[10];
    const earlierDose = state.doses[9];

    if (phase === 'missing') {
      const info = await evaluate('window.petal.getAiModelInfo()');
      assert.equal(info.available, false);
      const answer = await ask(evaluate, 'Did I take my pill yesterday?');
      assert.equal(answer.fallback, true);
      assert.equal(answer.fallbackReason, 'model-unavailable');
      assert.match(answer.text, /unknown/);
      done('remembered model missing: shown as unavailable; useful fixed answer; unknown stays unknown');
    }

    if (phase === 'restart') {
      // Asked straight away, before anything waits for the model check that runs at startup.
      const cold = await ask(evaluate, 'Did I take my pill yesterday?');
      assert.equal(cold.fallback, false, `cold native answer fell back: ${cold.fallbackReason}`);
      assert.match(cold.text, /taken/);
      done(`cold first native answer immediately after restart (${cold.generationMs} ms)`);
      const info = await evaluate('window.petal.getAiModelInfo()');
      assert.equal(info.available, true, 'model selection should survive restart');
      done('model selection persisted across restart and re-verified');
      const events = new Map(state.events.map(e => [e.doseId, e]));
      assert.equal(events.get(yesterdayDose.id)?.status, 'taken');
      assert.equal(events.get(yesterdayDose.id)?.timePrecision, 'unknown');
      assert.equal(events.get(earlierDose.id)?.timePrecision, 'approximate');
      assert.match(events.get(earlierDose.id)?.actualAt ?? '', /T20:30:00\+08:00$/);
      done('chat-confirmed corrections persisted across restart with their precision');
      const faq = await ask(evaluate, 'What does an empty intake record mean?');
      assert.equal(faq.fallback, false);
      assert.ok(faq.citations.length > 0 && faq.citations.every(e => e.reviewStatus === 'reviewed' && e.excerpt));
      done('cited FAQ answer after restart');
    }

    if (phase === 'first') {
      const blank = await ask(evaluate, 'Did I take my pill yesterday?');
      assert.equal(blank.fallback, true);
      assert.equal(blank.fallbackReason, 'model-unavailable');
      assert.match(blank.text, /unknown/);
      done('no model: useful fixed history answer');

      pickResult = join(folder, 'not-gemma.gguf');
      writeFileSync(pickResult, 'not a model');
      const rejected = await evaluate('window.petal.pickAiModel()');
      assert.equal(rejected.ok, false);
      assert.equal((await evaluate('window.petal.getAiModelInfo()')).available, false);
      done('invalid model file rejected; still unavailable');

      pickResult = model;
      const picked = await evaluate('window.petal.pickAiModel()');
      assert.equal(picked.ok, true);
      assert.equal(picked.value.available, true);
      done('exact Gemma artifact verified through the file picker');

      for (const question of ['Did I take my pill yesterday?', 'What does an empty intake record mean?', 'How does a combined pill work?', 'I have chest pain and shortness of breath']) {
        const answer = await ask(evaluate, question);
        assert.equal(answer.fallback, false, `native Gemma answer rejected for "${question}": ${answer.fallbackReason}`);
      }
      const [, faq, medical] = report.answers.slice(-4);
      assert.ok(faq.citations.length > 0 && faq.citations.every(e => e.reviewStatus === 'reviewed'));
      assert.equal(medical.citations.length, 0);
      done('native Gemma answers; reviewed-only citations; draft medical passages withheld');

      // Back-to-back requests: each starts the moment the previous reply arrives, while the worker is still cleaning up.
      for (let i = 0; i < 3; i++) {
        const answer = await ask(evaluate, i % 2 ? 'What does an empty intake record mean?' : 'Did I take my pill yesterday?');
        assert.equal(answer.fallback, false, `consecutive request ${i + 1} fell back: ${answer.fallbackReason}`);
      }
      done('three immediate consecutive native answers, none dropped');

      const preview = await evaluate(`window.petal.previewAiCorrection(${JSON.stringify({ doseId: yesterdayDose.id, status: 'taken' })})`);
      assert.equal(preview.ok, true);
      assert.equal((await evaluate('window.petal.getState()')).events.length, 0);
      assert.equal((await evaluate(`window.petal.discardAiCorrection(${JSON.stringify(preview.value.token)})`)).ok, true);
      assert.equal((await evaluate('window.petal.getState()')).events.length, 0);
      done('IPC preview and cancel leave the database unchanged');
      const second = await evaluate(`window.petal.previewAiCorrection(${JSON.stringify({ doseId: yesterdayDose.id, status: 'taken' })})`);
      const saved = await evaluate(`window.petal.confirmAiCorrection(${JSON.stringify(second.value.token)})`);
      assert.equal(saved.ok, true);
      assert.equal(saved.value.state.events[0].timePrecision, 'unknown');
      done('explicit IPC confirmation saves a taken record with unknown time');

      const pending = evaluate(`window.petal.askAi({question:'Did I take my pill yesterday?'})`);
      await new Promise(resolve => setTimeout(resolve, 50));
      await evaluate('window.petal.cancelAi()');
      assert.equal((await pending).ok, false);
      done('native answer cancellation');
      const after = await ask(evaluate, 'Did I take my pill yesterday?');
      assert.equal(after.fallback, false, `after-cancel answer fell back: ${after.fallbackReason}`);
      assert.match(after.text, /taken/);
      done('worker restarts after cancellation and reads the corrected history');

      // Real React forms: ask through the textarea, then preview / cancel / preview / confirm a correction. Setup and the
      // corrections above went through raw IPC, so reload the renderer to show the saved pack as a user would see it.
      win.webContents.reload();
      await new Promise(resolve => win.webContents.once('did-finish-load', resolve));
      await evaluate(DOM_HELPERS);
      await evaluate(OPEN_ASK);
      await evaluate(`window.__smoke.waitFor(() => window.__smoke.section()?.querySelector('form select'), 10000).then(() => true)`);
      const asked = await evaluate(`(async () => {
        const s = window.__smoke;
        const before = s.section().querySelectorAll('ol[aria-label="Conversation"] > li').length;
        s.set(s.section().querySelector('textarea'), 'Did I take my pill yesterday?');
        await s.waitFor(() => !s.button('Ask Petal').disabled);
        s.button('Ask Petal').click();
        await s.waitFor(() => s.section().querySelectorAll('ol[aria-label="Conversation"] > li').length > before);
        return s.section().querySelector('ol[aria-label="Conversation"] > li:last-child').textContent;
      })()`);
      assert.match(asked, /Petal:/);
      assert.match(asked, /Checked local Gemma response/);
      assert.doesNotMatch(asked, /dose tablet/i);
      done('chat form submits and shows a checked native answer');

      const date = earlierDose.localDate;
      const previewText = await evaluate(`(async () => {
        const s = window.__smoke;
        s.set(s.section().querySelector('form select'), ${JSON.stringify(earlierDose.id)});
        s.section().querySelector('details').open = true;
        const stateSelect = [...s.section().querySelectorAll('details select')][0];
        s.set(stateSelect, 'taken');
        const input = await s.waitFor(() => s.section().querySelector('input[type="datetime-local"]'));
        s.set(input, '${date}T20:30');
        await s.waitFor(() => !s.button('Preview correction').disabled);
        s.button('Preview correction').click();
        const region = await s.waitFor(() => s.section().querySelector('[aria-label="Proposed change"]'));
        return region.textContent;
      })()`);
      assert.match(previewText, /approximate/);
      assert.match(previewText, /20:30/);
      assert.equal((await evaluate('window.petal.getState()')).events.length, 1);
      const cancelled = await evaluate(`(async () => {
        const s = window.__smoke;
        s.button('Cancel proposal').click();
        return (await s.waitFor(() => [...s.section().querySelectorAll('[role="status"]')].find(e => /Cancelled the proposal/.test(e.textContent)))).textContent;
      })()`);
      assert.match(cancelled, /not changed/);
      assert.equal((await evaluate('window.petal.getState()')).events.length, 1);
      done('correction form: preview shows approximate time; Cancel proposal changes nothing');

      await evaluate(`(async () => {
        const s = window.__smoke;
        s.button('Preview correction').click();
        await s.waitFor(() => s.button('Confirm change'));
        s.button('Confirm change').click();
        await s.waitFor(() => [...s.section().querySelectorAll('[role="status"]')].find(e => /Saved the reviewed correction/.test(e.textContent)));
        return true;
      })()`);
      const confirmed = (await evaluate('window.petal.getState()')).events.find(e => e.doseId === earlierDose.id);
      assert.equal(confirmed?.status, 'taken');
      assert.equal(confirmed?.timePrecision, 'approximate');
      assert.match(confirmed?.actualAt ?? '', new RegExp(`^${date}T20:30:00\\+08:00$`));
      done('correction form: Confirm change saves an approximate time in the schedule zone');
    }

    await evaluate(`window.__smoke.section().scrollIntoView(); true`);
    // A fixed fallback can finish before Chromium has painted its first frame.
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
    const image = await win.webContents.capturePage();
    writeFileSync(join(folder, `screen-${phase}.png`), image.toPNG());
    report.pass = true;
    save();
    process.stdout.write(`Petal Electron AI smoke (${phase}) passed: ${report.checks.length} checks\n`);
    app.quit();
  } catch (error) {
    report.pass = false;
    report.failure = error.message;
    save();
    process.stderr.write(`Petal smoke (${phase}) failed: ${error.message}\n`);
    app.exit(1);
  }
});
