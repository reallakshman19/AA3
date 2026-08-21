#!/usr/bin/env node
import assert from 'node:assert/strict';
import { calculateLocalAttachmentFoundation } from '../src/core/local-stress/index.js';
import { canonicalFixture } from './lafea.1-fixtures.mjs';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS,
  evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate,
  runEmp1Wrc537Gamma5ZeroDpRoute,
} from '../src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';
import {
  EMP1_C_WRC537_APPLICABILITY_SOURCE_SUSPENSION_REASON,
  EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON,
  EMP1_C_WRC537_LONGITUDINAL_CURVE_SUSPENSION_REASON,
  EMP1_C_WRC537_LONGITUDINAL_EIGHT_POINT_AUTHORITY_STATE,
  EMP1_C_WRC537_R0_SOURCE_SUSPENSION_REASON,
  EMP1_C_WRC537_ROUTE_REQUALIFICATION_SUSPENSION_REASON,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  emp1CBoundedRoute,
} from '../src/core/emp1/emp1-c-bounded-route-registry.js';
import {
  EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_ID,
  EMP1_WRC537_CYLINDRICAL_AXIS_SOURCE_SHA256,
  deriveEmp1Wrc537CylindricalAxisAuthority,
} from '../src/core/emp1/emp1-wrc537-cylindrical-axis-authority.js';
import {
  EMP1_WRC537_APPLICABILITY_SOURCE_AUTHORITY,
  EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFIED,
  EMP1_WRC537_ATTACHMENT_STATION_BASIS,
  EMP1_WRC537_CYLINDER_LENGTH_BASIS,
  createEmp1Wrc537ApplicabilitySourceAuthority,
} from '../src/core/emp1/emp1-wrc537-applicability-source-authority.js';
import {
  EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_ID,
} from '../src/core/emp1/emp1-wrc537-longitudinal-moment-curve-selection.js';

const reasons = [EMP1_C_WRC537_ROUTE_REQUALIFICATION_SUSPENSION_REASON];
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED, false);
assert.deepEqual(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS, reasons);
for (const resolved of [
  EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON,
  EMP1_C_WRC537_R0_SOURCE_SUSPENSION_REASON,
  EMP1_C_WRC537_LONGITUDINAL_CURVE_SUSPENSION_REASON,
  EMP1_C_WRC537_APPLICABILITY_SOURCE_SUSPENSION_REASON,
]) {
  assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS.includes(resolved), false,
    `resolved source blocker reappeared: ${resolved}`);
}
assert.equal(
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.cylindricalLoadAxisSignAuthority,
  'SOURCE_QUALIFIED_RUNTIME_POLARITY_REQUIRED',
);
assert.equal(
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.attachmentOutsideRadiusSourceQualification,
  'QUALIFIED_FOR_BOUNDED_R0_CUSTODY',
);
assert.equal(
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.longitudinalMomentCurveSelectionAuthority,
  EMP1_C_WRC537_LONGITUDINAL_EIGHT_POINT_AUTHORITY_STATE,
);
assert.equal(
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.longitudinalMomentCurveSelectionAuthorityId,
  EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_ID,
);
assert.equal(
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.cylindricalApplicabilitySourceAuthority,
  EMP1_WRC537_APPLICABILITY_SOURCE_AUTHORITY,
);
assert.equal(
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.cylindricalApplicabilitySourceQualification,
  EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFIED,
);
assert.equal(
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.cylindricalApplicabilityNearestEndDistanceBasis,
  'DERIVED_MIN_X_L_MINUS_X',
);
assert.equal(
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.cylindricalLoadAxisAuthorityId,
  EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_ID,
);
assert.equal(
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.cylindricalLoadAxisSourceSha256,
  EMP1_WRC537_CYLINDRICAL_AXIS_SOURCE_SHA256,
);

const registry = emp1CBoundedRoute(EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID);
assert.deepEqual(registry.suspensionReasons, reasons);
assert.equal(registry.registered, false);
assert.equal(registry.engineeringUseAuthorized, false);
assert.equal(registry.method.routeRequalificationRequired, true);
assert.equal(registry.scope.rawFoundationRadialHintIsPolarityAuthority, false);
assert.equal(registry.scope.runtimeSourcePolarityEvidenceRequired, true);
assert.equal(registry.scope.runtimeAttachmentSourceEvidenceRequired, true);
assert.equal(registry.scope.legacyAttachmentSourceAuthorized, false);
assert.equal(registry.scope.applicabilitySourceAuthority,
  EMP1_WRC537_APPLICABILITY_SOURCE_AUTHORITY);
assert.equal(registry.scope.applicabilitySourceQualification,
  EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFIED);
