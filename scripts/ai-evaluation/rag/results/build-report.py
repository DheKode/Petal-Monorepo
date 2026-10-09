"""Rebuild the report from captured fictional output and explicit manual grades. No model call."""
import json, statistics
from pathlib import Path
root=Path(__file__).parent
initial=json.loads((root/'gemma-initial.json').read_text())
final=json.loads((root/'gemma-final.json').read_text())
normal=json.loads((root/'gemma-normal.json').read_text())
assessment=json.loads((root/'assessment.json').read_text())
cases=json.loads((root.parent/'cases.json').read_text())
weights=list(assessment['weights'].values())
def grade(values):
    applicable=[(v,w) for v,w in zip(values,weights) if v is not None]
    return round(sum(v*w for v,w in applicable)/sum(w for _,w in applicable)/4*100,1)
raw={r['id']:{**r,'score':grade(r['grades'])} for r in assessment['raw']}
guarded={r['id']:grade([4,4,assessment['guardedUsefulness'][n],4 if r['id'] in ['R13','R30','R31'] else None,4]) for n,r in enumerate(final['runs'])}
checks=[]
for row in cases:
    run=next(r for r in final['runs'] if r['id']==row['id'])
    ids=[e['id'] for e in run['delivered']['citations']]
    assert len(ids)<=3 and len(set(ids))==len(ids)
    if row['expectedEvidenceId']: assert row['expectedEvidenceId'] in ids,row['id']
    if row['category'] in ['scope','irrelevant','withheld']:assert not ids,row['id']
    assert not run['delivered']['recordsChanged']
    for e in run['delivered']['citations']:assert f"[{e['id']}]" in run['delivered']['text'] and e['excerpt']
    if run['researchPreview']:assert 'Developer research preview' in run['delivered']['text']
    live=next(r for r in normal['runs'] if r['id']==row['id'])
    assert not live['delivered'].get('researchPreview',False)
    assert all(e['reviewStatus']=='reviewed' for e in live['delivered']['citations'])
    if row['category']=='education':assert not live['delivered']['citations'] and live['delivered']['mode']=='insufficient-evidence'
    checks.append({'id':row['id'],'passed':True})
