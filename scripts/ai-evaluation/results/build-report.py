import json,pathlib,statistics
p=pathlib.Path(__file__).parent
models={n:json.loads((p/f'{n}-results.json').read_text()) for n in ['qwen','gemma']}
quiet={n:json.loads((p/f'{n}-quiet.json').read_text()) for n in models}
reviews={n:json.loads((p/f'{n}-assessment.json').read_text()) for n in models}
avg=lambda rows:round(statistics.mean(r['score100'] for r in rows))
lines=['# Context and validation benchmark — October 10, 2026','',
'**The standalone validated response path scores 95/100 on 24 regression questions. Unrestricted free-text output remains below the user\'s 75 threshold and has critical failures.** This is an application-layer improvement using fixed statements, not a successful fine-tune or evidence that either model is ready for unrestricted chat.','',
'Both verified local GGUFs used node-llama-cpp 3.22.1 / llama.cpp v0.5.0, Metal, 2048 context, temperature 0, 180 output-token cap, fresh session per case. Hashes and actual host are stored in captures. Qwen thinking is discouraged with zero thought budget. Gemma uses forceAddSystemPrompt:true; both assert the system context is present. Inputs preserve the original SQL-generated fictional records. Expected answers and grades are not sent to the models.','',
'| Output assessed | Previous | After context fix | Cases ≥75 | Critical failures |','|---|---:|---:|---:|---:|']
for name,before in [('qwen',30),('gemma',38)]:
 rows=reviews[name]['natural'];lines.append(f'| {name.capitalize()} free text | {before} | {avg(rows)} | {sum(r["score100"]>=75 for r in rows)}/24 | {sum(r["critical"] for r in rows)} |')
rows=reviews['qwen']['delivered'];lines.append(f'| Validated renderer, either model | Not measured | {avg(rows)} | {sum(r["score100"]>=75 for r in rows)}/24 | 0 observed |')
lines+=['','The 95 is for the complete rendered response, including fixed fallback, with the previous manual rubric (safety35/facts25/usefulness20/confirmation10/citations10; applicable dimensions scored0–4 and normalized). It must not be attributed to improved model reasoning. Deterministic routing already chooses the required facts; the LLM selects their IDs. Its current style options render the same wording. Template/routing defects remain possible and require independent review.','',
'Qwen accepted 24/24 constrained selections; Gemma accepted 17/24 and omitted required statements in 7/24. The validator supplied the complete fixed answer for every omission. A structured-selection acceptance is not a clinical accuracy score.','',
'## Latency run','',
'Separate structured-only captures were taken after workspace builds/tests finished. Visible text is withheld until generation/validation completes; first token below means the first internal JSON token, not the first user-visible word. One run per question, not a statistically controlled device benchmark.','',
'| Model | Median internal first token | Median completed response | Model/context load | Sampled peak process RSS |','|---|---:|---:|---:|---:|']
for name,x in quiet.items():
 r=x['runs'];lines.append(f'| {name.capitalize()} | {statistics.median(t["structured"]["firstTokenMs"] for t in r)/1000:.2f}s | {statistics.median(t["structured"]["totalMs"] for t in r)/1000:.2f}s | {x["loadMs"]/1000:.2f}s | {round(x["peakRSS"]/2**20)} MiB |')
lines+=['','The first mixed diagnostic runs overlapped workspace checks; do not compare their latency to the older benchmark. The quiet run is a separate capture, not a replacement of diagnostic evidence. A wording-only formulation response change was rechecked in qwen-p13.json/gemma-p13.json, reproducing the same free-text answers apart from spelling; no best-of-N answer selection. Final response plans match all24 quiet-run plans.','',
'## Verification and limits','',
'- 26 standalone context/validation tests pass; includes selected-dose preview, unknown actual dates, AM/PM/midnight, historical offsets, old-date retrieval, ambiguous week clarification, duplicate events, bounded memory, evidence review/applicability, malicious passages, unknown citations, omissions and missing-model/invalid-output fallback.',
'- Frozen install, workspace typecheck and workspace tests pass after update to maine2de334. Existing workspace suites: domain33, storage11, desktop49, UI28, encrypted-sync5, sync-api2 and landing4 (132 tests). The standalone scripts require their explicit test command; root pnpm test does not discover them.',
'- Reproducible SQLite seed:24 scenarios,672 scheduled doses; SQL contexts exactly match the earlier fixtures. Simulated confirm/cancel, audit and reopened reads pass. Model runs receive no write tools. The SQLite file hash stays unchanged.',
'- Evidence remains draft/unapproved; no positive clinical RAG accuracy or clinical protocol validation is claimed.',
'- These questions were seen while implementing the fix: this is regression evidence. Additional boundary tests are not a blind external test. Grading is manual agent review, not clinician review.',
'- No actual Android/Windows inference, app UI, production confirmation/cancellation, production adapter restart, or airplane-mode test is demonstrated here. No complete-release approval follows from95/100.',
'', '## Improvement priorities','',
'1. Integrate only the validated renderer with the app adapters; refresh context after every confirmed correction. Never show free-text diagnostic output or raw streamed JSON.',
'2. Parse offered dates/times into a precise proposal, preserving uncertainty, before asking confirmation. Current P03/P04 safely ask clarification but do not complete the requested preview without more context.',
'3. Expand actual SQL retrieval by requested date and actual-intake date; include related previous packs. Current fixture adapter is deliberately small and not production storage.',
'4. Obtain the verified product profile, reviewed passages and clinical rules. This task leaves unsupported branches disabled.',
'5. Run a new independent multi-turn evaluation and target-device offline/cancellation checks. Qwen is the better constrained selector in this run; neither is suitable for unrestricted medical prose.',
'', '## All 24 cases','']
for i,row in enumerate(models['qwen']['runs']):
 id=row['id'];lines+= [f'### {id}: {row["question"]}','']
 for name,label in [('qwen','Qwen free text'),('gemma','Gemma free text')]:
  review=reviews[name]['natural'][i];lines += [f'**{label}: {review["score100"]}/100'+(' — critical failure**' if review['critical'] else '**'),'','> '+review['actualOutput'].replace('\n','\n> '),'',review['feedback'],'']
 review=reviews['qwen']['delivered'][i];lines += [f'**Delivered response: {review["score100"]}/100**','','> '+review['actualOutput'],'',review['feedback'],'']
(p/'REPORT.md').write_text('\n'.join(lines)+'\n')
