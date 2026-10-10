import {
  applyIntake,
  deriveSchedule,
  DomainValidationError,
  localDateIn,
  parseBackupJson,
  serializeBackup,
  SettingsSchema,
  startDateFromPosition,
  toZonedIso,
  type AuditEntry,
  type Backup,
  type BleedingEntry,
  type Evidence,
  type IntakeEvent,
  type Pack,
  type PillProfile,
  type ScheduledDose,
  type Settings,
} from '@petal/domain';
import type {
  BatchRecordResult,
  BleedingInput,
  PetalMobileState,
  RecordIntakeInput,
  RecordIntakeResult,
  SetupPayload,
} from '../types/state.js';

export function getTrust28Profile(): PillProfile {
  return {
    id: 'trust-28',
    product: 'Trust 28',
    formulation: 'Ethinylestradiol 30mcg + Levonorgestrel 125mcg (21 active) / Ferrous Fumarate 75mg (7 non-hormonal)',
    ingredients: [
      { name: 'Ethinylestradiol', strength: '30 mcg' },
      { name: 'Levonorgestrel', strength: '125 mcg' },
      { name: 'Ferrous Fumarate', strength: '75 mg' },
    ],
    regimen: '28-tablet-pack',
    tabletMap: Array.from({ length: 28 }, (_, index) => {
      const position = index + 1;
      const isActive = position <= 21;
      return {
        position,
        kind: isActive ? ('active' as const) : ('non-hormonal' as const),
        label: isActive ? `Active Tablet ${position}` : `Brown Tablet ${position} (Non-hormonal)`,
      };
    }),
    leafletVersion: '2026.1-ph',
    evidenceVersion: '2026.1',
    evidenceIds: ['trust-leaflet-2026', 'cdc-spr-2024'],
    verificationState: 'verified',
  };
}

export function createInitialSettings(timeZone = 'Asia/Manila', usualTime = '21:00'): Settings {
  return {
    id: 'mobile-settings',
    usualTime,
    timeZone,
    notificationPreference: 'enabled',
    locale: 'en',
    modelConfiguration: {
      enabled: true,
      modelId: 'gemma-4-1b-it-q4_k_m',
      artifactSha256: '8ccc5cd1f1b3602548715ae25a66ed73fd5dc68a210412eea643eb20eb75a135',
      runtime: 'llama.rn-android',
    },
  };
}

export function createDefaultDemoState(): PetalMobileState {
  const profile = getTrust28Profile();
  const timeZone = 'Asia/Manila';
  const now = new Date();
  const todayDate = localDateIn(now, timeZone);
  // Start date anchored so today is Day 14 of the pack (middle of active phase)
  const [y, m, d] = todayDate.split('-').map(Number);
  const startDay = new Date(Date.UTC(y, m - 1, d - 13)).toISOString().slice(0, 10);

  const derived = deriveSchedule({
    packId: `pack-${startDay}`,
    profile,
    usualTime: '21:00',
    timeZone,
    startDate: startDay,
  });

  const events: IntakeEvent[] = [];
  const audits: AuditEntry[] = [];

  // Generate historical demo entries: Days 1 to 12 taken on time
  for (let pos = 1; pos <= 12; pos++) {
    const dose = derived.doses[pos - 1];
    const eventTime = `${dose.localDate}T21:05:00+08:00`;
    const event: IntakeEvent = {
      id: `evt-${dose.id}`,
      doseId: dose.id,
      status: 'taken',
      actualAt: eventTime,
      timePrecision: 'approximate',
      timeZone,
      origin: 'manual',
      createdAt: eventTime,
      updatedAt: eventTime,
    };
    events.push(event);
    audits.push({
      id: `audit-${event.id}`,
      entityId: event.id,
      entityType: 'intake-event',
      priorValue: null,
      newValue: { ...event },
      timestamp: eventTime,
      origin: 'manual',
    });
  }

  // Day 13 (yesterday) intentionally has NO ENTRY, so the user can see history repair in action!
  // Day 14 (today) is due today.

  const bleeding: BleedingEntry[] = [
    {
      id: 'bleed-1',
      startDate: startDay,
      endDate: null,
      category: 'bleeding',
      intensity: 'light',
      note: 'Cycle day 1 of new pack',
    },
  ];

  return {
    profile,
    settings: createInitialSettings(timeZone, '21:00'),
    pack: derived.pack,
    doses: derived.doses,
    events,
    bleeding,
    audits,
    isConfigured: true,
  };
}

/**
 * Mobile Storage Service
 * Fully functional offline store that adheres to @petal/domain constraints.
 * Ready for Necookie to plug in SQLite storage adapter on Android!
 */
