import assert from 'node:assert/strict';
import { sourceFixture } from './lafea.1-fixtures.mjs';
import {
  ACTION_SENSES,
  COORDINATE_SYSTEMS,
  calculateLocalAttachmentFoundation,
  createCanonicalLocalAttachmentFoundationModel,
} from '../src/core/local-stress/index.js';
import {
  ENVELOPE_QUANTITIES,
  QUALIFICATION_PROFILE,
  RADIUS_BASES,
  REQUEST_SCHEMA,
  SECTION_BASIS,
  SOURCE_SCHEMA,
  calculateLocalAttachmentScreening,
  createLocalAttachmentScreeningRequest,
} from '../src/core/local-attachment-screening/index.js';
import {
  calculateLocalAttachmentCorrelation,
  createCorrelationGeometryEvidenceFromLafea2,
  createCorrelationRequestFromLafea2,
  syntheticCorrelationProfile,
} from '../src/core/local-attachment-correlation/index.js';

const pressure = 15 * (150 ** 2 - 140 ** 2) / (140 ** 2);
close(pressure, 2.2193877551020407, 'designed internal pressure');

const foundationSource = sourceFixture((source, ref) => {
  source.pipeGeometry.outsideDiameter.value = 300;
  source.pressureDefinitions.find((row) => row.identity === 'P-CLOSED').internalPressure.value = pressure;
  source.loadCases = [{
    identity: 'LC-SYN',
    sourceCoordinateSystem: COORDINATE_SYSTEMS.PIPE_LOCAL,
    sourceReferencePointIdentity: 'TARGET',
    targetReferencePointIdentity: 'TARGET',
    actionSense: ACTION_SENSES.SUPPORT_ON_PIPE,
    force: { value: [90000, 30000, 60000], sourceRef: ref('loads.LC-SYN.force') },
    moment: { value: [1800000, 9000000, 2700000], sourceRef: ref('loads.LC-SYN.moment') },
  }];
  source.resultRequests.transformedLoadCaseIdentities = ['LC-SYN'];
  source.resultRequests.pressure = [{
    identity: 'PR-SYN',
    pressureDefinitionIdentity: 'P-CLOSED',
    requestedRadii: [140, 145, 150].map((value, index) => ({
      value, sourceRef: ref(`requests.PR-SYN.radius.${index}`),
    })),
    includeAxialPressureStress: true,
    includeThinWallComparison: false,
  }];
});
const foundationModel = createCanonicalLocalAttachmentFoundationModel(foundationSource);
const foundationResult = calculateLocalAttachmentFoundation(foundationModel);
assert.equal(foundationResult.qualification.state, 'ACCEPTED');
const closedPressure = foundationResult.pressureStressResults.find(
  (row) => row.pressureDefinitionIdentity === 'P-CLOSED',
);
const outer = closedPressure.requestedPoints.find((row) => row.radius === 150);
close(closedPressure.axialPressureStress, 15, 'LAFEA.1 exact axial pressure stress');
close(outer.hoopStress, 30, 'LAFEA.1 exact outer hoop pressure stress');
close(outer.radialStress, 0, 'LAFEA.1 exact outer radial pressure stress');

const screeningRequest = createLocalAttachmentScreeningRequest({
  schema: REQUEST_SCHEMA,
  requestIdentity: 'SCREEN-SYNTHETIC-CORRELATION',
  requestVersion: '1',
  sourceEvidence: {
    schema: SOURCE_SCHEMA,
    foundationModel,
    foundationResult,
  },
  sectionBasis: { basis: SECTION_BASIS },
  screeningCases: [{
    screeningCaseId: 'CASE-SYN',
    mechanicalTerms: [{ loadCaseId: 'LC-SYN', factor: 1 }],
    pressureDefinitionId: 'P-CLOSED',
    pressureFactor: 1,
    sourceReference: 'SYNTHETIC-HAND-CALC/CASE-SYN',
  }],
  evaluationLocations: [{
    evaluationLocationId: 'L0',
    radiusBasis: RADIUS_BASES.OUTER_SURFACE,
    explicitRadius: null,
    angle: 0,
    sourceReference: 'SYNTHETIC-HAND-CALC/L0',
  }],
  resultRequests: { envelopeQuantities: [...ENVELOPE_QUANTITIES] },
  qualificationProfile: structuredClone(QUALIFICATION_PROFILE),
  limitations: [],
});
const screeningResult = calculateLocalAttachmentScreening(screeningRequest);
assert.equal(screeningResult.qualification.state, 'ACCEPTED');
const caseSyn = screeningResult.screeningCases.find((row) => row.screeningCaseId === 'CASE-SYN');
assert.deepEqual(caseSyn.combinedForceLocal, [90000, 30000, 60000]);
assert.deepEqual(caseSyn.combinedMomentLocal, [1800000, 9000000, 2700000]);
const point = screeningResult.pointStressStates.find(
  (row) => row.screeningCaseId === 'CASE-SYN' && row.evaluationLocationId === 'L0',
);
close(point.pressureStress.sigmaXPressure, 15, 'LAFEA.2 inherited pressure sigmaX');
close(point.pressureStress.sigmaThetaPressure, 30, 'LAFEA.2 inherited pressure sigmaTheta');
close(point.pressureStress.sigmaRPressure, 0, 'LAFEA.2 inherited pressure sigmaR');

