#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LAFEA_CONTINUUM_MESH_V3_PRODUCER_BRIDGE_ID,
  produceLafea3AnalysisMeshEvidenceWithV3Candidate,
} from '../src/workspace/lafea-continuum-mesh-v3-producer-bridge.js';
import { createLafeaWorkbenchMeshGenerationState } from '../src/workspace/lafea-workbench-mesh-generation-state.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANDIDATE_FIELD = 'retainedAnalysisMeshCandidateV3';

assert.equal(
  LAFEA_CONTINUUM_MESH_V3_PRODUCER_BRIDGE_ID,
  'LAFEA.3/V2_QUALIFIED_PRODUCER_TO_V3_PRE_AUTHORITY_V1',
);

for (const stageId of ['LAFEA.4', 'LAFEA.5']) {
  assert.throws(
    () => produceLafea3AnalysisMeshEvidenceWithV3Candidate({ stageId }, {}),
    (error) => error?.code === 'LAFEA_CONTINUUM_MESH_V3_PRODUCER_BRIDGE_STAGE_INVALID',
    `${stageId} must fail before entering the continuum-v3 producer bridge`,
  );
}

const meshState = createLafeaWorkbenchMeshGenerationState(['LAFEA.3', 'LAFEA.4', 'LAFEA.5']);
assert.equal(meshState.fields('LAFEA.3')[CANDIDATE_FIELD], null);
assert.equal(meshState.fields('LAFEA.4')[CANDIDATE_FIELD], null);
assert.equal(meshState.fields('LAFEA.5')[CANDIDATE_FIELD], null);

// Authority-cutover is explicitly outside PR1174. If a future PR intentionally
// consumes the v3 candidate in readiness or Run, this guard must be changed in
// that authority PR together with trusted-receipt and solver-binding evidence.
for (const relativePath of [
  'src/workspace/lafea-workbench-readiness.js',
  'src/workspace/lafea-workbench-domain-first-run-actions.js',
  'src/workspace/lafea-workbench-shell-run-actions.js',
]) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  assert.equal(
    source.includes(CANDIDATE_FIELD),
    false,
    `${relativePath} must not consume Mesh v3 pre-authority custody`,
  );
}

console.log(JSON.stringify({
  check: 'lafea-continuum-mesh-v3-authority-isolation',
  status: 'PASS',
  continuumBridgeStage: 'LAFEA.3_ONLY',
  shellStagesRejectedBeforeContinuumProducer: true,
  shellCandidateInitialCustody: 'ABSENT',
  readinessConsumesV3Candidate: false,
  domainRunConsumesV3Candidate: false,
  shellRunConsumesV3Candidate: false,
  v2RunAuthorityPreserved: true,
  trustedAuthorityCutoverImplemented: false,
}));
