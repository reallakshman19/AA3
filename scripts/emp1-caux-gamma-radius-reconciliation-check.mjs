import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const RECON_HASH = 'b954eb34a18d11bea1f5af979f31781d8e40670fba480f1365f78116f812b2a8';
const INTERP_HASH = '193efc2a78ec52eac81009f7a47c721b9c9891ca4d8ce1b9f0ad711218d0fd13';
const QUAL3_HASH = '9c57953aff802624650050c251d05b3ca8ea6a190bec77863f03ec790abc353f';
const V2_HASH = 'f7b3d5cd789d05588987230f84c54db642d07202624d24d1ac9ee886bfc8ba1a';
const CAUX_SHA = 'c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e';
const WRC_SHA = '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';

const recon = await readJson('validation/emp1/caux2017-wrc01f/caux-pp24-31-gamma-radius-reconciliation-v1.json');
const interpolation = await readJson('validation/emp1/wrc537-2013/gamma-interpolation-authority-review-v2.json');
const qualification = await readJson('validation/emp1/caux2017-wrc01f/caux-pp24-31-benchmark-qualification-v3.json');

assert.equal(semanticHash(recon), RECON_HASH);
assert.equal(recon.source.rawPdfSha256, CAUX_SHA);
assert.equal(recon.source.directPdfPageReobservation, 'PASS');
assert.deepEqual(recon.source.observedPages, [25, 26]);
assert.equal(recon.wrcCylindricalRadiusAuthority.sourceDocumentSha256, WRC_SHA);
assert.equal(
  recon.status,
  'PASS_CAUX_INTERNAL_CORROSION_SAME_STATE_MID_RADIUS_RECONCILIATION',
);

const { vesselOutsideDiameter_mm: doMm, nominalShellThickness_mm: tNom, internalCorrosionAllowance_mm: ca } =
  recon.sourceInputs;
const t = tNom - ca;
const ro = doMm / 2;
const ri = ro - t;
const rm = ro - t / 2;
const gamma = rm / t;
assert.equal(t, 19);
assert.equal(ro, 922);
assert.equal(ri, 903);
assert.equal(rm, 912.5);
approx(gamma, 48.026315789473685, 1e-14, 'same-state gamma');
assert.equal(Math.round(gamma * 100) / 100, recon.sourceInputs.reportedGamma);
assert.equal(recon.reconciliation.reportedGammaRoundedMatch, true);
assert.equal(recon.reconciliation.caesarReportComputationConsistentWithWrcMidRadiusSemantics, true);

const annotatedGamma = recon.presenterAnnotation.annotatedMeanRadius_mm
  / recon.presenterAnnotation.annotatedShellThickness_mm;
approx(annotatedGamma, 47.94736842105263, 1e-14, 'presenter annotation gamma');
assert.equal(recon.presenterAnnotation.wallStateConsistent, false);
assert.equal(
  recon.reconciliation.classification,
  'PRESENTER_ANNOTATION_MIXES_NOMINAL_RADIUS_WITH_CORRODED_THICKNESS',
);
assert.equal(recon.scope.mayEstablishGlobalCorrosionGeometryPolicy, false);
assert.equal(recon.freeze.benchmarkExpectedValuesChanged, false);
assert.equal(recon.freeze.comparisonToleranceChanged, false);
assert.equal(recon.freeze.productionOutputUsedToChooseSourceInterpretation, false);
assert.equal(recon.authority.mayCloseThisBenchmarkGammaRadiusBasis, true);
assertFalseAuthority(recon.authority);

