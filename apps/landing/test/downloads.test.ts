import {test} from 'node:test';
import assert from 'node:assert/strict';
import {detectPlatform, downloads} from '../src/downloads';

test('detects each supported platform', () => {
  assert.equal(detectPlatform('Mozilla/5.0 (Linux; Android 14; ANY-LX2) AppleWebKit/537.36'), 'android');
  assert.equal(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'), 'windows');
  assert.equal(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'), 'macos');
});

test('returns null for unsupported or ambiguous platforms', () => {
  assert.equal(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'), null);
  assert.equal(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5), null);
  assert.equal(detectPlatform('Mozilla/5.0 (X11; Linux x86_64)'), null);
});

test('lists exactly the three PRD targets once each', () => {
  assert.deepEqual(downloads.map((d) => d.id).sort(), ['android', 'macos', 'windows']);
});

test('a published download has a real https URL, size and checksum', () => {
  for (const d of downloads) {
    if (d.url === null) continue;
    assert.match(d.url, /^https:\/\//, `${d.id} url`);
    assert.ok(d.sizeLabel, `${d.id} sizeLabel`);
    assert.match(d.sha256 ?? '', /^[0-9a-f]{64}$/, `${d.id} sha256`);
  }
});
