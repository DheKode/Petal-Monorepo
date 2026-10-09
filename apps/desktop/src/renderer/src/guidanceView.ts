import {
  evaluateGuidance, DomainValidationError,
  type Evidence, type GuidanceResult, type ScheduledDose,
} from '@petal/domain';
import type { PetalState } from '../../shared/ipc';
import { doseLabel } from './format';

/* Display model for the guidance panel (F05/F06). Guidance is derived from the current records every time and never stored.
   Nothing here decides or words a clinical action: actions and citations come only from the domain result and the bundled
   evidence corpus. Until reviewed rules exist (#4, #5) the domain returns "unsupported", and the panel says exactly that. */

export interface GuidanceView {
  status: GuidanceResult['status'] | 'error';
  headline: string;
  /** Fixed actions from the rule engine, shown first and verbatim. Empty until rules are approved. */
  actions: { id: string; text: string }[];
  /** Rule that produced the result, e.g. "unsupported.not-yet-verified v0". */
  rule: string;
  relevantEventCount: number;
  /** Facts the engine needs but does not have, one per tablet where it applies. */
  missing: { key: string; subject: string; field: string; reason: string }[];
  flags: string[];
  /** Citations resolved from the offline evidence corpus. `passage` is null when the ID is not in the bundled corpus. */
  citations: { id: string; passage: Evidence | null }[];
}

const FIELD_LABEL: Record<GuidanceResult['missingFacts'][number]['field'], string> = {
  'profile-verification': 'Product verification',
  'intake-status': 'Intake status',
  'intake-time': 'Intake time',
  other: 'Other',
};

/** The domain's reasons are written for developers (and name the contract stub). Known messages get plain wording; anything
    else is shown exactly as the domain wrote it, so no reason is ever hidden. */
const REASON_TEXT: Record<string, string> = {
  'Product-specific clinical rules are not implemented or approved in this contract stub.':
    'Product-specific rules have not been reviewed and approved yet.',
  'History remains unknown until the user confirms it.':
    'History stays unknown until you confirm it. It is not counted as missed.',
  'Time is approximate or unknown; do not invent an exact timestamp.':
    'The time is approximate or unknown, so no exact time is assumed.',
};

const FLAG_LABEL: Record<string, string> = {
  'clinical-guidance-unverified': 'Clinical guidance has not been verified for this product.',
};

const HEADLINE: Record<GuidanceResult['status'], string> = {
  unsupported: 'No guidance is available yet. Product-specific rules have not been reviewed and approved, so Petal can only track your tablets.',
  incomplete: 'Guidance needs more information from you before it can be shown.',
  supported: 'Guidance for your recorded tablets',
};

/** Turn a rule-engine result into display text. Pure: the same result and records always give the same view. */
export function describeGuidance(result: GuidanceResult, doses: readonly ScheduledDose[], evidence: ReadonlyMap<string, Evidence>): GuidanceView {
  const byId = new Map(doses.map(d => [d.id, d]));
  return {
    status: result.status,
    headline: HEADLINE[result.status],
    actions: result.fixedActions.map(a => ({ id: a.id, text: a.text })),
    rule: `${result.ruleId} v${result.ruleVersion}`,
    relevantEventCount: result.relevantEventIds.length,
    missing: result.missingFacts.map((fact, index) => {
      const dose = fact.doseId ? byId.get(fact.doseId) : undefined;
      return {
        key: `${fact.doseId ?? 'general'}:${fact.field}:${index}`,
        subject: dose ? doseLabel(dose) : 'Whole pack',
        field: FIELD_LABEL[fact.field],
        reason: REASON_TEXT[fact.reason] ?? fact.reason,
      };
    }),
    flags: result.flags.map(flag => FLAG_LABEL[flag] ?? flag),
    citations: result.evidenceIds.map(id => ({ id, passage: evidence.get(id) ?? null })),
  };
}

/** Evaluate the current records. Returns `null` before setup. If the records cannot be evaluated (for example they are
    inconsistent), the view says so and tracking keeps working: guidance never blocks logging (F16). */
export function guidanceFor(state: PetalState, evidence: ReadonlyMap<string, Evidence>): GuidanceView | null {
  if (!state.profile || !state.pack) return null;
  try {
    const result = evaluateGuidance({ profile: state.profile, doses: state.doses, events: state.events });
    return describeGuidance(result, state.doses, evidence);
  } catch (error) {
    return {
      status: 'error',
      headline: 'Guidance could not be worked out from these records. Tracking still works.',
      actions: [],
      rule: error instanceof DomainValidationError ? 'records failed validation' : 'unavailable',
      relevantEventCount: 0,
      missing: [],
      flags: [],
      citations: [],
    };
  }
}

