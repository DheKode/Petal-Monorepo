import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BleedingEntry } from '@petal/domain';
import { dateRangeLabel, entrySummary, intensityLabel, sortJournal, CATEGORY_LABEL, INTENSITY_LABEL } from '../src/renderer/src/journalView';

const entry = (id: string, startDate: string, extra: Partial<BleedingEntry> = {}): BleedingEntry => ({
  id, startDate, endDate: null, category: 'bleeding', intensity: null, note: null, ...extra,
});

test('the journal is shown newest first, with a stable order for ties', () => {
  const sorted = sortJournal([
    entry('a', '2026-10-01'), entry('c', '2026-10-05'), entry('b', '2026-10-05'), entry('d', '2026-10-05', { endDate: '2026-10-07' }), entry('e', '2026-09-20'),
  ]);
  assert.deepEqual(sorted.map(e => e.id), ['d', 'b', 'c', 'a', 'e']);
  const input = [entry('x', '2026-10-01'), entry('y', '2026-10-02')];
  sortJournal(input);
  assert.deepEqual(input.map(e => e.id), ['x', 'y'], 'sorting never changes the stored order');
});

test('date ranges are described without implying an end date', () => {
  assert.equal(dateRangeLabel(entry('a', '2026-10-05')), '2026-10-05, no end date recorded');
  assert.equal(dateRangeLabel(entry('a', '2026-10-05', { endDate: '2026-10-05' })), '2026-10-05');
  assert.equal(dateRangeLabel(entry('a', '2026-10-05', { endDate: '2026-10-07' })), '2026-10-05 to 2026-10-07');
});

test('labels are plain, and an unset intensity is "Not recorded" rather than a guess', () => {
  assert.equal(intensityLabel(entry('a', '2026-10-05')), 'Not recorded');
  assert.equal(intensityLabel(entry('a', '2026-10-05', { intensity: 'moderate' })), 'Moderate');
  assert.equal(entrySummary(entry('a', '2026-10-05', { category: 'spotting', endDate: '2026-10-06' })), 'Spotting, 2026-10-05 to 2026-10-06');
  const words = [...Object.values(CATEGORY_LABEL), ...Object.values(INTENSITY_LABEL)].join(' ');
  assert.doesNotMatch(words, /fertil|ovulat|period|cycle|normal|abnormal|irregular|expected|predict/i, 'no interpretation in the labels');
});
