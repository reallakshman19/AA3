import assert from 'node:assert/strict';
import {
  EMP1_B_SOURCE_CUSTODY_STATES,
  EMP1_C_BLOCKER_CODES,
  EMP1_C_PRODUCTION_ROUTE,
  EMP1_LOCAL_CORRELATION_BLOCKERS,
  EMP1_PUBLIC_PRODUCT,
  buildEmp1ProductProjection,
  emp1StepForBackingStage,
  isEmp1BackingStage,
} from '../src/workspace/emp1-product-projection.js';
import { screeningRequestFixture } from './lafea.2-fixtures.mjs';

const bDocument = screeningRequestFixture();
const aDocument = bDocument.sourceEvidence.foundationModel;
const aResult = bDocument.sourceEvidence.foundationResult;
const state = {
  activeStageId: 'LAFEA.1',
  stages: {
    'LAFEA.1': {
      document: aDocument,
      execution: { stageId: 'LAFEA.1', status: 'QUALIFIED', source: aDocument, canonicalInput: aDocument, result: aResult, diagnostics: [] },
      orchestration: { sections: { AUTHORIZATION: { state: 'READY' } } },
    },
    'LAFEA.2': {
      document: bDocument,
      execution: null,
      orchestration: { sections: { AUTHORIZATION: { state: 'READY' } } },
    },
    'LAFEA.3': { document: { id: 'FE' } },
  },
};

const projection = buildEmp1ProductProjection(state);
assert.equal(EMP1_PUBLIC_PRODUCT.productId, 'EMP.1');
assert.equal(projection.steps.length, 3);
assert.equal(projection.steps[0].state, 'CALCULATED');
assert.equal(projection.steps[1].state, 'READY_TO_RUN');
assert.equal(projection.steps[2].state, 'BLOCKED');
assert.equal(projection.steps[2].runAuthorized, false);
assert.deepEqual(projection.steps[2].blockers, EMP1_LOCAL_CORRELATION_BLOCKERS);
assert.deepEqual(projection.steps[2].blockers, [
  EMP1_C_BLOCKER_CODES.WRC_DATASET_NOT_READY,
  EMP1_C_BLOCKER_CODES.WRC_DIMENSIONAL_CONTRACT_UNRESOLVED,
  EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING,
  EMP1_C_BLOCKER_CODES.WRC_SIGN_ARBITRATION_OPEN,
  EMP1_C_BLOCKER_CODES.CAUX_PP24_31_NOT_FROZEN,
]);
assert.equal(projection.steps[2].blockerDetails.length, 5);
assert.match(projection.steps[2].blockerDetails[0].message, /21 unresolved fields; 7 open issues/u);
assert.match(projection.steps[2].blockerDetails[1].message, /2 contradiction\(s\)/u);
assert.match(projection.steps[2].blockerDetails[2].message, /0\/1200 named scalar coefficients numeric across 120 response-curve rows/u);
assert.equal(projection.steps[2].qualification.evidence.derivation.retainedAuditObservedMatch, true);
assert.equal(projection.steps[2].qualification.evidence.derivation.retainedExtractionPinVerified, true);
assert.equal(projection.steps[2].qualification.gateStatus.wrcDimensionalContractReady, false);
assert.equal(projection.steps[2].qualification.gateStatus.signArbitrationReady, false);
assert.equal(projection.steps[2].qualification.gateStatus.cauxBenchmarkReady, false);
assert.equal(EMP1_C_PRODUCTION_ROUTE.registered, false);
assert.equal(projection.qualificationBoundary.emp1CProductionAuthority, 'NOT_AUTHORIZED');
assert.equal(projection.qualificationBoundary.emp1CTechnicalQualificationReady, false);
assert.equal(projection.qualificationBoundary.emp1CRunAuthorized, false);
assert.equal(projection.qualificationBoundary.emp1CProductionRoute.registered, false);
assert.equal(projection.qualificationBoundary.passIsCodeCompliance, false);
assert.equal(projection.custody.bSourceEvidenceState, EMP1_B_SOURCE_CUSTODY_STATES.CURRENT);
assert.equal(isEmp1BackingStage('LAFEA.1'), true);
assert.equal(isEmp1BackingStage('LAFEA.2'), true);
assert.equal(isEmp1BackingStage('LAFEA.3'), false);
assert.equal(emp1StepForBackingStage('LAFEA.2').stepId, 'EMP.1.B');

