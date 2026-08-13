#!/usr/bin/env node
/**
 * M047 Stage 2 — verify a completed L13 RCA evidence-batch manifest.
 *
 * This is a post-run integrity check. It re-hashes every listed artifact from disk,
 * verifies the exact conditional artifact set/order, checks common ACCDB custody and
 * L13 case binding, and recomputes the manifest semantic hash. It does not solve or
 * modify any mechanics.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import { evidenceStepOrder } from './lfea-m047-stage2-rca-evidence-batch.mjs';

const PINNED_ACCDB_SHA256 = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const CASE_ID = 'L13';

export function verifyStage2RcaEvidenceManifest(manifest, root = resolve('.')) {
  assert.equal(manifest?.schema, 'm047-bm4l-stage2-rca-evidence-batch/v1', 'unsupported RCA evidence manifest schema');
  assert.equal(manifest.status, 'COMPLETE', 'only a COMPLETE evidence batch can be verified for citation');
  assert.equal(manifest.error, null, 'complete evidence manifest must not retain an execution error');
  assert.equal(manifest.caseId, CASE_ID, 'evidence batch must be L13');
  assert.equal(manifest.sourceAccdbSha256, PINNED_ACCDB_SHA256, 'evidence batch ACCDB custody hash mismatch');
  assert.equal(manifest.productionMechanicsChanged, false);
  assert.equal(manifest.toleranceChanged, false);
  assert.equal(manifest.comparisonPolicyChanged, false);

  const expectedIds = evidenceStepOrder(manifest.r2StateStableSnapshotAvailable !== false);
  const artifactIds = manifest.artifacts.map((entry) => entry.id);
  assert.deepEqual(artifactIds, expectedIds,
    'manifest artifact set/order must exactly match the conditional governed evidence order');
  assert.deepEqual(manifest.expectedEvidenceOrder, expectedIds,
    'manifest declared expected evidence order disagrees with the governed batch order');

  const verifiedArtifacts = manifest.artifacts.map((entry) => verifyArtifact(entry, root));
  const decision = verifiedArtifacts.find((entry) => entry.id === 'RCA_DECISION_GATE');
  assert.ok(decision, 'RCA decision artifact is required');
  assert.equal(decision.value.schema, 'm047-bm4l-stage2-rca-decision-gate/v1');
  assert.equal(decision.value.mechanicsChanged, false);
  assert.equal(decision.value.toleranceChanged, false);
  assert.equal(decision.value.comparisonPolicyChanged, false);

  const base = { ...manifest };
  delete base.semanticHash;
  assert.equal(manifest.semanticHash, semanticHash(base), 'manifest semantic hash mismatch');

  return Object.freeze({
    schema: 'm047-bm4l-stage2-rca-evidence-manifest-verification/v1',
    status: 'PASS',
    caseId: manifest.caseId,
    sourceAccdbSha256: manifest.sourceAccdbSha256,
    artifactCount: verifiedArtifacts.length,
    r2StateStableSnapshotAvailable: manifest.r2StateStableSnapshotAvailable,
    nextDecision: decision.value.next?.decision ?? null,
    manifestSemanticHash: manifest.semanticHash,
    productionMechanicsChanged: false,
    toleranceChanged: false,
    comparisonPolicyChanged: false,
  });
}

function verifyArtifact(entry, root) {
  const path = resolve(root, entry.path);
  assert.ok(existsSync(path), `manifest artifact is missing: ${entry.path}`);
  const bytes = readFileSync(path);
  const fileSha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(fileSha256, entry.sha256, `${entry.id} file SHA-256 mismatch`);
  assert.equal(bytes.byteLength, entry.byteLength, `${entry.id} byte length mismatch`);
  const value = JSON.parse(bytes.toString('utf8'));
  assert.equal(value.schema, entry.schema, `${entry.id} schema mismatch`);
  assert.equal(value.sourceAccdbSha256, PINNED_ACCDB_SHA256, `${entry.id} ACCDB custody mismatch`);
  assert.equal(entry.sourceAccdbSha256, PINNED_ACCDB_SHA256, `${entry.id} manifest custody mismatch`);
  if (entry.caseId !== null) assert.equal(String(entry.caseId), CASE_ID, `${entry.id} manifest case mismatch`);
  if (value.caseId !== undefined) assert.equal(String(value.caseId), CASE_ID, `${entry.id} artifact case mismatch`);
  if (value.frictionCaseId !== undefined) assert.equal(String(value.frictionCaseId), CASE_ID, `${entry.id} artifact friction case mismatch`);
  for (const field of [
    'mechanicsChanged',
    'productionMechanicsChanged',
    'productionSourceModified',
    'toleranceChanged',
    'comparisonPolicyChanged',
    'acceptanceCriteriaChanged',
  ]) {
    assert.notEqual(value[field], true, `${entry.id} declares forbidden ${field}=true`);
  }
  return { id: entry.id, path, value };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.length !== 2 || argv[0] !== '--manifest') {
    throw new TypeError('Usage: --manifest <reports/.../manifest.json>');
  }
  const manifestPath = resolve(argv[1]);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const result = verifyStage2RcaEvidenceManifest(manifest, resolve('.'));
  process.stdout.write(`${canonicalPrettyStringify(result)}\n`);
}
