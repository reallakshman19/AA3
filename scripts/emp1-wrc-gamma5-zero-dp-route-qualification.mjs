#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { calculateLocalAttachmentFoundation } from '../src/core/local-stress/index.js';
import { canonicalFixture } from './lafea.1-fixtures.mjs';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS,
  evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate,
  runEmp1Wrc537Gamma5ZeroDpRoute,
} from '../src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';
import {
  deriveEmp1Wrc537CylindricalAxisAuthority,
} from '../src/core/emp1/emp1-wrc537-cylindrical-axis-authority.js';
import {
  EMP1_WRC537_ATTACHMENT_STATION_BASIS,
  EMP1_WRC537_CYLINDER_LENGTH_BASIS,
  createEmp1Wrc537ApplicabilitySourceAuthority,
} from '../src/core/emp1/emp1-wrc537-applicability-source-authority.js';

const routeRecord = JSON.parse(await readFile(
  'validation/emp1/wrc537-2013/gamma5-zero-dp-route-qualification-v1.json', 'utf8'));
const producerRecord = JSON.parse(await readFile(
  'validation/emp1/wrc537-2013/emp1-a-zero-dp-wrc-load-producer-qualification-v1.json', 'utf8'));
const historicalOracle = JSON.parse(await readFile(
  'validation/emp1/wrc537-2013/gamma5-full-table5-oracle-v1.json', 'utf8'));

const routeHash = sha256Canonical(routeRecord.semanticPayload);
assert.equal(routeHash, routeRecord.qualificationRecordSha256);
assert.equal(routeHash, EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256);
assert.equal(routeRecord.status, 'PASS_REOBSERVED_AUTHORIZED_BOUNDED_ZERO_DP_ROUTE');
assert.equal(routeRecord.productionRouteAuthority, true,
  'historical record remains an immutable statement about its old qualification epoch');
assert.equal(routeRecord.globalEmp1CRouteAuthority, false);
assert.equal(routeRecord.productionObservationUsedToSetAuthority, false);
assert.equal(routeRecord.reobservation?.stressComparisonsPassed, 32);
assert.equal(routeRecord.reobservation?.routeFalsifiersPassed, 8);
assert.equal(producerRecord.semanticHashSha256,
  routeRecord.semanticPayload.loadProducerQualificationSha256);
assert.equal(historicalOracle.semanticHash,
  routeRecord.semanticPayload.benchmarkQualification.benchmarkHash);

assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED, false,
  'historical qualification must not reactivate current production');
assert.deepEqual(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS, [
  'WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE',
]);

const model = routeFixture();
const result = calculateLocalAttachmentFoundation(model);
assert.equal(result.qualification.state, 'ACCEPTED');
const axisAuthority = deriveEmp1Wrc537CylindricalAxisAuthority({
  foundationResult: result,
  foundationModel: model,
  loadCaseIdentity: 'LC-1',
});
const applicabilitySourceAuthority = applicabilityAuthority(300, 80);
const input = {
  loadTransferResult: result,
  loadCaseIdentity: 'LC-1',
  pressureResultIdentity: 'PR-1',
  wrcReferencePointGlobal: [0, 0, 0],
  geometry: {
    meanRadius: 100,
    shellThickness: 20,
    attachmentOutsideRadius: 17.714285714285715,
    gamma: 5,
    beta: 0.155,
  },
  axisAuthority,
  applicabilitySourceAuthority,
  stressConcentration: { Kn: 1, Kb: 1 },
};
const candidate = evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate(input);
assert.equal(candidate.state, 'PASS_BOUNDED_ROUTE_COMPARISON_CANDIDATE');
assert.equal(candidate.productionRouteAuthority, false);
assert.equal(candidate.globalEmp1CRouteAuthority, false);
assert.equal(candidate.methodGate.state, 'METHOD_QUALIFIED');
assert.equal(candidate.numerics.qualifiedInputAuthority, true);
assert.equal(candidate.numerics.loadCustody.productionRouteInputAuthorized, true);
assert.equal(candidate.applicability.status, 'PASS_WRC537_4_5_SOURCE_LIMITS_QUALIFIED');
assert.equal(candidate.applicability.sourceAuthoritySemanticHash,
  applicabilitySourceAuthority.semanticHash);
assert.equal(candidate.numerics.extremaScope.evaluatedLocationCount, 8);
for (const key of ['circumferential', 'longitudinal', 'shear', 'stressIntensity']) {
  assert.equal(candidate.stresses[key].length, 8);
  candidate.stresses[key].forEach((value) => assert.ok(Number.isFinite(value)));
}

// Deliberately DO NOT compare this source-authorized physical candidate with the
// historical gamma5 stress vector. Axis/r0/curve/applicability authority was
// closed after that record. A new independent physical vector must be frozen by
// the successor route-requalification increment before production can reactivate.
const currentStressComparisonsAgainstHistoricalVector = 0;

let suspended = null;
try { runEmp1Wrc537Gamma5ZeroDpRoute(input); } catch (error) { suspended = error; }
assert.equal(suspended?.code, 'EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENDED');
assert.deepEqual(suspended.reasons, EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS);

const falsifiers = [];
runCandidateFalsifier('missing-applicability-authority',
  () => evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({
    ...input, applicabilitySourceAuthority: undefined,
  }), 'EMP1_WRC537_4_5_QUALIFIED_SOURCE_AUTHORITY_REQUIRED');
