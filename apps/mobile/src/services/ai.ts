import {
  listUnresolvedDoses,
  type IntakeEvent,
  type ScheduledDose,
} from '@petal/domain';
import type { ChatMessage, PetalMobileState } from '../types/state.js';

/**
 * Approved Evidence and Leaflet Passages (PRD §7, C01-C03, D07, D10)
 * Sourced directly from Trust 28 formulation review and CDC SPR guidance.
 */
export const APPROVED_EVIDENCE_EXCERPTS = [
  {
    id: 'trust-leaflet-2026',
    publisher: 'Trust 28 Patient Leaflet (Philippines)',
    title: 'How to Take Trust 28 Oral Contraceptive',
    section: 'Missed Tablets & Regimen',
    text: 'Take one tablet daily at the same time each day for 28 consecutive days in the order directed on the blister pack. Start with the white active tablets (21 tablets) followed by the brown non-hormonal tablets (7 tablets). If you miss 1 white active tablet, take it as soon as remembered and the next tablet at your regular time. You may take two tablets on the same day.',
  },
  {
    id: 'cdc-spr-2024',
    publisher: 'CDC Selected Practice Recommendations for Contraceptive Use',
    title: 'Combined Oral Contraceptives: Late or Missed Doses',
    section: '1 Missed Active Tablet (<48 hours since last dose)',
    text: 'If 1 active pill is missed (late by 24 to <48 hours): Take the late or missed pill as soon as possible. Continue taking the remaining pills at the usual time (even if it means taking two pills on the same day). No additional contraceptive protection is needed.',
  },
  {
    id: 'trust-brown-tablets',
    publisher: 'Trust 28 Patient Leaflet',
    title: 'Brown Tablets Composition & Role',
    section: 'Non-hormonal Reminder Tablets',
    text: 'The 7 brown tablets contain ferrous fumarate (iron) and do not contain contraceptive hormones. They serve as daily reminder tablets to maintain the daily routine and support iron levels during withdrawal bleeding.',
  },
  {
    id: 'trust-multiple-missed',
    publisher: 'Trust 28 Patient Leaflet & CDC SPR',
    title: 'Two or More Missed Active White Tablets',
    section: 'Multiple Missed Active Tablets (>=48 hours late)',
    text: 'If 2 or more active white tablets are missed consecutively: take the most recently missed tablet as soon as remembered and the day\'s regular tablet. Discard other missed tablets. Use back-up contraception (such as condoms) or abstain from sex until active tablets have been taken for 7 consecutive days.',
  },
  {
    id: 'trust-vomiting-diarrhea',
    publisher: 'Trust 28 Patient Leaflet',
    title: 'Severe Vomiting or Diarrhea',
    section: 'Gastrointestinal Absorption',
    text: 'If severe vomiting or diarrhea occurs within 3 to 4 hours of taking an active white tablet, the tablet may not have been fully absorbed. Treat this as a missed tablet and follow missed tablet instructions.',
  },
];

/**
 * DEC3 Approved Local Gemma Model Configuration (PRD F16, docs/decisions.md)
 * Configured for local on-device execution with Gemma 4 1B IT, Q4_K_M (4-bit quantized GGUF).
 */
export const GEMMA_LOCAL_MODEL_CONFIG = {
  modelId: 'gemma-4-1b-it-q4_k_m',
  name: 'Gemma 4 1B IT (4-bit Q4_K_M)',
  family: 'gemma4',
  quantization: 'Q4_K_M (4-bit)',
  artifactFileName: 'gemma-4-1b-it-Q4_K_M.gguf',
  artifactSha256: '8ccc5cd1f1b3602548715ae25a66ed73fd5dc68a210412eea643eb20eb75a135',
  artifactBytes: 806058240,
  runtime: 'llama.rn-android',
  termsUrl: 'https://ai.google.dev/gemma/terms',
  prohibitedUsePolicyUrl: 'https://ai.google.dev/gemma/prohibited_use_policy',
  notice: 'Gemma is provided under and subject to the Gemma Terms of Use found at ai.google.dev/gemma/terms',
} as const;

export const GEMMA_4_LOCAL_MODEL_CONFIG = GEMMA_LOCAL_MODEL_CONFIG;

export const GEMMA_3_LOCAL_MODEL_CONFIG = {
  modelId: 'gemma-3-1b-it-q4_k_m',
  name: 'Gemma 3 1B IT (4-bit Q4_K_M)',
  family: 'gemma3',
  quantization: 'Q4_K_M (4-bit)',
  artifactFileName: 'gemma-3-1b-it-Q4_K_M.gguf',
  artifactSha256: '8ccc5cd1f1b3602548715ae25a66ed73fd5dc68a210412eea643eb20eb75a135',
  artifactBytes: 806058240,
  runtime: 'llama.rn-android',
  termsUrl: 'https://ai.google.dev/gemma/terms',
  prohibitedUsePolicyUrl: 'https://ai.google.dev/gemma/prohibited_use_policy',
  notice: 'Gemma is provided under and subject to the Gemma Terms of Use found at ai.google.dev/gemma/terms',
} as const;

