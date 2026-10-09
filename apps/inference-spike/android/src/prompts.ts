// Copy of apps/inference-spike/node/prompts/fictional.json so desktop and
// Android numbers come from identical prompts. Fictional data only; the
// bracketed fixed action is a placeholder, not a clinical rule.
export const system =
  'You are Petal, a private offline pill-diary assistant. Use only the facts supplied in the message. Do not give medical advice, diagnoses or new instructions. Never change or add to the fixed action text. If a fact is unknown, say it is unknown. Answer in plain English, under 80 words.';

export const prompts = [
  {
    id: 'explain-result',
    text: 'Facts (fictional demo user):\n- Pack position 9 (Thursday): taken at 21:05, exact time.\n- Pack position 10 (Friday): no entry.\n- Pack position 11 (Saturday): taken at about 21:30, approximate time.\nFixed action from the rules engine: "[PLACEHOLDER FIXED ACTION - not yet verified]".\nEvidence passage E-DEMO-1: "This is a placeholder passage used for runtime testing only."\n\nExplain briefly what Petal knows and does not know about these three days. Do not invent the Friday time.',
  },
  {
    id: 'clarify-friday',
    text: 'A fictional user wrote: "I remember Saturday but not Friday."\nRecords: Friday (pack position 10) has no entry; Saturday (pack position 11) is recorded as taken at about 21:30.\n\nAsk the user exactly one short, neutral question that would help resolve the Friday entry. Offer \'taken\', \'missed\' and \'not sure\' as possible answers.',
  },
];
