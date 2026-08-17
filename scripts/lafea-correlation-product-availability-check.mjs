import assert from 'node:assert/strict';
import {
  LAFEA_ENGINEERING_CORRELATION_REGISTRY,
  lafeaCorrelationProductAvailability,
} from '../src/workspace/lafea-correlation-product.js';

assert.deepEqual(LAFEA_ENGINEERING_CORRELATION_REGISTRY.profiles, []);
assert.deepEqual(LAFEA_ENGINEERING_CORRELATION_REGISTRY.qualificationRecords, []);

const before = lafeaCorrelationProductAvailability({
  stageId: 'LAFEA.2',
  execution: null,
});
assert.equal(before.state, 'BLOCKED');
assert.equal(before.registeredMethodCount, 0);
assert.deepEqual(before.methods, []);
assert.deepEqual(before.reasons, [
  'NO_ENGINEERING_CORRELATION_PROFILE_REGISTERED',
  'QUALIFIED_LAFEA2_RESULT_REQUIRED',
]);
assert.equal(before.sourceEvidence.screeningResultPayloadSemanticHash, null);
assert.equal(before.nextRequiredInput, null);

const retainedHash = 'fnv1a64:0123456789abcdef';
const after = lafeaCorrelationProductAvailability({
  stageId: 'LAFEA.2',
  execution: {
    status: 'QUALIFIED',
    result: {
      qualification: { state: 'ACCEPTED' },
      semanticHashes: { screeningResultPayloadSemanticHash: retainedHash },
    },
  },
});
assert.equal(after.state, 'BLOCKED');
assert.equal(after.registeredMethodCount, 0);
assert.deepEqual(after.reasons, ['NO_ENGINEERING_CORRELATION_PROFILE_REGISTERED']);
assert.equal(after.sourceEvidence.screeningResultStatus, 'QUALIFIED');
assert.equal(after.sourceEvidence.screeningResultQualification, 'ACCEPTED');
assert.equal(after.sourceEvidence.screeningResultPayloadSemanticHash, retainedHash);
assert.equal(after.nextRequiredInput, null);

assert.throws(
  () => lafeaCorrelationProductAvailability({ stageId: 'LAFEA.1' }),
  /LAFEA_CORRELATION_PRODUCT_STAGE_MUST_BE_LAFEA2/u,
);

console.log(JSON.stringify({
  check: 'lafea2-correlation-product-availability',
  status: 'PASS',
  registeredEngineeringMethods: after.registeredMethodCount,
  preRunBlockers: before.reasons,
  postRunBlockers: after.reasons,
  retainedLafea2ResultHash: after.sourceEvidence.screeningResultPayloadSemanticHash,
  syntheticEngineeringMethodExposed: false,
}));