runCandidateFalsifier('nonzero-dp',
  () => evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({
    ...input,
    loadTransferResult: calculateLocalAttachmentFoundation(nonzeroDpRouteFixture()),
  }), 'EMP1_A_WRC_ZERO_DP_NONZERO_DIFFERENTIAL_PRESSURE');
runCandidateFalsifier('nonunity-kn',
  () => evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({
    ...input, stressConcentration: { Kn: 1.01, Kb: 1 },
  }), 'EMP1_WRC537_GAMMA5_ZERO_DP_UNITY_STRESS_CONCENTRATION_REQUIRED');
runCandidateFalsifier('nonunity-kb',
  () => evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({
    ...input, stressConcentration: { Kn: 1, Kb: 0.99 },
  }), 'EMP1_WRC537_GAMMA5_ZERO_DP_UNITY_STRESS_CONCENTRATION_REQUIRED');
runCandidateFalsifier('short-cylinder',
  () => evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({
    ...input, applicabilitySourceAuthority: applicabilityAuthority(90, 45),
  }), 'EMP1_WRC537_CYLINDRICAL_APPLICABILITY_OUTSIDE_SOURCE_LIMITS');
runCandidateFalsifier('beta-high',
  () => evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({
    ...input,
    geometry: { ...input.geometry, attachmentOutsideRadius: 60, beta: 0.525 },
  }), 'EMP1_LOCAL_CORRELATION_NOT_AUTHORIZED');
runCandidateFalsifier('reference-mismatch',
  () => evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({
    ...input, wrcReferencePointGlobal: [0, 0, 1],
  }), 'EMP1_A_WRC_ZERO_DP_REFERENCE_POINT_MISMATCH');
const hashTamper = structuredClone(result);
hashTamper.semanticHashes.resultPayloadSemanticHash = 'fnv1a64:0000000000000000';
runCandidateFalsifier('upstream-hash-drift',
  () => evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({
    ...input, loadTransferResult: hashTamper,
  }), 'EMP1_A_WRC_ZERO_DP_RESULT_HASH_DRIFT:resultPayloadSemanticHash');
assert.equal(falsifiers.length, 8);

console.log(JSON.stringify({
  schema: 'emp1-wrc537-gamma5-zero-dp-route-qualification/v5',
  status: 'PASS_HISTORICAL_RECORD_CUSTODY_CURRENT_SOURCE_CHAIN_REOBSERVED_REQUALIFICATION_REQUIRED',
  historicalQualificationRecord: {
    qualificationRecordSha256: routeHash,
    historicalStressComparisons: routeRecord.reobservation?.stressComparisonsPassed,
    oldProductionAuthority: routeRecord.productionRouteAuthority,
    reusedAsCurrentAuthorization: false,
  },
  current: {
    routeAuthorized: EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
    suspensionReasons: EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS,
    applicabilityAuthorityHash: applicabilitySourceAuthority.semanticHash,
    finiteEightPointCandidate: true,
    currentStressComparisonsAgainstHistoricalVector,
    currentPhysicalVectorRefrozen: false,
    falsifiersPassed: falsifiers.length,
    falsifiers,
  },
  globalEmp1CRouteAuthority: false,
}, null, 2));

function applicabilityAuthority(cylinderLength, station) {
  return createEmp1Wrc537ApplicabilitySourceAuthority({
    geometryIdentity: `EMP1-15-ROUTE-${cylinderLength}-${station}`,
    cylinderLengthBasis: EMP1_WRC537_CYLINDER_LENGTH_BASIS,
    cylinderLength,
    attachmentStationBasis: EMP1_WRC537_ATTACHMENT_STATION_BASIS,
    attachmentStationFromCylinderStart: station,
    unit: 'mm',
    cylinderLengthSourceReference: 'EMP1-15/QUALIFICATION/CYLINDER-LENGTH',
    attachmentStationSourceReference: 'EMP1-15/QUALIFICATION/WRC-STATION',
    productionObservationUsedToSetAuthority: false,
  });
}
function routeFixture() {
  return canonicalFixture((source) => {
    source.loadCases[0].force.value = [-400, 250, 1000];
    source.loadCases[0].moment.value = [-250000, -200000, 700000];
    source.pressureDefinitions.forEach((row) => {
      row.internalPressure.value = 0;
      row.externalPressure.value = 0;
    });
  });
}
function nonzeroDpRouteFixture() {
  return canonicalFixture((source) => {
    source.loadCases[0].force.value = [-400, 250, 1000];
    source.loadCases[0].moment.value = [-250000, -200000, 700000];
    source.pressureDefinitions.forEach((row) => {
      row.internalPressure.value = 1;
      row.externalPressure.value = 0;
    });
  });
}
function runCandidateFalsifier(name, fn, code) {
  expectCode(name, fn, code);
  falsifiers.push(name);
}
function expectCode(name, fn, prefix) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  assert.ok(caught, `${name}: expected failure`);
  assert.ok(String(caught.code ?? caught.message).startsWith(prefix),
    `${name}: actual=${caught.code ?? caught.message}`);
}
function sha256Canonical(value) {
  return createHash('sha256')
    .update(JSON.stringify(sortValue(value)), 'utf8')
    .digest('hex');
}
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortValue(value[key]);
    return out;
  }
  return value;
}
