#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  LAFEA_MESH_VALIDATION_BUNDLE_V3_SCHEMA,
  lafeaMeshValidationPolicyV3,
  createLafeaMeshValidationBundleV3,
} from '../src/workspace/lafea-mesh-validation-bundle-v3.js';
import {
  LAFEA_ANALYSIS_MESH_EVIDENCE_V3_SCHEMA,
  createLafeaAnalysisMeshEvidenceV3,
} from '../src/workspace/lafea-analysis-mesh-evidence-v3.js';
import {
  LAFEA_MESH_AUTHORITY_MIGRATION_V3_SCHEMA,
  createLafeaMeshAuthorityMigrationV3,
} from '../src/workspace/lafea-mesh-authority-migration-v3.js';
import { LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION } from '../src/workspace/lafea-mesh-workspace-v3.js';

const policy = lafeaMeshValidationPolicyV3('LAFEA.3', 'T6');
assert.ok(policy.requiredGateIds.includes('HIGH_ORDER_MAPPING'));
const validation = createLafeaMeshValidationBundleV3({
  schema: LAFEA_MESH_VALIDATION_BUNDLE_V3_SCHEMA,
  stageId: 'LAFEA.3', meshContentHash: hash('M'), meshDependencyHash: hash('D'),
  policyHash: policy.policyHash,
  gates: policy.requiredGateIds.map((gateId) => ({
    gateId, evidenceHash: hash(`GATE:${gateId}`), status: 'PASS',
  })),
}, policy);
assert.equal(validation.qualification, 'PASS');
assert.throws(() => createLafeaMeshValidationBundleV3({
  schema: LAFEA_MESH_VALIDATION_BUNDLE_V3_SCHEMA,
  stageId: 'LAFEA.3', meshContentHash: hash('M'), meshDependencyHash: hash('D'),
  policyHash: policy.policyHash,
  gates: policy.requiredGateIds.filter((gateId) => gateId !== 'HIGH_ORDER_MAPPING').map((gateId) => ({
    gateId, evidenceHash: hash(`GATE:${gateId}`), status: 'PASS',
  })),
}, policy), (error) => error?.code === 'LAFEA_MESH_VALIDATION_V3_REQUIRED_GATE_SET_MISMATCH');

const evidence = createLafeaAnalysisMeshEvidenceV3({
  schema: LAFEA_ANALYSIS_MESH_EVIDENCE_V3_SCHEMA,
  stageId: 'LAFEA.3', sourceHash: hash('SOURCE'), meshDependencyHash: hash('D'),
  meshContentHash: hash('M'), meshArtifactHash: hash('ARTIFACT'),
  meshProfileHash: 'fnv1a64:mesh-profile', adapterCapabilityHash: hash('ADAPTER_CAP'),
  producerCapabilityHash: hash('PRODUCER_CAP'), producerQualificationHash: hash('PRODUCER_Q'),
  producerId: 'CORE_MESHER', producerRevision: '3', planHash: hash('PLAN'),
  outputHash: hash('OUTPUT'), validationHash: validation.validationHash, transferHash: null,
}, validation, policy);
assert.equal(evidence.status, 'QUALIFIED_PENDING_TRUSTED_AUTHORITY');
assert.equal(evidence.engineeringAuthority, false);

const migration = createLafeaMeshAuthorityMigrationV3({
  schema: LAFEA_MESH_AUTHORITY_MIGRATION_V3_SCHEMA,
  stageId: 'LAFEA.3', legacyAuthorityVersion: 'V2', legacyEvidenceHash: hash('OLD_EVIDENCE'),
  v3EvidenceHash: evidence.evidenceHash, v3AuthorityReceiptHash: hash('RECEIPT'),
  migrationMode: 'REPLAY_AND_REQUALIFY', legacyDisposition: 'FROZEN_HISTORICAL_READ_ONLY',
  activatedAuthorityVersion: LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION,
});
assert.equal(migration.dualCurrentAuthorityAllowed, false);
assert.equal(migration.legacyDisposition, 'FROZEN_HISTORICAL_READ_ONLY');

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch12', status: 'PASS',
  highOrderMappingGateCannotBeOmittedForT6: true,
  validationBundleSealsRequiredGateSet: true,
  meshEvidenceRemainsPendingUntilTrustedAuthority: true,
  v2EvidenceIsFrozenHistoricalOnV3Activation: true,
  dualCurrentAuthorityExplicitlyDisallowed: true,
}));

function hash(value) {
  const hex = Buffer.from(value).toString('hex').padEnd(64, '0').slice(0, 64);
  return `sha256:${hex}`;
}