assert.equal(semanticHash(interpolation), INTERP_HASH);
assert.equal(interpolation.controlledSource.rawPdfSha256, WRC_SHA);
assert.equal(interpolation.primaryEvidence.exactCrossGammaNumericalRule, 'NOT_ESTABLISHED');
assert.equal(
  interpolation.primaryEvidence.qualifiedSelectionPolicy,
  'EXACT_SOURCE_TABULATED_GAMMA_ONLY',
);
assert.ok(interpolation.primaryEvidence.unresolvedRequiredFields.length >= 10);
assert.equal(interpolation.secondaryImplementationEvidence.observedRule.gammaCoordinate, 'LOGARITHMIC');
assert.equal(interpolation.secondaryImplementationEvidence.observedRule.betaCoordinate, 'LINEAR');
assert.equal(interpolation.secondaryImplementationEvidence.controlledDocumentIdentityRetained, false);
assert.equal(interpolation.secondaryImplementationEvidence.adequateForWrcMethodFidelity, false);
assert.equal(interpolation.secondaryImplementationEvidence.adequateForRouteEngineeringUseAuthorization, false);
assert.equal(interpolation.existingOwnerDirectedPolicy.defaultCoordinate, 'LINEAR_GAMMA');
assert.equal(interpolation.existingOwnerDirectedPolicy.sourceRuleQualified, false);
assert.equal(interpolation.benchmarkEvidence.mayCreateInterpolationSourceAuthority, false);
assert.equal(interpolation.benchmarkEvidence.maySelectInterpolationCoordinateByBestFit, false);
assert.equal(interpolation.routeDisposition.engineeringUseAuthorized, false);
assert.equal(
  interpolation.routeDisposition.suspensionReason,
  'NON_TABULATED_GAMMA_INTERPOLATION_RULE_NOT_SOURCE_QUALIFIED',
);
assert.equal(interpolation.routeDisposition.decision, 'KEEP_FAIL_CLOSED_ENGINEERING_USE_UNAUTHORIZED');
assert.equal(interpolation.status, 'BLOCKED_PRIMARY_GAMMA_INTERPOLATION_RULE_UNQUALIFIED');
assertFalseAuthority(interpolation.authority);

assert.equal(semanticHash(qualification), QUAL3_HASH);
assert.equal(qualification.priorQualification.semanticHash, V2_HASH);
assert.equal(qualification.directPdfObservation.rawPdfSha256, CAUX_SHA);
assert.equal(qualification.gammaRadiusReconciliation.semanticHash, RECON_HASH);
assert.equal(
  qualification.status,
  'PASS_FINAL_CAUX_SOURCE_QUALIFICATION_GAMMA_RADIUS_RECONCILED_REFERENCE_FREEZE_PRESERVED',
);
assert.equal(
  qualification.independentChecks.gammaRadiusBasis.status,
  'PASS_CAUX_INTERNAL_CORROSION_SAME_STATE_MID_RADIUS_RECONCILIATION',
);
assert.equal(qualification.independentChecks.gammaRadiusBasis.sameStateMeanRadius_mm, 912.5);
approx(qualification.independentChecks.gammaRadiusBasis.computedGamma, gamma, 1e-14, 'qualification gamma');
assert.equal(qualification.independentChecks.gammaRadiusBasis.sourceDisplayedGammaMatchAt2dp, true);
assert.equal(qualification.independentChecks.gammaRadiusBasis.mayCloseThisBenchmarkGammaRadiusBasis, true);
assert.equal(qualification.independentChecks.gammaRadiusBasis.mayEstablishGlobalCorrosionGeometryPolicy, false);
assert.equal(qualification.independentChecks.gammaRadiusBasis.mayCreateWrcMethodAuthority, false);
assert.equal(qualification.remaining.thisBenchmarkGammaRadiusBasis, false);
assert.equal(qualification.remaining.globalAssessmentCorrosionGeometryPolicy, true);
assert.equal(qualification.remaining.wrcCrossGammaInterpolationRule, true);
assert.equal(qualification.freeze.productionOutputObservedForExpectedValueSelection, false);
assert.equal(qualification.freeze.toleranceWideningAfterMismatchProhibited, true);
assertFalseAuthority(qualification.authority);

console.log(JSON.stringify({
  schema: 'emp1-caux-gamma-radius-reconciliation-check/v1',
  gammaRadiusStatus: recon.status,
  sameStateMeanRadius_mm: rm,
  computedGamma: gamma,
  sourceDisplayedGamma: recon.sourceInputs.reportedGamma,
  interpolationAuthorityStatus: interpolation.status,
  interpolatedEngineeringUseAuthorized: interpolation.routeDisposition.engineeringUseAuthorized,
  qualificationStatus: qualification.status,
  reconciliationSemanticHash: RECON_HASH,
  interpolationReviewSemanticHash: INTERP_HASH,
  qualificationSemanticHash: QUAL3_HASH,
}, null, 2));
console.log('EMP1_CAUX_GAMMA_RADIUS_RECONCILIATION_CHECK_PASS');

function assertFalseAuthority(authority) {
  for (const key of [
    'wrcMethodAuthority',
    'engineeringUseAuthorized',
    'productionUseAuthorized',
    'codeComplianceAuthorized',
    'releaseAuthorityGranted',
  ]) assert.equal(authority[key], false, `${key} must remain false`);
}
function approx(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`);
}
function semanticHash(value) {
  const copy = structuredClone(value);
  delete copy.semanticHash;
  return createHash('sha256').update(stableJson(copy)).digest('hex');
}
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}
