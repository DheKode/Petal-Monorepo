/** Actual built Electron/IPC/utilityProcess smoke. Fictional data only.
 * Usage: electron test/ai-electron-smoke.cjs --user-data-dir=<fresh absolute folder> --petal-model=<verified absolute GGUF>
 * Build first. The caller owns the scratch folder; never run against a real Petal data directory. */
const {app,BrowserWindow,dialog}=require('electron');
const assert=require('node:assert/strict');
const {join}=require('node:path');
const {writeFile}=require('node:fs/promises');
const report={checks:[],answers:[],platform:process.platform,arch:process.arch};
const folder=app.commandLine.getSwitchValue('user-data-dir');
if(!folder||!folder.includes('petal-ai-smoke'))throw new Error('Use a fresh petal-ai-smoke scratch directory');
const model=app.commandLine.getSwitchValue('petal-model');
dialog.showOpenDialog=async()=>({canceled:false,filePaths:[model]});
require('../out/main/index.js');
function waitForWindow(){return new Promise(resolve=>{const timer=setInterval(()=>{const win=BrowserWindow.getAllWindows()[0];if(win&&!win.webContents.isLoading()){clearInterval(timer);resolve(win);}},100);});}
app.whenReady().then(async()=>{
  try{
    const win=await waitForWindow();
    const evaluate=code=>win.webContents.executeJavaScript(code);
    await evaluate("new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(document.getElementById('ask-petal-heading')){clearInterval(timer);resolve(true);}else if(++n>100){clearInterval(timer);reject(new Error('Chat did not mount'));}},100);})");
    assert.equal(await evaluate("!!window.petal.askAi && !!document.getElementById('ask-petal-heading')"),true);report.checks.push('real renderer and preload AI methods');
    let state=await evaluate("window.petal.getState()");
    if(!state.pack){const result=await evaluate("window.petal.saveSetup({usualTime:'21:00',timeZone:'Asia/Manila',anchor:{kind:'mid-pack',position:12,date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}})");assert.equal(result.ok,true);state=result.value;}
    const blank=await evaluate("window.petal.askAi({question:'Did I take my pill yesterday?'})");assert.equal(blank.ok,true);assert.equal(blank.value.fallback,true);assert.match(blank.value.text,/unknown/);report.checks.push('no-model useful history fallback');
    const picked=await evaluate('window.petal.pickAiModel()');assert.equal(picked.ok,true);assert.equal(picked.value.available,true);report.checks.push('exact local artifact file-picker verification');
    for(const question of ['Did I take my pill yesterday?','What does an empty intake record mean?','How does a combined pill work?','I have chest pain and shortness of breath']){
      const result=await evaluate('window.petal.askAi('+JSON.stringify({question})+')');assert.equal(result.ok,true);report.answers.push({question,...result.value});assert.equal(result.value.fallback,false,'actual Gemma accepted: '+question);
    }
    assert.equal(report.answers[2].citations.length,0);assert.ok(report.answers[1].citations.every(e=>e.reviewStatus==='reviewed'));report.checks.push('fresh real utility-process Gemma; approved-only offline citations; draft medical exclusion');
    const dose=state.doses[10];
    const preview=await evaluate('window.petal.previewAiCorrection('+JSON.stringify({doseId:dose.id,status:'taken'})+')');assert.equal(preview.ok,true);
    const before=await evaluate('window.petal.getState()');assert.equal(before.events.length,0);
    const discard=await evaluate('window.petal.discardAiCorrection('+JSON.stringify(preview.value.token)+')');assert.equal(discard.ok,true);
    assert.equal((await evaluate('window.petal.getState()')).events.length,0);report.checks.push('real IPC preview and cancel leave DB unchanged');
    const second=await evaluate('window.petal.previewAiCorrection('+JSON.stringify({doseId:dose.id,status:'taken'})+')');
    const saved=await evaluate('window.petal.confirmAiCorrection('+JSON.stringify(second.value.token)+')');assert.equal(saved.ok,true);assert.equal(saved.value.state.events[0].timePrecision,'unknown');report.checks.push('explicit IPC confirmation saves an uncertain-time record');
    const pending=evaluate("window.petal.askAi({question:'Did I take my pill yesterday?'})");await new Promise(resolve=>setTimeout(resolve,50));await evaluate('window.petal.cancelAi()');assert.equal((await pending).ok,false);report.checks.push('native cancellation');
    const after=await evaluate("window.petal.askAi({question:'Did I take my pill yesterday?'})");assert.equal(after.ok,true);assert.equal(after.value.fallback,false);assert.match(after.value.text,/taken/);report.checks.push('native worker restarts after cancellation with live corrected history');
    await win.webContents.capturePage().then(image=>writeFile(join(folder,'screen.png'),image.toPNG()));
    report.pass=true;await writeFile(join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');
    process.stdout.write('Petal real Electron AI smoke passed: '+report.checks.length+' checks\n');app.quit();
  }catch(error){report.pass=false;report.failure=error.message;await writeFile(join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');process.stderr.write('Petal smoke failed: '+error.message+'\n');app.exit(1);}
});
