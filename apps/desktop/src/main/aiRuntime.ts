import {utilityProcess,type UtilityProcess} from 'electron';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {verifyGemma,GEMMA_BYTES} from './aiArtifact';
import type {AiModelInfo} from '../shared/ai';
import type {AiGenerator} from './aiService';
/** External artifact selection only. First-run downloading/redistribution remains #15. */
export class AiRuntime implements AiGenerator {
  private path:string|null=null;
  private child:UtilityProcess|null=null;
  private initialization:Promise<void>=Promise.resolve();
  private revision=0;
  constructor(private folder:string,private workerPath=join(__dirname,'aiWorker.js')){}
  initialize():Promise<void>{
    const revision=this.revision;
    this.initialization=(async()=>{
      try{const config=JSON.parse(await readFile(join(this.folder,'ai-model.json'),'utf8'));if(config.version===1&&typeof config.path==='string'){await verifyGemma(config.path);if(revision===this.revision)this.path=config.path;}}catch{if(revision===this.revision)this.path=null;}
    })();return this.initialization;
  }
  async info():Promise<AiModelInfo>{
    await this.initialization;
    let available=false;
    try{available=!!this.path&&(await stat(this.path)).size===GEMMA_BYTES;}catch{/* Missing file is a normal fallback state. */}
    return {available,title:'Gemma 3 1B IT Q4_K_M · node-llama-cpp 3.22.1',message:available?'Verified local model selected. Answers are validated before display.':'No verified local model selected. Recorded-history help and reviewed FAQ passages still work with fixed responses.'};
  }
  async select(path:string):Promise<void>{
    this.revision++;
    await verifyGemma(path);
    await writeFile(join(this.folder,'ai-model.json'),JSON.stringify({version:1,path})+'\n',{mode:0o600});
    this.dispose();this.path=path;
  }
  generate(question:string,system:string,schema:Record<string,unknown>,signal:AbortSignal):Promise<string>{
    if(!this.path||signal.aborted)return Promise.reject(new Error('model-unavailable'));
    const path=this.path;
    const child=this.child??=utilityProcess.fork(this.workerPath,[],{stdio:'pipe',serviceName:'Petal local AI'});
    // Drain runtime logs without ever exposing prompt/record contents to app logs or the renderer.
    child.stdout?.resume();child.stderr?.resume();
    return new Promise((resolve,reject)=>{
      const id=randomUUID();
      const cleanup=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);child.removeListener('message',message);child.removeListener('exit',exit);};
      const stop=()=>{if(this.child===child)this.child=null;child.kill();};
      const abort=()=>{cleanup();stop();reject(new Error('cancelled'));};
      const exit=()=>{cleanup();if(this.child===child)this.child=null;reject(new Error('worker-exited'));};
      const message=(data:{id?:string;raw?:unknown;error?:string})=>{
        if(data?.id!==id)return;
        cleanup();
        if(typeof data.raw==='string'&&data.raw.length<=20000)resolve(data.raw);
        else {stop();reject(new Error('worker-'+(data.error??'generation-failed')));}
      };
      const timer=setTimeout(()=>{cleanup();stop();reject(new Error('generation-timeout'));},30000);
      signal.addEventListener('abort',abort,{once:true});child.on('message',message);child.once('exit',exit);
      if(signal.aborted)abort();else child.postMessage({id,path,question,system,schema});
    });
  }
  dispose():void{this.child?.kill();this.child=null;}
}
