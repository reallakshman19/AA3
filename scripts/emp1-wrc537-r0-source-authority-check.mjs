#!/usr/bin/env node
import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-primitives/canonical-json.js';
import { calculateLocalAttachmentScreening } from '../src/core/local-attachment-screening/index.js';
import {
  EMP1_WRC537_ATTACHMENT_DIAMETER_BASIS,
  EMP1_WRC537_ATTACHMENT_PHYSICAL_LOCATION,
  EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFIED,
  createEmp1Wrc537AttachmentSourceAuthority,
  requireEmp1Wrc537QualifiedAttachmentSourceAuthority,
} from '../src/core/emp1/emp1-wrc537-attachment-source-authority.js';
import {
  EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFICATION,
  createEmp1RetainedSectionScreeningLayer,
  deriveEmp1Wrc537SourceCustody,
  requireEmp1Wrc537QualifiedR0SourceCustody,
} from '../src/core/emp1/emp1-wrc537-source-custody.js';
import {
  EMP1_C_WRC537_APPLICABILITY_SOURCE_SUSPENSION_REASON,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  EMP1_C_WRC537_LONGITUDINAL_CURVE_SUSPENSION_REASON,
  EMP1_C_WRC537_R0_SOURCE_SUSPENSION_REASON,
  emp1CBoundedRoute,
} from '../src/core/emp1/emp1-c-bounded-route-registry.js';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION,
  requireEmp1Wrc537Gamma5ZeroDpRuntimeSourceAuthority,
} from '../src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';
import { screeningRequestFixture } from './lafea.2-fixtures.mjs';

const request = screeningRequestFixture();
const screeningResult = calculateLocalAttachmentScreening(request);
assert.equal(screeningResult.qualification.state, 'ACCEPTED');

const binding = {
  geometryIdentity: 'EMP1-R0-TYPED-SOURCE-TEST',
  outsideDiameter: 35.42857142857143,
  diameterBasis: EMP1_WRC537_ATTACHMENT_DIAMETER_BASIS,
  physicalLocation: EMP1_WRC537_ATTACHMENT_PHYSICAL_LOCATION,
  unit: 'mm',
  sourceReference: 'QUALIFICATION/DRAWING-N1/NOZZLE-OD-AT-SHELL-JUNCTURE',
};
const authority = createEmp1Wrc537AttachmentSourceAuthority({
  ...binding,
  sourceBindingSemanticHash: semanticHash(binding),
  productionObservationUsedToSetAuthority: false,
});
assert.equal(authority.sourceQualification, EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFIED);
assert.equal(requireEmp1Wrc537QualifiedAttachmentSourceAuthority(authority).semanticHash, authority.semanticHash);

const typedLayer = createEmp1RetainedSectionScreeningLayer({
  screeningRequest: request,
  screeningResult,
  attachmentSourceAuthority: authority,
});
const typedCustody = deriveEmp1Wrc537SourceCustody({
  foundationResult: request.sourceEvidence.foundationResult,
  sectionScreening: typedLayer,
  loadCaseIdentity: 'LC-A',
});
const qualified = requireEmp1Wrc537QualifiedR0SourceCustody(typedCustody);
assert.equal(qualified.geometry.attachmentRadiusSourceQualification, EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFIED);
close(qualified.geometry.attachmentOutsideRadius, 17.714285714285715, 'qualified r0');
close(qualified.geometry.beta, 0.155, 'qualified beta');
assert.equal(qualified.geometrySourceReferences.attachmentPhysicalLocation, EMP1_WRC537_ATTACHMENT_PHYSICAL_LOCATION);
assert.equal(qualified.geometrySourceReferences.attachmentSourceBindingSemanticHash, semanticHash(binding));

const runtime = requireEmp1Wrc537Gamma5ZeroDpRuntimeSourceAuthority({ attachmentSourceAuthority: authority });
assert.equal(runtime.attachmentSourceAuthority.semanticHash, authority.semanticHash);
expectCode(
  () => requireEmp1Wrc537Gamma5ZeroDpRuntimeSourceAuthority({}),
  'EMP1_WRC537_R0_QUALIFIED_SOURCE_AUTHORITY_REQUIRED',
);