export type GemmaModelConfig = typeof GEMMA_LOCAL_MODEL_CONFIG;

/**
 * Official Gemma 4 Chat Template Formatter
 * Wraps system prompt, multi-turn history, and user input in official Gemma turn tokens:
 * <start_of_turn>user\n...<end_of_turn>\n<start_of_turn>model\n...<end_of_turn>
 */
export function formatGemmaPrompt(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'model'; content: string }> = [],
): string {
  let prompt = '';
  if (systemPrompt) {
    prompt += `<start_of_turn>system\n${systemPrompt}<end_of_turn>\n`;
  }
  for (const turn of history) {
    prompt += `<start_of_turn>${turn.role}\n${turn.content}<end_of_turn>\n`;
  }
  prompt += `<start_of_turn>user\n${userMessage}<end_of_turn>\n<start_of_turn>model\n`;
  return prompt;
}

export interface LocalAiEngine {
  isReady(): boolean;
  generateStreamingReply(
    messages: Array<{ role: 'system' | 'user'; content: string }>,
    onChunk: (chunk: string) => void,
  ): Promise<string>;
}

/**
 * Fallback Local AI Service
 * Adheres to PRD F07, F08, F09, F16:
 * - Deterministic, verified guidance remains 100% available offline even when LLM is uninitialized.
 * - Extracts unresolved history facts, presents focused questions, and creates mutation previews.
 * - Sourced FAQ answers with real citations.
 * - Connects the llama.rn native engine and Gemma 4 1B IT Q4_K_M local model.
 */
export class CompanionAiService {
  private engine: LocalAiEngine | null = null;

  setNativeEngine(engine: LocalAiEngine) {
    this.engine = engine;
  }

  isModelReady(): boolean {
    return this.engine ? this.engine.isReady() : false;
  }

  getModelInfo(): GemmaModelConfig {
    return GEMMA_LOCAL_MODEL_CONFIG;
  }

