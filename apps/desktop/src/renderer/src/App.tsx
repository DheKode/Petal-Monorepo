import { useEffect, useRef, useState } from 'react';
import { Feedback } from '@petal/ui/components';
import type { AppInfo, PetalState } from '../../shared/ipc';
import { Backup } from './Backup';
import { Privacy } from './Privacy';
import { Rail, type Page } from './Rail';
import { Setup } from './Setup';
import { Today } from './Today';

const TITLES: Record<Page, { title: string; subtitle: string }> = {
  today: { title: 'Today', subtitle: '' },
  pack: { title: 'Pack', subtitle: 'Your 28-tablet Trust pack. Choose a tablet to see and record it.' },
  settings: { title: 'Settings', subtitle: 'Privacy, backups and app details.' },
};

// Shell for the desktop screens: a side rail and one page at a time. Appearance comes from @petal/ui tokens and the brand
// assets (see app.css and home.css); do not add raw brand values.
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
    return <main><p>Loading…</p></main>;
  }

  const hasPack = state.pack !== null;
  const shown: Page = page === 'pack' && !hasPack ? 'today' : page;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const { title, subtitle } = shown === 'today'
    ? { title: hasPack ? 'Today' : 'Welcome to Petal', subtitle: hasPack ? today : 'Set up your pack to start recording.' }
    : TITLES[shown];

  return (
    <div data-petal-ui className="app app-shell">
      <Rail page={shown} hasPack={hasPack} onGo={setPage} />
      <main className="app-main" aria-labelledby="page-heading">
        <header className="app-page-header">
          <h1 id="page-heading" ref={heading} tabIndex={-1}>{title}</h1>
          {subtitle && <p className="petal-muted">{subtitle}</p>}
        </header>

        {state.persistence === 'memory' && (
          <Feedback kind="warning" message="Temporary storage: your records are lost when the app closes." />
        )}
        {shown !== 'settings' && (
          <Feedback kind="warning" message="Product details are not verified yet, so Petal is tracking only and shows no guidance." />
        )}

        {shown === 'settings' ? (
          <div className="app-settings">
            <Privacy info={info} />
            <Backup onState={setState} />
            {info && (
              <section className="petal-card" aria-labelledby="about-heading">
                <h2 id="about-heading">About</h2>
                <p>Petal {info.appVersion} on {info.platform}. Works offline; no account needed.</p>
              </section>
            )}
          </div>
        ) : hasPack ? (
          <Today key={shown} state={state} onState={setState} view={shown} />
        ) : (
          <Setup onSaved={setState} />
        )}
      </main>
    </div>
  );
}
