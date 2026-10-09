import type { GbnfJsonObjectSchema, Llama, LlamaModel } from 'node-llama-cpp';
import { verifyGemma } from './aiArtifact';

/* Dedicated Electron utility process for local Gemma inference (#9). No database access, networking, record writes,
   raw token streaming or log forwarding. The model stays loaded; every request gets a fresh context. */

interface Request {
  id: string;
  path: string;
  question: string;
  system: string;
  schema: Record<string, unknown>;
}

let llama: Llama | null = null;
let model: LlamaModel | null = null;
let selectedPath: string | null = null;

const MAX_INPUT_TOKENS = 1500;

async function generate(request: Request, setStage: (stage: string) => void): Promise<string> {
  const { getLlama, LlamaChatSession, GemmaChatWrapper } = await import('node-llama-cpp');
  if (!model || selectedPath !== request.path) {
    setStage('artifact');
    await verifyGemma(request.path);
    if (model) await model.dispose();
    model = null;
    setStage('runtime');
    // Local prebuilt binaries only: never build or download a runtime. Windows uses the CPU build.
    llama ??= await getLlama({ gpu: process.platform === 'win32' ? false : 'auto', build: 'never', skipDownload: true, progressLogs: false, logger: () => {} });
    setStage('model');
    model = await llama.loadModel({ modelPath: request.path });
    selectedPath = request.path;
  }
  setStage('context');
  const context = await model.createContext({ contextSize: 2048, threads: 4 });
  try {
    setStage('session');
    const session = new LlamaChatSession({ contextSequence: context.getSequence(), chatWrapper: new GemmaChatWrapper(), systemPrompt: request.system, forceAddSystemPrompt: true });
    try {
      if (!session.getChatHistory().some(turn => turn.type === 'system' && JSON.stringify(turn).includes('PETAL CONTEXT'))) throw new Error('context-missing');
      if (model.tokenize(request.system + request.question).length > MAX_INPUT_TOKENS) throw new Error('context-too-large');
      setStage('grammar');
      const grammar = await llama!.createGrammarForJsonSchema(request.schema as GbnfJsonObjectSchema);
      setStage('prompt');
      return await session.prompt(request.question, { temperature: 0, maxTokens: 180, budgets: { thoughtTokens: 0 }, grammar });
    } finally {
      session.dispose();
    }
  } finally {
    await context.dispose();
  }
}

// Requests run one at a time, and each reply is sent only after its context is disposed, so a fast follow-up request
// queues behind cleanup instead of being dropped.
let queue: Promise<void> = Promise.resolve();

process.parentPort.on('message', ({ data }: { data: Request }) => {
  queue = queue.then(async () => {
    let stage = 'import';
    let reply: { id: string; raw?: string; error?: string };
    try {
      reply = { id: data.id, raw: await generate(data, next => { stage = next; }) };
    } catch {
      reply = { id: data.id, error: stage };
    }
    process.parentPort.postMessage(reply);
  });
});
