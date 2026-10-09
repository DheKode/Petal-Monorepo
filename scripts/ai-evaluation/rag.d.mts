import type { Evidence } from '../../packages/domain/src/index.js';
import type {ResponsePlan,Answer} from './context.mjs';
export interface RagCorpus {supportedProfileId:string;knowledgeVersion:string;items:unknown[]}
export interface RagPlan extends ResponsePlan {preview:boolean}
export function parseRagCorpus(input:string):RagCorpus;
export function scopeReason(question:string):string|null;
export function planRag(question:string,corpus:RagCorpus,options?:{profileId?:string;researchPreview?:boolean}):RagPlan;
export function ragPrompt(plan:RagPlan):unknown;
export function renderRag(plan:RagPlan,raw:unknown):Answer & {researchPreview:boolean;knowledgeVersion:string};
