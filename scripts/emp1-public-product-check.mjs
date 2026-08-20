import assert from 'node:assert/strict';
import {
  EMP1_B_SOURCE_CUSTODY_STATES,
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
assert.equal(projection.state, 'BOUNDED_LOCAL_CORRELATION_AVAILABLE');
assert.equal(projection.steps.length, 3);
assert.equal(projection.steps[0].stepId, 'EMP.1.A');
assert.equal(projection.steps[0].state, 'CALCULATED');
assert.equal(projection.steps[1].stepId, 'EMP.1.B');
assert.equal(projection.steps[1].state, 'READY_TO_RUN');
assert.equal(projection.steps[1].runAuthorized, true);
assert.equal(projection.steps[2].stepId, 'EMP.1.C');
assert.equal(projection.steps[2].state, 'BOUNDED_ROUTE_AVAILABLE');
assert.equal(projection.steps[2].runAuthorized, false);
assert.equal(projection.steps[2].workspaceExecutionWired, false);
assert.equal(projection.steps[2].boundedRouteCount, 1);
assert.equal(projection.steps[2].boundedProductionRoutes[0].registered, true);
assert.equal(projection.steps[2].boundedProductionRoutes[0].engineeringUseAuthorized, true);
assert.equal(projection.steps[2].boundedProductionRoutes[0].globalEmp1CRouteAuthority, false);
assert.equal(projection.steps[2].boundedProductionRoutes[0].scope.gamma, 5);
assert.equal(projection.steps[2].boundedProductionRoutes[0].scope.betaMinimum, 0.05);
assert.equal(projection.steps[2].boundedProductionRoutes[0].scope.betaMaximum, 0.5);
assert.equal(projection.steps[2].boundedProductionRoutes[0].scope.differentialPressure, 0);
assert.deepEqual(projection.steps[2].blockers, EMP1_LOCAL_CORRELATION_BLOCKERS);
assert.equal(projection.qualificationBoundary.emp1CProductionAuthority, 'BOUNDED_ROUTE_ONLY');
assert.equal(projection.qualificationBoundary.emp1CWorkspaceExecutionWired, false);
assert.equal(projection.qualificationBoundary.globalEmp1CRouteAuthority, false);
assert.equal(projection.qualificationBoundary.passIsCodeCompliance, false);
assert.equal(projection.qualificationBoundary.releaseQualified, false);
assert.equal(projection.custody.automaticAToBSynchronization, false);
assert.equal(projection.custody.governedAToBRefresh, true);
assert.equal(projection.custody.bSourceEvidenceState, EMP1_B_SOURCE_CUSTODY_STATES.CURRENT);
assert.equal(projection.custody.canRefreshBFromCurrentA, false);
assert.equal(isEmp1BackingStage('LAFEA.1'), true);
assert.equal(isEmp1BackingStage('LAFEA.2'), true);
assert.equal(isEmp1BackingStage('LAFEA.3'), false);
assert.equal(emp1StepForBackingStage('LAFEA.2').stepId, 'EMP.1.B');
console.log(JSON.stringify({
  status: 'PASS',
  product: projection.product,
  productState: projection.state,
  bCustody: projection.custody.bSourceEvidenceState,
  cState: projection.steps[2].state,
  cBoundedRoutes: projection.steps[2].boundedRouteCount,
  cBlockers: projection.steps[2].blockers,
  globalEmp1CRouteAuthority: projection.qualificationBoundary.globalEmp1CRouteAuthority,
  releaseQualified: projection.qualificationBoundary.releaseQualified,
}, null, 2));
