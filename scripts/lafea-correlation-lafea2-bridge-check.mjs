import assert from 'node:assert/strict';
import { screeningRequestFixture } from './lafea.2-fixtures.mjs';
import { calculateLocalAttachmentScreening } from '../src/core/local-attachment-screening/index.js';
import {
  calculateLocalAttachmentCorrelation,
  createCorrelationRequestFromLafea2,
  syntheticCorrelationProfile,
} from '../src/core/local-attachment-correlation/index.js';

const screeningResult = calculateLocalAttachmentScreening(screeningRequestFixture());
assert.equal(screeningResult.qualification.state, 'ACCEPTED');

const request = createCorrelationRequestFromLafea2({
  requestIdentity: 'LAFEA2-BRIDGE-CASE-A-L0',
  screeningResult,
  screeningCaseId: 'CASE-A',
  attachmentDiameter: 250,
  targetMappings: [{ targetId: 'CROWN_OUTER', evaluationLocationId: 'L0' }],
});

assert.deepEqual(request.geometry, {
  pipeOutsideDiameter: 1000,
  pipeThickness: 10,
  attachmentDiameter: 250,
});
assert.deepEqual(request.loads, {
  FX: 1000, FY: 100, FZ: -50,
  MX: 5000, MY: 20000, MZ: -10000,
});
const pressure = request.pressureByTarget[0];
close(pressure.SIGMA_X, 48.505050505050505, 'CASE-A/L0 axial pressure stress');
close(pressure.SIGMA_THETA, 97.01010101010101, 'CASE-A/L0 hoop pressure stress');
close(pressure.SIGMA_R, 0, 'CASE-A/L0 radial pressure stress');
close(pressure.TAU_XTHETA, 0, 'CASE-A/L0 pressure shear');
assert.equal(request.sourceCustody.authorityType, 'LAFEA2_RETAINED_RESULT');
assert.equal(request.sourceCustody.sourceStageId, 'LAFEA.2');
assert.equal(request.sourceCustody.screeningCaseId, 'CASE-A');
assert.equal(
  request.sourceCustody.sourceRequestHash,
  screeningResult.semanticHashes.screeningRequestSemanticHash,
);
assert.equal(
  request.sourceCustody.sourceResultHash,
  screeningResult.semanticHashes.screeningResultPayloadSemanticHash,
);
assert.deepEqual(request.sourceCustody.targetMappings, [
  { targetId: 'CROWN_OUTER', evaluationLocationId: 'L0' },
]);

const empirical = calculateLocalAttachmentCorrelation(request, syntheticCorrelationProfile());
assert.equal(empirical.qualification.state, 'OUTSIDE_DOMAIN');
assert.equal(empirical.qualification.engineeringUseAuthorized, false);
assert.equal(empirical.diagnostics[0].code, 'OUTSIDE_CORRELATION_DOMAIN');
assert.deepEqual(empirical.diagnostics[0].domain, { minimum: 20, maximum: 40, value: 100 });
assert.equal(empirical.targetResults.length, 0);
assert.equal(empirical.sourceCustody.sourceResultHash, request.sourceCustody.sourceResultHash);

assert.throws(() => createCorrelationRequestFromLafea2({
  requestIdentity: 'MISSING-LOCATION',
  screeningResult,
  screeningCaseId: 'CASE-A',
  attachmentDiameter: 250,
  targetMappings: [{ targetId: 'CROWN_OUTER', evaluationLocationId: 'NOT-PRESENT' }],
}), (error) => error?.code === 'CORRELATION_LAFEA2_POINT_NOT_FOUND');

console.log(JSON.stringify({
  check: 'lafea2-to-local-attachment-correlation-bridge',
  status: 'PASS',
  sourceCustody: request.sourceCustody,
  geometry: request.geometry,
  loads: request.loads,
  pressureByTarget: request.pressureByTarget,
  syntheticProfileDisposition: empirical.qualification.state,
  rejectedDomain: empirical.diagnostics[0].domain,
  extrapolationPerformed: false,
}));

function close(actual, expected, label) {
  const error = Math.abs(actual - expected);
  assert.ok(error <= 1e-10, `${label}: expected ${expected}, received ${actual}, |Δ|=${error}`);
}
