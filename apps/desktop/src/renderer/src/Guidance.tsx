import { useMemo } from 'react';
import { createEvidenceIndex, type Evidence } from '@petal/domain';
import approvedEvidence from '@petal/domain/evidence.json';
import type { PetalState } from '../../shared/ipc';
import { guidanceFor } from './guidanceView';

/** Offline citation corpus bundled with the app. If it were ever invalid, citations simply show as not found. */
function loadEvidence(): ReadonlyMap<string, Evidence> {
  try {
    return createEvidenceIndex(approvedEvidence as Evidence[]);
  } catch {
    return new Map();
  }
}
const evidenceIndex = loadEvidence();

// Functional markup only; visual design belongs to the designer (#11).
export function Guidance({ state }: { state: PetalState }) {
  const view = useMemo(() => guidanceFor(state, evidenceIndex), [state]);
  if (!view) return null;

  return (
    <section className="petal-card" aria-labelledby="guidance-heading">
      <h2 id="guidance-heading">Guidance</h2>
      <p>{view.headline}</p>
      {view.actions.length > 0 && (
        <ol aria-label="Fixed actions">
          {view.actions.map(action => <li key={action.id}>{action.text}</li>)}
        </ol>
      )}

      <details>
        <summary>How this was worked out</summary>
        <p>
          Rule: {view.rule}. Based on {view.relevantEventCount} recorded {view.relevantEventCount === 1 ? 'entry' : 'entries'}.
          This is recalculated from your records every time they change.
        </p>
        {view.flags.length > 0 && (
          <ul aria-label="Limits">
            {view.flags.map(flag => <li key={flag}>{flag}</li>)}
          </ul>
        )}

        <h3>Missing information ({view.missing.length})</h3>
        {view.missing.length === 0 ? (
          <p>Nothing is missing.</p>
        ) : (
          <table>
            <caption>Information the guidance would need</caption>
            <thead>
              <tr><th scope="col">About</th><th scope="col">What is missing</th><th scope="col">Why</th></tr>
            </thead>
            <tbody>
              {view.missing.map(fact => (
                <tr key={fact.key}>
                  <th scope="row">{fact.subject}</th>
                  <td>{fact.field}</td>
                  <td>{fact.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3>Sources</h3>
        {view.citations.length === 0 ? (
          <p>No sources are bundled yet. Approved sources will appear here and can be read offline.</p>
        ) : (
          <ul aria-label="Sources">
            {view.citations.map(({ id, passage }) => (
              <li key={id}>
                {passage ? (
                  <>
                    <strong>{passage.title}</strong>, {passage.publisher}, {passage.sectionOrPage}
                    <blockquote>{passage.excerpt}</blockquote>
                    <small>
                      Version {passage.version}, review status: {passage.reviewStatus}, retrieved {passage.retrievalDate}.
                      Online source (needs internet): {passage.url}
                    </small>
                  </>
                ) : (
                  <>Source {id} is not in the bundled sources, so it cannot be shown.</>
                )}
              </li>
            ))}
          </ul>
        )}
      </details>
    </section>
  );
}
