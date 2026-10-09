import { useEffect, useState } from 'react';
import type { AppInfo, PetalState } from '../../shared/ipc';
import { Backup } from './Backup';
import { Privacy } from './Privacy';
import { Feedback } from '@petal/ui/components';
import logo from '../../../../../libs/assets/brands/svg/petal-logo-horizontal-primary.svg';
import { Setup } from './Setup';
import { Today } from './Today';

// Shell for the desktop screens. Appearance comes from @petal/ui tokens and the brand assets (see app.css); do not add raw brand values.
export function App() {
  const [state, setState] = useState<PetalState | null>(null);
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    window.petal.getState().then(setState);
    window.petal.getAppInfo().then(setInfo);
  }, []);

  if (!state) {
    return <main><p>Loading…</p></main>;
  }

  return (
    <main data-petal-ui className="app">
      <header className="app-header">
        <h1>
          <img className="app-logo" src={logo} alt="Petal" />
        </h1>
      </header>
      <div className="app-notes">
        {state.persistence === 'memory' ? (
          <Feedback kind="warning" message="Temporary storage: your records are lost when the app closes." />
        ) : (
          <p className="petal-muted">Your records are saved on this device only. They are not encrypted, so anyone who can open your user account can read them.</p>
        )}
        <Feedback kind="warning" message="Product details are not verified yet, so Petal is tracking only and shows no guidance." />
      </div>
      <Privacy info={info} />
      {state.pack ? <Today state={state} onState={setState} /> : <Setup onSaved={setState} />}
      <Backup onState={setState} />
      {info && <footer className="app-footer">Petal {info.appVersion} · {info.platform}</footer>}
    </main>
  );
}