summary={'cases':len(final['runs']),'rawScore':round(statistics.mean(r['score'] for r in raw.values())),
 'guardedPreviewScore':round(statistics.mean(guarded.values())), 'rawCriticalCases':[r['id'] for r in raw.values() if r['critical']],
 'initialAccepted':sum(not r['delivered']['fallback'] for r in initial['runs']),
 'finalAccepted':sum(not r['delivered']['fallback'] for r in final['runs']),
 'normalAccepted':sum(not r['delivered']['fallback'] for r in normal['runs']),
 'previewStructuredMedianMs':statistics.median(r['structured']['totalMs'] for r in final['runs']),
 'normalStructuredMedianMs':statistics.median(r['structured']['totalMs'] for r in normal['runs']),
 'previewJsonFirstTokenMedianMs':statistics.median(r['structured']['firstTokenMs'] for r in final['runs']),
 'peakProcessRssMiB':round(final['peakRSS']/2**20,1),'modelLoadMs':final['loadMs'],
 'clinicalReleaseReady':False,'invariants':checks}
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
lines=['# Local Gemma + Trust RAG benchmark — October 10, 2026','',
 f"32 realistic fictional questions. Raw Gemma diagnostic: **{summary['rawScore']}/100**, with **{len(summary['rawCriticalCases'])} critical cases**. Guarded extractive developer preview: **{summary['guardedPreviewScore']}/100**, with no observed critical delivered response in these cases. **Not ready for clinical/app release.**",'',
 'The >=75 threshold applies only to this bounded assessment. Unsupported product facts/actions, fabricated regulatory or personal facts, and a claimed record change are critical failures regardless of average. Raw outputs never enter the displayed response. All health passages remain draft. No qualified clinical approval or target-device acceptance is implied.','',
 '## What was actually tested','',
 '- Freshly seeded fictional SQLite: 24 scenarios, 672 scheduled doses; all 32 evaluation contexts match newly queried fixtures. Four cases cover separate same-day doses, cancellation, approximate confirmed save and unknown history.',
 '- Actual local Gemma 3 1B IT Q4_K_M, verified artifact hash; node-llama-cpp 3.22.1; 2048 context, 180 output tokens, temperature 0; fresh session each case and asserted system context.',
 '- First run: both structured and raw outputs with broad history context and optional citation counts. Final run: both outputs after exact required array counts and knowledge-only FAQ context. Normal approval-gated run: all 32 structured cases with preview disabled.',
 '- No model weights changed. Expected categories, answers and grades are not sent to Gemma. The prompts do contain curated statements, so this measures retrieval/faithfulness/selection, not independent clinical reasoning.',
 '- These questions were used during development, not a blind external evaluation. Source review and language faithfulness are separate gates. Regex scope matching is not an exhaustive medical classifier.','',
 '## Measured outcomes','',
 f"- Structured selection accepted: **{summary['initialAccepted']}/32 → {summary['finalAccepted']}/32** after the grammar/context fix. Normal mode: **{summary['normalAccepted']}/32**. This is constrained ID compliance, not clinical-answer correctness.",
 '- All ten draft-education questions retrieve their expected passage in preview and retrieve no medical passage in normal mode. All unsupported/irrelevant/withheld-source cases have no citations. No actual records changed.',
 f"- Median structured completion: **{summary['previewStructuredMedianMs']/1000:.2f}s preview**, **{summary['normalStructuredMedianMs']/1000:.2f}s normal**. Internal JSON first token: **{summary['previewJsonFirstTokenMedianMs']/1000:.2f}s**; not visible chat streaming latency.",
 f"- Preview-run model load: **{summary['modelLoadMs']/1000:.2f}s**; peak process RSS **{summary['peakProcessRssMiB']} MiB**. Model load is cache-dependent and RSS excludes complete GPU/device memory accounting.",
 '- Mac-local measurements only. Android/Windows app adapters, actual offline packaged UI, model delivery and reminders were not tested.','',
 '## Critical feedback and priorities','',
 '1. Keep raw prose out of the app. Gemma still miscounts tablets, infers pregnancy from bleeding, invents FDA approval and a personal interval, and misstates cancellation. The tighter grammar fixes citation compliance, not medical reasoning.',
 '2. Obtain the exact Trust leaflet and qualified evidence review. FDA search-index metadata and a pharmacy education transcription do not authenticate the pack. Health FAQs must remain disabled in normal mode until approved.',
 '3. Improve answer granularity and unsupported replies. A question about brown tablets gets the full formulation paragraph; many unsupported questions receive the same generic limitation. Explain the specific missing evidence and ask one relevant clarification where appropriate.',
 '4. Add intent routing and app adapters. This benchmark explicitly flags FAQ cases; it is not a production router. Keep FAQ context free of irrelevant personal facts, and query relevant authoritative records for personal-history questions.',
 '5. Run independent multi-turn/paraphrase tests, corrections with stale previews, source conflicts, noisy queries and real-device Wi-Fi-off checks. Check phone memory and repeated-turn latency before a release decision.',
 '6. Avoid fine-tuning at this stage. The measured immediate improvements came from context selection, required output counts and validator/fallback. Expand reviewed coverage before considering model training.','',
 '## Per-case manual review','', '| Case | Question | Raw /100 | Critical raw? | Guarded /100 | Feedback |','| --- | --- | ---: | --- | ---: | --- |']
for r in final['runs']:
    a=raw[r['id']]
    lines.append(f"| {r['id']} | {r['question'].replace('|','/')} | {a['score']} | {'Yes' if a['critical'] else 'No'} | {guarded[r['id']]} | {a['feedback']} |")
lines+=['','## Actual outputs','']
for r in final['runs']:
    lines += [f"### {r['id']} — {r['question']}",'','Raw diagnostic (not displayed):','',r.get('natural',{}).get('raw','[generation failed]'),'', 'Delivered developer-preview/guarded response:','',r['delivered']['text'],'']
(root/'REPORT.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='invariants'},indent=2))
