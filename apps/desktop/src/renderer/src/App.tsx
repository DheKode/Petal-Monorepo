import { useEffect, useState } from 'react';
import type { AppInfo, PetalState } from '../../shared/ipc';
import { Backup } from './Backup';
import { Setup } from './Setup';
import { Today } from './Today';

// Functional screens only. Visual direction belongs to the designer (#11); do not add styling decisions here.
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
    <main>
      <h1>Petal</h1>
      {state.persistence === 'memory' ? (
        <p role="status">Temporary storage: your records are lost when the app closes.</p>
      ) : (
        <p role="status">Your records are saved on this device only. They are not encrypted, so anyone who can open your user account can read them.</p>
      )}
      <p>Product details are not verified yet, so Petal is tracking only and shows no guidance.</p>
      {state.pack ? <Today state={state} onState={setState} /> : <Setup onSaved={setState} />}
      <Backup onState={setState} />
      {info && <footer><small>Petal {info.appVersion} · {info.platform}</small></footer>}
    </main>
  );
}
