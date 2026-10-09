import { applyIntake, DomainValidationError, listUnresolvedDoses, type ScheduledDose } from '@petal/domain';
import type { PetalState, RecordIntakeInput } from '../../shared/ipc';
import { doseLabel, statusLabel } from './format';

/* "Fix my history": a guided way to answer, one tablet at a time, what the user remembers. Answers are only proposals.
   Nothing is written until the user confirms the review, and cancelling changes nothing (F08). This is the deterministic
   half of history repair (TASKS.md A07); a chat can later propose answers into the same review step. */

/** What the user remembers about one tablet. Skipping a tablet is the absence of an answer, not an answer. */
export type Answer =
  | { kind: 'taken-usual' }
  | { kind: 'taken-time'; at: string }
  | { kind: 'taken-unknown' }
  | { kind: 'missed' }
  | { kind: 'unsure' };

export const ANSWER_LABEL: Record<Answer['kind'], string> = {
  'taken-usual': 'Taken, about the usual time',
  'taken-time': 'Taken, and I remember roughly when',
  'taken-unknown': "Taken, but I don't remember the time",
  missed: "I'm sure I missed it",
  unsure: "I'm not sure",
};

/** Tablets that are due and still unknown or unsure, newest first because recent days are easier to remember. */
export function questionsFor(state: PetalState, now: Date): ScheduledDose[] {
  return listUnresolvedDoses(state.doses, state.events, now).reverse();
}

/** The entry an answer stands for. Times given from memory are always stored as approximate, never exact. */
export function toInput(dose: ScheduledDose, answer: Answer): RecordIntakeInput {
  switch (answer.kind) {
    case 'taken-usual':
      return { doseId: dose.id, status: 'taken', actualAt: dose.scheduledAt, timePrecision: 'approximate' };
    case 'taken-time':
      return { doseId: dose.id, status: 'taken', actualAt: answer.at, timePrecision: 'approximate' };
    case 'taken-unknown':
      return { doseId: dose.id, status: 'taken' };
    case 'missed':
      return { doseId: dose.id, status: 'confirmed-missed' };
    case 'unsure':
      return { doseId: dose.id, status: 'unsure' };
  }
}

export interface ProposedChange {
  doseId: string;
  tablet: number;
  label: string;
  before: string;
  after: string;
  input: RecordIntakeInput;
}

export interface Proposal {
  /** Entries that would be created or changed, oldest tablet first. */
  changes: ProposedChange[];
  /** Answers that already match the records and would change nothing. */
  unchanged: number;
  /** Answers that cannot be saved, with the reason (for example a time in the future). */
  problems: { doseId: string; label: string; message: string }[];
}

/** Work out exactly what confirming would do, using the same rules the main process applies when saving. */
export function proposeChanges(state: PetalState, answers: ReadonlyMap<string, Answer>, now: Date): Proposal {
  const proposal: Proposal = { changes: [], unchanged: 0, problems: [] };
  for (const dose of state.doses) {
    const answer = answers.get(dose.id);
    if (!answer) continue;
    const existing = state.events.find(e => e.doseId === dose.id);
    const input = toInput(dose, answer);
    try {
      const { event, change } = applyIntake(dose, existing, { status: input.status, actualAt: input.actualAt, timePrecision: input.timePrecision }, now);
      if (change === 'unchanged') proposal.unchanged += 1;
      else proposal.changes.push({ doseId: dose.id, tablet: dose.position, label: doseLabel(dose), before: statusLabel(dose, existing), after: statusLabel(dose, event), input });
    } catch (error) {
      const message = error instanceof DomainValidationError ? error.issues.map(i => i.message).join('; ') : 'This answer cannot be saved.';
      proposal.problems.push({ doseId: dose.id, label: doseLabel(dose), message });
    }
  }
  return proposal;
}