assert.equal(registry.scope.nearestEndDistanceBasis, 'DERIVED_MIN_X_L_MINUS_X');
assert.equal(registry.scope.runtimeApplicabilitySourceEvidenceRequired, true);
assert.equal(registry.scope.legacyApplicabilityEvidenceAuthorizedForProduction, false);
assert.equal(registry.scope.longitudinalMomentCurveSelectionAuthority,
  EMP1_C_WRC537_LONGITUDINAL_EIGHT_POINT_AUTHORITY_STATE);
assert.equal(registry.scope.longitudinalMomentCurveSelectionAuthorityId,
  EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_ID);
assert.equal(registry.scope.offAxisLongitudinalMomentMaximumAuthorized, false);
assert.ok(registry.remainingBlocked.includes('OFF_AXIS_LONGITUDINAL_MOMENT_MAXIMUM'));

const model = routeFixture();
const result = calculateLocalAttachmentFoundation(model);
assert.equal(result.qualification.state, 'ACCEPTED');
const axisAuthority = deriveEmp1Wrc537CylindricalAxisAuthority({
  foundationResult: result,
  foundationModel: model,
  loadCaseIdentity: 'LC-1',
});
assert.deepEqual(axisAuthority.frameInput.nozzleCenterlineGlobal, [0, 0, -1]);
const applicabilitySourceAuthority = createEmp1Wrc537ApplicabilitySourceAuthority({
  geometryIdentity: 'EMP1-15-ROUTE-CYLINDER',
  cylinderLengthBasis: EMP1_WRC537_CYLINDER_LENGTH_BASIS,
  cylinderLength: 300,
  attachmentStationBasis: EMP1_WRC537_ATTACHMENT_STATION_BASIS,
  attachmentStationFromCylinderStart: 80,
  unit: 'mm',
  cylinderLengthSourceReference: 'EMP1-15/QUALIFICATION/CYLINDER-LENGTH',
  attachmentStationSourceReference: 'EMP1-15/QUALIFICATION/WRC-STATION',
  productionObservationUsedToSetAuthority: false,
});
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
const comparison = evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate(input);
assert.equal(comparison.axisAuthority.state, 'QUALIFIED_SOURCE_POLARITY');
assert.equal(comparison.numerics.geometry.attachmentRadiusBasis,
  'OUTSIDE_RADIUS_AT_SHELL_JUNCTURE');
assert.equal(comparison.numerics.longitudinalMomentBendingAuthority.authorityId,
  EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_ID);
assert.equal(comparison.numerics.curveFigureMap.circ.Mlbend, '1B');
assert.equal(comparison.numerics.curveFigureMap.long.Mlbend, '2B');
assert.equal(comparison.numerics.extremaScope.evaluatedLocationCount, 8);
assert.equal(comparison.numerics.extremaScope.continuousJunctureSearchPerformed, false);
assert.equal(comparison.applicability.status, 'PASS_WRC537_4_5_SOURCE_LIMITS_QUALIFIED');
assert.equal(comparison.applicability.productionUseAuthorized, true);
assert.equal(comparison.applicability.evidence.cylinderLength, 300);
assert.equal(comparison.applicability.evidence.nearestCylinderEndDistance, 80);
assert.equal(comparison.numerics.applicability.sourceAuthoritySemanticHash,
  applicabilitySourceAuthority.semanticHash);
assert.equal(comparison.stressScope.domain,
  'HOST_CYLINDRICAL_SHELL_AT_ATTACHMENT_SHELL_JUNCTURE');
assert.equal(comparison.stressScope.attachmentStressesCalculated, false);

assert.throws(
  () => evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({ ...input, applicabilitySourceAuthority: undefined }),
  (error) => error?.code === 'EMP1_WRC537_4_5_QUALIFIED_SOURCE_AUTHORITY_REQUIRED',
);

let caught = null;
try { runEmp1Wrc537Gamma5ZeroDpRoute(input); } catch (error) { caught = error; }
assert.equal(caught?.code, 'EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENDED');
assert.deepEqual(caught.reasons, reasons);

console.log(JSON.stringify({
  status: 'PASS_WRC_SOURCE_AUTHORITIES_CLOSED_ROUTE_REQUALIFICATION_REMAINS',
  resolvedSourceBlockers: [
    EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON,
    EMP1_C_WRC537_R0_SOURCE_SUSPENSION_REASON,
    EMP1_C_WRC537_LONGITUDINAL_CURVE_SUSPENSION_REASON,
    EMP1_C_WRC537_APPLICABILITY_SOURCE_SUSPENSION_REASON,
  ],
  applicabilityAuthority: {
    authority: applicabilitySourceAuthority.authority,
    semanticHash: applicabilitySourceAuthority.semanticHash,
    cylinderLength: applicabilitySourceAuthority.cylinderLength,
    nearestEndDistance: applicabilitySourceAuthority.nearestCylinderEndDistance,
  },
  remainingSuspensionReasons: reasons,
  productionRouteAuthorized: false,
  routeRequalificationRequired: true,
}, null, 2));

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