const legacyLayer = createEmp1RetainedSectionScreeningLayer({
  screeningRequest: request,
  screeningResult,
  geometryIdentity: binding.geometryIdentity,
  attachmentDiameter: binding.outsideDiameter,
  attachmentSourceReference: binding.sourceReference,
});
assert.equal(legacyLayer.attachmentGeometryEvidence.sourceQualification, EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFICATION);
const legacyCustody = deriveEmp1Wrc537SourceCustody({
  foundationResult: request.sourceEvidence.foundationResult,
  sectionScreening: legacyLayer,
  loadCaseIdentity: 'LC-A',
});
expectCode(
  () => requireEmp1Wrc537QualifiedR0SourceCustody(legacyCustody),
  'EMP1_WRC537_R0_QUALIFIED_SOURCE_AUTHORITY_REQUIRED',
);
expectCode(
  () => createEmp1Wrc537AttachmentSourceAuthority({ ...binding, diameterBasis: 'GENERIC_DIAMETER', sourceBindingSemanticHash: semanticHash(binding) }),
  'EMP1_WRC537_R0_OUTSIDE_DIAMETER_BASIS_REQUIRED',
);
expectCode(
  () => createEmp1Wrc537AttachmentSourceAuthority({ ...binding, physicalLocation: 'UNSPECIFIED', sourceBindingSemanticHash: semanticHash(binding) }),
  'EMP1_WRC537_R0_SHELL_JUNCTURE_LOCATION_REQUIRED',
);
expectCode(
  () => createEmp1Wrc537AttachmentSourceAuthority({ ...binding, sourceBindingSemanticHash: semanticHash(binding), productionObservationUsedToSetAuthority: true }),
  'EMP1_WRC537_R0_PRODUCTION_OBSERVATION_PROHIBITED',
);
const tampered = structuredClone(authority);
tampered.outsideDiameter *= 2;
expectCode(
  () => requireEmp1Wrc537QualifiedAttachmentSourceAuthority(tampered),
  'EMP1_WRC537_R0_SOURCE_AUTHORITY_HASH_MISMATCH',
);

const route = emp1CBoundedRoute(EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID);
const expectedReasons = [
  EMP1_C_WRC537_LONGITUDINAL_CURVE_SUSPENSION_REASON,
  EMP1_C_WRC537_APPLICABILITY_SOURCE_SUSPENSION_REASON,
];
assert.deepEqual(route.suspensionReasons, expectedReasons);
assert.equal(route.suspensionReasons.includes(EMP1_C_WRC537_R0_SOURCE_SUSPENSION_REASON), false);
assert.equal(route.registered, false);
assert.equal(route.engineeringUseAuthorized, false);
assert.equal(route.scope.attachmentRadiusSourceAuthority, 'EMP1_TYPED_ENGINEERING_SOURCE_BINDING_V1');
assert.equal(route.scope.attachmentRadiusSourceQualification, EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFIED);
assert.equal(route.scope.runtimeAttachmentSourceEvidenceRequired, true);
assert.equal(route.scope.legacyAttachmentSourceAuthorized, false);
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.attachmentOutsideRadiusSourceAuthority,
  'TYPED_ENGINEERING_SOURCE_BINDING_RUNTIME_REQUIRED');
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.attachmentOutsideRadiusSourceQualification,
  EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFIED);

console.log(JSON.stringify({
  status: 'PASS_TYPED_WRC_R0_SOURCE_AUTHORITY',
  r0: qualified.geometry.attachmentOutsideRadius,
  beta: qualified.geometry.beta,
  sourceQualification: qualified.geometry.attachmentRadiusSourceQualification,
  legacyRejectedForProduction: true,
  basisSpoofRejected: true,
  locationSpoofRejected: true,
  hashDriftRejected: true,
  productionObservationRejected: true,
  directRouteRuntimeAuthorityGuarded: true,
  resolvedSuspensionReason: EMP1_C_WRC537_R0_SOURCE_SUSPENSION_REASON,
  remainingSuspensionReasons: expectedReasons,
  productionRouteAuthorized: false,
}, null, 2));

function expectCode(fn, code) {
  let error = null;
  try { fn(); } catch (caught) { error = caught; }
  assert.equal(error?.code, code, `expected ${code}, got ${error?.code}`);
}
function close(actual, expected, label) {
  const tolerance = Math.max(1, Math.abs(expected)) * 1e-12;
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual}`);
}