const geometryEvidence = createCorrelationGeometryEvidenceFromLafea2({
  screeningResult,
  geometryIdentity: 'SYNTHETIC-ATTACHMENT-D75',
  attachmentDiameter: 75,
  attachmentSourceReference: 'SYNTHETIC-HAND-CALC/ATTACHMENT-DIAMETER',
});
const correlationRequest = createCorrelationRequestFromLafea2({
  requestIdentity: 'CORRELATION-SYNTHETIC-END-TO-END',
  screeningResult,
  screeningCaseId: 'CASE-SYN',
  geometryEvidence,
  targetMappings: [{ targetId: 'CROWN_OUTER', evaluationLocationId: 'L0' }],
});
assert.deepEqual(correlationRequest.geometry, {
  pipeOutsideDiameter: 300,
  pipeThickness: 10,
  attachmentDiameter: 75,
});
assert.deepEqual(correlationRequest.loads, {
  FX: 90000, FY: 30000, FZ: 60000,
  MX: 1800000, MY: 9000000, MZ: 2700000,
});

const correlation = calculateLocalAttachmentCorrelation(
  correlationRequest,
  syntheticCorrelationProfile(),
);
assert.equal(correlation.qualification.state, 'ACCEPTED');
assert.equal(correlation.qualification.engineeringUseAuthorized, false);
close(correlation.geometryParameters.diameterRatio, 0.25, 'end-to-end d/D');
close(correlation.geometryParameters.diameterThicknessRatio, 30, 'end-to-end D/t');
const crown = correlation.targetResults.find((row) => row.targetId === 'CROWN_OUTER');
close(crown.components.SIGMA_X.totalSurface, 100, 'end-to-end sigmaX');
close(crown.components.SIGMA_THETA.totalSurface, 59, 'end-to-end sigmaTheta');
close(crown.components.SIGMA_R.totalSurface, 0, 'end-to-end sigmaR');
close(crown.components.TAU_XTHETA.totalSurface, 2, 'end-to-end tauXTheta');
close(crown.vonMises, 87.13782186857783, 'end-to-end von Mises');
assert.equal(correlation.sourceCustody.sourceRequestHash,
  screeningResult.semanticHashes.screeningRequestSemanticHash);
assert.equal(correlation.sourceCustody.sourceResultHash,
  screeningResult.semanticHashes.screeningResultPayloadSemanticHash);
assert.equal(correlation.sourceCustody.geometryEvidenceHash, geometryEvidence.semanticHash);

console.log(JSON.stringify({
  check: 'lafea1-lafea2-correlation-end-to-end-hand-benchmark',
  status: 'PASS',
  pipe: { outsideDiameterMm: 300, thicknessMm: 10 },
  attachmentDiameterMm: 75,
  internalPressureMpa: pressure,
  dimensionless: correlation.geometryParameters,
  loads: correlationRequest.loads,
  pressureStressMpa: { sigmaX: 15, sigmaTheta: 30, sigmaR: 0 },
  empiricalTotalStressMpa: {
    sigmaX: crown.components.SIGMA_X.totalSurface,
    sigmaTheta: crown.components.SIGMA_THETA.totalSurface,
    sigmaR: crown.components.SIGMA_R.totalSurface,
    tauXTheta: crown.components.TAU_XTHETA.totalSurface,
    vonMises: crown.vonMises,
  },
  engineeringUseAuthorized: correlation.qualification.engineeringUseAuthorized,
  sourceCustody: correlation.sourceCustody,
}));

function close(actual, expected, label) {
  const error = Math.abs(actual - expected);
  assert.ok(error <= 1e-10, `${label}: expected ${expected}, received ${actual}, |Δ|=${error}`);
}
