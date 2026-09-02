import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  EMP1_METHOD_AUTHORITY_PROJECTION_SCHEMA,
  EMP1_METHOD_AUTHORITY_STATE,
  projectEmp1MethodAuthority,
} from '../src/core/emp1/emp1-method-authority-projection.js';
import { currentEmp1WorkbenchRouteAuthority } from '../src/workspace/emp1-workbench-product-run.js';

const SNAPSHOT_SCHEMA = 'emp1-workbench-route-authority-snapshot/v1';

const authorized = projectEmp1MethodAuthority(snapshot());
assert.equal(authorized.schema, EMP1_METHOD_AUTHORITY_PROJECTION_SCHEMA);
assert.equal(authorized.state, EMP1_METHOD_AUTHORITY_STATE.AUTHORIZED_BOUNDED_ROUTE);
assert.equal(authorized.route.productionUseAuthorized, true);
assert.equal(authorized.route.registryPresent, true);
assert.equal(authorized.method.identity, 'METHOD-IDENTITY');
assert.equal(authorized.method.edition, 'EDITION');
assert.equal(authorized.method.sourceDocumentSha256, 'source-sha');
assert.equal(authorized.method.datasetHash, 'dataset-hash');
assert.equal(authorized.method.qualificationRecordSha256, 'qualification-sha');
assert.equal(authorized.method.loadProducerQualificationSha256, 'producer-sha');
assert.equal(authorized.scope.shellFamily, 'CYLINDRICAL');
assert.equal(authorized.scope.attachmentShape, 'ROUND');
assert.equal(authorized.scope.gamma, 5);
assert.equal(authorized.scope.betaMinimum, 0.05);
assert.equal(authorized.scope.betaMaximum, 0.5);
assert.equal(authorized.scope.differentialPressure, 0);
assert.equal(authorized.scope.Kn, 1);
assert.equal(authorized.scope.Kb, 1);
assert.equal(authorized.scope.interpolationAllowed, false);
assert.equal(authorized.scope.crossVariantFallbackAllowed, false);
assert.equal(authorized.scope.attachmentStressCalculated, false);
assert.equal(authorized.scope.nozzleStressCalculated, false);
assert.deepEqual(authorized.limitations, ['LIMITATION-A']);
assert.deepEqual(authorized.remainingBlocked, ['BLOCKED-EXTENSION-A']);
assert.equal(authorized.provenance.routeAuthorityHash, 'authority-hash');
assert.equal(authorized.applicabilityBoundary.methodScopeReported, true);
assert.equal(authorized.applicabilityBoundary.assessmentApplicabilityEvaluated, false);
assert.equal(authorized.applicabilityBoundary.authorityEstablishedByProjection, false);
assertAuthorityBoundary(authorized.authorityBoundary);
assert.equal(Object.isFrozen(authorized), true);
assert.equal(Object.isFrozen(authorized.route.routeModuleSuspensionReasons), true);
assert.equal(Object.isFrozen(authorized.limitations), true);
assert.equal(Object.isFrozen(authorized.scope), true);

const blockedSnapshot = snapshot({
  productionUseAuthorized: false,
  routeModuleAuthorized: false,
  routeModuleSuspensionReasons: ['ROUTE-MODULE-BLOCKED'],
});
blockedSnapshot.registry.engineeringUseAuthorized = false;
blockedSnapshot.registry.suspensionReasons = ['REGISTRY-BLOCKED'];
const blocked = projectEmp1MethodAuthority(blockedSnapshot);
assert.equal(blocked.state, EMP1_METHOD_AUTHORITY_STATE.BLOCKED);
assert.equal(blocked.route.productionUseAuthorized, false);
assert.deepEqual(blocked.route.routeModuleSuspensionReasons, ['ROUTE-MODULE-BLOCKED']);
assert.deepEqual(blocked.route.registrySuspensionReasons, ['REGISTRY-BLOCKED']);
assertAuthorityBoundary(blocked.authorityBoundary);

const notEstablished = projectEmp1MethodAuthority(snapshot({
  productionUseAuthorized: false,
  routeModuleAuthorized: false,
  registry: null,
}));
assert.equal(notEstablished.state, EMP1_METHOD_AUTHORITY_STATE.NOT_ESTABLISHED);
assert.equal(notEstablished.route.registryPresent, false);
assert.equal(notEstablished.method, null);
assert.equal(notEstablished.scope, null);
assert.equal(notEstablished.applicabilityBoundary.methodScopeReported, false);
assert.deepEqual(notEstablished.limitations, []);
assert.deepEqual(notEstablished.remainingBlocked, []);

assert.throws(
  () => projectEmp1MethodAuthority({ ...snapshot(), schema: 'wrong-schema' }),
  hasCode('EMP1_METHOD_AUTHORITY_SNAPSHOT_SCHEMA_INVALID'),
);
assert.throws(
  () => projectEmp1MethodAuthority(snapshot({ registry: null })),
  hasCode('EMP1_METHOD_AUTHORITY_AUTHORIZED_REGISTRY_REQUIRED'),
);
const mismatchedRoute = snapshot();
mismatchedRoute.registry.routeId = 'OTHER-ROUTE';
assert.throws(
  () => projectEmp1MethodAuthority(mismatchedRoute),
  hasCode('EMP1_METHOD_AUTHORITY_ROUTE_ID_MISMATCH'),
);

