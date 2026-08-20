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
import { EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON,EMP1_C_WRC537_LONGITUDINAL_CURVE_SUSPENSION_REASON } from '../src/core/emp1/emp1-c-bounded-route-registry.js';
import { screeningRequestFixture } from './lafea.2-fixtures.mjs';
const bDocument=screeningRequestFixture(),aDocument=bDocument.sourceEvidence.foundationModel,aResult=bDocument.sourceEvidence.foundationResult;
const state={activeStageId:'LAFEA.1',stages:{'LAFEA.1':{document:aDocument,execution:{stageId:'LAFEA.1',status:'QUALIFIED',source:aDocument,canonicalInput:aDocument,result:aResult,diagnostics:[]},orchestration:{sections:{AUTHORIZATION:{state:'READY'}}}},'LAFEA.2':{document:bDocument,execution:null,orchestration:{sections:{AUTHORIZATION:{state:'READY'}}}},'LAFEA.3':{document:{id:'FE'}}}};
const projection=buildEmp1ProductProjection(state);assert.equal(EMP1_PUBLIC_PRODUCT.productId,'EMP.1');assert.equal(projection.state,'BLOCKED_LOCAL_CORRELATION');assert.equal(projection.steps.length,3);assert.equal(projection.steps[0].state,'CALCULATED');assert.equal(projection.steps[1].state,'READY_TO_RUN');assert.equal(projection.steps[2].state,'BLOCKED');assert.equal(projection.steps[2].runAuthorized,false);
assert.equal(EMP1_C_PRODUCTION_ROUTE.registered,false);assert.equal(EMP1_C_BOUNDED_PRODUCTION_ROUTES.length,1);const bounded=EMP1_C_BOUNDED_PRODUCTION_ROUTES[0],reasons=[EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON,EMP1_C_WRC537_LONGITUDINAL_CURVE_SUSPENSION_REASON];assert.equal(bounded.routeId,EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID);assert.equal(bounded.registered,false);assert.equal(bounded.engineeringUseAuthorized,false);assert.equal(bounded.comparisonQualificationAvailable,true);assert.deepEqual(bounded.suspensionReasons,reasons);assert.equal(bounded.scope.longitudinalMomentBendingSelection,'SOURCE_GOVERNED_REQUIRED');assert.equal(projection.qualificationBoundary.emp1CProductionAuthority,'NOT_AUTHORIZED');assert.equal(projection.qualificationBoundary.emp1CRunAuthorized,false);assert.equal(projection.qualificationBoundary.globalEmp1CRouteAuthority,false);assert.equal(projection.qualificationBoundary.releaseQualified,false);
const globalQualification=projection.steps[2].qualification;assert.equal(globalQualification.technicalQualificationReady,false);assert.ok(globalQualification.blockerCodes.includes(EMP1_C_BLOCKER_CODES.WRC_SIGN_ARBITRATION_OPEN));assert.deepEqual(projection.steps[2].blockers,globalQualification.blockerCodes);assert.equal(projection.custody.bSourceEvidenceState,EMP1_B_SOURCE_CUSTODY_STATES.CURRENT);assert.equal(isEmp1BackingStage('LAFEA.1'),true);assert.equal(isEmp1BackingStage('LAFEA.2'),true);assert.equal(isEmp1BackingStage('LAFEA.3'),false);assert.equal(emp1StepForBackingStage('LAFEA.2').stepId,'EMP.1.B');
console.log(JSON.stringify({status:'PASS',productState:projection.state,suspendedRoute:bounded.routeId,suspensionReasons:reasons,globalQualificationBlockers:globalQualification.blockerCodes,releaseQualified:false},null,2));
