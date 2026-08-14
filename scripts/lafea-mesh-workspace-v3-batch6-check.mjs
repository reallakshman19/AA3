#!/usr/bin/env node
import assert from 'node:assert/strict';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import {
  LAFEA_AUTHORITY_RECEIPT_V3_SCHEMA,
  createLafeaAuthorityReceiptV3,
  validateLafeaAuthorityReceiptV3,
} from '../src/workspace/lafea-authority-receipt-v3.js';
import { LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION } from '../src/workspace/lafea-mesh-workspace-v3.js';

const receipt = createLafeaAuthorityReceiptV3({
  schema: LAFEA_AUTHORITY_RECEIPT_V3_SCHEMA,
  stageId: 'LAFEA.4',
  authorityVersion: LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION,
  authorityEvidenceHash: hash('EVIDENCE'),
  meshContentHash: hash('MESH'),
  meshDependencyHash: hash('DEPENDENCY'),
  issuerId: 'LAFEA_TRUST_SERVICE',
  issuerKeyId: 'ed25519:key-2026-01',
  signatureAlgorithm: 'Ed25519',
  signatureBase64: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  issuedAt: '2026-08-14T06:00:00Z',
});
assert.deepEqual(validateLafeaAuthorityReceiptV3(receipt), receipt);
assert.equal(receipt.trustStatus, 'STRUCTURALLY_VALID_UNVERIFIED');
assert.equal(receipt.engineeringAuthority, false);
const forgedTrust = structuredClone(receipt);
forgedTrust.trustStatus = 'VERIFIED';
forgedTrust.engineeringAuthority = true;
assert.throws(
  () => validateLafeaAuthorityReceiptV3(forgedTrust),
  (error) => error?.code === 'LAFEA_AUTHORITY_RECEIPT_V3_TRUST_LAUNDERING_INVALID',
);

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch6', status: 'PASS',
  receiptStructureIsNotAuthority: true,
  clientCannotMarkReceiptVerifiedThroughContract: true,
  currentPassReceiptRequirementCoveredByBatch2: true,
  highOrderTopologyHardeningCoveredByBatch3: true,
}));

function hash(value) {
  return canonicalLafeaSha256({ schema: 'lafea-mesh-workspace-v3-batch6-fixture/v1', value });
}