const liveAuthority = currentEmp1WorkbenchRouteAuthority();
const liveProjection = projectEmp1MethodAuthority(liveAuthority.snapshot);
assert.equal(liveProjection.provenance.routeAuthorityHash, liveAuthority.routeAuthorityHash);
assert.equal(
  liveProjection.route.productionUseAuthorized,
  liveAuthority.productionUseAuthorized,
);
assert.equal(liveProjection.route.routeId, liveAuthority.snapshot.routeId);
assert.equal(
  liveProjection.state === EMP1_METHOD_AUTHORITY_STATE.AUTHORIZED_BOUNDED_ROUTE,
  liveAuthority.productionUseAuthorized,
);
assertAuthorityBoundary(liveProjection.authorityBoundary);

const productionSource = readFileSync(
  new URL('../src/core/emp1/emp1-method-authority-projection.js', import.meta.url),
  'utf8',
);
assert.equal(/^\s*import\s/m.test(productionSource), false,
  'projection must not import an engineering authority owner');
for (const forbidden of [
  'emp1-c-bounded-route-registry',
  'emp1-wrc537-gamma5-zero-dp-route',
  'semanticHash(',
  'routeModuleAuthorized &&',
  'registry.registered &&',
  'engineeringUseAuthorized &&',
]) {
  assert.equal(productionSource.includes(forbidden), false,
    `projection must not contain authority reconstruction token: ${forbidden}`);
}
assert.match(productionSource, /snapshot\.productionUseAuthorized/,
  'projection must consume the existing top-level authority conclusion');
assert.match(productionSource, /assessmentApplicabilityEvaluated:\s*false/,
  'method scope must not be promoted to assessment applicability');
assert.match(productionSource, /createsMethodAuthority:\s*false/);
assert.match(productionSource, /createsApplicabilityAuthority:\s*false/);
assert.match(productionSource, /createsNumericalAuthority:\s*false/);
assert.match(productionSource, /createsCodeCompliance:\s*false/);
assert.match(productionSource, /createsReleaseAuthority:\s*false/);

console.log(JSON.stringify({
  schema: 'emp1-method-authority-projection-check/v1',
  status: 'PASS_READ_ONLY_EXISTING_ROUTE_AUTHORITY_PROJECTION',
  authorizedState: authorized.state,
  blockedState: blocked.state,
  notEstablishedState: notEstablished.state,
  liveRouteAuthorityHashPreserved:
    liveProjection.provenance.routeAuthorityHash === liveAuthority.routeAuthorityHash,
  assessmentApplicabilityEvaluated: false,
  authorityRecomputedByProjection: false,
  methodAuthorityCreatedByProjection: false,
  applicabilityAuthorityCreatedByProjection: false,
  numericalAuthorityCreatedByProjection: false,
  codeComplianceCreatedByProjection: false,
  releaseAuthorityCreatedByProjection: false,
}, null, 2));

function snapshot(overrides = {}) {
  return {
    schema: SNAPSHOT_SCHEMA,
    routeId: 'ROUTE-ID',
    productionUseAuthorized: true,
    routeModuleAuthorized: true,
    routeModuleSuspensionReasons: [],
    registry: registry(),
    semanticHash: 'authority-hash',
    ...overrides,
  };
}

function registry() {
  return {
    schema: 'bounded-route-registry/v1',
    routeId: 'ROUTE-ID',
    registered: true,
    engineeringUseAuthorized: true,
    suspensionReasons: [],
    method: {
      identity: 'METHOD-IDENTITY',
      edition: 'EDITION',
      sourceDocumentSha256: 'source-sha',
      datasetHash: 'dataset-hash',
      qualificationRecordSha256: 'qualification-sha',
      qualificationRecordRole: 'QUALIFICATION-ROLE',
      routeRequalificationRequired: false,
      loadProducerQualificationSha256: 'producer-sha',
    },
    scope: {
      shellFamily: 'CYLINDRICAL',
      attachmentShape: 'ROUND',
      variant: 'ORIGINAL',
      gamma: 5,
      betaMinimum: 0.05,
      betaMaximum: 0.5,
      differentialPressure: 0,
      canonicalLengthUnit: 'mm',
      interpolationAllowed: false,
      crossVariantFallbackAllowed: false,
      Kn: 1,
      Kb: 1,
      stressConcentrationMode: 'UNITY_ONLY',
      nonUnityStressConcentrationAuthorized: false,
      longitudinalMomentBendingSelection: 'EIGHT_POINT',
      offAxisLongitudinalMomentMaximumAuthorized: false,
      attachmentRadiusBasis: 'OUTSIDE_RADIUS_AT_SHELL_JUNCTURE',
      runtimeAttachmentSourceEvidenceRequired: true,
      runtimeApplicabilitySourceEvidenceRequired: true,
      stressOutputDomain: 'HOST_SHELL',
      attachmentStressCalculated: false,
      nozzleStressCalculated: false,
      evaluatedStressLocations: 'EIGHT_POINTS',
      eightPointEnvelopeBasis: 'EIGHT_POINTS_ONLY',
      absoluteShellMaximumAssured: false,
      continuousJunctureSearchPerformed: false,
      arbitraryLoadingExtremaRequiresEngineeringJudgment: true,
    },
    limitations: ['LIMITATION-A'],
    remainingBlocked: ['BLOCKED-EXTENSION-A'],
  };
}

function assertAuthorityBoundary(boundary) {
  assert.equal(boundary.projectionOnly, true);
  assert.equal(boundary.consumesExistingRouteAuthority, true);
  assert.equal(boundary.createsEngineeringAuthority, false);
  assert.equal(boundary.createsMethodAuthority, false);
  assert.equal(boundary.createsApplicabilityAuthority, false);
  assert.equal(boundary.createsNumericalAuthority, false);
  assert.equal(boundary.createsCodeCompliance, false);
  assert.equal(boundary.createsReleaseAuthority, false);
}

function hasCode(code) {
  return (error) => error?.code === code;
}
