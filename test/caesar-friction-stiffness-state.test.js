import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCaesarFrictionStiffnessState } from '../src/core/fea-benchmarks/caesar-friction-stiffness-state.js';

const BASE = 'a'.repeat(64);
const restraints = Object.freeze([
  Object.freeze({ restraintId: 'R-10', nodeId: '10', frictionStiffnessNPerM: 1e8 }),
  Object.freeze({ restraintId: 'R-20', nodeId: '20', frictionStiffnessNPerM: 1e8 }),
]);

function state(restraintId, activeState, extra = {}) {
  return { restraintId, state: activeState, ...extra };
}

test('STICK to SLIDE changes the nonlinear tangent stiffness hash', () => {
  const allStick = buildCaesarFrictionStiffnessState({
    baseStiffnessStateHash: BASE,
    restraints,
    finalStates: [state('R-10', 'STICK'), state('R-20', 'STICK')],
  });
  const oneSlide = buildCaesarFrictionStiffnessState({
    baseStiffnessStateHash: BASE,
    restraints,
    finalStates: [state('R-10', 'SLIDE'), state('R-20', 'STICK')],
  });

  assert.notEqual(allStick.semanticHash, oneSlide.semanticHash);
  assert.equal(allStick.frictionStates[0].tangentStiffnessNPerM, 1e8);
  assert.equal(oneSlide.frictionStates[0].tangentStiffnessNPerM, 0);
});

test('capped slide force is load-state evidence and does not alter tangent stiffness identity', () => {
  const left = buildCaesarFrictionStiffnessState({
    baseStiffnessStateHash: BASE,
    restraints,
    finalStates: [
      state('R-10', 'SLIDE', { appliedFrictionForce: [100, 0, 0] }),
      state('R-20', 'STICK'),
    ],
  });
  const right = buildCaesarFrictionStiffnessState({
    baseStiffnessStateHash: BASE,
    restraints,
    finalStates: [
      state('R-10', 'SLIDE', { appliedFrictionForce: [500, 0, 0] }),
      state('R-20', 'STICK'),
    ],
  });
  assert.equal(left.semanticHash, right.semanticHash);
});

test('state ordering is canonical by restraint identity', () => {
  const left = buildCaesarFrictionStiffnessState({
    baseStiffnessStateHash: BASE,
    restraints,
    finalStates: [state('R-20', 'STICK'), state('R-10', 'SLIDE')],
  });
  const right = buildCaesarFrictionStiffnessState({
    baseStiffnessStateHash: BASE,
    restraints,
    finalStates: [state('R-10', 'SLIDE'), state('R-20', 'STICK')],
  });
  assert.equal(left.semanticHash, right.semanticHash);
  assert.deepEqual(left.frictionStates.map((entry) => entry.restraintId), ['R-10', 'R-20']);
});

test('incomplete or duplicate final states fail closed', () => {
  assert.throws(
    () => buildCaesarFrictionStiffnessState({
      baseStiffnessStateHash: BASE,
      restraints,
      finalStates: [state('R-10', 'STICK')],
    }),
    /exactly one entry for every friction restraint/,
  );
  assert.throws(
    () => buildCaesarFrictionStiffnessState({
      baseStiffnessStateHash: BASE,
      restraints,
      finalStates: [state('R-10', 'STICK'), state('R-10', 'SLIDE')],
    }),
    /duplicate restraint states/,
  );
});
