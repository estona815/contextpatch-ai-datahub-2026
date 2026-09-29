import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreStoredValue } from '../src/shared/storage.ts';

const initial = { name: 'example' };
const valid = (value) => Boolean(value && typeof value.name === 'string');
test('saved valid module input survives restoration', () => {
  assert.deepEqual(restoreStoredValue('{"name":"edited"}', initial, valid), {
    name: 'edited',
  });
});
test('invalid JSON or invalid module schema restores the known example', () => {
  for (const raw of ['{', '{"name":4}', 'null', null])
    assert.equal(restoreStoredValue(raw, initial, valid), initial);
});
test('valid-looking saved input with 8000-level extra data cannot reach recursive module code', () => {
  const raw =
    '{"name":"edited","extra":' +
    '['.repeat(8000) +
    '0' +
    ']'.repeat(8000) +
    '}';
  assert.equal(restoreStoredValue(raw, initial, valid), initial);
});
test('excessive saved node count and byte length restore without calling module validators', () => {
  const raw = JSON.stringify({ name: 'edited', extra: Array(20_001).fill(0) });
  let calls = 0;
  const validator = () => {
    calls++;
    return true;
  };
  assert.equal(restoreStoredValue(raw, initial, validator), initial);
  assert.equal(
    restoreStoredValue(' '.repeat(1_200_001), initial, validator),
    initial,
  );
  assert.equal(calls, 0);
});
