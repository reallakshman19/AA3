import assert from 'node:assert/strict';
import {
  EMP1_B_SOURCE_CUSTODY_STATES,
  EMP1_C_BLOCKER_CODES,
  EMP1_C_BOUNDED_PRODUCTION_ROUTES,
  EMP1_C_PRODUCTION_ROUTE,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  EMP1_PUBLIC_PRODUCT,
  buildEmp1ProductProjection,
  emp1StepForBackingStage,
  isEmp1BackingStage,
} from '../src/workspace/emp1-product-projection.js';
import { EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON } from '../src/core/emp1/emp1-c-bounded-route-registry.js';
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
assert.equal(projection.state, 'BLOCKED_LOCAL_CORRELATION');
assert.equal(projection.steps.length, 3);
assert.equal(projection.steps[0].state, 'CALCULATED');
assert.equal(projection.steps[1].state, 'READY_TO_RUN');
assert.equal(projection.steps[1].runAuthorized, true);
assert.equal(projection.steps[2].state, 'BLOCKED');
assert.equal(projection.steps[2].runAuthorized, false);
assert.equal(projection.steps[2].workspaceExecutionWired, false);
assert.equal(projection.steps[2].boundedRouteCount, 1);

assert.equal(EMP1_C_PRODUCTION_ROUTE.registered, false, 'global/full-domain EMP.1.C remains unregistered');
assert.equal(EMP1_C_BOUNDED_PRODUCTION_ROUTES.length, 1);
const bounded = EMP1_C_BOUNDED_PRODUCTION_ROUTES[0];
assert.equal(bounded.routeId, EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID);
assert.equal(bounded.registered, false);
assert.equal(bounded.engineeringUseAuthorized, false);
assert.equal(bounded.comparisonQualificationAvailable, true);
assert.deepEqual(bounded.suspensionReasons,[EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON]);
assert.equal(bounded.globalEmp1CRouteAuthority, false);
assert.equal(bounded.releaseQualified, false);
assert.equal(bounded.runtimeEligibilityRequired, true);
assert.equal(bounded.scope.gamma, 5);
assert.equal(bounded.scope.betaMinimum, 0.05);
assert.equal(bounded.scope.betaMaximum, 0.5);
assert.equal(bounded.scope.differentialPressure, 0);
assert.equal(bounded.scope.Kn, 1);
assert.equal(bounded.scope.Kb, 1);
assert.ok(bounded.remainingBlocked.includes(EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON));

assert.equal(projection.qualificationBoundary.emp1CProductionAuthority, 'NOT_AUTHORIZED');
assert.equal(projection.qualificationBoundary.emp1CTechnicalQualificationReady, false);
assert.equal(projection.qualificationBoundary.emp1CRunAuthorized, false);
assert.equal(projection.qualificationBoundary.emp1CWorkspaceExecutionWired, false);
assert.equal(projection.qualificationBoundary.emp1CProductionRoute.registered, false);
assert.equal(projection.qualificationBoundary.emp1CBoundedRouteCount, 1);
assert.equal(projection.qualificationBoundary.globalEmp1CRouteAuthority, false);
assert.equal(projection.qualificationBoundary.passIsCodeCompliance, false);
assert.equal(projection.qualificationBoundary.releaseQualified, false);

const globalQualification = projection.steps[2].qualification;
assert.equal(globalQualification.technicalQualificationReady, false);
assert.ok(globalQualification.blockerCodes.includes(EMP1_C_BLOCKER_CODES.WRC_DATASET_NOT_READY));
assert.ok(globalQualification.blockerCodes.includes(EMP1_C_BLOCKER_CODES.WRC_DIMENSIONAL_CONTRACT_UNRESOLVED));
assert.ok(globalQualification.blockerCodes.includes(EMP1_C_BLOCKER_CODES.WRC_RUNTIME_CONTRACTS_UNRESOLVED));
assert.ok(globalQualification.blockerCodes.includes(EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING));
assert.ok(globalQualification.blockerCodes.includes(EMP1_C_BLOCKER_CODES.WRC_SIGN_ARBITRATION_OPEN));
assert.ok(globalQualification.blockerCodes.includes(EMP1_C_BLOCKER_CODES.CAUX_PP24_31_NOT_FROZEN));
assert.deepEqual(projection.steps[2].blockers,globalQualification.blockerCodes);
assert.equal(globalQualification.evidence.derivation.retainedAuditObservedMatch, true);
assert.equal(globalQualification.evidence.derivation.retainedExtractionPinVerified, true);

assert.equal(projection.custody.bSourceEvidenceState, EMP1_B_SOURCE_CUSTODY_STATES.CURRENT);
assert.equal(projection.custody.automaticAToBSynchronization, false);
assert.equal(projection.custody.governedAToBRefresh, true);
assert.equal(projection.custody.canRefreshBFromCurrentA, false);
assert.equal(isEmp1BackingStage('LAFEA.1'), true);
assert.equal(isEmp1BackingStage('LAFEA.2'), true);
assert.equal(isEmp1BackingStage('LAFEA.3'), false);
assert.equal(emp1StepForBackingStage('LAFEA.2').stepId, 'EMP.1.B');

console.log(JSON.stringify({
  status: 'PASS',
  productState: projection.state,
  bCustody: projection.custody.bSourceEvidenceState,
  cState: projection.steps[2].state,
  cBoundedRoutes: projection.steps[2].boundedRouteCount,
  suspendedRoute: bounded.routeId,
  suspensionReasons: bounded.suspensionReasons,
  globalQualificationBlockers: globalQualification.blockerCodes,
  globalEmp1CRouteAuthority: projection.qualificationBoundary.globalEmp1CRouteAuthority,
  releaseQualified: projection.qualificationBoundary.releaseQualified,
}, null, 2));
