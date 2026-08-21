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
import {
  EMP1_C_WRC537_APPENDIX_B_SCF_LIMITATION,
  EMP1_C_WRC537_APPLICABILITY_SOURCE_SUSPENSION_REASON,
  EMP1_C_WRC537_AXIS_AUTHORITY_STATE,
  EMP1_C_WRC537_EXTREMA_LIMITATION,
  EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON,
  EMP1_C_WRC537_LONGITUDINAL_CURVE_SUSPENSION_REASON,
  EMP1_C_WRC537_R0_SOURCE_SUSPENSION_REASON,
  EMP1_C_WRC537_UNITY_SCF_LIMITATION,
} from '../src/core/emp1/emp1-c-bounded-route-registry.js';
import {
  EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_ID,
  EMP1_WRC537_CYLINDRICAL_AXIS_SOURCE_SHA256,
} from '../src/core/emp1/emp1-wrc537-cylindrical-axis-authority.js';
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
    'LAFEA.2': { document: bDocument, execution: null, orchestration: { sections: { AUTHORIZATION: { state: 'READY' } } } },
    'LAFEA.3': { document: { id: 'FE' } },
  },
};

const projection = buildEmp1ProductProjection(state);
assert.equal(EMP1_PUBLIC_PRODUCT.productId, 'EMP.1');
assert.equal(projection.state, 'BLOCKED_LOCAL_CORRELATION');
assert.equal(projection.steps.length, 3);
assert.equal(projection.steps[0].state, 'CALCULATED');
assert.equal(projection.steps[1].state, 'READY_TO_RUN');
assert.equal(projection.steps[2].state, 'BLOCKED');
assert.equal(projection.steps[2].runAuthorized, false);

assert.equal(EMP1_C_PRODUCTION_ROUTE.registered, false);
assert.equal(EMP1_C_BOUNDED_PRODUCTION_ROUTES.length, 1);
const bounded = EMP1_C_BOUNDED_PRODUCTION_ROUTES[0];
const reasons = [
  EMP1_C_WRC537_LONGITUDINAL_CURVE_SUSPENSION_REASON,
  EMP1_C_WRC537_R0_SOURCE_SUSPENSION_REASON,
  EMP1_C_WRC537_APPLICABILITY_SOURCE_SUSPENSION_REASON,
];
assert.equal(bounded.routeId, EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID);
assert.equal(bounded.registered, false);
assert.equal(bounded.engineeringUseAuthorized, false);
assert.equal(bounded.comparisonQualificationAvailable, true);
assert.deepEqual(bounded.suspensionReasons, reasons);
assert.equal(bounded.suspensionReasons.includes(EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON), false);
assert.deepEqual(bounded.limitations, [
  EMP1_C_WRC537_EXTREMA_LIMITATION,
  EMP1_C_WRC537_UNITY_SCF_LIMITATION,
  EMP1_C_WRC537_APPENDIX_B_SCF_LIMITATION,
]);
assert.equal(bounded.scope.cylindricalLoadAxisAuthority, EMP1_C_WRC537_AXIS_AUTHORITY_STATE);
assert.equal(bounded.scope.cylindricalLoadAxisAuthorityId, EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_ID);
assert.equal(bounded.scope.cylindricalLoadAxisSourceSha256, EMP1_WRC537_CYLINDRICAL_AXIS_SOURCE_SHA256);
assert.equal(bounded.scope.wrcPositivePRule, 'SOURCE_REFERENCE_TOWARD_ATTACHMENT_TARGET');
assert.equal(bounded.scope.rawFoundationRadialHintIsPolarityAuthority, false);
assert.equal(bounded.scope.runtimeSourcePolarityEvidenceRequired, true);
assert.equal(bounded.scope.Kn, 1);
assert.equal(bounded.scope.Kb, 1);
assert.equal(bounded.scope.stressConcentrationMode, 'UNITY_ONLY');
assert.equal(bounded.scope.stressConcentrationAuthority, 'BOUNDED_ROUTE_UNITY_MULTIPLIER_ONLY');
assert.equal(bounded.scope.stressConcentrationEngineeringMeaning, 'NO_APPENDIX_B_STRESS_CONCENTRATION_AMPLIFICATION_APPLIED');
assert.equal(bounded.scope.appendixBStressConcentrationQualified, false);
assert.equal(bounded.scope.nonUnityStressConcentrationAuthorized, false);
assert.equal(bounded.scope.stressConcentrationSourceQualification, 'NOT_READY_FOR_IMPLEMENTATION');
assert.ok(bounded.remainingBlocked.includes('NONUNITY_STRESS_CONCENTRATION'));
assert.equal(bounded.scope.longitudinalMomentBendingSelection, 'SOURCE_GOVERNED_REQUIRED');
assert.equal(bounded.scope.attachmentRadiusBasis, 'OUTSIDE_RADIUS_AT_SHELL_JUNCTURE_SOURCE_QUALIFIED_REQUIRED');
assert.equal(bounded.scope.radialLoadCylinderLengthRule, 'P_REQUIRES_L_GE_RM');
assert.equal(bounded.scope.externalMomentEndDistanceRule, 'MC_OR_ML_REQUIRES_NEAREST_END_DISTANCE_GE_0P5_RM');
assert.equal(bounded.scope.stressOutputDomain, 'HOST_CYLINDRICAL_SHELL_AT_ATTACHMENT_SHELL_JUNCTURE');
assert.equal(bounded.scope.attachmentStressCalculated, false);
assert.equal(bounded.scope.nozzleStressCalculated, false);
assert.equal(bounded.scope.evaluatedStressLocations, 'WRC_TABLE5_EIGHT_SHELL_JUNCTURE_POINTS');
assert.equal(bounded.scope.eightPointEnvelopeBasis, 'MAXIMUM_OVER_EVALUATED_TABLE5_EIGHT_POINTS_ONLY');
assert.equal(bounded.scope.absoluteShellMaximumAssured, false);
assert.equal(bounded.scope.continuousJunctureSearchPerformed, false);
assert.equal(bounded.scope.arbitraryLoadingExtremaRequiresEngineeringJudgment, true);
assert.equal(projection.qualificationBoundary.emp1CProductionAuthority, 'NOT_AUTHORIZED');
assert.equal(projection.qualificationBoundary.emp1CRunAuthorized, false);
assert.equal(projection.qualificationBoundary.globalEmp1CRouteAuthority, false);
assert.equal(projection.qualificationBoundary.releaseQualified, false);

