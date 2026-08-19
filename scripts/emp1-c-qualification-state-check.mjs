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
assert.equal(current.evidence.derivation.mode, 'RETAINED_ARTIFACT_DERIVATION');
assert.equal(current.evidence.derivation.manualSummaryPermitted, false);
assert.equal(current.evidence.wrcDataset.unresolvedJsonPathCount, 21);
assert.equal(current.evidence.wrcDataset.openIssueCount, 7);
assert.equal(current.evidence.wrcDataset.coefficientCurveRows, 120);
assert.equal(current.evidence.wrcDataset.coefficientsPerCurve, 10);
assert.equal(current.evidence.wrcDataset.requiredScalarCoefficientCount, 1200);
assert.equal(current.evidence.wrcDataset.numericScalarCoefficientCount, 0);
assert.equal(current.evidence.wrcDataset.unresolvedScalarCoefficientCount, 0);
assert.equal(current.evidence.wrcDataset.missingScalarCoefficientCount, 1200);
assert.equal(current.evidence.wrcDataset.coefficientSchema, 'LEGACY_SINGLE_VALUE_PER_CURVE');
assert.equal(current.evidence.wrcDataset.coefficientSchemaQualified, false);
assert.equal(current.evidence.wrcDataset.independentVariable, 'U');
assert.equal(current.evidence.wrcDataset.independentVariableRepresentation, 'LEGACY_PARAMETER_3_ROW_ORDINATE');
assert.equal(current.evidence.wrcDataset.independentVariableQualified, false);
assert.equal(current.evidence.wrcDataset.sourceCustodyQualified, false);
assert.equal(current.evidence.wrcDataset.sourceRawPdfSha256, null);
assert.equal(current.evidence.signArbitration.openConflicts.length, 2);
assert.equal(current.evidence.signArbitration.sourceCustodyQualified, false);
assert.equal(current.evidence.cauxBenchmark.pageRange, '24-31');
assert.equal(current.evidence.cauxBenchmark.sourceCustodyQualified, false);
assert.equal(current.evidence.cauxBenchmark.expectedValuesFrozen, false);
assert.equal(current.evidence.cauxBenchmark.independentHandCalculationStatus, 'NOT_RUN');
assert.equal(current.evidence.cauxBenchmark.supplementalPrecheckMaySatisfyCauxA4, false);
assert.match(current.blockers[0].message, /21 unresolved fields; 7 open issues/u);
assert.match(current.blockers[0].message, /sourceCustody=UNRESOLVED_RAW_BYTES\/BLOCKED/u);
assert.match(current.blockers[1].message, /0\/1200 named scalar coefficients numeric across 120 response-curve rows/u);
assert.match(current.blockers[1].message, /schema=LEGACY_SINGLE_VALUE_PER_CURVE\/BLOCKED/u);
assert.match(current.blockers[1].message, /independentVariable=U\/LEGACY_PARAMETER_3_ROW_ORDINATE\/BLOCKED/u);
assert.match(current.blockers[3].message, /sourceCustody=UNRESOLVED_RAW_BYTES\/BLOCKED/u);

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
missingCoefficient.wrcDataset.numericScalarCoefficientCount = 0;
missingCoefficient.wrcDataset.missingScalarCoefficientCount = 1200;
assert.deepEqual(
  evaluateEmp1CQualificationState(missingCoefficient).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING],
);

const incompleteCoverage = readyEvidence({ methodAuthorized: true, routeRegistered: true });
incompleteCoverage.wrcDataset.numericScalarCoefficientCount = 1199;
incompleteCoverage.wrcDataset.missingScalarCoefficientCount = 1;
assert.deepEqual(
  evaluateEmp1CQualificationState(incompleteCoverage).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING],
);

const anonymousCurveValues = readyEvidence({ methodAuthorized: true, routeRegistered: true });
anonymousCurveValues.wrcDataset.coefficientSchema = 'LEGACY_SINGLE_VALUE_PER_CURVE';
anonymousCurveValues.wrcDataset.coefficientSchemaQualified = false;
assert.deepEqual(
  evaluateEmp1CQualificationState(anonymousCurveValues).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING],
);

const rowOrdinateU = readyEvidence({ methodAuthorized: true, routeRegistered: true });
rowOrdinateU.wrcDataset.independentVariableRepresentation = 'LEGACY_PARAMETER_3_ROW_ORDINATE';
rowOrdinateU.wrcDataset.independentVariableQualified = false;
assert.deepEqual(
  evaluateEmp1CQualificationState(rowOrdinateU).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING],
);

const missingWrcSourceCustody = readyEvidence({ methodAuthorized: true, routeRegistered: true });
missingWrcSourceCustody.wrcDataset.sourceCustodyQualified = false;
missingWrcSourceCustody.wrcDataset.sourceRawPdfSha256 = null;
assert.deepEqual(
  evaluateEmp1CQualificationState(missingWrcSourceCustody).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_DATASET_NOT_READY],
);

