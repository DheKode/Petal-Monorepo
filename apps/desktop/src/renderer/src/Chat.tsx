import { useEffect, useRef, useState } from 'react';
import type { AiAnswer, AiModelInfo, AiPreview } from '../../shared/ai';
import type { PetalState } from '../../shared/ipc';
import { statusLabel } from './format';
import { scheduleWallTime } from './scheduleWallTime';

type RememberedStatus = 'taken' | 'confirmed-missed' | 'unsure';

const WALL_TIME_ERRORS = {
  invalid: 'Enter a valid date and time. Nothing was saved.',
  skipped: 'That time did not exist in your schedule’s time zone because the clocks moved forward. Choose another time, or leave it blank if you are not sure. Nothing was saved.',
  ambiguous: 'That time happened twice in your schedule’s time zone because the clocks moved back. Choose a time just before or after, or leave it blank if you are not sure. Nothing was saved.',
};

/** Ask Petal (#9). Functional screen using existing control classes; the visual direction and its final place in the
    redesigned navigation (Ask Petal destination, #57) belong to the designer and desktop owner. */
export function Chat({ state, onState }: { state: PetalState; onState: (state: PetalState) => void }) {
  const [question, setQuestion] = useState('');
  const [doseId, setDoseId] = useState('');
  const [model, setModel] = useState<AiModelInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ question: string; answer: AiAnswer }[]>([]);
  const [status, setStatus] = useState<RememberedStatus>('unsure');
  const [at, setAt] = useState('');
  const [preview, setPreview] = useState<AiPreview | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const mounted = useRef(true);
  const pendingToken = useRef<string | null>(null);
  // True only while this screen's own question is being answered.
  const asking = useRef(false);

  useEffect(() => {
    mounted.current = true;
    window.petal.getAiModelInfo()
      .then(info => { if (mounted.current) setModel(info); })
      .catch(() => { if (mounted.current) setError('Model status is unavailable. You can still track tablets.'); });
    return () => {
      // The conversation is transient: leaving the screen cancels this screen's answer and any unconfirmed proposal.
      // Only cancel when this screen asked something, so leaving it never interrupts a request it did not start.
      mounted.current = false;
      if (asking.current) void window.petal.cancelAi().catch(() => {});
      if (pendingToken.current) void window.petal.discardAiCorrection(pendingToken.current).catch(() => {});
    };
  }, []);

  async function pickModel() {
    setSelecting(true);
    setError(null);
    try {
      const result = await window.petal.pickAiModel();
      if (!mounted.current) return;
      if (result.ok) setModel(result.value);
      else setError(result.message);
    } catch {
      if (mounted.current) setError('Model setup did not finish. Tracking is still available.');
    } finally {
      if (mounted.current) setSelecting(false);
    }
  }

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (busy || selecting) return;
    setBusy(true);
    setError(null);
    const submitted = question.trim();
    asking.current = true;
    try {
      const result = await window.petal.askAi({ question: submitted, discussedDoseId: doseId || null });
      if (!mounted.current) return;
      if (result.ok) {
        setMessages(previous => [...previous, { question: submitted, answer: result.value }].slice(-8));
        setQuestion('');
      } else {
        setError(result.message);
      }
    } catch {
      if (mounted.current) setError('The answer did not finish. Your records were not changed.');
    } finally {
      asking.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function cancelAnswer() {
    try {
      await window.petal.cancelAi();
    } catch {
      setError('Cancellation could not be requested. Chat never saves anything by itself.');
    }
  }

  async function showPreview(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    setNotice('');
    // A remembered time is entered in the schedule's zone and is always approximate; blank means unknown.
    let actualAt: string | null = null;
    if (status === 'taken' && at) {
      const zone = state.settings?.timeZone;
      if (!zone) {
        setError('Finish setup before recording a time.');
        return;
      }
      const converted = scheduleWallTime(at, zone);
      if (!converted.ok) {
        setError(WALL_TIME_ERRORS[converted.reason]);
        return;
      }
      actualAt = converted.iso;
    }
    setSaving(true);
    try {
      const result = await window.petal.previewAiCorrection({ doseId, status, actualAt, timePrecision: actualAt ? 'approximate' : 'unknown' });
      if (!mounted.current) return;
      if (result.ok) {
        pendingToken.current = result.value.token;
        setPreview(result.value);
      } else {
        setError(result.message);
      }
    } catch {
      if (mounted.current) setError('This correction could not be previewed. Nothing was saved.');
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  async function confirm() {
    if (!preview || saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = await window.petal.confirmAiCorrection(preview.token);
      if (!mounted.current) return;
      pendingToken.current = null;
      setPreview(null);
      if (result.ok) {
        onState(result.value.state);
        setNotice('Saved the reviewed correction. Petal has recalculated from the updated records.');
        setMessages([]);
      } else {
        setError(result.message);
      }
    } catch {
      if (mounted.current) setError('Could not confirm the correction. Check the current records before trying again.');
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  async function discard() {
    if (!preview || saving) return;
    setSaving(true);
    try {
      const result = await window.petal.discardAiCorrection(preview.token);
      if (!mounted.current) return;
      if (result.ok) {
        pendingToken.current = null;
        setPreview(null);
        setNotice('Cancelled the proposal. Your records were not changed.');
      } else {
        setError(result.message);
      }
    } catch {
      if (mounted.current) setError('Could not dismiss the preview. Nothing is saved without confirmation.');
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  const previewDose = preview ? state.doses.find(d => d.id === preview.doseId) : undefined;

  return (
    <section aria-labelledby="ask-petal-heading">
      <h2 id="ask-petal-heading">Ask Petal</h2>
      <p>Check recorded history, review a correction, or read supported FAQs. Medical guidance is unavailable while Trust evidence awaits review. This conversation is kept only while this screen is open.</p>
      <p>{model?.message ?? 'Checking local model setup…'}</p>
      {model && <small>{model.title}</small>}
      <p>
        <button type="button" className="petal-button" data-variant="secondary" onClick={pickModel} disabled={busy || selecting}>
          {selecting ? 'Verifying file…' : 'Choose downloaded Gemma model'}
        </button>
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}

      <ol aria-label="Conversation">
        {messages.map((message, index) => (
          <li key={index}>
            <p><strong>You:</strong> {message.question}</p>
            <p><strong>Petal:</strong> {message.answer.text}</p>
            <small>{message.answer.fallback ? 'Fixed response: the local model was unavailable or its answer was rejected.' : 'Checked local Gemma response.'}</small>
            {message.answer.citations.map(source => (
              <details key={source.id}>
                <summary>Based on {source.publisher}: {source.title}</summary>
                <blockquote>{source.excerpt}</blockquote>
                <p>{source.sectionOrPage} · {source.reviewStatus} · version {source.version} · retrieved {source.retrievalDate}</p>
                <p>Online source (requires internet): {source.url}</p>
              </details>
            ))}
          </li>
        ))}
      </ol>

      <form onSubmit={ask}>
        {state.pack && (
          <p>
            <label>Tablet to discuss or correct{' '}
              <select value={doseId} onChange={event => setDoseId(event.target.value)} disabled={busy || !!preview || saving}>
                <option value="">Choose a tablet when needed</option>
                {state.doses.map(d => <option key={d.id} value={d.id}>Tablet {d.position} · {d.localDate}</option>)}
              </select>
            </label>
          </p>
        )}
        <p>
          <label>Your question{' '}
            <textarea className="petal-input" value={question} onChange={event => setQuestion(event.target.value)} maxLength={4000} required disabled={busy} />
          </label>
        </p>
        <button type="submit" className="petal-button" disabled={busy || selecting || !question.trim()}>Ask Petal</button>{' '}
        {busy && <><span role="status">Preparing a checked local answer…</span>{' '}<button type="button" onClick={cancelAnswer}>Cancel answer</button></>}
      </form>

      {state.pack && (
        <details>
          <summary>Review a record correction</summary>
          <p>Choose the tablet above and record only what you remember. Chat text never saves a correction.</p>
          {preview ? (
            <div aria-label="Proposed change">
              <h3>Proposed change: tablet {preview.position} · {preview.date}</h3>
              <p>Before: {previewDose ? statusLabel(previewDose, preview.before ?? undefined) : 'see the current pack'}.</p>
              <p>After: {previewDose ? statusLabel(previewDose, preview.after) : preview.after.status}. Time taken: {preview.after.actualAt ?? 'unknown'} ({preview.after.timePrecision}).</p>
              <p>Nothing is saved until you confirm.</p>
              <button type="button" className="petal-button" onClick={confirm} disabled={saving}>Confirm change</button>{' '}
              <button type="button" onClick={discard} disabled={saving}>Cancel proposal</button>
            </div>
          ) : (
            <form onSubmit={showPreview}>
              <p>
                <label>Remembered state{' '}
                  <select value={status} onChange={event => setStatus(event.target.value as RememberedStatus)} disabled={saving}>
                    <option value="unsure">Unsure</option>
                    <option value="taken">Taken</option>
                    <option value="confirmed-missed">Confirmed missed</option>
                  </select>
                </label>
              </p>
              {status === 'taken' && (
                <p>
                  <label>Approximate time ({state.settings?.timeZone}); leave blank if unknown{' '}
                    <input type="datetime-local" value={at} onChange={event => setAt(event.target.value)} disabled={saving} />
                  </label>
                </p>
              )}
              <button type="submit" disabled={!doseId || saving}>Preview correction</button>
            </form>
          )}
        </details>
      )}
    </section>
  );
}
