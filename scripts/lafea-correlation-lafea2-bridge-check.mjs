import assert from 'node:assert/strict';
import { screeningRequestFixture } from './lafea.2-fixtures.mjs';
import { calculateLocalAttachmentScreening } from '../src/core/local-attachment-screening/index.js';
import {
  calculateLocalAttachmentCorrelation,
  createCorrelationGeometryEvidenceFromLafea2,
  createCorrelationRequestFromLafea2,
  syntheticCorrelationProfile,
  validateCorrelationGeometryEvidence,
} from '../src/core/local-attachment-correlation/index.js';

const screeningRequest = screeningRequestFixture();
const screeningResult = calculateLocalAttachmentScreening(screeningRequest);
assert.equal(screeningResult.qualification.state, 'ACCEPTED');

const geometryEvidence = createCorrelationGeometryEvidenceFromLafea2({
  screeningRequest,
  screeningResult,
  geometryIdentity: 'ATTACHMENT-GEOMETRY-001',
  attachmentDiameter: 250,
  attachmentSourceReference: 'QUALIFICATION_FIXTURE/ATTACHMENT_DIAMETER',
});
assert.equal(geometryEvidence.pipeOutsideDiameter, 1000);
assert.equal(geometryEvidence.pipeThickness, 10);
assert.equal(geometryEvidence.attachmentDiameter, 250);
assert.equal(
  geometryEvidence.sourceEvidenceHash,
  screeningResult.semanticHashes.sourceEvidenceSemanticHash,
);
assert.equal(
  geometryEvidence.foundationModelHash,
  screeningRequest.sourceEvidence.foundationModel.semanticHash,
);
assert.equal(
  geometryEvidence.foundationResultHash,
  screeningRequest.sourceEvidence.foundationResult.semanticHashes.resultPayloadSemanticHash,
);
assert.match(geometryEvidence.semanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.deepEqual(validateCorrelationGeometryEvidence(geometryEvidence), geometryEvidence);

const request = createCorrelationRequestFromLafea2({
  requestIdentity: 'LAFEA2-BRIDGE-CASE-A-L0',
  screeningResult,
  screeningCaseId: 'CASE-A',
  geometryEvidence,
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
assert.equal(request.sourceCustody.geometryEvidenceHash, geometryEvidence.semanticHash);
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
assert.equal(empirical.sourceCustody.geometryEvidenceHash, geometryEvidence.semanticHash);

assert.throws(() => createCorrelationRequestFromLafea2({
  requestIdentity: 'MISSING-LOCATION',
  screeningResult,
  screeningCaseId: 'CASE-A',
  geometryEvidence,
  targetMappings: [{ targetId: 'CROWN_OUTER', evaluationLocationId: 'NOT-PRESENT' }],
}), (error) => error?.code === 'CORRELATION_LAFEA2_POINT_NOT_FOUND');

const tamperedGeometry = structuredClone(geometryEvidence);
tamperedGeometry.attachmentDiameter = 251;
assert.throws(() => validateCorrelationGeometryEvidence(tamperedGeometry),
  (error) => error?.code === 'CORRELATION_GEOMETRY_HASH_MISMATCH');

const forgedRequest = structuredClone(screeningRequest);
forgedRequest.sourceEvidence.foundationModel.modelVersion = 'FORGED';
assert.throws(() => createCorrelationGeometryEvidenceFromLafea2({
  screeningRequest: forgedRequest,
  screeningResult,
  geometryIdentity: 'FORGED-ATTACHMENT-GEOMETRY',
  attachmentDiameter: 250,
  attachmentSourceReference: 'QUALIFICATION_FIXTURE/ATTACHMENT_DIAMETER',
}), (error) => [
  'REQUEST_HASH_MISMATCH',
  'INVALID_FOUNDATION_EVIDENCE',
  'CORRELATION_LAFEA2_REQUEST_RESULT_MISMATCH',
].includes(error?.code));

console.log(JSON.stringify({
  check: 'lafea2-to-local-attachment-correlation-bridge',
  status: 'PASS',
  foundationModelHash: geometryEvidence.foundationModelHash,
  foundationResultHash: geometryEvidence.foundationResultHash,
  geometryEvidenceHash: geometryEvidence.semanticHash,
  sourceCustody: request.sourceCustody,
  geometry: request.geometry,
  loads: request.loads,
  pressureByTarget: request.pressureByTarget,
  syntheticProfileDisposition: empirical.qualification.state,
  rejectedDomain: empirical.diagnostics[0].domain,
  geometryTamperRejected: true,
  screeningRequestForgeryRejected: true,
  extrapolationPerformed: false,
}));

function close(actual, expected, label) {
  const error = Math.abs(actual - expected);
  assert.ok(error <= 1e-10, `${label}: expected ${expected}, received ${actual}, |Δ|=${error}`);
}
