/** A focused UI vocabulary. Status names describe records, never protection. */
export const iconNames = Object.freeze([
  'home', 'calendar', 'clock', 'journal', 'chat', 'check', 'taken', 'unsure',
  'missed', 'no-entry', 'plus', 'edit', 'delete', 'settings', 'reminder',
  'back', 'next', 'previous', 'download', 'upload', 'info', 'warning', 'close', 'pill',
] as const);
export type IconName = typeof iconNames[number];

export const iconLabels: Readonly<Record<IconName, string>> = Object.freeze({
  home: 'Home', calendar: 'Calendar', clock: 'Time', journal: 'Journal', chat: 'Ask Petal',
  check: 'Confirm', taken: 'Taken', unsure: 'Unsure', missed: 'Confirmed missed', 'no-entry': 'No entry',
  plus: 'Add entry', edit: 'Edit', delete: 'Delete', settings: 'Settings', reminder: 'Reminder',
  back: 'Back', next: 'Next', previous: 'Previous', download: 'Export', upload: 'Import',
  info: 'Information', warning: 'Review needed', close: 'Close', pill: 'Pill pack',
});
