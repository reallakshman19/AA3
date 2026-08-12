import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCaesarFrictionTangentialTranslationVector,
  normalizedCaesarFrictionTranslationUpdate,
} from '../src/core/fea-benchmarks/caesar-friction-convergence-metrics.js';

const restraints = Object.freeze([
  Object.freeze({ restraintId: 'Y-10', normalDirection: [0, 1, 0] }),
  Object.freeze({ restraintId: 'Z-20', normalDirection: [0, 0, -1] }),
]);

test('projects only translational motion into each friction tangent plane', () => {
  const vector = buildCaesarFrictionTangentialTranslationVector(restraints, {
    'Y-10': [0.001, 0.009, -0.002],
    'Z-20': [0.004, -0.005, 0.011],
  });
  assert.deepEqual(vector, [0.001, 0, -0.002, 0.004, -0.005, 0]);
});

test('normal support compression does not pollute tangential displacement convergence', () => {
  const first = buildCaesarFrictionTangentialTranslationVector([
    { restraintId: 'Y-10', normalDirection: [0, 1, 0] },
  ], { 'Y-10': [0.001, -0.1, 0.002] });
  const second = buildCaesarFrictionTangentialTranslationVector([
    { restraintId: 'Y-10', normalDirection: [0, 1, 0] },
  ], { 'Y-10': [0.001, -0.3, 0.002] });
  assert.equal(normalizedCaesarFrictionTranslationUpdate(second, first), 0);
});

test('the convergence update is metre-only and has no rotation input channel', () => {
  const previous = [0.001, 0, 0.002];
  const current = [0.001000001, 0, 0.002];
  const update = normalizedCaesarFrictionTranslationUpdate(current, previous);
  assert.ok(Math.abs(update - 1e-9) < 1e-15);
});

test('invalid dimensions fail closed', () => {
  assert.throws(
    () => buildCaesarFrictionTangentialTranslationVector(
      [{ restraintId: 'Y-10', normalDirection: [0, 1, 0] }],
      { 'Y-10': [0.1, 0.2] },
    ),
    /exactly three translations/,
  );
  assert.throws(
    () => normalizedCaesarFrictionTranslationUpdate([0.1], [0.1, 0.2]),
    /same length/,
  );
});
