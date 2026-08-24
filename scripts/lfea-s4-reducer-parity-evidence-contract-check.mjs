#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  S4_REDUCER_PARITY_EVIDENCE_SCHEMA,
  S4_REDUCER_REQUIRED_PAIRED_FAMILIES,
  S4_REDUCER_SECTION_CANDIDATES,
  validateS4ReducerParityEvidence,
} from './lfea-s4-reducer-parity-evidence-contract.mjs';

const ORIENTATIONS = ['LARGE_TO_SMALL', 'SMALL_TO_LARGE'];

function runRecord(family, orientation, index) {
  const token = (index + 1).toString(16).padStart(2, '0');
  const hash = token.repeat(32);
  return {
    runId: `${family}-${orientation}`,
    family,
    modelOrientation: orientation,
    jobFileHash: hash,
    inputSourceHash: hash,
    outputFileHash: hash,
    units: 'SI',
    loadCase: `${family}-LC`,
    restraints: 'CONTROLLED_PROTOCOL_RESTRAINT_SET',
    reportedResults: { controlledQuantity: index + 1 },
    reportLocator: `CAESAR_REPORT:${family}:${orientation}`,
    artifactLocator: `external://caesar/s4/${family}/${orientation}`,
    observer: 'CAESAR_OPERATOR_A',
    observationDate: '2026-08-24',
  };
}

function completeEvidence() {
  const runs = [];
  let index = 0;
  for (const family of S4_REDUCER_REQUIRED_PAIRED_FAMILIES) {
    for (const orientation of ORIENTATIONS) runs.push(runRecord(family, orientation, index++));
  }
  runs.push(runRecord('CODE_SIF_BASELINE', 'LARGE_TO_SMALL', index++));
  runs.push(runRecord('CODE_SIF_VARIED', 'LARGE_TO_SMALL', index++));
  return {
    schema: S4_REDUCER_PARITY_EVIDENCE_SCHEMA,
    protocolId: 'S4_Reducer_Parity_Protocol_20260824',
    evidenceClass: 'CONTROLLED_CAESAR_OBSERVATION',
    status: 'QUALIFIED',
    caesarVersion: '14.x-CONTRACT-FIXTURE',
    build: 'CONTRACT-FIXTURE',
    geometry: {
      length: 0.500,
      largeOuterDiameter: 0.27305,
      largeWallThickness: 0.015062,
      smallOuterDiameter: 0.21905,
      smallWallThickness: 0.012700,
    },
    tolerancePolicy: {
      observationTolerance: 1e-6,
      source: 'CONTRACT_FIXTURE_PREDECLARED_NOT_CAESAR_FITTED',
      fittedToCaesar: false,
    },
    productionAuthorizationRequested: false,
    reducerExactMechanicsRequested: false,
    runs,
    candidateComparisons: S4_REDUCER_SECTION_CANDIDATES.map((candidateId, candidateIndex) => ({
      candidateId,
      maximumNormalizedError: candidateIndex === 0 ? 1e-7 : 1e-3 * (candidateIndex + 1),
      accepted: candidateIndex === 0,
    })),
    decisions: {
      sectionSamplingRule: 'MIDPOINT_LINEAR_INTERPOLATION',
      metalGravityRule: 'PROGRESSIVE_SECTION',
      fluidGravityRule: 'PROGRESSIVE_SECTION',
      insulationGravityRule: 'PROGRESSIVE_SECTION',
    },
    acceptance: {
      sectionSamplingUnique: true,
      axialTorsionBendingParity: true,
      metalGravityQualified: true,
      fluidGravityQualified: true,
      insulationGravityQualified: true,
      gravityFirstMomentQualified: true,
      thermalParityQualified: true,
      codeBoundaryQualified: true,
      expectedValuesRebaselined: false,
      tolerancesWidenedToFitCaesar: false,
    },
    independentReview: {
      status: 'APPROVED',
      reviewer: 'INDEPENDENT_REVIEWER_B',
      reviewDate: '2026-08-24',
      reviewLocator: 'CONTRACT_FIXTURE_REVIEW',
    },
  };
}

function expectCode(mutator, expectedCode) {
  const record = structuredClone(completeEvidence());
  mutator(record);
  assert.throws(
    () => validateS4ReducerParityEvidence(record),
    (error) => error?.code === expectedCode,
    expectedCode,
  );
}

const accepted = validateS4ReducerParityEvidence(completeEvidence());
assert.equal(accepted.status, 'QUALIFIED_PARITY_EVIDENCE_ONLY');
assert.equal(accepted.runCount, 20);
assert.equal(accepted.sectionSamplingRule, 'MIDPOINT_LINEAR_INTERPOLATION');
assert.equal(accepted.productionUseAuthorized, false);
assert.equal(accepted.reducerExactMechanicsAuthorized, false);

expectCode(
  (record) => record.runs.splice(record.runs.findIndex((run) => (
    run.family === 'GRAVITY_METAL' && run.modelOrientation === 'SMALL_TO_LARGE'
  )), 1),
  'S4_REDUCER_REQUIRED_CASE_MISSING_OR_DUPLICATED',
);
expectCode(
  (record) => { record.tolerancePolicy.fittedToCaesar = true; },
  'S4_REDUCER_TOLERANCE_FITTING_FORBIDDEN',
);
expectCode(
  (record) => { record.productionAuthorizationRequested = true; },
  'S4_REDUCER_EVIDENCE_CANNOT_AUTHORIZE_PRODUCTION',
);
expectCode(
  (record) => { record.candidateComparisons[0].maximumNormalizedError = 2e-6; },
  'S4_REDUCER_ACCEPTED_CANDIDATE_OUTSIDE_TOLERANCE',
);
expectCode(
  (record) => { record.candidateComparisons[1].maximumNormalizedError = 5e-7; },
  'S4_REDUCER_SECTION_RULE_NOT_UNIQUE',
);
expectCode(
  (record) => {
    record.candidateComparisons[0].accepted = false;
    record.candidateComparisons[1].accepted = true;
  },
  'S4_REDUCER_ACCEPTED_CANDIDATE_OUTSIDE_TOLERANCE',
);
expectCode(
  (record) => { record.acceptance.thermalParityQualified = false; },
  'S4_REDUCER_ACCEPTANCE_NOT_MET',
);
expectCode(
  (record) => { record.independentReview.reviewer = 'CAESAR_OPERATOR_A'; },
  'S4_REDUCER_REVIEWER_NOT_INDEPENDENT',
);
expectCode(
  (record) => { record.status = 'UNRESOLVED'; },
  'S4_REDUCER_EVIDENCE_STATUS_NOT_QUALIFIED',
);

console.log('LFEA S4 reducer parity evidence contract check PASS');