const unresolvedSign = readyEvidence({ methodAuthorized: true, routeRegistered: true });
unresolvedSign.signArbitration.resolutionAuthority = 'HEXAGON_SECONDARY_REFERENCE';
assert.deepEqual(
  evaluateEmp1CQualificationState(unresolvedSign).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_SIGN_ARBITRATION_OPEN],
);

const signWithoutSourceCustody = readyEvidence({ methodAuthorized: true, routeRegistered: true });
signWithoutSourceCustody.signArbitration.sourceCustodyQualified = false;
assert.deepEqual(
  evaluateEmp1CQualificationState(signWithoutSourceCustody).blockerCodes,
  [EMP1_C_BLOCKER_CODES.WRC_SIGN_ARBITRATION_OPEN],
);

const incompleteCaux = readyEvidence({ methodAuthorized: true, routeRegistered: true });
incompleteCaux.cauxBenchmark.independentHandCalculationStatus = 'NOT_RUN';
assert.deepEqual(
  evaluateEmp1CQualificationState(incompleteCaux).blockerCodes,
  [EMP1_C_BLOCKER_CODES.CAUX_PP24_31_NOT_FROZEN],
);

const cauxWithoutSourceCustody = readyEvidence({ methodAuthorized: true, routeRegistered: true });
cauxWithoutSourceCustody.cauxBenchmark.sourceCustodyQualified = false;
cauxWithoutSourceCustody.cauxBenchmark.sourceRawPdfSha256 = null;
assert.deepEqual(
  evaluateEmp1CQualificationState(cauxWithoutSourceCustody).blockerCodes,
  [EMP1_C_BLOCKER_CODES.CAUX_PP24_31_NOT_FROZEN],
);

assert.equal(Object.isFrozen(current), true);
assert.equal(Object.isFrozen(current.blockers), true);
assert.equal(Object.isFrozen(EMP1_C_CURRENT_QUALIFICATION_EVIDENCE), true);

console.log(JSON.stringify({
  schema: 'emp1-c-qualification-state-check/v2',
  status: 'PASS',
  currentState: current.state,
  currentBlockers: current.blockerCodes,
  currentMetrics: {
    unresolvedJsonPaths: current.evidence.wrcDataset.unresolvedJsonPathCount,
    openIssues: current.evidence.wrcDataset.openIssueCount,
    coefficientCurveRows: current.evidence.wrcDataset.coefficientCurveRows,
    requiredScalarCoefficientCount: current.evidence.wrcDataset.requiredScalarCoefficientCount,
    numericScalarCoefficientCount: current.evidence.wrcDataset.numericScalarCoefficientCount,
    missingScalarCoefficientCount: current.evidence.wrcDataset.missingScalarCoefficientCount,
    coefficientSchema: current.evidence.wrcDataset.coefficientSchema,
    independentVariableRepresentation: current.evidence.wrcDataset.independentVariableRepresentation,
    wrcSourceCustodyQualified: current.evidence.wrcDataset.sourceCustodyQualified,
    signConflicts: current.evidence.signArbitration.openConflicts.length,
    cauxSourceCustodyQualified: current.evidence.cauxBenchmark.sourceCustodyQualified,
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
      coefficientCurveRows: 120,
      coefficientSchema: 'WIDE_A_TO_J_PER_CURVE',
      coefficientSchemaQualified: true,
      coefficientsPerCurve: 10,
      requiredScalarCoefficientCount: 1200,
      numericScalarCoefficientCount: 1200,
      unresolvedScalarCoefficientCount: 0,
      missingScalarCoefficientCount: 0,
      invalidScalarCoefficientCount: 0,
      independentVariable: 'U',
      independentVariableRepresentation: 'EXPLICIT_RUNTIME_INDEPENDENT_VARIABLE',
      independentVariableQualified: true,
      semanticHash: 'sha256:qualified-dataset',
      sourceCustodyQualified: true,
      sourceCustodyState: 'VERIFIED',
      sourceQualificationState: 'PASS',
      sourceRawPdfSha256: 'a'.repeat(64),
    },
    signArbitration: {
      status: 'PASS',
      resolutionAuthority: 'PINNED_WRC_PDF',
      openConflicts: [],
      sourceCustodyQualified: true,
    },
    cauxBenchmark: {
      status: 'PASS',
      sourceIdentityVerified: true,
      sourceCustodyQualified: true,
      sourceCustodyState: 'VERIFIED',
      sourceQualificationState: 'PASS',
      sourceRawPdfSha256: 'b'.repeat(64),
      pageRange: '24-31',
      expectedValuesFrozen: true,
      independentHandCalculationStatus: 'PASS',
      benchmarkHash: 'sha256:qualified-caux-benchmark',
      supplementalPrecheckVerdict: 'QUALIFIED_FOR_BOUNDED_SANITY_CHECK_ONLY',
      supplementalPrecheckMaySatisfyCauxA4: false,
    },
    methodAuthorization: {
      engineeringUseAuthorized: methodAuthorized,
      qualificationRecordHash: methodAuthorized ? 'sha256:qualified-method-record' : null,
      authoritySource: methodAuthorized ? 'SYNTHETIC_TEST_ONLY' : 'NONE',
    },
    execution: { routeRegistered },
  };
}
