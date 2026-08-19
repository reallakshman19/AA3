import assert from 'node:assert/strict';
import {
  EMP1_C_BLOCKER_CODES,
  EMP1_C_CURRENT_QUALIFICATION_EVIDENCE,
  EMP1_C_QUALIFICATION_SCHEMA,
  evaluateEmp1CQualificationState,
} from '../src/core/emp1/emp1-c-qualification-state.js';

const current = evaluateEmp1CQualificationState();
assert.equal(current.schema, EMP1_C_QUALIFICATION_SCHEMA);
assert.equal(current.state, 'BLOCKED');
assert.equal(current.technicalQualificationReady, false);
assert.equal(current.engineeringUseAuthorized, false);
assert.equal(current.runAuthorized, false);
assert.deepEqual(current.blockerCodes, [
  EMP1_C_BLOCKER_CODES.WRC_DATASET_NOT_READY,
  EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING,
  EMP1_C_BLOCKER_CODES.WRC_SIGN_ARBITRATION_OPEN,
  EMP1_C_BLOCKER_CODES.CAUX_PP24_31_NOT_FROZEN,
]);
assert.equal(current.evidence.wrcDataset.unresolvedJsonPathCount, 21);
assert.equal(current.evidence.wrcDataset.openIssueCount, 7);
assert.equal(current.evidence.wrcDataset.numericCoefficientRows, 0);
assert.equal(current.evidence.wrcDataset.unresolvedCoefficientRows, 120);
assert.equal(current.evidence.wrcDataset.unresolvedParameterRows, 120);
assert.equal(current.evidence.signArbitration.openConflicts.length, 2);
assert.equal(current.evidence.cauxBenchmark.pageRange, '24-31');
assert.equal(current.evidence.cauxBenchmark.expectedValuesFrozen, false);
assert.equal(current.evidence.cauxBenchmark.independentHandCalculationStatus, 'NOT_RUN');
assert.match(current.blockers[0].message, /21 unresolved fields; 7 open issues/u);
assert.match(current.blockers[1].message, /0 numeric coefficient rows; 120 unresolved coefficient rows; 120 unresolved parameter rows/u);

const technicallyReady = readyEvidence({ methodAuthorized: false, routeRegistered: false });
const technical = evaluateEmp1CQualificationState(technicallyReady);
assert.equal(technical.technicalQualificationReady, true);
assert.equal(technical.engineeringUseAuthorized, false);
assert.equal(technical.runAuthorized, false);
assert.deepEqual(technical.blockerCodes, [EMP1_C_BLOCKER_CODES.METHOD_AUTHORITY_NOT_GRANTED]);

const methodAuthorized = readyEvidence({ methodAuthorized: true, routeRegistered: false });
const awaitingRoute = evaluateEmp1CQualificationState(methodAuthorized);
assert.equal(awaitingRoute.technicalQualificationReady, true);
assert.equal(awaitingRoute.engineeringUseAuthorized, true);
assert.equal(awaitingRoute.runAuthorized, false);
assert.deepEqual(awaitingRoute.blockerCodes, [EMP1_C_BLOCKER_CODES.EXECUTION_ROUTE_NOT_REGISTERED]);

const executable = evaluateEmp1CQualificationState(readyEvidence({
  methodAuthorized: true,
  routeRegistered: true,
}));
assert.equal(executable.state, 'READY_TO_RUN');
assert.equal(executable.technicalQualificationReady, true);
assert.equal(executable.engineeringUseAuthorized, true);
assert.equal(executable.runAuthorized, true);
assert.deepEqual(executable.blockerCodes, []);

const missingCoefficient = readyEvidence({ methodAuthorized: true, routeRegistered: true });
missingCoefficient.wrcDataset.numericCoefficientRows = 0;
assert.deepEqual(
  evaluateEmp1CQualificationState(missingCoefficient).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING],
);

const unresolvedSign = readyEvidence({ methodAuthorized: true, routeRegistered: true });
unresolvedSign.signArbitration.resolutionAuthority = 'HEXAGON_SECONDARY_REFERENCE';
assert.deepEqual(
  evaluateEmp1CQualificationState(unresolvedSign).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_SIGN_ARBITRATION_OPEN],
);

const incompleteCaux = readyEvidence({ methodAuthorized: true, routeRegistered: true });
incompleteCaux.cauxBenchmark.independentHandCalculationStatus = 'NOT_RUN';
assert.deepEqual(
  evaluateEmp1CQualificationState(incompleteCaux).blockerCodes,
  [EMP1_C_BLOCKER_CODES.CAUX_PP24_31_NOT_FROZEN],
);

assert.equal(Object.isFrozen(current), true);
assert.equal(Object.isFrozen(current.blockers), true);
assert.equal(Object.isFrozen(EMP1_C_CURRENT_QUALIFICATION_EVIDENCE), true);

console.log(JSON.stringify({
  schema: 'emp1-c-qualification-state-check/v1',
  status: 'PASS',
  currentState: current.state,
  currentBlockers: current.blockerCodes,
  currentMetrics: {
    unresolvedJsonPaths: current.evidence.wrcDataset.unresolvedJsonPathCount,
    openIssues: current.evidence.wrcDataset.openIssueCount,
    numericCoefficientRows: current.evidence.wrcDataset.numericCoefficientRows,
    unresolvedCoefficientRows: current.evidence.wrcDataset.unresolvedCoefficientRows,
    unresolvedParameterRows: current.evidence.wrcDataset.unresolvedParameterRows,
    signConflicts: current.evidence.signArbitration.openConflicts.length,
    cauxIndependentHandCalculation: current.evidence.cauxBenchmark.independentHandCalculationStatus,
  },
  syntheticPromotionSequence: [
    'TECHNICAL_READY_METHOD_AUTHORITY_REQUIRED',
    'METHOD_AUTHORIZED_EXECUTION_ROUTE_REQUIRED',
    'READY_TO_RUN',
  ],
}, null, 2));

function readyEvidence({ methodAuthorized, routeRegistered }) {
  return {
    schema: 'emp1-c-qualification-evidence/v1',
    wrcDataset: {
      status: 'PASS',
      extractionStatus: 'READY_FOR_IMPLEMENTATION',
      unresolvedJsonPathCount: 0,
      openIssueCount: 0,
      numericalDataCount: 1,
      numericCoefficientRows: 120,
      unresolvedCoefficientRows: 0,
      unresolvedParameterRows: 0,
      semanticHash: 'sha256:qualified-dataset',
    },
    signArbitration: {
      status: 'PASS',
      resolutionAuthority: 'PINNED_WRC_PDF',
      openConflicts: [],
    },
    cauxBenchmark: {
      status: 'PASS',
      sourceIdentityVerified: true,
      pageRange: '24-31',
      expectedValuesFrozen: true,
      independentHandCalculationStatus: 'PASS',
      benchmarkHash: 'sha256:qualified-caux-benchmark',
    },
    methodAuthorization: {
      engineeringUseAuthorized: methodAuthorized,
      qualificationRecordHash: methodAuthorized ? 'sha256:qualified-method-record' : null,
    },
    execution: { routeRegistered },
  };
}
