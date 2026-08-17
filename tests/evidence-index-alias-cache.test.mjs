import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEvidenceIndex,
  findAllIndexedEvidence,
  findFirstIndexedEvidence,
} from '../src/core/shared-piping-model/evidence-index.js';

function countingAlias(text, counter) {
  return {
    toString() {
      counter.calls += 1;
      return text;
    },
  };
}

test('frozen alias arrays normalize once and reuse the cached normalized keys', () => {
  const index = createEvidenceIndex([['attributes', { OD_MM: 168.3, BORE_MM: 150 }]]);
  const counter = { calls: 0 };
  const aliases = Object.freeze([
    countingAlias('OUTSIDE_DIAMETER_MM', counter),
    countingAlias('OD_MM', counter),
  ]);

  const first = findFirstIndexedEvidence(index, aliases);
  assert.equal(first.value, 168.3);
  assert.equal(counter.calls, 2, 'first frozen-array lookup must normalize each alias once');

  const second = findFirstIndexedEvidence(index, aliases);
  assert.equal(second.value, 168.3);
  assert.equal(counter.calls, 2, 'second frozen-array lookup must reuse normalized aliases');

  const all = findAllIndexedEvidence(index, aliases);
  assert.deepEqual(all.map((row) => row.value), [168.3]);
  assert.equal(counter.calls, 2, 'first/all lookup APIs must share the same frozen-array alias cache');
});

test('mutable alias arrays are deliberately not cached', () => {
  const index = createEvidenceIndex([['attributes', { OD_MM: 168.3 }]]);
  const counter = { calls: 0 };
  const aliases = [countingAlias('OD_MM', counter)];

  assert.equal(findFirstIndexedEvidence(index, aliases).value, 168.3);
  assert.equal(counter.calls, 1);
  assert.equal(findFirstIndexedEvidence(index, aliases).value, 168.3);
  assert.equal(counter.calls, 2, 'mutable arrays must be renormalized to avoid stale-cache semantics');

  aliases[0] = countingAlias('MISSING_KEY', counter);
  assert.equal(findFirstIndexedEvidence(index, aliases), null);
  assert.equal(counter.calls, 3, 'mutated alias content must be observed immediately');
});

test('alias and root precedence remain unchanged', () => {
  const index = createEvidenceIndex([
    ['sourceAttributes', { OD_MM: 100, OUTSIDE_DIAMETER: 101 }],
    ['attributes', { OD_MM: 200, OUTSIDE_DIAMETER: 201 }],
  ]);

  const aliasFirst = Object.freeze(['OUTSIDE_DIAMETER', 'OD_MM']);
  assert.equal(findFirstIndexedEvidence(index, aliasFirst).value, 101,
    'alias precedence must remain outer loop before root precedence');

  const rootFirst = Object.freeze(['OD_MM']);
  assert.equal(findFirstIndexedEvidence(index, rootFirst).value, 100,
    'within one alias, first root must remain authoritative');

  assert.deepEqual(
    findAllIndexedEvidence(index, Object.freeze(['OD_MM'])).map((row) => row.value),
    [100, 200],
    'findAll must preserve root order',
  );
});
