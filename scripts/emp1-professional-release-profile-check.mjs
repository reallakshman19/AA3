import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS,
} from '../src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';
import {
  EMP1_C_BOUNDED_PRODUCTION_ROUTES,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  EMP1_C_WRC537_ROUTE_REQUALIFICATION_SUSPENSION_REASON,
} from '../src/core/emp1/emp1-c-bounded-route-registry.js';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const WRC_SHA256 = '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
const CAUX_SHA256 = 'c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e';
const DATASET_HASH = 'fb440a292f8794430977f60f5365a678a9aff62a4dae3397621902964a0db73c';
const ORACLE_HASH = '60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18';
const LOCATIONS = ['Au', 'Al', 'Bu', 'Bl', 'Cu', 'Cl', 'Du', 'Dl'];

const profile = await readJson('validation/emp1/release/emp1-wrc537-gamma5-bounded-release-profile-v1.json');
const manifest = await readJson('validation/emp1/release/emp1-wrc537-gamma5-benchmark-manifest-v1.json');
const oracle = await readJson('validation/emp1/wrc537-2013/gamma5-post-authority-physical-oracle-v1.json');

assert.equal(profile.schema, 'emp1-release-profile/v1');
assert.equal(profile.releaseProfileId, 'EMP1_WRC537_2013_CYLINDRICAL_GAMMA5_ZERO_DP_V1');
assert.equal(profile.definitionState, 'FROZEN_BEFORE_PRODUCTION_AUTHORIZATION');
assert.equal(profile.issue, 1389);
assert.equal(profile.product.id, 'EMP.1');
assert.equal(profile.method.identity, 'WRC537_2013_CYLINDRICAL_ORIGINAL_GAMMA5_TABLE5_ZERO_DP');
assert.equal(profile.method.edition, '2013');
assert.equal(profile.method.sourceSha256, WRC_SHA256);
assert.equal(profile.method.datasetHash, DATASET_HASH);

assert.equal(profile.scope.shellFamily, 'CYLINDRICAL');
assert.equal(profile.scope.attachmentShape, 'ROUND');
assert.match(profile.scope.attachmentClass, /^BLOCKED_PENDING_ISSUE_1370/u);
assert.match(profile.scope.axisApplicability, /^BLOCKED_PENDING_ISSUE_1368/u);
assert.match(profile.scope.interactionIsolation, /^BLOCKED_PENDING_ISSUE_1373/u);
assert.equal(profile.scope.variant, 'ORIGINAL');
assert.equal(profile.scope.gamma, 5);
assert.deepEqual(profile.scope.beta, { min: 0.05, max: 0.5, inclusive: true });
assert.equal(profile.scope.differentialPressure, 0);
assert.equal(profile.scope.Kn, 1);
assert.equal(profile.scope.Kb, 1);
assert.deepEqual(profile.scope.recoveryLocations, LOCATIONS);
assert.equal(profile.scope.absoluteMaximumAssured, false);
assert.equal(profile.scope.continuousJunctureSearchPerformed, false);
assert.equal(profile.scope.hostShellStressOnly, true);
assert.equal(profile.scope.attachmentStressCalculated, false);
assert.equal(profile.scope.nozzleStressCalculated, false);
assert.equal(profile.scope.interpolationAllowed, false);
assert.equal(profile.scope.crossVariantFallbackAllowed, false);
assert.equal(profile.scope.offAxisMaximumAuthorized, false);

assert.equal(profile.requiredAuthorities.sourceCustody.state, 'PASS_SOURCE_CUSTODY');
const blockedIssueAuthorities = {
  surfaceSignSemantics: 1385,
  stressIntensitySemantics: 1383,
  thicknessBasis: 1375,
  meanRadiusBasis: 1377,
  materialTheory: 1379,
  attachmentAxis: 1368,
  attachmentClass: 1370,
  interactionIsolation: 1373,
};
for (const [key, issue] of Object.entries(blockedIssueAuthorities)) {
  assert.equal(profile.requiredAuthorities[key].state, 'BLOCKED', `${key} must remain blocked in PR-A`);
  assert.equal(profile.requiredAuthorities[key].issue, issue);
}
assert.equal(profile.requiredAuthorities.codeAcceptanceBoundary.issue, 1381);
assert.match(profile.requiredAuthorities.codeAcceptanceBoundary.state, /^BLOCKED/u);
assert.equal(profile.requiredAuthorities.cauxBenchmark.state, 'NOT_RUN_PENDING_PR_C_SOURCE_FREEZE');
assert.equal(profile.requiredAuthorities.gamma5ExactHeadQualification.state, 'NOT_RUN_PENDING_ISSUE_1333');
assert.match(profile.requiredAuthorities.postPromotionQualification.state, /^NOT_RUN/u);
assert.equal(profile.requiredAuthorities.ciExecution.issue, 54);
assert.match(profile.requiredAuthorities.ciExecution.state, /^BLOCKED/u);

assert.equal(profile.benchmark.physicalOracleHash, ORACLE_HASH);
assert.equal(oracle.semanticHash, ORACLE_HASH);
assert.equal(oracle.productionAuthority, false);
assert.equal(oracle.productionObservationUsed, false);

assert.equal(profile.codeCompliance.performed, false);
assert.equal(profile.codeCompliance.authorized, false);
assert.equal(profile.codeCompliance.state, 'NOT_ASSESSED');
assert.deepEqual(profile.releaseAuthority, {
  engineeringUseAuthorized: false,
  productionUseAuthorized: false,
  deploymentAuthorized: false,
  globalEmp1CRouteAuthority: false,
  releaseQualified: false,
});
assert.equal(profile.productionObservationUsedToChooseDefinition, false);
assert.equal(profile.authorityBoundary, 'DEFINITION_ONLY_NO_ENGINEERING_PRODUCTION_DEPLOYMENT_OR_CODE_AUTHORITY');

