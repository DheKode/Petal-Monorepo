import type { IntakeChange, IntakeEvent, Pack, PillProfile, ScheduledDose, Settings } from '@petal/domain';

export const IPC_APP_INFO = 'petal:app-info';
export const IPC_GET_STATE = 'petal:get-state';
export const IPC_SAVE_SETUP = 'petal:save-setup';
export const IPC_RECORD_INTAKE = 'petal:record-intake';
export const IPC_UNDO_INTAKE = 'petal:undo-intake';

export interface AppInfo {
  appVersion: string;
  platform: string;
}

/** Everything the screens need, as plain JSON. `persistence` tells the UI whether records survive a restart. */
export interface PetalState {
  profile: PillProfile | null;
  settings: Settings | null;
  pack: Pack | null;
  doses: ScheduledDose[];
  events: IntakeEvent[];
  persistence: 'memory' | 'disk';
}

export type SetupAnchor =
  | { kind: 'first-pack'; startDate: string }
  | { kind: 'mid-pack'; position: number; date: string };

export interface SetupInput {
  usualTime: string;
  timeZone: string;
  anchor: SetupAnchor;
}

export interface RecordIntakeInput {
  doseId: string;
  status: IntakeEvent['status'];
  actualAt?: string | null;
  timePrecision?: IntakeEvent['timePrecision'];
}

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export interface IntakeOutcome {
  state: PetalState;
  change: IntakeChange;
  /** True when this change was a correction that can be undone. New entries cannot be undone (#37). */
  undoable: boolean;
}

export interface PetalBridge {
  getAppInfo(): Promise<AppInfo>;
  getState(): Promise<PetalState>;
  saveSetup(input: SetupInput): Promise<Result<PetalState>>;
  recordIntake(input: RecordIntakeInput): Promise<Result<IntakeOutcome>>;
  /** Restore the dose's record to what it was before its most recent correction in this session. */
  undoIntake(doseId: string): Promise<Result<PetalState>>;
}
