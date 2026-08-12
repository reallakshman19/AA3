import assert from 'node:assert/strict';

import {
  CAESAR_FRICTION_EVIDENCE_REPLAY_STATUS,
  replayCaesarFrictionMicroModelEvidence,
  summarizeIndependentSlidePlateauEvidence,
} from '../src/core/nonlinear-restraint-friction/caesar-friction-evidence-measurement-replay.js';

function evidence(runId, normalReactionN, frictionReactionN, shaChar) {
  return {
    experimentId: 'MM2_SLIDE_PLATEAU',
    runId,
    source: { provenanceClass: 'INDEPENDENT_MICRO_MODEL', benchmarkId: runId },
    product: { name: 'CAESAR II', version: '14.00.00.0910', build: '231113' },
    inputCustody: { fileName: `${runId}._A`, sha256: shaChar.repeat(64) },
    configuration: {
      coefficientOfFriction: 0.3,
      frictionMultiplier: 1,
      frictionStiffnessNPerM: 100_000_000,
      normalUnit: [0, 1, 0],
    },
    finalOutput: {
      displacementM: [0.001, 0, 0],
      restraintReactionN: [-frictionReactionN, normalReactionN, 0],
      globalEquilibriumPassed: true,
    },
  };
}

const one = evidence('MM-PLATEAU-A', 1000, 300, 'a');
const replay = replayCaesarFrictionMicroModelEvidence(one);
assert.equal(replay.status, CAESAR_FRICTION_EVIDENCE_REPLAY_STATUS.MEASURED_DIAGNOSTIC);
assert.equal(replay.measurement.frictionLimitRatio, 1);
assert.equal(replay.authority.productionMechanicsAuthorized, false);
assert.equal(replay.authority.slideMultiplierAuthorized, false);

const bad = replayCaesarFrictionMicroModelEvidence({
  ...one,
  source: { provenanceClass: 'INDEPENDENT_MICRO_MODEL', benchmarkId: 'BM4_L' },
});
assert.equal(bad.status, CAESAR_FRICTION_EVIDENCE_REPLAY_STATUS.BLOCKED_EVIDENCE);
assert.equal(bad.measurement, null);

const series = summarizeIndependentSlidePlateauEvidence([
  one,
  evidence('MM-PLATEAU-B', 1500, 450, 'b'),
  evidence('MM-PLATEAU-C', 2200, 660, 'c'),
]);
assert.equal(series.status, CAESAR_FRICTION_EVIDENCE_REPLAY_STATUS.MEASURED_DIAGNOSTIC);
assert.equal(series.runCount, 3);
assert.equal(series.usableRunCount, 3);
assert.equal(series.distinctInputCount, 3);
assert.equal(series.distinctNormalForceCount, 3);
assert.equal(series.repetitionDiagnostics.atLeastThreeIndependentInputs, true);
assert.equal(series.repetitionDiagnostics.atLeastThreeDistinctNormalForces, true);
assert.equal(series.frictionLimitRatio.minimum, 1);
assert.equal(series.frictionLimitRatio.maximum, 1);
assert.equal(series.frictionLimitRatio.mean, 1);
assert.equal(series.frictionLimitRatio.range, 0);
assert.equal(series.authority.slideMultiplierAuthorized, false);

const mixed = summarizeIndependentSlidePlateauEvidence([
  one,
  { ...evidence('MM-WRONG', 1200, 360, 'd'), experimentId: 'MM1_STICK_STIFFNESS' },
]);
assert.equal(mixed.status, CAESAR_FRICTION_EVIDENCE_REPLAY_STATUS.BLOCKED_EVIDENCE);
assert.ok(mixed.blockerCodes.includes('MM2_SLIDE_PLATEAU_EVIDENCE_ONLY'));

console.log('PASS M047 friction evidence measurement replay');
