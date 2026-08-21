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
  EMP1_C_WRC537_R0_SOURCE_SUSPENSION_REASON,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  emp1CBoundedRoute,
} from '../src/core/emp1/emp1-c-bounded-route-registry.js';
import {
  EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_ID,
  EMP1_WRC537_CYLINDRICAL_AXIS_SOURCE_SHA256,
  deriveEmp1Wrc537CylindricalAxisAuthority,
} from '../src/core/emp1/emp1-wrc537-cylindrical-axis-authority.js';

const reasons = [
  EMP1_C_WRC537_LONGITUDINAL_CURVE_SUSPENSION_REASON,
  EMP1_C_WRC537_R0_SOURCE_SUSPENSION_REASON,
  EMP1_C_WRC537_APPLICABILITY_SOURCE_SUSPENSION_REASON,
];
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED, false);
assert.deepEqual(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS, reasons);
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS
  .includes(EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON), false);
assert.equal(
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.cylindricalLoadAxisSignAuthority,
  'SOURCE_QUALIFIED_RUNTIME_POLARITY_REQUIRED',
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
assert.equal(registry.scope.rawFoundationRadialHintIsPolarityAuthority, false);
assert.equal(registry.scope.runtimeSourcePolarityEvidenceRequired, true);

const model = routeFixture();
const result = calculateLocalAttachmentFoundation(model);
assert.equal(result.qualification.state, 'ACCEPTED');
const axisAuthority = deriveEmp1Wrc537CylindricalAxisAuthority({
  foundationResult: result,
  foundationModel: model,
  loadCaseIdentity: 'LC-1',
});
assert.deepEqual(axisAuthority.frameInput.nozzleCenterlineGlobal, [0, 0, -1]);
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
  stressConcentration: { Kn: 1, Kb: 1 },
};
const comparison = evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate(input);
assert.equal(comparison.axisAuthority.state, 'QUALIFIED_SOURCE_POLARITY');
assert.equal(comparison.numerics.geometry.attachmentRadiusBasis,
  'OUTSIDE_RADIUS_AT_SHELL_JUNCTURE');
assert.equal(comparison.numerics.curveFigureMap.circ.Mlbend, '1B');
assert.equal(comparison.numerics.curveFigureMap.long.Mlbend, '2B');
assert.equal(comparison.applicability.status, 'INCOMPLETE_WRC537_4_5_SOURCE_EVIDENCE');
assert.equal(comparison.stressScope.domain,
  'HOST_CYLINDRICAL_SHELL_AT_ATTACHMENT_SHELL_JUNCTURE');
assert.equal(comparison.stressScope.attachmentStressesCalculated, false);
let caught = null;
try { runEmp1Wrc537Gamma5ZeroDpRoute(input); } catch (error) { caught = error; }
assert.equal(caught?.code, 'EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENDED');
assert.deepEqual(caught.reasons, reasons);

console.log(JSON.stringify({
  status: 'PASS_AXIS_AUTHORITY_CLOSED_OTHER_WRC_AUTHORITIES_STILL_FAIL_CLOSED',
  resolvedAxisBlocker: EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON,
  axisAuthority: {
    state: axisAuthority.state,
    authorityId: axisAuthority.authorityId,
    sourceDocumentSha256: axisAuthority.sourceDocumentSha256,
    wrcPositivePGlobal: axisAuthority.basisGlobal.P,
  },
  remainingSuspensionReasons: reasons,
  r0Basis: comparison.numerics.geometry.attachmentRadiusBasis,
  applicability: comparison.applicability.status,
  stressDomain: comparison.stressScope.domain,
  comparisonLongitudinalMomentFigures: ['1B', '2B'],
  productionRouteAuthorized: false,
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
