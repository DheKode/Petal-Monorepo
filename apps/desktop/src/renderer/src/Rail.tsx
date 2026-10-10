import { Icon, type IconName } from '@petal/ui/icons';
import symbol from '../../../../../libs/assets/brands/svg/petal-symbol-rose.svg';
import { useIconPlay } from './useIconPlay';

export type Page = 'today' | 'journal' | 'ask' | 'settings';

interface Item {
  page: Page;
  label: string;
  icon: IconName;
}

const MAIN: Item[] = [
  { page: 'today', label: 'Today', icon: 'home' },
  { page: 'journal', label: 'Journal', icon: 'pill' },
  { page: 'ask', label: 'Ask Petal', icon: 'home' },
];
const SETTINGS: Item = { page: 'settings', label: 'Settings', icon: 'settings' };

function RailItem({ item, current, disabled, onGo }: { item: Item; current: boolean; disabled?: boolean; onGo: (page: Page) => void }) {
  const play = useIconPlay(disabled);
  return (
    <li>
      <button
        type="button"
        className="app-rail-item"
        aria-current={current ? 'page' : undefined}
        disabled={disabled}
        onClick={() => { play.icon.current?.startAnimation(); onGo(item.page); }}
        {...play.handlers}
      >
        <Icon ref={play.icon} name={item.icon} />
        <span className="app-rail-label">{item.label}</span>
      </button>
    </li>
  );
}

/** Side navigation. Each destination has a visible text label under its icon; the current page is marked with aria-current. */
export function Rail({ page, hasPack, onGo }: { page: Page; hasPack: boolean; onGo: (page: Page) => void }) {
  return (
    <nav className="app-rail" aria-label="Main">
      <img className="app-rail-logo" src={symbol} alt="Petal" />
      <ul className="app-rail-list">
        {MAIN.map(item => (
          <RailItem key={item.page} item={item} current={page === item.page} disabled={item.page === 'journal' && !hasPack} onGo={onGo} />
        ))}
      </ul>
      <ul className="app-rail-list app-rail-foot">
        <RailItem item={SETTINGS} current={page === 'settings'} onGo={onGo} />
      </ul>
    </nav>
  );
}
