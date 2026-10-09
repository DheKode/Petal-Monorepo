/** A11 standalone local extractive RAG. No network, writes, dependencies or clinical actions.
 * Research preview is for developer evaluation only; never enable it in a shipped app. */
import {validateOutput} from './context.mjs';
const normalize = s => s.toLowerCase().normalize('NFKC').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const STOP = new Set(['a','an','and','are','as','at','be','can','do','does','for','how','i','in','is','it','me','my','of','on','or','pill','pills','please','the','this','to','trust','what','with','you']);
const tokens = s => new Set(normalize(s).split(' ').filter(w => w && !STOP.has(w)));
const date = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
const object = x => x && typeof x === 'object' && !Array.isArray(x);
const text = (x,n=2000) => typeof x === 'string' && x.trim().length > 0 && x.length <= n;

export function parseRagCorpus(input) {
  if (typeof input !== 'string' || new TextEncoder().encode(input).byteLength > 1500000) throw new Error('Invalid corpus size');
  const c = JSON.parse(input);
  if (!object(c) || c.schemaVersion !== 1 || !text(c.knowledgeVersion,100) || !text(c.supportedProfileId,100) || !Array.isArray(c.items) || c.items.length > 2000) throw new Error('Invalid corpus envelope');
  const seen = new Set();
  for (const i of c.items) {
    const e = i?.evidence, p = i?.provenance;
    if (!object(e) || !object(p) || !text(e.id,100) || seen.has(e.id) || !text(e.publisher,200) || !text(e.title,500) || !text(e.sectionOrPage,200) || !text(e.excerpt,2000) || !text(e.version,100)) throw new Error('Invalid or duplicate evidence');
    seen.add(e.id);
    let url; try {url=new URL(e.url);} catch {throw new Error('Invalid source URL');}
    if (url.protocol !== 'https:' || url.username || url.password || !date(e.retrievalDate) || (e.publicationDate !== null && !date(e.publicationDate))) throw new Error('Invalid source metadata');
    if (!Array.isArray(e.supportedProfileIds) || !e.supportedProfileIds.includes(c.supportedProfileId) || !e.supportedProfileIds.every(x=>text(x,100)) || !['draft','reviewed','rejected'].includes(e.reviewStatus)) throw new Error('Invalid evidence applicability');
    if (!['app-behavior','education','clinical-research','reference-research'].includes(i.kind) || !Array.isArray(i.keywords) || !i.keywords.length || !i.keywords.every(k=>text(k,100)) || typeof i.caveat !== 'string' || i.caveat.length>1000) throw new Error('Invalid retrieval metadata');
    if (!['opened-page','search-index-only','repo-contract'].includes(p.acquisition) || p.excerptType !== 'paraphrase' || !text(p.sourceCheckedBy,200) || !date(p.sourceCheckedDate)) throw new Error('Invalid provenance');
    if (e.reviewStatus === 'reviewed' && (!text(p.reviewer,200) || !date(p.reviewedAt) || !['product-contract','human-evidence'].includes(p.reviewType))) throw new Error('Reviewed source needs recorded reviewer/date/type');
    if (e.reviewStatus==='reviewed' && i.kind==='education' && (p.reviewType!=='human-evidence' || p.acquisition==='search-index-only' || p.reviewedExcerpt!==e.excerpt || p.reviewedSourceUrl!==e.url || p.reviewedVersion!==e.version)) throw new Error('Education requires human evidence review of the original');
    if (i.kind==='app-behavior' && p.reviewType!=='product-contract') throw new Error('App behavior requires an approved product contract');
  }
  return c;
}

/** Scope checks precede retrieval, including in research preview. Not an exhaustive medical classifier. */
export function scopeReason(question) {
  const q=normalize(question);
  if (/ignore.{0,35}(rules|instructions)|invent|make up|pretend.{0,25}(verified|doctor)|system prompt/.test(q)) return 'instruction-override';
  if (/emergency|yuzpe|unprotected sex|sex.{0,25}miss|miss.{0,25}sex/.test(q)) return 'time-sensitive';
  if (/chest pain|breathless|shortness of breath|fainting|collapsed|coughing blood/.test(q)) return 'urgent-symptom';
  if (/pregnan|fertil|safe.{0,20}sex|protected|protection begins|diagnos|pcos|endometriosis|ovulat.{0,20}(date|day|when)|when.{0,20}ovulat/.test(q)) return 'unsupported-clinical';
  if (/vomit|threw up|diarr|antibiotic|interaction|other medicine|start.{0,15}pill|stop.{0,15}pill|skip|missed.{0,25}(pill|tablet|dose)|forgot.{0,25}(pill|tablet|dose)|late.{0,25}(pill|tablet|dose)|next (pack|box)|redose|take.{0,20}(extra|another|double)/.test(q)) return 'unsupported-clinical';
  if (/lady|althea|daphne|charlize|yaz|yasmin|mini pill|progestin only/.test(q)) return 'unsupported-product';
  if (/when.{0,30}(period|bleed)|which day.{0,20}bleed|predict.{0,20}(period|bleed)/.test(q)) return 'unsupported-prediction';
  return null;
}