const globalQualification = projection.steps[2].qualification;
assert.equal(globalQualification.technicalQualificationReady, false);
assert.ok(globalQualification.blockerCodes.includes(EMP1_C_BLOCKER_CODES.WRC_SIGN_ARBITRATION_OPEN));
assert.deepEqual(projection.steps[2].blockers, globalQualification.blockerCodes);
assert.equal(projection.custody.bSourceEvidenceState, EMP1_B_SOURCE_CUSTODY_STATES.CURRENT);
assert.equal(isEmp1BackingStage('LAFEA.1'), true);
assert.equal(isEmp1BackingStage('LAFEA.2'), true);
assert.equal(isEmp1BackingStage('LAFEA.3'), false);
assert.equal(emp1StepForBackingStage('LAFEA.2').stepId, 'EMP.1.B');

console.log(JSON.stringify({
  status: 'PASS',
  productState: projection.state,
  suspendedRoute: bounded.routeId,
  suspensionReasons: reasons,
  boundedAxisAuthority: {
    state: bounded.scope.cylindricalLoadAxisAuthority,
    authorityId: bounded.scope.cylindricalLoadAxisAuthorityId,
    sourceSha256: bounded.scope.cylindricalLoadAxisSourceSha256,
    positivePRule: bounded.scope.wrcPositivePRule,
    rawFoundationRadialHintIsPolarityAuthority: bounded.scope.rawFoundationRadialHintIsPolarityAuthority,
  },
  limitations: bounded.limitations,
  stressConcentration: {
    Kn: bounded.scope.Kn,
    Kb: bounded.scope.Kb,
    mode: bounded.scope.stressConcentrationMode,
    authority: bounded.scope.stressConcentrationAuthority,
    appendixBQualified: bounded.scope.appendixBStressConcentrationQualified,
    nonUnityAuthorized: bounded.scope.nonUnityStressConcentrationAuthorized,
  },
  scope: {
    radialLoadCylinderLengthRule: bounded.scope.radialLoadCylinderLengthRule,
    externalMomentEndDistanceRule: bounded.scope.externalMomentEndDistanceRule,
    stressOutputDomain: bounded.scope.stressOutputDomain,
    eightPointEnvelopeBasis: bounded.scope.eightPointEnvelopeBasis,
    absoluteShellMaximumAssured: bounded.scope.absoluteShellMaximumAssured,
  },
  globalQualificationBlockers: globalQualification.blockerCodes,
  releaseQualified: false,
}, null, 2));
