import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bleedingOn, monthCells, shiftMonth } from '../src/renderer/src/calendarView';

test('month grid preserves leap days and weekday alignment', () => {
  const cells = monthCells('2024-02');
  assert.equal(cells[4], '2024-02-01');
  assert.equal(cells.filter(Boolean).length, 29);
  assert.equal(cells.length % 7, 0);
  assert.equal(monthCells('2026-02').filter(Boolean).length, 28);
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
});

test('bleeding ranges cross months inclusively without inventing unknown ends', () => {
  const entries = [
    { id: 'range', startDate: '2026-09-29', endDate: '2026-10-02', category: 'bleeding' as const, intensity: null, note: null },
    { id: 'unknown', startDate: '2026-10-01', endDate: null, category: 'spotting' as const, intensity: null, note: null },
  ];
  assert.deepEqual(bleedingOn(entries, '2026-10-01').map(entry => entry.id), ['range', 'unknown']);
  assert.deepEqual(bleedingOn(entries, '2026-10-02').map(entry => entry.id), ['range']);
  assert.deepEqual(bleedingOn(entries, '2026-10-03'), []);
});
