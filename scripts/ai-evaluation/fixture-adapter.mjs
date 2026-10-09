/** Converts the fictional SQL export to existing domain shapes. Not a production storage adapter. */
export function adaptFixture(row) {
  const c = row.databaseContext;
  const profileId = 'trust-28-unverified';
  const snapshot = {
    profile: {id: profileId, product: 'Trust 28', formulation: null, ingredients: [], regimen: '28-tablet-pack', tabletMap: Array.from({length: 28}, (_, i) => ({position: i + 1, kind: 'unverified', label: `Tablet ${i + 1}`})), leafletVersion: null, evidenceVersion: null, evidenceIds: [], verificationState: 'unverified'},
    settings: {id: 'settings', usualTime: c.profile.usual_time, timeZone: c.profile.time_zone, notificationPreference: 'disabled', locale: 'en', modelConfiguration: {enabled: true, modelId: null, artifactSha256: null, runtime: null}},
    packs: [{id: c.pack.pack_id, profileId, startDate: c.pack.scheduled_start, scheduleVersion: 'fixture-1', transitionState: c.pack.reported_actual_start ? 'delayed' : 'current'}],
    doses: c.relevantDoses.map(d => ({id: d.dose_id, packId: c.pack.pack_id, position: d.position, tabletKind: d.tablet_kind, scheduledAt: d.scheduled_at, localDate: d.local_date, timeZone: c.profile.time_zone})),
    events: c.relevantDoses.filter(d => d.intake_status !== 'no-entry').map(d => ({id: `${d.dose_id}-event`, doseId: d.dose_id, status: d.intake_status, actualAt: d.actual_at, timePrecision: d.time_precision, timeZone: c.profile.time_zone, origin: 'manual', createdAt: '2026-10-10T00:00:00+08:00', updatedAt: '2026-10-10T00:00:00+08:00'})),
    bleeding: c.bleedingEntries.map((b, i) => ({id: `bleeding-${i}`, startDate: b.local_date, endDate: null, category: b.category, intensity: null, note: null})),
    guidance: {status: 'unsupported', profileId, ruleId: 'unsupported', ruleVersion: 'fixture-1', relevantEventIds: [], fixedActions: [], missingFacts: [], flags: ['clinical-guidance-unverified'], evidenceIds: []}
  };
  return {snapshot, currentLocalDate: c.profile.current_date, session: {pendingProposal: c.pendingOrCompletedProposal?.state === 'pending' ? c.pendingOrCompletedProposal : null,
    actionResult: c.appActionResult, recentTurns: []}};
}
export function validateSnapshot(s, domain) {
  domain.PillProfileSchema.parse(s.profile); domain.SettingsSchema.parse(s.settings);
  s.packs.forEach(p => domain.PackSchema.parse(p)); s.doses.forEach(d => domain.ScheduledDoseSchema.parse(d));
  s.events.forEach(e => domain.IntakeEventSchema.parse(e)); s.bleeding.forEach(b => domain.BleedingEntrySchema.parse(b)); domain.GuidanceResultSchema.parse(s.guidance);
}
