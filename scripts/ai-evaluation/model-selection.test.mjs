import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {selectModel} from './model-selection.mjs';
test('default family, model filename and integrity hash all select Gemma', () => {
  const m = selectModel({}, '/fictional/models'); assert.equal(m.family, 'gemma3');
  assert.equal(m.model, path.join('/fictional/models', 'gemma-3-1b-it-Q4_K_M.gguf'));
  assert.equal(m.sha256, '8ccc5cd1f1b3602548715ae25a66ed73fd5dc68a210412eea643eb20eb75a135');
});
test('explicit benchmark comparison can still select Qwen', () => assert.equal(selectModel({family: 'qwen3'}, '/fictional/models').family, 'qwen3'));
test('mismatched family/hash and unknown families fail before loading', () => {
  assert.throws(() => selectModel({family: 'gemma3', sha256: selectModel({family: 'qwen3'}).sha256}), /does not match/);
  assert.throws(() => selectModel({family: 'other'}), /Unknown/);
});
