import test from 'node:test';
import assert from 'node:assert/strict';
import { runDeterministicCaesarFrictionActiveSet } from '../src/core/fea-benchmarks/caesar-friction-active-set.js';

const profile = {
  schema: 'caesar-friction-solver-profile/v1',
  displacementUpdateNorm: 1e-9,
  reactionUpdateNorm: 1e-6,
  capResidualN: 1e-6,
  stickResidualN: 1e-6,
  slideResidualN: 1e-6,
  assemblyLoadResidualN: 1e-6,
  directionCosineTolerance: 1e-9,
  equilibriumForceN: 5,
  equilibriumMomentNm: 0.5,
};

test('stable slide re-solves when recovered cap changes the assembled friction load', () => {
  const calls = [];
  const run = runDeterministicCaesarFrictionActiveSet({
    profile,
    maximumIterations: 4,
    restraints: [{
      restraintId: 'R1',
      normalDirection: [0, 1, 0],
      effectiveCoefficient: 0.3,
      frictionStiffnessNPerM: 1e8,
    }],
    solveIteration: ({ iteration, assemblyTerms }) => {
      calls.push(assemblyTerms[0]);
      return {
        relativeTangentialDisplacements: { R1: [1e-4, 0, 0] },
        normalReactions: { R1: iteration === 1 ? 1000 : 1100 },
        displacementUpdateNorm: iteration === 1 ? 1 : 0,
        reactionUpdateNorm: iteration === 1 ? 1 : 0,
        equilibriumForceResidualN: 0,
        equilibriumMomentResidualNm: 0,
      };
    },
  });

  assert.equal(run.status, 'CONVERGED');
  assert.equal(run.iterations, 3);
  assert.deepEqual(calls[1].cappedLoadVectorN, [-300, 0, 0]);
  assert.equal(run.ledger[1].convergence.gates.activeSetStable, true);
  assert.equal(run.ledger[1].convergence.gates.assembledFrictionLoad, false);
  assert.equal(run.ledger[1].convergence.metrics.assemblyLoadResidualN, 30);
  assert.deepEqual(calls[2].cappedLoadVectorN, [-330, 0, 0]);
  assert.equal(run.ledger[2].convergence.gates.assembledFrictionLoad, true);
  assert.equal(run.ledger[2].convergence.metrics.assemblyLoadResidualN, 0);
});