export class MobileStorageService {
  private state: PetalMobileState;
  private undoStack: Map<string, IntakeEvent | null> = new Map();
  private listeners: Set<(state: PetalMobileState) => void> = new Set();
  private revision = 1;

  constructor(initialState?: PetalMobileState) {
    if (initialState) {
      this.state = initialState;
    } else {
      const persisted = this.loadPersistedState();
      if (persisted) {
        this.state = persisted;
      } else {
        this.state = createDefaultDemoState();
        this.persist();
      }
    }
  }

  private loadPersistedState(): PetalMobileState | null {
    if (typeof window === 'undefined') return null;
    let jsonStr: string | null = null;
    const native = (window as any).PetalNative;
    if (native && typeof native.getSnapshot === 'function') {
      try {
        jsonStr = native.getSnapshot();
        if (typeof native.getRevision === 'function') {
          const rev = native.getRevision();
          if (typeof rev === 'number' && rev > 0) {
            this.revision = rev;
          }
        }
      } catch (e) {
        console.warn('Native SQLite getSnapshot error:', e);
      }
    }
    if (!jsonStr && typeof window.localStorage !== 'undefined') {
      try {
        jsonStr = window.localStorage.getItem('petal_mobile_backup');
      } catch {}
    }
    if (jsonStr) {
      try {
        const backup = parseBackupJson(jsonStr);
        return {
          profile: backup.profiles[0] ?? null,
          settings: backup.settings ?? createInitialSettings(),
          pack: backup.packs[0] ?? null,
          doses: backup.scheduledDoses,
          events: backup.intakeEvents,
          bleeding: backup.bleedingEntries,
          audits: backup.auditEntries,
          isConfigured: backup.packs.length > 0,
        };
      } catch (e) {
        console.warn('Persisted backup failed to parse:', e);
      }
    }
    return null;
  }

  private persist() {
    this.revision++;
    if (typeof window === 'undefined') return;
    try {
      const jsonStr = this.exportBackupJson();
      const native = (window as any).PetalNative;
      if (native && typeof native.saveSnapshot === 'function') {
        try {
          native.saveSnapshot(this.revision, jsonStr);
        } catch (e) {
          console.error('Failed to persist snapshot to native SQLite:', e);
        }
      }
      if (typeof window.localStorage !== 'undefined') {
        try {
          window.localStorage.setItem('petal_mobile_backup', jsonStr);
        } catch {}
      }
    } catch (e) {
      console.warn('Could not export backup for persistence:', e);
    }
  }

  getState(): PetalMobileState {
    return this.state;
  }

