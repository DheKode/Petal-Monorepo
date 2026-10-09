import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zoneNoticeText } from '../src/renderer/src/zoneNoticeText';

const NOW = new Date('2026-10-10T08:00:00Z');

test('no notice when the computer is in the schedule\'s zone, in a zone with the same offset, or before setup', () => {
  assert.equal(zoneNoticeText('Asia/Manila', 'Asia/Manila', NOW), null);
  assert.equal(zoneNoticeText('Asia/Manila', 'Asia/Singapore', NOW), null, 'same offset right now: nothing to say');
  assert.equal(zoneNoticeText(null, 'Asia/Manila', NOW), null);
  assert.equal(zoneNoticeText(undefined, 'America/New_York', NOW), null);
});

test('a different zone is explained plainly and says the schedule does not move', () => {
  const text = zoneNoticeText('Asia/Manila', 'America/New_York', NOW);
  assert.ok(text);
  assert.match(text, /schedule uses Asia\/Manila/);
  assert.match(text, /computer is set to America\/New_York/);
  assert.match(text, /does not move them/);
});
