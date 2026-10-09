import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAIN_PACKAGE_VERSION } from '../src/index.js';

test('domain package exposes its version', () => {
  assert.equal(DOMAIN_PACKAGE_VERSION, '0.1.0');
});
