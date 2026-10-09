import { useEffect, useMemo, useRef, useState } from 'react';
import { toZonedIso } from '@petal/domain';
import type { PetalState } from '../../shared/ipc';
import { doseLabel, statusLabel } from './format';
import { ANSWER_LABEL, proposeChanges, questionsFor, type Answer } from './historyRepair';

type Phase = 'questions' | 'review' | 'saving' | 'done';

/** Local date-time text for a `datetime-local` input, in the schedule's own zone. */
function inputValueFor(iso: string, timeZone: string): string {
  return toZonedIso(new Date(iso), timeZone).slice(0, 16);
}

// Functional markup only; visual design belongs to the designer (#11).
export function Repair({ state, onState, onClose }: {
  state: PetalState;
  onState: (state: PetalState) => void;
  /** Called when the user leaves. `message` says what was saved, if anything. */
  onClose: (message?: string) => void;
}) {
  // The tablets to ask about are fixed when the screen opens, so the list does not shift while the user answers.
  const [asked] = useState(() => questionsFor(state, new Date()));
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ReadonlyMap<string, Answer>>(new Map());
  const [phase, setPhase] = useState<Phase>('questions');
  const [error, setError] = useState<string | null>(null);
  const [remembered, setRemembered] = useState(false);
  const [rememberedAt, setRememberedAt] = useState('');
  const [summary, setSummary] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);

  const dose = asked[step];
  const proposal = useMemo(() => proposeChanges(state, answers, new Date()), [state, answers, phase]);

  useEffect(() => {
    heading.current?.focus();
  }, [phase, step]);

  function answer(value: Answer) {
    if (!dose) return;
    setError(null);
    setRemembered(false);
    setAnswers(previous => new Map(previous).set(dose.id, value));
    next();
  }

  function skip() {
    if (!dose) return;
    setError(null);
    setRemembered(false);
    setAnswers(previous => {
      const copy = new Map(previous);
      copy.delete(dose.id);
      return copy;
    });
    next();
  }

  function next() {
    if (step + 1 >= asked.length) setPhase('review');
    else setStep(step + 1);
  }

  function useRememberedTime(event: React.FormEvent) {
    event.preventDefault();
    const when = new Date(rememberedAt);
    if (Number.isNaN(when.getTime())) {
      setError('Enter the date and time you remember.');
      return;
    }
    if (when.getTime() > Date.now()) {
      setError('That time is in the future.');
      return;
    }
    answer({ kind: 'taken-time', at: when.toISOString() });
  }

  async function confirm() {
    setPhase('saving');
    setError(null);
    const result = await window.petal.recordIntakeBatch(proposal.changes.map(change => change.input));
    if (result.ok) {
      onState(result.value.state);
      const { applied, unchanged } = result.value;
      setSummary(`Saved ${applied} change${applied === 1 ? '' : 's'}${unchanged ? `; ${unchanged} already matched your records` : ''}.`);
      setPhase('done');
      return;
    }
    // A failure part-way can leave some entries saved, so show what is stored now before asking the user to try again.
    setError(result.message);
    onState(await window.petal.getState());
    setPhase('review');
  }

  if (asked.length === 0) {
    return (
      <section aria-labelledby="repair-heading">
        <h2 id="repair-heading" ref={heading} tabIndex={-1}>Fix my history</h2>
        <p>Every tablet that is due already has an entry you have confirmed. There is nothing to fix.</p>
        <p><button type="button" onClick={() => onClose()}>Back to Today</button></p>
      </section>
    );
  }

  if (phase === 'done') {
    return (
      <section aria-labelledby="repair-heading">
        <h2 id="repair-heading" ref={heading} tabIndex={-1}>Fix my history</h2>
        <p role="status">{summary}</p>
        <p>To change an entry later, choose that tablet in the pack list.</p>
        <p><button type="button" onClick={() => onClose(summary)}>Back to Today</button></p>
      </section>
    );
  }

  if (phase === 'review' || phase === 'saving') {
    const saving = phase === 'saving';
    return (
      <section aria-labelledby="repair-heading">
        <h2 id="repair-heading" ref={heading} tabIndex={-1}>Review your changes</h2>
        <p><strong>Nothing is saved until you confirm.</strong> Tablets you skipped stay exactly as they are.</p>
        {error && <p role="alert">{error}</p>}
        {proposal.problems.length > 0 && (
          <ul aria-label="Answers that cannot be saved">
            {proposal.problems.map(problem => <li key={problem.doseId}>{problem.label}: {problem.message}</li>)}
          </ul>
        )}
        {proposal.changes.length === 0 ? (
          <p>You have not answered anything that would change your records.</p>
        ) : (
          <table>
            <caption>{proposal.changes.length} change{proposal.changes.length === 1 ? '' : 's'} to save</caption>
            <thead>
              <tr><th scope="col">Tablet</th><th scope="col">Now</th><th scope="col">Will become</th></tr>
            </thead>
            <tbody>
              {proposal.changes.map(change => (
                <tr key={change.doseId}>
                  <th scope="row">{change.label}</th>
                  <td>{change.before}</td>
                  <td>{change.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {proposal.unchanged > 0 && <p>{proposal.unchanged} answer{proposal.unchanged === 1 ? '' : 's'} already match your records and will not change anything.</p>}
        <p>
          <button type="button" onClick={confirm} disabled={saving || proposal.changes.length === 0 || proposal.problems.length > 0}>
            {saving ? 'Saving…' : `Confirm and save ${proposal.changes.length} change${proposal.changes.length === 1 ? '' : 's'}`}
          </button>{' '}
          <button type="button" onClick={() => { setPhase('questions'); setStep(0); }} disabled={saving}>Back to the questions</button>{' '}
          <button type="button" onClick={() => onClose()} disabled={saving}>Cancel and save nothing</button>
        </p>
      </section>
    );
  }

  const current = state.events.find(e => e.doseId === dose.id);
  const chosen = answers.get(dose.id);
  return (
    <section aria-labelledby="repair-heading">
      <h2 id="repair-heading">Fix my history</h2>
      <p role="status">Question {step + 1} of {asked.length}, newest tablet first.</p>
      <h3 ref={heading} tabIndex={-1}>{doseLabel(dose)}</h3>
      <p>Current status: {statusLabel(dose, current)}. What do you remember about this tablet?</p>
      <p>If you do not remember, skip it. Skipping leaves it as it is; Petal never counts unknown history as missed.</p>
      {chosen && <p>Your answer so far: {ANSWER_LABEL[chosen.kind]}. Choose another answer to change it.</p>}
      {error && <p role="alert">{error}</p>}
      <p>
        <button type="button" onClick={() => answer({ kind: 'taken-usual' })}>{ANSWER_LABEL['taken-usual']}</button>{' '}
        <button type="button" onClick={() => { setRemembered(open => !open); setRememberedAt(inputValueFor(dose.scheduledAt, dose.timeZone)); }} aria-expanded={remembered}>{ANSWER_LABEL['taken-time']}</button>{' '}
        <button type="button" onClick={() => answer({ kind: 'taken-unknown' })}>{ANSWER_LABEL['taken-unknown']}</button>{' '}
        <button type="button" onClick={() => answer({ kind: 'missed' })}>{ANSWER_LABEL.missed}</button>{' '}
        <button type="button" onClick={() => answer({ kind: 'unsure' })}>{ANSWER_LABEL.unsure}</button>{' '}
        <button type="button" onClick={skip}>Skip this tablet</button>
      </p>
      {remembered && (
        <form onSubmit={useRememberedTime}>
          <p>
            <label>About when did you take it? <input type="datetime-local" value={rememberedAt} onChange={e => setRememberedAt(e.target.value)} required /></label>
          </p>
          <p><small>This is stored as an approximate time, not an exact one.</small></p>
          <button type="submit">Use this time</button>
        </form>
      )}
      <p>
        <button type="button" onClick={() => { setError(null); setRemembered(false); setStep(Math.max(0, step - 1)); }} disabled={step === 0}>Back</button>{' '}
        <button type="button" onClick={() => setPhase('review')}>Skip the rest and review</button>{' '}
        <button type="button" onClick={() => onClose()}>Cancel and save nothing</button>
      </p>
    </section>
  );
}
