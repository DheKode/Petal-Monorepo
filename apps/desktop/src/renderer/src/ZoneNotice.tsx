import type { PetalState } from '../../shared/ipc';
import { zoneNoticeText } from './zoneNoticeText';

// Functional markup only; visual design belongs to the designer (#11).
export function ZoneNotice({ state }: { state: PetalState }) {
  const text = zoneNoticeText(state.settings?.timeZone, Intl.DateTimeFormat().resolvedOptions().timeZone, new Date());
  return text ? <p role="status">{text}</p> : null;
}
