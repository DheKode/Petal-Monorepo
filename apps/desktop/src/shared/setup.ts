import {
  deriveSchedule, startDateFromPosition, DomainValidationError, SettingsSchema,
  type DerivedSchedule, type PillProfile, type Settings,
} from '@petal/domain';
import type { SetupInput } from './ipc';

/** Trust 28 profile with every tablet `unverified`. Product details have not been verified against the leaflet (#4), so
    the app runs in tracking-only mode and must not claim which tablets are active. */
export function unverifiedTrust28Profile(): PillProfile {
  return {
    id: 'trust-28-unverified',
    product: 'Trust 28',
    formulation: null,
    ingredients: [],
    regimen: '28-tablet-pack',
    tabletMap: Array.from({ length: 28 }, (_, index) => ({ position: index + 1, kind: 'unverified' as const, label: `Tablet ${index + 1}` })),
    leafletVersion: null,
    evidenceVersion: null,
    evidenceIds: [],
    verificationState: 'unverified',
  };
}

export interface DerivedSetup extends DerivedSchedule {
  profile: PillProfile;
  settings: Settings;
}

/** Validate setup answers and derive everything to save. Used by the renderer for the review step and again by the main
    process before saving, so the main process never trusts what the renderer previewed. */
export function deriveFromSetupInput(input: SetupInput): DerivedSetup {
  const startDate = input.anchor.kind === 'first-pack'
    ? input.anchor.startDate
    : startDateFromPosition({ position: input.anchor.position, date: input.anchor.date });
  const profile = unverifiedTrust28Profile();
  const schedule = deriveSchedule({ packId: `pack-${startDate}`, profile, usualTime: input.usualTime, timeZone: input.timeZone, startDate });
  const settings = SettingsSchema.safeParse({
    id: 'settings',
    usualTime: input.usualTime,
    timeZone: input.timeZone,
    notificationPreference: 'disabled',
    locale: 'en',
    modelConfiguration: { enabled: false, modelId: null, artifactSha256: null, runtime: null },
  });
  if (!settings.success) throw new DomainValidationError([{ path: 'settings', message: 'Invalid settings' }]);
  return { ...schedule, profile, settings: settings.data };
}
