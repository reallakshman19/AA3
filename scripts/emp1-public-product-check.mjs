import assert from 'node:assert/strict';
import {
  EMP1_B_SOURCE_CUSTODY_STATES,
  EMP1_C_BLOCKER_CODES,
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
      execution: {
        stageId: 'LAFEA.1',
        status: 'QUALIFIED',
        source: aDocument,
        canonicalInput: aDocument,
        result: aResult,
        diagnostics: [],
      },
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
assert.equal(projection.steps[0].stepId, 'EMP.1.A');
assert.equal(projection.steps[0].state, 'CALCULATED');
assert.equal(projection.steps[1].stepId, 'EMP.1.B');
assert.equal(projection.steps[1].state, 'READY_TO_RUN');
assert.equal(projection.steps[1].runAuthorized, true);
assert.equal(projection.steps[2].stepId, 'EMP.1.C');
assert.equal(projection.steps[2].state, 'BLOCKED');
assert.equal(projection.steps[2].runAuthorized, false);
assert.deepEqual(projection.steps[2].blockers, EMP1_LOCAL_CORRELATION_BLOCKERS);
assert.deepEqual(projection.steps[2].blockers, [
  EMP1_C_BLOCKER_CODES.WRC_DATASET_NOT_READY,
  EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING,
  EMP1_C_BLOCKER_CODES.WRC_SIGN_ARBITRATION_OPEN,
  EMP1_C_BLOCKER_CODES.CAUX_PP24_31_NOT_FROZEN,
]);
assert.equal(projection.steps[2].blockerDetails.length, 4);
assert.match(projection.steps[2].blockerDetails[0].message, /21 unresolved fields; 7 open issues/u);
assert.match(projection.steps[2].blockerDetails[1].message, /0 numeric coefficient rows; 120 unresolved coefficient rows/u);
assert.equal(projection.steps[2].qualification.gateStatus.signArbitrationReady, false);
assert.equal(projection.steps[2].qualification.gateStatus.cauxBenchmarkReady, false);
assert.equal(projection.qualificationBoundary.emp1CProductionAuthority, 'NOT_AUTHORIZED');
assert.equal(projection.qualificationBoundary.emp1CTechnicalQualificationReady, false);
assert.equal(projection.qualificationBoundary.emp1CRunAuthorized, false);
assert.equal(projection.qualificationBoundary.passIsCodeCompliance, false);
assert.equal(projection.custody.automaticAToBSynchronization, false);
assert.equal(projection.custody.governedAToBRefresh, true);
assert.equal(projection.custody.bSourceEvidenceState, EMP1_B_SOURCE_CUSTODY_STATES.CURRENT);
assert.equal(projection.custody.canRefreshBFromCurrentA, false);
assert.equal(isEmp1BackingStage('LAFEA.1'), true);
assert.equal(isEmp1BackingStage('LAFEA.2'), true);
assert.equal(isEmp1BackingStage('LAFEA.3'), false);
assert.equal(emp1StepForBackingStage('LAFEA.2').stepId, 'EMP.1.B');

const syntheticReady = buildEmp1ProductProjection(state, {
  localCorrelationQualificationEvidence: readyCQualificationEvidence(),
});
assert.equal(syntheticReady.state, 'LOCAL_CORRELATION_READY');
assert.equal(syntheticReady.steps[2].state, 'READY_TO_RUN');
assert.equal(syntheticReady.steps[2].runAuthorized, true);
assert.deepEqual(syntheticReady.steps[2].blockers, []);
assert.equal(syntheticReady.qualificationBoundary.emp1CProductionAuthority, 'QUALIFIED_METHOD_AUTHORITY');
assert.equal(syntheticReady.qualificationBoundary.emp1CTechnicalQualificationReady, true);
assert.equal(syntheticReady.qualificationBoundary.emp1CRunAuthorized, true);
assert.equal(syntheticReady.qualificationBoundary.releaseQualified, false);

console.log(JSON.stringify({
  status: 'PASS',
  product: projection.product,
  bCustody: projection.custody.bSourceEvidenceState,
  currentCBlockers: projection.steps[2].blockers,
  currentCBlockerMessages: projection.steps[2].blockerDetails.map((item) => item.message),
  syntheticCState: syntheticReady.steps[2].state,
  releaseQualified: syntheticReady.qualificationBoundary.releaseQualified,
}, null, 2));

function readyCQualificationEvidence() {
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
      engineeringUseAuthorized: true,
      qualificationRecordHash: 'sha256:qualified-method-record',
    },
    execution: { routeRegistered: true },
  };
}