  subscribe(listener: (state: PetalMobileState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.persist();
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  setupPack(payload: SetupPayload): PetalMobileState {
    const profile = getTrust28Profile();
    let startDate: string;

    if (payload.mode === 'first-pack') {
      startDate = payload.startDate || localDateIn(new Date(), payload.timeZone);
    } else {
      const pos = payload.currentPosition || 1;
      const curDate = payload.currentDate || localDateIn(new Date(), payload.timeZone);
      startDate = startDateFromPosition({ position: pos, date: curDate });
    }

    const derived = deriveSchedule({
      packId: `pack-${startDate}`,
      profile,
      usualTime: payload.usualTime,
      timeZone: payload.timeZone,
      startDate,
    });

    const settings: Settings = {
      id: 'mobile-settings',
      usualTime: payload.usualTime,
      timeZone: payload.timeZone,
      notificationPreference: payload.remindersEnabled ? 'enabled' : 'disabled',
      locale: 'en',
      modelConfiguration: {
        enabled: true,
        modelId: 'gemma-4-1b-it-q4_k_m',
        artifactSha256: '8ccc5cd1f1b3602548715ae25a66ed73fd5dc68a210412eea643eb20eb75a135',
        runtime: 'llama.rn-android',
      },
    };

    this.state = {
      profile,
      settings,
      pack: derived.pack,
      doses: derived.doses,
      events: [],
      bleeding: [],
      audits: [],
      isConfigured: true,
    };

    this.undoStack.clear();
    this.notify();
    return this.state;
  }

  recordIntake(input: RecordIntakeInput, now = new Date()): RecordIntakeResult {
    const dose = this.state.doses.find(d => d.id === input.doseId);
    if (!dose) {
      return { ok: false, message: 'Dose not found', state: this.state, change: 'unchanged', undoable: false };
    }

    const existing = this.state.events.find(e => e.doseId === input.doseId);

    try {
      const { event, change } = applyIntake(
        dose,
        existing,
        {
          status: input.status,
          actualAt: input.actualAt,
          timePrecision: input.timePrecision,
          origin: input.origin ?? 'manual',
        },
        now,
      );

      if (change === 'unchanged') {
        return { ok: true, state: this.state, change: 'unchanged', undoable: false };
      }

      // Record undo state
      this.undoStack.set(dose.id, existing ?? null);

      // Update events array
      const nextEvents = this.state.events.filter(e => e.doseId !== dose.id);
      nextEvents.push(event);

      // Audit entry
      const audit: AuditEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        entityId: event.id,
        entityType: 'intake-event',
        priorValue: existing ? { ...existing } : null,
        newValue: { ...event },
        timestamp: event.updatedAt,
        origin: input.origin ?? 'manual',
      };

      this.state = {
        ...this.state,
        events: nextEvents,
        audits: [...this.state.audits, audit],
      };

      this.notify();
      return {
        ok: true,
        state: this.state,
        change,
        undoable: existing !== null,
      };
    } catch (error) {
      const msg = error instanceof DomainValidationError ? error.issues.map(i => i.message).join('; ') : 'Could not record intake';
      return { ok: false, message: msg, state: this.state, change: 'unchanged', undoable: false };
    }
  }

  undoIntake(doseId: string, now = new Date()): { ok: boolean; message?: string; state: PetalMobileState } {
    if (!this.undoStack.has(doseId)) {
      return { ok: false, message: 'No undo available for this dose', state: this.state };
    }

    const previousEvent = this.undoStack.get(doseId);
    const dose = this.state.doses.find(d => d.id === doseId);
    if (!dose) return { ok: false, message: 'Dose not found', state: this.state };

    const currentEvent = this.state.events.find(e => e.doseId === doseId);
    if (previousEvent === undefined) {
      return { ok: false, message: 'There is nothing to undo for that tablet.', state: this.state };
    }

    // Undoing a newly created entry: remove it from events and audit the removal
    if (previousEvent === null) {
      if (!currentEvent) {
        this.undoStack.delete(doseId);
        return { ok: false, message: 'No intake event found to undo.', state: this.state };
      }
      const nextEvents = this.state.events.filter(e => e.doseId !== doseId);
      const audit: AuditEntry = {
        id: `audit-undo-remove-${Date.now()}`,
        entityId: currentEvent.id,
        entityType: 'intake-event',
        priorValue: { ...currentEvent },
        newValue: null,
        timestamp: toZonedIso(now, currentEvent.timeZone),
        origin: 'manual',
      };

      this.state = {
        ...this.state,
        events: nextEvents,
        audits: [...this.state.audits, audit],
      };
      this.undoStack.delete(doseId);
      this.notify();
      return { ok: true, state: this.state };
    }

    try {
      const at = new Date(Math.max(now.getTime(), Date.parse(currentEvent?.updatedAt ?? '')));
      const updatedTimeIso = toZonedIso(at, previousEvent.timeZone);
      const restoredEvent: IntakeEvent = {
        ...previousEvent,
        updatedAt: updatedTimeIso,
      };

      const nextEvents = this.state.events.filter(e => e.doseId !== doseId);
      nextEvents.push(restoredEvent);

      const audit: AuditEntry = {
        id: `audit-undo-${Date.now()}`,
        entityId: restoredEvent.id,
        entityType: 'intake-event',
        priorValue: currentEvent ? { ...currentEvent } : null,
        newValue: { ...restoredEvent },
        timestamp: updatedTimeIso,
        origin: 'manual',
      };

      this.state = {
        ...this.state,
        events: nextEvents,
        audits: [...this.state.audits, audit],
      };

      this.undoStack.delete(doseId);
      this.notify();
      return { ok: true, state: this.state };
    } catch (err) {
      return { ok: false, message: 'Could not undo entry', state: this.state };
    }
  }

  recordBatch(inputs: RecordIntakeInput[], now = new Date()): BatchRecordResult {
    let applied = 0;
    let unchanged = 0;

    for (const input of inputs) {
      const res = this.recordIntake(input, now);
      if (res.ok) {
        if (res.change === 'unchanged') unchanged++;
        else applied++;
      } else {
        return { ok: false, message: res.message, state: this.state, applied, unchanged };
      }
    }

    return { ok: true, state: this.state, applied, unchanged };
  }

  addBleeding(input: BleedingInput, now = new Date()): PetalMobileState {
    const entry: BleedingEntry = {
      id: `bleed-${Date.now()}`,
      startDate: input.date,
      endDate: null,
      category: input.category,
      intensity: input.intensity || null,
      note: input.note || null,
    };

    const audit: AuditEntry = {
      id: `audit-bleed-${Date.now()}`,
      entityId: entry.id,
      entityType: 'bleeding-entry',
      priorValue: null,
      newValue: { ...entry },
      timestamp: toZonedIso(now, this.state.settings.timeZone),
      origin: 'manual',
    };

    this.state = {
      ...this.state,
      bleeding: [entry, ...this.state.bleeding],
      audits: [...this.state.audits, audit],
    };
    this.notify();
    return this.state;
  }

  deleteBleeding(id: string, now = new Date()): PetalMobileState {
    const prior = this.state.bleeding.find(b => b.id === id);
    if (!prior) return this.state;

    const audit: AuditEntry = {
      id: `audit-bleed-del-${Date.now()}`,
      entityId: prior.id,
      entityType: 'bleeding-entry',
      priorValue: { ...prior },
      newValue: null,
      timestamp: toZonedIso(now, this.state.settings.timeZone),
      origin: 'manual',
    };

    this.state = {
      ...this.state,
      bleeding: this.state.bleeding.filter(b => b.id !== id),
      audits: [...this.state.audits, audit],
    };
    this.notify();
    return this.state;
  }

  updateSettings(partial: Partial<Settings>): PetalMobileState {
    this.state = {
      ...this.state,
      settings: {
        ...this.state.settings,
        ...partial,
      },
    };
    this.notify();
    return this.state;
  }

  exportBackupJson(): string {
    const evidencePassages: Evidence[] = [
      {
        id: 'trust-leaflet-2026',
        publisher: 'Trust 28 Patient Leaflet',
        title: 'How to Take Trust 28',
        url: 'https://example.com/trust28',
        sectionOrPage: 'Missed Tablets',
        excerpt: 'Take one tablet daily at the same time each day for 28 consecutive days in the order directed on the blister pack.',
        publicationDate: '2026-01-01',
        retrievalDate: '2026-10-09',
        supportedProfileIds: [this.state.profile?.id || 'trust-28'],
        version: '2026.1',
        reviewStatus: 'reviewed',
      },
      {
        id: 'cdc-spr-2024',
        publisher: 'CDC SPR',
        title: 'Combined Oral Contraceptives Guidance',
        url: 'https://example.com/cdc-spr',
        sectionOrPage: 'Late or Missed Doses',
        excerpt: 'If 1 active pill is missed: Take the late or missed pill as soon as possible.',
        publicationDate: '2024-01-01',
        retrievalDate: '2026-10-09',
        supportedProfileIds: [this.state.profile?.id || 'trust-28'],
        version: '2024.1',
        reviewStatus: 'reviewed',
      },
    ];

    const backup: Backup = {
      schemaVersion: 1,
      appVersion: '0.1.0',
      exportedAt: new Date().toISOString(),
      encryption: 'none',
      profiles: this.state.profile ? [this.state.profile] : [],
      settings: this.state.settings,
      packs: this.state.pack ? [this.state.pack] : [],
      scheduledDoses: this.state.doses,
      intakeEvents: this.state.events,
      bleedingEntries: this.state.bleeding,
      auditEntries: this.state.audits,
      evidence: this.state.profile ? evidencePassages : [],
    };
    return serializeBackup(backup);
  }

  importBackupJson(jsonStr: string): { ok: boolean; message?: string } {
    try {
      const restored = parseBackupJson(jsonStr);

      this.state = {
        profile: restored.profiles[0] || null,
        settings: restored.settings ?? createInitialSettings(),
        pack: restored.packs[0] || null,
        doses: restored.scheduledDoses,
        events: restored.intakeEvents,
        bleeding: restored.bleedingEntries,
        audits: restored.auditEntries,
        isConfigured: restored.packs.length > 0,
      };

      this.undoStack.clear();
      this.notify();
      return { ok: true };
    } catch (err: any) {
      const message = err instanceof DomainValidationError
        ? err.issues.map(i => i.message).join('; ')
        : err?.message || 'Invalid backup format';
      return { ok: false, message };
    }
  }

  resetAll(): PetalMobileState {
    this.state = {
      profile: null,
      settings: createInitialSettings(),
      pack: null,
      doses: [],
      events: [],
      bleeding: [],
      audits: [],
      isConfigured: false,
    };
    this.undoStack.clear();
    if (typeof window !== 'undefined') {
      const native = (window as any).PetalNative;
      if (native && typeof native.resetDatabase === 'function') {
        try {
          native.resetDatabase();
        } catch {}
      }
      try {
        window.localStorage?.removeItem('petal_mobile_backup');
      } catch {}
    }
    this.notify();
    return this.state;
  }
}

export const mobileStore = new MobileStorageService();
