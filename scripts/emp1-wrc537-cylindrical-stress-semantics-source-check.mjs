import fs from 'node:fs';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const readText = (path) => fs.readFileSync(path, 'utf8');

const reconciliation = readJson(
  'validation/emp1/wrc537-2013/cylindrical-stress-semantics-source-reconciliation-v1.json',
);
const sign = readJson(
  'validation/emp1/wrc537-2013/cylindrical-surface-sign-source-qualification-v1.json',
);
const intensity = readJson(
  'validation/emp1/wrc537-2013/stress-intensity-source-qualification-v1.json',
);
const professional = readJson(
  'validation/emp1/release/emp1-professional-release-current-state-v1.json',
);
const route = readText('src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js');
const registry = readText('src/core/emp1/emp1-c-bounded-route-registry.js');
const doc = readText('docs/emp1/WRC537_2013_Cylindrical_Stress_Semantics_Authority.md');

assertEqual(
  reconciliation.status,
  'BLOCKED_CURRENT_ROUTE_AUTHORIZED_STRESS_SEMANTICS_SOURCE_GATES_UNQUALIFIED',
);
assertEqual(reconciliation.source.rawPdfSha256,
  '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2');
assertEqual(reconciliation.source.gitBlobSha1,
  'ce861233928154145a9257efbbf8dbef3f5a17d1');
assertEqual(reconciliation.source.directPrimaryPageObservation,
  'NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT');

assertEqual(sign.status,
  'BLOCKED_PARTIAL_TABLE5_SIGN_AUTHORITY_PHYSICAL_SURFACE_SEMANTICS_UNQUALIFIED');
assertEqual(intensity.status,
  'BLOCKED_PARTIAL_TABLE5_STRESS_INTENSITY_FORMULA_AUTHORITY_PLANE_STRESS_SEMANTICS_UNQUALIFIED');

for (const key of [
  'radialLoadSignPlacementQualified',
  'circumferentialMomentSignPlacementQualified',
  'longitudinalMomentSignPlacementQualified',
  'shearAndTorsionSignPlacementQualified',
  'oppositeLoadDirectionReversesApplicableSignsQualified',
]) assertEqual(sign.retainedTable5SignAuthority[key], true, `SIGN_AUTHORITY:${key}`);

for (const key of [
  'table5CombinedStressIntensityPostProcessingQualified',
  'combinedSigmaPhiSigmaXTauInputsQualified',
  'algebraicComponentSummationBeforeSQualified',
  'likeUnlikeAndZeroShearCaseStructureQualified',
  'table5SIsDerivedAfterComponentStressFormationQualified',
]) assertEqual(intensity.qualifiedSourceClaims[key], true, `INTENSITY_AUTHORITY:${key}`);

for (const key of [
  'uLowerPhysicalSurfaceMeaningQualified',
  'ABCDPhysicalLocationMeaningQualified',
  'membraneBendingSurfaceReconstructionQualified',
  'commonPhysicalPointSuperpositionQualified',
]) assertEqual(sign.primarySourceAuthority[key], false, `SURFACE_GATE_MUST_REMAIN_FALSE:${key}`);

for (const [key, value] of Object.entries(intensity.unqualifiedPrimarySourceClaims)) {
  assertEqual(value, false, `INTENSITY_GATE_MUST_REMAIN_FALSE:${key}`);
}
for (const [key, value] of Object.entries(reconciliation.sourceAuthorityStillFalse)) {
  assertEqual(value, false, `AGGREGATE_SOURCE_GATE_MUST_REMAIN_FALSE:${key}`);
}

requireText(route, 'export const EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED = true;');
requireText(route, 'engineeringUseAuthorized: true');
requireText(route, 'productionUseAuthorized: true');
requireText(registry, 'registered: true');
requireText(registry, 'engineeringUseAuthorized: true');
requireText(registry, 'globalEmp1CRouteAuthority: false');
requireText(registry, 'releaseQualified: false');

assertEqual(professional.runtimeAuthority.boundedProductionRouteAuthorized, true);
assertEqual(professional.runtimeAuthority.registryRegistered, true);
assertEqual(professional.runtimeAuthority.boundedEngineeringUseAuthorized, true);
assertEqual(professional.runtimeAuthority.globalEmp1CRouteAuthority, false);
assertEqual(professional.runtimeAuthority.codeComplianceAuthorized, false);
assertEqual(professional.runtimeAuthority.releaseQualified, false);
assertEqual(professional.sequenceStatus.professionalReleaseReady, false);
assertEqual(professional.releaseReady, false);

for (const [key, value] of Object.entries(reconciliation.changeBoundary)) {
  assertEqual(value, false, `NO_MUTATION_BOUNDARY:${key}`);
}
assertEqual(
  reconciliation.authoritySeparation.rule,
  'BOUNDED_WRC_ROUTE_AUTHORIZATION_DOES_NOT_BACK_PROPAGATE_TO_STRESS_RECONSTRUCTION_OR_STRESS_INTENSITY_SOURCE_SEMANTICS',
);
assertEqual(
  reconciliation.authoritySeparation.routeAuthorizationMayRemainTrueWhileSourceSemanticsRemainBlocked,
  true,
);
assertEqual(reconciliation.authoritySeparation.codeAcceptanceMayNotBeInferredFromStressIntensity, true);

requireText(doc, 'route authorization does not back-propagate');
requireText(doc, 'physical surface/common-point');
requireText(doc, 'plane-stress / sigma3 / Tresca');
requireText(doc, 'code acceptance');

console.log(JSON.stringify({
  status: 'PASS_CURRENT_ROUTE_STRESS_SEMANTICS_BOUNDARY_STATIC_CHECK',
  boundedRouteAuthorized: true,
  physicalSurfaceSemanticsAuthority: false,
  explicitPlaneStressSourceAuthority: false,
  codeComplianceAuthority: false,
  releaseAuthority: false,
  productionNumericsChanged: false,
}, null, 2));

function requireText(text, token) {
  if (!text.includes(token)) throw new Error(`EMP1 stress-semantics required token missing: ${token}`);
}

function assertEqual(actual, expected, label = '') {
  if (actual !== expected) {
    throw new Error(
      `EMP1 stress-semantics assertion failed${label ? ` ${label}` : ''}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}
