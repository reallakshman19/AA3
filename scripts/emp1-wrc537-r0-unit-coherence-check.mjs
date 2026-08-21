#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  EMP1_WRC537_ATTACHMENT_DIAMETER_BASIS,
  EMP1_WRC537_ATTACHMENT_PHYSICAL_LOCATION,
  createEmp1Wrc537AttachmentSourceAuthority,
} from '../src/core/emp1/emp1-wrc537-attachment-source-authority.js';
import {
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  emp1CBoundedRoute,
} from '../src/core/emp1/emp1-c-bounded-route-registry.js';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION,
  requireEmp1Wrc537Gamma5ZeroDpRuntimeSourceAuthority,
} from '../src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';

const geometry = {
  meanRadius: 100,
  shellThickness: 20,
  attachmentOutsideRadius: 17.714285714285715,
  gamma: 5,
  beta: 0.155,
};
const base = {
  geometryIdentity: 'EMP1-R0-UNIT-CUSTODY',
  outsideDiameter: 35.42857142857143,
  diameterBasis: EMP1_WRC537_ATTACHMENT_DIAMETER_BASIS,
  physicalLocation: EMP1_WRC537_ATTACHMENT_PHYSICAL_LOCATION,
  sourceReference: 'QUALIFICATION/R0-UNIT-CUSTODY',
  productionObservationUsedToSetAuthority: false,
};
const mmAuthority = createEmp1Wrc537AttachmentSourceAuthority({ ...base, unit: 'mm' });
const accepted = requireEmp1Wrc537Gamma5ZeroDpRuntimeSourceAuthority({
  geometry,
  attachmentSourceAuthority: mmAuthority,
});
assert.equal(accepted.canonicalLengthUnit, 'mm');

const inchAuthority = createEmp1Wrc537AttachmentSourceAuthority({ ...base, unit: 'in' });
expectCode(() => requireEmp1Wrc537Gamma5ZeroDpRuntimeSourceAuthority({
  geometry,
  attachmentSourceAuthority: inchAuthority,
}), 'EMP1_WRC537_GAMMA5_ZERO_DP_R0_SOURCE_UNIT_MISMATCH');

const route = emp1CBoundedRoute(EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID);
assert.equal(route.scope.canonicalLengthUnit, 'mm');
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.scopeContract.canonicalLengthUnit, 'mm');
assert.equal(route.scope.runtimeAttachmentSourceEvidenceRequired, true);
assert.equal(route.engineeringUseAuthorized, false);

console.log(JSON.stringify({
  status: 'PASS_WRC_R0_UNIT_COHERENCE',
  canonicalLengthUnit: 'mm',
  sameUnitAccepted: true,
  mixedUnitRejected: true,
  productionRouteAuthorized: false,
}, null, 2));

function expectCode(fn, code) {
  let error = null;
  try { fn(); } catch (caught) { error = caught; }
  assert.equal(error?.code, code, `expected ${code}, got ${error?.code}`);
}
