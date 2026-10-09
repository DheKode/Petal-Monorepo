import { useEffect, useRef, useState } from 'react';
import logo from '../../../../../libs/assets/brands/svg/petal-logo-horizontal-primary.svg';
import type { AppInfo, PetalState } from '../../shared/ipc';
import { Backup } from './Backup';
import { Chat } from './Chat';
import { Journal } from './Journal';
import { Privacy } from './Privacy';
import { Setup } from './Setup';
import { UsualTime } from './UsualTime';
import { Today } from './Today';
import { ZoneNotice } from './ZoneNotice';

type Page = 'today' | 'journal' | 'ask' | 'settings';

const PAGES: { page: Page; label: string; needsPack: boolean }[] = [
  { page: 'today', label: 'Today', needsPack: false },
  { page: 'journal', label: 'Journal', needsPack: true },
  { page: 'ask', label: 'Ask Petal', needsPack: false },
  { page: 'settings', label: 'Settings', needsPack: false },
];

/* Minimal brand shell (DESIGN.md: desktop side rail with Today, Journal, Ask Petal, Settings). Appearance comes only from
   @petal/ui tokens in shell.css; the fuller redesign in draft #57 can replace this shell. */
export function App() {
  const [state, setState] = useState<PetalState | null>(null);
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [page, setPage] = useState<Page>('today');
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    window.petal.getState().then(setState);
    window.petal.getAppInfo().then(setInfo);
  }, []);

  // Moving between pages puts keyboard and screen-reader focus on the new page's heading.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo({ top: 0 });
    heading.current?.focus();
  }, [page]);

  if (!state) {
    return <div data-petal-ui className="shell-loading"><p>Loading…</p></div>;
  }

  const hasPack = state.pack !== null;
  const shown: Page = PAGES.find(p => p.page === page && (!p.needsPack || hasPack)) ? page : 'today';
  const title = shown === 'today' ? (hasPack ? 'Today' : 'Welcome to Petal') : PAGES.find(p => p.page === shown)!.label;

  return (
    <div data-petal-ui className="shell">
      <nav className="shell-rail" aria-label="Main">
        <img className="shell-logo" src={logo} alt="Petal" />
        <ul>
          {PAGES.map(item => (
            <li key={item.page}>
              <button
                type="button"
                aria-current={shown === item.page ? 'page' : undefined}
                disabled={item.needsPack && !hasPack}
                onClick={() => setPage(item.page)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
        <p className="shell-rail-note">
          {state.persistence === 'memory'
            ? 'Temporary storage: your records are lost when the app closes.'
            : 'Saved on this device only. Not encrypted.'}
        </p>
      </nav>

      <main className="shell-main" aria-labelledby="page-heading">
        <header className="shell-header">
          <h1 id="page-heading" ref={heading} tabIndex={-1}>{title}</h1>
          {shown === 'today' && hasPack && (
            <p className="petal-muted">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          )}
        </header>

        {state.persistence === 'memory' && (
          <p className="shell-notice" data-kind="warning" role="status">Temporary storage: your records are lost when the app closes.</p>
        )}
        {shown !== 'settings' && (
          <p className="shell-notice" role="note">Tracking only. Product details are not verified yet, so Petal shows no guidance.</p>
        )}

        {shown === 'today' && (
          <>
            <ZoneNotice state={state} />
            {hasPack ? <Today state={state} onState={setState} /> : <Setup onSaved={setState} />}
          </>
        )}
        {shown === 'journal' && <Journal state={state} onState={setState} />}
        {shown === 'ask' && <Chat state={state} onState={setState} />}
        {shown === 'settings' && (
          <div className="shell-stack">
            {hasPack && <UsualTime state={state} onState={setState} />}
            <section aria-labelledby="privacy-heading">
              <h2 id="privacy-heading">Privacy</h2>
              <p>
                {state.persistence === 'memory'
                  ? 'Temporary storage: your records are lost when the app closes.'
                  : 'Your records are saved on this device only. They are not encrypted, so anyone who can open your user account can read them.'}
              </p>
              <Privacy info={info} />
            </section>
            <Backup onState={setState} />
            {info && <p className="petal-muted shell-about">Petal {info.appVersion} · {info.platform} · works offline, no account needed</p>}
          </div>
        )}
      </main>
    </div>
  );
}
