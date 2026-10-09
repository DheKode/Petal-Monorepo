import type { Evidence, IntakeEvent } from '@petal/domain';
import type { PetalState } from './ipc';

// IPC channels for Ask Petal (#9). The renderer only sees these narrow methods; never files, SQL or Node.
export const AI_ASK = 'petal:ai-ask';
export const AI_CANCEL = 'petal:ai-cancel';
export const AI_MODEL_INFO = 'petal:ai-model-info';
export const AI_MODEL_PICK = 'petal:ai-model-pick';
export const AI_PREVIEW = 'petal:ai-preview';
export const AI_CONFIRM = 'petal:ai-confirm';
export const AI_DISCARD = 'petal:ai-discard';

export interface AiQuestion {
  question: string;
  discussedDoseId?: string | null;
}

export interface AiAnswer {
  text: string;
  mode: string;
  /** True when a fixed response is shown because the model was unavailable or its output was rejected. */
  fallback: boolean;
  fallbackReason: string | null;
  citations: Evidence[];
  recordsChanged: false;
  generationMs: number;
}

export interface AiModelInfo {
  /** A verified model file is selected. This does not prove the runtime has loaded it. */
  available: boolean;
  title: string;
  message: string;
}

export interface AiCorrection {
  doseId: string;
  status: IntakeEvent['status'];
  actualAt?: string | null;
  /** Remembered times are never exact. */
  timePrecision?: 'approximate' | 'unknown';
}

export interface AiPreview {
  token: string;
  doseId: string;
  position: number;
  date: string;
  before: IntakeEvent | null;
  after: IntakeEvent;
}

export interface AiSaved {
  state: PetalState;
  doseId: string;
}
