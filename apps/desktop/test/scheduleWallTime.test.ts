import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleWallTime } from '../src/renderer/src/scheduleWallTime';

test('a remembered time is read in the schedule zone, not the device zone', () => {
  assert.deepEqual(scheduleWallTime('2026-10-09T21:00', 'Asia/Manila'), { ok: true, iso: '2026-10-09T21:00:00+08:00' });
  assert.deepEqual(scheduleWallTime('2026-10-09T21:00', 'America/New_York'), { ok: true, iso: '2026-10-09T21:00:00-04:00' });
  assert.deepEqual(scheduleWallTime('2026-10-09T21:00:30', 'Asia/Manila'), { ok: true, iso: '2026-10-09T21:00:00+08:00' }, 'seconds from the input are ignored');
});

test('ordinary times on clock-change days convert with the right offset', () => {
  assert.deepEqual(scheduleWallTime('2026-03-08T21:00', 'America/New_York'), { ok: true, iso: '2026-03-08T21:00:00-04:00' });
  assert.deepEqual(scheduleWallTime('2026-11-01T00:30', 'America/New_York'), { ok: true, iso: '2026-11-01T00:30:00-04:00' });
  assert.deepEqual(scheduleWallTime('2026-11-01T03:00', 'America/New_York'), { ok: true, iso: '2026-11-01T03:00:00-05:00' });
});

test('a time skipped by a clock change is refused rather than shifted', () => {
  assert.deepEqual(scheduleWallTime('2026-03-08T02:30', 'America/New_York'), { ok: false, reason: 'skipped' });
  assert.deepEqual(scheduleWallTime('2026-03-29T01:30', 'Europe/London'), { ok: false, reason: 'skipped' });
});

test('a time that happens twice is refused rather than silently picking one offset', () => {
  assert.deepEqual(scheduleWallTime('2026-11-01T01:30', 'America/New_York'), { ok: false, reason: 'ambiguous' });
  assert.deepEqual(scheduleWallTime('2026-10-25T01:30', 'Europe/London'), { ok: false, reason: 'ambiguous' });
});

test('malformed values are refused', () => {
  for (const value of ['', '2026-10-09', '2026-02-30T21:00', '2026-10-09T24:00', '2026-10-09 21:00', 'yesterday'])
    assert.equal(scheduleWallTime(value, 'Asia/Manila').ok, false, value);
});
