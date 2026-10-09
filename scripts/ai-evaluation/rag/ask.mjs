/** Offline developer inspection; fixed fallback works without loading a model. */
import {readFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {parseRagCorpus,planRag,renderRag} from '../rag.mjs';
const {values}=parseArgs({options:{question:{type:'string'},corpus:{type:'string'},'research-preview':{type:'boolean',default:false}}});
if(!values.question)throw new Error('Pass --question; never put real health records in evaluation output.');
const corpus=parseRagCorpus(await readFile(values.corpus??new URL('./corpus.json',import.meta.url),'utf8'));
const plan=planRag(values.question,corpus,{researchPreview:values['research-preview']});
process.stdout.write(JSON.stringify(renderRag(plan,null),null,2)+'\n');