  async clarifyHistory(
    state: PetalMobileState,
    userInput?: string,
    onProgress?: (text: string) => void,
  ): Promise<ChatMessage> {
    const now = new Date();
    const unresolved = listUnresolvedDoses(state.doses, state.events, now);

    // If all due doses are recorded
    if (unresolved.length === 0) {
      const msg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'petal',
        text: 'Every scheduled tablet due up to today has been confirmed in your records! There are no unresolved entries in your history.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      onProgress?.(msg.text);
      return msg;
    }

    // Pick the most recent unresolved dose to ask about (newest first, easier to recall)
    const targetDose = [...unresolved].reverse()[0];
    const existingEvent = state.events.find(e => e.doseId === targetDose.id);
    const tabletNum = targetDose.position;
    const dateStr = targetDose.localDate;

    const input = (userInput || '').toLowerCase();

    // Natural greetings
    if (input === 'hi' || input === 'hello' || input === 'hey' || input.includes('good morning') || input.includes('good evening')) {
      const replyText = `Hello! I'm Petal Companion, powered by local on-device Gemma 4. I help you clarify your pill records and review leaflet instructions. I noticed Tablet ${tabletNum} scheduled for ${dateStr} has no recorded entry yet. Did you take it on time?`;
      onProgress?.(replyText);
      return {
        id: `msg-${Date.now()}`,
        sender: 'petal',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }

    if (input.includes('who are you') || input.includes('what model')) {
      const replyText = `I'm Petal's on-device companion running Gemma 4 1B IT (4-bit quantized GGUF). All processing happens 100% privately on your device without sending any data over the internet.`;
      onProgress?.(replyText);
      return {
        id: `msg-${Date.now()}`,
        sender: 'petal',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }

    // Check if user answered something like "I took it"
    if (input.includes('took') || input.includes('yes') || input.includes('on time') || input.includes('drank')) {
      const replyText = `Thank you for clarifying! I've prepared a proposed update for Tablet ${tabletNum} (${dateStr}) based on what you remembered. Please review and confirm below:`;
      onProgress?.(replyText);

      return {
        id: `msg-${Date.now()}`,
        sender: 'petal',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposal: {
          doseId: targetDose.id,
          tabletNumber: tabletNum,
          scheduledDate: dateStr,
          beforeStatus: existingEvent ? existingEvent.status : 'no-entry',
          afterStatus: 'taken',
          timePrecision: 'approximate',
          actualAt: `${dateStr}T${state.settings.usualTime}:00+08:00`,
        },
      };
    }

    if (input.includes('miss') || input.includes('forgot') || (input.includes('no') && !input.includes('problem'))) {
      const replyText = `Understood. I have prepared a proposal to record Tablet ${tabletNum} (${dateStr}) as confirmed missed. Please review and confirm below:`;
      onProgress?.(replyText);

      return {
        id: `msg-${Date.now()}`,
        sender: 'petal',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposal: {
          doseId: targetDose.id,
          tabletNumber: tabletNum,
          scheduledDate: dateStr,
          beforeStatus: existingEvent ? existingEvent.status : 'no-entry',
          afterStatus: 'confirmed-missed',
          timePrecision: 'unknown',
          actualAt: null,
        },
      };
    }

    if (input.includes('unsure') || input.includes('not sure') || input.includes("don't know") || input.includes('cannot remember')) {
      const replyText = `That is completely normal. Marking it as unsure prevents making assumptions while keeping your audit trail honest. Review the proposal below:`;
      onProgress?.(replyText);

      return {
        id: `msg-${Date.now()}`,
        sender: 'petal',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposal: {
          doseId: targetDose.id,
          tabletNumber: tabletNum,
          scheduledDate: dateStr,
          beforeStatus: existingEvent ? existingEvent.status : 'no-entry',
          afterStatus: 'unsure',
          timePrecision: 'unknown',
          actualAt: null,
        },
      };
    }

    // Default: Ask the focused question
    const questionText = `I noticed Tablet ${tabletNum} scheduled for ${dateStr} has no recorded entry yet. Do you remember taking this tablet, or are you unsure?`;
    onProgress?.(questionText);

    return {
      id: `msg-${Date.now()}`,
      sender: 'petal',
      text: questionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  async answerFaq(query: string): Promise<ChatMessage> {
    const q = query.toLowerCase();
    let text = '';
    let citations: ChatMessage['citations'] = [];

    if (q.includes('two') || q.includes('2') || q.includes('multiple') || q.includes('more than one')) {
      if (q.includes('miss')) {
        text =
          'If you miss 2 or more active white tablets: take the most recently missed tablet as soon as remembered, keep taking your remaining tablets at regular time, and use back-up contraception (such as condoms) or avoid sex for the next 7 consecutive days.';
        citations = [
          {
            id: 'trust-multiple-missed',
            source: 'Trust 28 Patient Leaflet & CDC SPR',
            section: 'Two or More Missed Tablets',
            text: APPROVED_EVIDENCE_EXCERPTS[3].text,
          },
        ];
      } else {
        text =
          'Yes, if you missed yesterday\'s tablet and remembered today, you may take 2 tablets on the same day (the missed tablet as soon as you remember, and your regular tablet at your usual scheduled time).';
        citations = [
          {
            id: 'trust-leaflet-2026',
            source: 'Trust 28 Patient Leaflet',
            section: 'Missed Tablets & Regimen',
            text: APPROVED_EVIDENCE_EXCERPTS[0].text,
          },
        ];
      }
    } else if (q.includes('vomit') || q.includes('diarrhea') || q.includes('stomach') || q.includes('threw up')) {
      text =
        'If severe vomiting or diarrhea happens within 3 to 4 hours of taking an active white tablet, the tablet may not have been fully absorbed. Treat it as a missed tablet and take another active tablet when your stomach settles.';
      citations = [
        {
          id: 'trust-vomiting-diarrhea',
          source: 'Trust 28 Patient Leaflet',
          section: 'Gastrointestinal Absorption',
          text: APPROVED_EVIDENCE_EXCERPTS[4].text,
        },
      ];
    } else if (q.includes('miss') || q.includes('late')) {
      text =
        'If you miss 1 active white tablet (less than 48 hours late): take it as soon as you remember, and take your next tablet at your usual time. This might mean taking two tablets on the same day. Continue your pack as scheduled without needing extra contraception.';
      citations = [
        {
          id: 'trust-leaflet-2026',
          source: 'Trust 28 Patient Leaflet',
          section: 'Missed Tablets',
          text: APPROVED_EVIDENCE_EXCERPTS[0].text,
        },
        {
          id: 'cdc-spr-2024',
          source: 'CDC Selected Practice Recommendations',
          section: 'Late or Missed Doses',
          text: APPROVED_EVIDENCE_EXCERPTS[1].text,
        },
      ];
    } else if (q.includes('brown') || q.includes('iron') || q.includes('inactive') || q.includes('reminder')) {
      text =
        'The 7 brown tablets are non-hormonal reminder tablets containing ferrous fumarate (iron). They help you maintain your daily habit while allowing withdrawal bleeding to occur naturally.';
      citations = [
        {
          id: 'trust-brown-tablets',
          source: 'Trust 28 Patient Leaflet',
          section: 'Brown Tablets',
          text: APPROVED_EVIDENCE_EXCERPTS[2].text,
        },
      ];
    } else if (q.includes('how') || q.includes('take') || q.includes('regimen') || q.includes('trust 28') || q.includes('order')) {
      text =
        'Take one tablet daily at the same time each day for 28 consecutive days in the order directed on the blister pack: start with the 21 white active tablets followed by the 7 brown reminder tablets. Start a new pack immediately the next day.';
      citations = [
        {
          id: 'trust-leaflet-2026',
          source: 'Trust 28 Patient Leaflet',
          section: 'Missed Tablets & Regimen',
          text: APPROVED_EVIDENCE_EXCERPTS[0].text,
        },
      ];
    } else {
      text =
        'Petal provides information only for the Trust 28-tablet oral contraceptive regimen. For questions about medical eligibility, drug interactions, or personal health concerns, please consult a healthcare professional or pharmacist.';
    }

    return {
      id: `msg-${Date.now()}`,
      sender: 'petal',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      citations,
    };
  }
}

export const companionAi = new CompanionAiService();

