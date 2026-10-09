import {verifyGemma} from './aiArtifact';
import type {Llama,LlamaModel,GbnfJsonObjectSchema} from 'node-llama-cpp';
let llama:Llama|null=null;
let model:LlamaModel|null=null;
let selectedPath:string|null=null;
let busy=false;
/** Dedicated process: no DB access, networking, record writes, raw token streaming, or log forwarding. */
process.parentPort.on('message', async ({data})=>{
  if(busy)return;busy=true;
  const {id,path,question,system,schema}=data;
  let stage='import';
  try {
    const {getLlama,LlamaChatSession,GemmaChatWrapper}=await import('node-llama-cpp');
    if(!model || selectedPath!==path){
      stage='artifact';await verifyGemma(path);
      if(model)await model.dispose();
      stage='runtime';llama??=await getLlama({gpu:process.platform==='win32'?false:'auto',build:'never',skipDownload:true,progressLogs:false,logger:()=>{}});
      stage='model';model=await llama.loadModel({modelPath:path});selectedPath=path;
    }
    stage='context';const context=await model.createContext({contextSize:2048,threads:4});
    try {
      stage='session';const session=new LlamaChatSession({contextSequence:context.getSequence(),chatWrapper:new GemmaChatWrapper(),systemPrompt:system,forceAddSystemPrompt:true});
      if(!session.getChatHistory().some(turn=>turn.type==='system' && JSON.stringify(turn).includes('PETAL CONTEXT')))throw new Error('context-missing');
      if(model.tokenize(system+question).length>1500)throw new Error('context-too-large');
      try {
        stage='grammar';const grammar=await llama!.createGrammarForJsonSchema(schema as GbnfJsonObjectSchema);
        stage='prompt';const raw=await session.prompt(question,{temperature:0,maxTokens:180,budgets:{thoughtTokens:0},grammar});
        process.parentPort.postMessage({id,raw});
      } finally {session.dispose();}
    } finally {await context.dispose();}
  }catch(error){process.parentPort.postMessage({id,error:stage,errorType:error instanceof Error?error.name:'unknown'});}
  finally{busy=false;}
});