const requiredProhibitions = [
  'NO_NONZERO_DP',
  'NO_NONUNITY_SCF',
  'NO_GAMMA_INTERPOLATION',
  'NO_GAMMA_OTHER_THAN_5',
  'NO_BETA_OUTSIDE_0P05_TO_0P50',
  'NO_EXTRAPOLATED_VARIANT',
  'NO_OFF_AXIS_GLOBAL_MAXIMUM',
  'NO_SPHERICAL_ROUTE',
  'NO_NONROUND_ATTACHMENT',
  'NO_WRC297',
  'NO_NOZZLE_WALL_STRESS',
  'NO_CODE_PASS',
];
assert.deepEqual(profile.prohibitions, requiredProhibitions);

assert.equal(manifest.schema, 'emp1-wrc537-gamma5-benchmark-manifest/v1');
assert.equal(manifest.definitionState, 'FROZEN_BEFORE_PRODUCTION_AUTHORIZATION');
assert.equal(manifest.method.sourceSha256, WRC_SHA256);
assert.equal(manifest.method.datasetHash, DATASET_HASH);
assert.equal(manifest.physicalOracle.semanticHash, ORACLE_HASH);
assert.equal(manifest.physicalOracle.productionAuthority, false);
assert.equal(manifest.physicalOracle.productionObservationUsed, false);
assert.equal(manifest.physicalOracle.requiredWrcLoadComparisons, 6);
assert.equal(manifest.physicalOracle.requiredStressComparisons, 32);
assert.deepEqual(manifest.physicalOracle.locations, LOCATIONS);
assert.deepEqual(manifest.physicalOracle.stressFamilies, [
  'circumferential', 'longitudinal', 'shear', 'stressIntensity',
]);
assert.deepEqual(manifest.physicalOracle.tolerancePolicy, {
  absolute: 1e-12,
  relative: 1e-11,
  formula: 'max(absolute,max(1,abs(expected))*relative)',
  maximumToleranceRatio: 1,
});
assert.equal(manifest.caux.rawPdfSha256, CAUX_SHA256);
assert.deepEqual(manifest.caux.pdfPages, [24, 25, 26, 27, 28, 29, 30, 31]);
assert.equal(manifest.caux.sourceIdentityFrozen, true);
assert.equal(manifest.caux.sourceValuesExtracted, false);
assert.equal(manifest.caux.expectedValuesFrozen, false);
assert.equal(manifest.caux.independentHandCalculationStatus, 'NOT_RUN');
assert.equal(manifest.caux.releaseProfileDisposition, 'UNRESOLVED_PENDING_PR_C_SOURCE_EXTRACTION');
assert.equal(manifest.caux.productionOutputObservedForExpectedValueSelection, false);
assert.equal(manifest.caux.productionOutputUsedToChooseDefinition, false);
assert.equal(manifest.antiCircularity.productionExpectedValueRegenerationProhibited, true);
assert.equal(manifest.antiCircularity.toleranceWideningAfterMismatchProhibited, true);
assert.equal(manifest.antiCircularity.productionEvaluatorImportIntoIndependentOracleProhibited, true);
assert.equal(manifest.antiCircularity.cauxMayDefineWrcEquationsSignsCurvesDomainsOrTolerances, false);

assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED, false);
assert.ok(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS.includes(
  EMP1_C_WRC537_ROUTE_REQUALIFICATION_SUSPENSION_REASON,
));
const registeredRoute = EMP1_C_BOUNDED_PRODUCTION_ROUTES.find(
  (row) => row.routeId === EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
);
assert.ok(registeredRoute, 'bounded gamma5 registry row required');
assert.equal(registeredRoute.registered, false);
assert.equal(registeredRoute.engineeringUseAuthorized, false);
assert.equal(registeredRoute.globalEmp1CRouteAuthority, false);
assert.equal(registeredRoute.releaseQualified, false);
assert.equal(registeredRoute.method.sourceDocumentSha256, WRC_SHA256);
assert.equal(registeredRoute.method.datasetHash, DATASET_HASH);
assert.equal(registeredRoute.scope.gamma, 5);
assert.equal(registeredRoute.scope.betaMinimum, 0.05);
assert.equal(registeredRoute.scope.betaMaximum, 0.5);
assert.equal(registeredRoute.scope.differentialPressure, 0);
assert.equal(registeredRoute.scope.Kn, 1);
assert.equal(registeredRoute.scope.Kb, 1);
assert.equal(registeredRoute.scope.absoluteShellMaximumAssured, false);

console.log(JSON.stringify({
  schema: 'emp1-professional-release-profile-check/v1',
  status: 'PASS_DEFINITION_FROZEN_AUTHORITY_FALSE',
  releaseProfileId: profile.releaseProfileId,
  sourceSha256: WRC_SHA256,
  datasetHash: DATASET_HASH,
  physicalOracleHash: ORACLE_HASH,
  cauxSourceSha256: CAUX_SHA256,
  authority: {
    routeAuthorized: EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
    registryRegistered: registeredRoute.registered,
    engineeringUseAuthorized: registeredRoute.engineeringUseAuthorized,
    releaseQualified: registeredRoute.releaseQualified,
    globalEmp1CRouteAuthority: registeredRoute.globalEmp1CRouteAuthority,
    codeComplianceAuthorized: profile.codeCompliance.authorized,
  },
}, null, 2));

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(repoRoot, relativePath), 'utf8'));
}