const syntheticQualifiedMethod = buildEmp1ProductProjection(state, {
  localCorrelationQualificationEvidence: readyCQualificationEvidence(),
});
assert.equal(syntheticQualifiedMethod.state, 'BLOCKED_LOCAL_CORRELATION');
assert.equal(syntheticQualifiedMethod.steps[2].runAuthorized, false);
assert.deepEqual(syntheticQualifiedMethod.steps[2].blockers, [EMP1_C_BLOCKER_CODES.EXECUTION_ROUTE_NOT_REGISTERED]);
assert.equal(syntheticQualifiedMethod.qualificationBoundary.emp1CProductionAuthority, 'QUALIFIED_METHOD_AUTHORITY');
assert.equal(syntheticQualifiedMethod.qualificationBoundary.emp1CTechnicalQualificationReady, true);
assert.equal(syntheticQualifiedMethod.qualificationBoundary.emp1CRunAuthorized, false);
assert.equal(syntheticQualifiedMethod.qualificationBoundary.releaseQualified, false);

console.log(JSON.stringify({ status: 'PASS', currentCBlockers: projection.steps[2].blockers, productionRouteRegistered: EMP1_C_PRODUCTION_ROUTE.registered }, null, 2));

function readyCQualificationEvidence() {
  return {
    schema: 'emp1-c-qualification-evidence/v1',
    derivation: { mode: 'SYNTHETIC_TEST_ONLY', manualSummaryPermitted: false, retainedAuditObservedMatch: true, retainedExtractionPinVerified: true },
    wrcDataset: {
      status: 'PASS', extractionStatus: 'READY_FOR_IMPLEMENTATION', unresolvedJsonPathCount: 0, openIssueCount: 0, numericalDataCount: 1,
      dimensionalContractStatus: 'PASS', dimensionalViolationCount: 0, dimensionalViolationIds: [],
      coefficientCurveRows: 120, coefficientSchema: 'WIDE_A_TO_J_PER_CURVE', coefficientSchemaQualified: true, coefficientsPerCurve: 10,
      requiredScalarCoefficientCount: 1200, numericScalarCoefficientCount: 1200, unresolvedScalarCoefficientCount: 0, missingScalarCoefficientCount: 0, invalidScalarCoefficientCount: 0,
      independentVariable: 'U', independentVariableRepresentation: 'EXPLICIT_RUNTIME_INDEPENDENT_VARIABLE', independentVariableQualified: true,
      semanticHash: 'sha256:qualified-dataset', sourceCustodyQualified: true, sourceCustodyState: 'VERIFIED', sourceQualificationState: 'PASS', sourceRawPdfSha256: 'a'.repeat(64),
    },
    signArbitration: { status: 'PASS', resolutionAuthority: 'PINNED_WRC_PDF', openConflicts: [], sourceCustodyQualified: true },
    cauxBenchmark: {
      status: 'PASS', sourceIdentityVerified: true, sourceCustodyQualified: true, sourceCustodyState: 'VERIFIED', sourceQualificationState: 'PASS', sourceRawPdfSha256: 'b'.repeat(64),
      pageRange: '24-31', expectedValuesFrozen: true, independentHandCalculationStatus: 'PASS', benchmarkHash: 'sha256:qualified-caux-benchmark', supplementalPrecheckVerdict: 'QUALIFIED_FOR_BOUNDED_SANITY_CHECK_ONLY', supplementalPrecheckMaySatisfyCauxA4: false,
    },
    methodAuthorization: { engineeringUseAuthorized: true, qualificationRecordHash: 'sha256:qualified-method-record', authoritySource: 'SYNTHETIC_TEST_ONLY' },
    execution: { routeRegistered: true },
  };
}
