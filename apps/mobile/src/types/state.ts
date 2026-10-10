import type {
  AuditEntry,
  BleedingEntry,
  GuidanceResult,
  IntakeEvent,
  IntakeState,
  Pack,
  PillProfile,
  ScheduledDose,
  Settings,
} from '@petal/domain';

export type TabId = 'today' | 'pack' | 'clarify' | 'bleeding' | 'settings';

export interface PetalMobileState {
  profile: PillProfile | null;
  settings: Settings;
  pack: Pack | null;
  doses: ScheduledDose[];
  events: IntakeEvent[];
  bleeding: BleedingEntry[];
  audits: AuditEntry[];
  isConfigured: boolean;
}

export interface RecordIntakeInput {
  doseId: string;
  status: 'taken' | 'confirmed-missed' | 'unsure';
  actualAt?: string | null;
  timePrecision?: 'exact' | 'approximate' | 'unknown';
  origin?: 'manual' | 'chat' | 'import';
}

export interface RecordIntakeResult {
  ok: boolean;
  message?: string;
  state: PetalMobileState;
  change: 'created' | 'corrected' | 'unchanged';
  undoable: boolean;
}

export interface BatchRecordResult {
  ok: boolean;
  message?: string;
  state: PetalMobileState;
  applied: number;
  unchanged: number;
}

export interface SetupPayload {
  mode: 'first-pack' | 'current-pack';
  usualTime: string;
  timeZone: string;
  startDate?: string;
  currentPosition?: number;
  currentDate?: string;
  remindersEnabled: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'petal' | 'user';
  text: string;
  timestamp: string;
  proposal?: {
    doseId: string;
    tabletNumber: number;
    scheduledDate: string;
    beforeStatus: string;
    afterStatus: 'taken' | 'confirmed-missed' | 'unsure';
    timePrecision: 'exact' | 'approximate' | 'unknown';
    actualAt?: string | null;
    status?: 'pending' | 'confirmed' | 'cancelled';
  };
  citations?: Array<{
    id: string;
    source: string;
    section: string;
    text: string;
  }>;
}

export interface BleedingInput {
  date: string;
  category: 'spotting' | 'bleeding';
  intensity?: 'light' | 'moderate' | 'heavy' | null;
  note?: string | null;
}
