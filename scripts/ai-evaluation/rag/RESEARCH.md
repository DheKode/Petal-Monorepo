# Trust-focused local RAG research — October 10, 2026

A11/F09 under issue #9. This is a versioned research deliverable and standalone implementation, not clinical approval. All external health passages are `draft`. Four Petal behavior passages use the existing human-approved PRD as a product contract; they do not assert that every app has implemented that contract. Production `packages/domain/evidence/approved.json` is untouched and remains empty.

## Source register

| Source | Inspected material | What it can establish | Acquisition / limitation |
| --- | --- | --- | --- |
| [Philippine FDA DRP-336](https://verification.fda.gov.ph/drug_productsview.php?registration_number=DRP-336&showdetail=) | Product-information record | Listed ingredients/strengths, 28-tablet packaging, manufacturer/importer | Search-index record accessible; direct opens failed. Re-open the original during review. Not a leaflet or proof of the user's product. |
| [CDC combined hormonal contraceptives](https://www.cdc.gov/contraception/hcp/usspr/combined-hormonal-contraceptives.html) | Overview; late/missed-dose section | General combined-pill education and clinical research leads | Original page opened. Header shows November 19, 2024; footer shows November 18. Corpus uses header update date. General U.S. guidance is not Trust-specific approval. |
| [CDC U.S. SPR 2024](https://www.cdc.gov/mmwr/volumes/73/rr/rr7303a1.htm) | Figure 1; mechanism comparison in missed POPs section | Combined-pill mechanism and original missed-pill branches for review | Original public CDC publication; August 8, 2024. POP-specific dosing is excluded. |
| [NHS combined-pill side effects](https://www.nhs.uk/contraception/methods-of-contraception/combined-pill/side-effects/) | Common side effects | General bleeding-change education and persistent-side-effect escalation | Original page opened. Last reviewed February 15, 2024; this is a review date, not a claim of original publication. Does not diagnose an individual's symptoms. |
| [SwipeRx Trust Pill learning page](https://mobile.swiperxapp.com/trust-pharmacy-learning-hub/tplh-content/tlph-trust-pill-oral-contraceptive-pill/) | Formulation; dosage items 3 and 7 | Product-description lead corroborating registry strengths; unresolved instruction language | Original page opened; no revision date or authenticated insert supplied. Pharmacy education source, not regulator/manufacturer-issued leaflet. Product education remains draft. |
| [DKT / TRUST.ph FAQ](https://trust.ph/faq/) | Named missed-pill question | Product-publication lead for reconciliation | Original page opened; multi-brand Tagalog FAQ, no exact insert. Narrow English paraphrase; full page never ingested. |
| [Petal PRD at starting commit](https://github.com/DheKode/Petal-Monorepo/blob/ea408b8/PRD.md) | §5.2/5.4/8/10 and F08 | Intended record semantics and confirmation contract | Approved local product contract. An explanation of intended behavior does not certify app implementation. |

All excerpts are short paraphrases, not quotations or whole-page copies. URL, publisher, section, dates, formulation applicability, version, acquisition method and review status are retained per passage. Unknown publication dates remain null. Search results from pharmacies, forums and other products were not used as clinical authority. No model knowledge is treated as a source.

## Verification and unresolved facts

The regulator's indexed record and the SwipeRx formulation description agree on the listed contraceptive strengths and ferrous fumarate strength. This corroboration is a research finding, not authentication of an actual pack, ordering, leaflet revision or final `PillProfile`. Do not switch a user's profile to `verified` from these references.

An authenticated exact Trust leaflet was **not obtained**. The SwipeRx publication is useful but insufficient for C01/C02. Its timing language needs reconciliation with CDC. Remaining-active-tablet boundaries must also be checked against the full CDC figure before creating executable clinical fixtures. Product-page statements predicting an exact bleeding day are excluded. No claim that iron tablets treat anemia is included.

CDC's spotting discussion for extended/continuous regimens must not be applied as though it describes Trust's ordinary 21/7 schedule. The draft general bleeding FAQ therefore cites NHS's combined-pill education. It does not conclude that an individual bleeding episode is harmless or predict a date.

The Trust public FAQ also contains out-of-scope emergency-contraception and pregnancy-related claims. It is not ingested wholesale. Initiation instructions, eligibility, interactions, vomiting/diarrhea redosing, emergency-contraception dosing, pregnancy probability, fertility windows, additional products and regimen changes are excluded from answer passages.

## Approval handoff

Issue #4 remains the clinical approval dependency. Its human owner and qualified reviewer are not yet confirmed. Before release of health FAQs: inspect original sources, approve each paraphrase/caveat and applicability, record reviewer/date with `reviewType: human-evidence`, bind approval to the exact `reviewedExcerpt`, `reviewedSourceUrl` and `reviewedVersion`, and change the specific education item's status to `reviewed`. This is a human evidence review, distinct from an agent's source check. Search-index-only records cannot be approved through this educational route.

Clinical-research entries remain excluded even if marked reviewed; they are not answer templates or deterministic rules. C01/C02/C03/D09 must separately establish authenticated product details, source reconciliation, fixed actions and approved boundary fixtures. This task creates no medication-action rules.

`--research-preview` is for developer evaluation of draft educational content only. It adds an unavoidable review warning to displayed responses and citations retain `draft`. It cannot enable clinical/research or rejected entries. Never enable it in an app distributed to users. The standalone corpus is not automatically packaged into Android/Electron; an agreed app adapter handoff is still required.
