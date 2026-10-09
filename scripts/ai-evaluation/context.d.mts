import type { Evidence } from '../../packages/domain/src/index.js';
export interface ResponsePlan { mode: string; statements: {id:string;plain:string;gentle:string}[]; requiredIds:string[]; evidenceIds:string[] }
export interface Answer {text:string;mode:string;fallback:boolean;reason:string|null;citations:Evidence[];recordsChanged:false}
export function buildContext(snapshot:unknown, question:string, options:{currentLocalDate:string;session?:unknown;evidence?:Evidence[]}):unknown;
export function planResponse(context:unknown):ResponsePlan;
export function promptContext(context:unknown,plan:ResponsePlan):string;
export function outputSchema(plan:ResponsePlan):Record<string,unknown>;
export function renderResponse(context:unknown,plan:ResponsePlan,raw:unknown):Answer;
export const SYSTEM:string;