export function retrieveRag(question, corpus, {profileId=corpus.supportedProfileId,researchPreview=false}={}) {
  if (typeof question!=='string' || !question.trim() || question.length>4000) throw new Error('Invalid question');
  if (profileId!==corpus.supportedProfileId || scopeReason(question)) return [];
  const q=normalize(question);
  return corpus.items.filter(i => ['app-behavior','education'].includes(i.kind) && i.evidence.supportedProfileIds.includes(profileId) &&
    (i.evidence.reviewStatus==='reviewed' || (researchPreview && i.kind==='education' && i.evidence.reviewStatus==='draft' && i.provenance.acquisition==='opened-page')))
    .map(item=>({item,score:item.keywords.reduce((score,k)=>{
      const key=normalize(k), parts=tokens(key);
      // Match whole words/phrases; common words never establish relevance on their own.
      return score + (parts.size && (` ${q} `).includes(` ${key} `) ? 3 + parts.size : 0);
    },0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score || a.item.evidence.id.localeCompare(b.item.evidence.id)).slice(0,3).map(x=>x.item);
}

export function planRag(question, corpus, options={}) {
  const reason=scopeReason(question);
  const passages=retrieveRag(question,corpus,options);
  const preview=passages.some(i=>i.evidence.reviewStatus==='draft');
  const statements=[];
  const add=(id,plain)=>statements.push({id,plain,gentle:plain});
  if (preview) add('research-preview','Developer research preview: these educational passages await human evidence review and are not approved for release.');
  for (const i of passages) add(`faq-${i.evidence.id}`,`${i.evidence.excerpt}${i.caveat ? ` ${i.caveat}` : ''} Based on ${i.evidence.publisher} [${i.evidence.id}].`);
  if (!passages.length) {
    if (reason==='time-sensitive') add('rag-limit','This may be time-sensitive. Contact a pharmacist or clinician promptly today about your situation. Petal does not provide emergency-contraception dosing.');
    else if (reason==='urgent-symptom') add('rag-limit','These symptoms need urgent medical assessment. Seek urgent medical care now; Petal cannot diagnose their cause.');
    else if (reason) add('rag-limit','This question needs guidance outside this FAQ’s supported scope. I can help review your recorded history, but cannot provide an individualized medical instruction. A pharmacist or clinician can help with that decision.');
    else add('rag-limit','No applicable reviewed passage answers this question in the local knowledge base. I can still help check recorded intake history.');
  }
  return {mode:passages.length?'faq':'insufficient-evidence',reason,preview,knowledgeVersion:corpus.knowledgeVersion,passages,statements,requiredIds:statements.map(s=>s.id),evidenceIds:passages.map(i=>i.evidence.id)};
}

export function ragPrompt(plan) {
  return {mode:plan.mode,scopeReason:plan.reason,knowledgeVersion:plan.knowledgeVersion,researchPreview:plan.preview,
    passages:plan.passages.map(i=>({id:i.evidence.id,publisher:i.evidence.publisher,section:i.evidence.sectionOrPage,excerpt:i.evidence.excerpt,reviewStatus:i.evidence.reviewStatus})),
    statementChoices:plan.statements.map(s=>({id:s.id,text:s.plain})),requiredIds:plan.requiredIds,allowedEvidenceIds:plan.evidenceIds};
}
export function renderRag(plan,raw) {
  const v=validateOutput(raw,plan);
  return {text:plan.statements.map(s=>s[v.ok?v.value.style:'plain']).join(' '),mode:plan.mode,fallback:!v.ok,reason:v.ok?null:v.reason,
    researchPreview:plan.preview,knowledgeVersion:plan.knowledgeVersion,recordsChanged:false,
    citations:plan.passages.map(i=>({...i.evidence,excerptType:i.provenance.excerptType}))};
}
