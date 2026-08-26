import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
} from '../src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';
import {
  EMP1_C_BOUNDED_PRODUCTION_ROUTES,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
} from '../src/core/emp1/emp1-c-bounded-route-registry.js';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const requireReady = process.argv.includes('--require-ready');
const WRC_SHA256 = '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';

const gate = await readJson('validation/emp1/release/emp1-wrc537-gamma5-p0-source-semantics-gate-v1.json');
const profile = await readJson(gate.releaseProfilePath);

assert.equal(gate.schema, 'emp1-wrc537-gamma5-p0-source-semantics-gate/v1');
assert.equal(gate.issue, 1389);
assert.equal(gate.releaseProfileId, 'EMP1_WRC537_2013_CYLINDRICAL_GAMMA5_ZERO_DP_V1');
assert.equal(gate.sourceSha256, WRC_SHA256);
assert.equal(gate.state, 'BLOCKED_P0_SOURCE_SEMANTICS');
assert.equal(gate.blockerCount, 9);
assert.equal(gate.gates.length, 9);
assert.equal(new Set(gate.gates.map((row) => row.gateId)).size, 9);
assert.equal(new Set(gate.gates.map((row) => row.issue)).size, 9);
assert.equal(gate.sourceObservation.directPrimaryPageObservationAvailableInCurrentConnectedExecution, false);
assert.equal(gate.sourceObservation.secondaryOrOcrEvidenceMayCloseGate, false);
assert.equal(gate.sourceObservation.productionOutputMayCloseGate, false);
assert.equal(gate.sourceObservation.cauxOutputMayCloseGate, false);

assert.equal(profile.releaseProfileId, gate.releaseProfileId);
assert.equal(profile.definitionState, 'FROZEN_BEFORE_PRODUCTION_AUTHORIZATION');
assert.equal(profile.method.sourceSha256, WRC_SHA256);
assert.equal(profile.releaseAuthority.engineeringUseAuthorized, false);
assert.equal(profile.releaseAuthority.productionUseAuthorized, false);
assert.equal(profile.releaseAuthority.deploymentAuthorized, false);
assert.equal(profile.releaseAuthority.globalEmp1CRouteAuthority, false);
assert.equal(profile.releaseAuthority.releaseQualified, false);
assert.equal(profile.codeCompliance.performed, false);
assert.equal(profile.codeCompliance.authorized, false);
assert.equal(profile.codeCompliance.state, 'NOT_ASSESSED');

const observed = [];
for (const row of gate.gates) {
  assert.ok(row.gateId && row.artifact && row.authorityDocument && row.profileAuthorityKey);
  const artifact = await readJson(row.artifact);
  assert.equal(artifact.status, row.currentStatus, `${row.gateId}: retained source status drift`);
  assert.match(artifact.status, /^BLOCKED_/u, `${row.gateId}: PR-B expects fail-closed source state`);
  assertSourceHash(row, artifact, WRC_SHA256);

  const profileAuthority = profile.requiredAuthorities[row.profileAuthorityKey];
  assert.ok(profileAuthority, `${row.gateId}: missing release-profile authority key`);
  assert.equal(profileAuthority.issue, row.issue, `${row.gateId}: issue binding drift`);
  assert.match(profileAuthority.state, /^BLOCKED/u, `${row.gateId}: frozen profile must remain blocked`);

  observed.push({
    gateId: row.gateId,
    issue: row.issue,
    category: row.category,
    status: artifact.status,
    artifact: row.artifact,
    authorityDocument: row.authorityDocument,
  });
}

assert.equal(gate.closureRule.allNineGatesMustBeSourceClosedBeforeBoundedProfessionalAuthorization, true);
assert.equal(gate.closureRule.exactPrimarySourceLocatorsRequiredWhereApplicable, true);
assert.equal(gate.closureRule.engineeringAssumptionsMustBeExplicitlyDistinguishedFromWrcSourceRules, true);
assert.equal(gate.closureRule.codeComplianceRemainsNotAssessedAfterBoundaryClosure, true);
assert.equal(gate.closureRule.productionRouteMutationAllowedByThisArtifact, false);
assert.equal(gate.closureRule.releaseAuthorityGrantedByThisArtifact, false);
assert.deepEqual(gate.authority, {
  engineeringUseAuthorized: false,
  productionUseAuthorized: false,
  deploymentAuthorized: false,
  globalEmp1CRouteAuthority: false,
  codeComplianceAuthorized: false,
});

assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED, false);
const registry = EMP1_C_BOUNDED_PRODUCTION_ROUTES.find(
  (row) => row.routeId === EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
);
assert.ok(registry, 'bounded gamma5 route registry row required');
assert.equal(registry.registered, false);
assert.equal(registry.engineeringUseAuthorized, false);
assert.equal(registry.globalEmp1CRouteAuthority, false);
assert.equal(registry.releaseQualified, false);

const result = {
  schema: 'emp1-professional-p0-source-semantics-check/v1',
  status: 'PASS_P0_GATE_RECONCILED_SOURCE_SEMANTICS_BLOCKED',
  releaseProfileId: gate.releaseProfileId,
  blockerCount: observed.length,
  blockers: observed,
  authority: {
    routeAuthorized: EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
    registryRegistered: registry.registered,
    engineeringUseAuthorized: registry.engineeringUseAuthorized,
    globalEmp1CRouteAuthority: registry.globalEmp1CRouteAuthority,
    releaseQualified: registry.releaseQualified,
    codeComplianceAuthorized: profile.codeCompliance.authorized,
  },
  requireReady,
};

console.log(JSON.stringify(result, null, 2));

if (requireReady && observed.length > 0) process.exit(2);

function assertSourceHash(row, artifact, expected) {
  const candidates = [
    artifact.source?.sha256,
    artifact.sourceDocument?.rawPdfSha256,
    artifact.sourceDocument?.rawSha256,
    artifact.sourceCustody?.rawSha256,
    artifact.primarySource?.rawPdfSha256,
  ].filter((value) => value != null);
  assert.ok(candidates.length > 0, `${row.gateId}: source SHA custody missing`);
  for (const value of candidates) {
    assert.equal(value, expected, `${row.gateId}: WRC source SHA drift`);
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(repoRoot, relativePath), 'utf8'));
}
