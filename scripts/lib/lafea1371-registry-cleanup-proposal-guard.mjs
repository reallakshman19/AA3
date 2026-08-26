import assert from 'node:assert/strict';

import {
  LAFEA1371_REGISTRY_CLOSURE_READINESS_SCHEMA,
  PROTECTED_LAFEA3_LIMITATION,
  PROTECTED_LAFEA3_LIMITATIONS,
  hashRegistryProjection,
  lafea1371RegistryBaselineProjection,
} from './lafea1371-registry-closure-readiness.mjs';

export const LAFEA1371_REGISTRY_CLEANUP_PROPOSAL_SCHEMA =
  'lafea1371-registry-cleanup-proposal-guard/v1';

export function evaluateLafea1371RegistryCleanupProposal({
  readiness,
  candidateRegistry,
  changedPaths,
} = {}) {
  requireReadiness(readiness);
  assert.ok(Array.isArray(changedPaths), 'registry cleanup proposal requires changed paths');

  const productionPaths = [...new Set(changedPaths)]
    .filter((path) => !path.startsWith('agents/'))
    .sort();
  assert.deepEqual(
    productionPaths,
    ['src/workspace/lafea-stage-registry.js'],
    'Section 17 cleanup proposal may mutate only the LAFEA stage registry outside recovery records',
  );

  const candidateProjection = lafea1371RegistryBaselineProjection(candidateRegistry);
  const candidateLafea3 = requireStage(candidateProjection, 'LAFEA.3');
  const candidateLafea4 = requireStage(candidateProjection, 'LAFEA.4');

  assert.equal(
    candidateLafea3.authority,
    'T3_T6_Q8_LINEAR_CONTINUUM',
    'LAFEA.3 cleanup proposal must not widen continuum authority',
  );
  assert.equal(candidateLafea3.engineState, 'QUALIFIED_ROUTE_REGISTERED');
  assert.equal(candidateLafea3.enginePackage, 'local-continuum');
  assert.equal(candidateLafea3.inputContractRole, 'LOCAL_CONTINUUM_MODEL');
  assert.equal(candidateLafea3.resultContractRole, 'LOCAL_CONTINUUM_RESULT');
  assert.equal(candidateLafea3.presenterRole, 'CONTINUUM_RESULT_EVIDENCE');
  assert.ok(
    typeof candidateLafea3.limitation === 'string' && candidateLafea3.limitation.trim(),
    'LAFEA.3 cleanup proposal requires a non-empty top-level limitation',
  );
  assert.notEqual(
    candidateLafea3.limitation,
    PROTECTED_LAFEA3_LIMITATION,
    'LAFEA.3 cleanup proposal did not replace the obsolete top-level limitation',
  );
  assert.ok(Array.isArray(candidateLafea3.limitations));
  assert.equal(candidateLafea3.limitations.length, PROTECTED_LAFEA3_LIMITATIONS.length);
  assert.equal(
    candidateLafea3.limitations[0],
    PROTECTED_LAFEA3_LIMITATIONS[0],
    'LAFEA.3 integration-point stress authority statement must remain unchanged',
  );
  assert.ok(
    typeof candidateLafea3.limitations[1] === 'string' && candidateLafea3.limitations[1].trim(),
    'LAFEA.3 cleanup proposal requires a non-empty orchestration limitation',
  );
  assert.notEqual(
    candidateLafea3.limitations[1],
    PROTECTED_LAFEA3_LIMITATIONS[1],
    'LAFEA.3 cleanup proposal did not replace the obsolete detailed orchestration limitation',
  );

  assert.equal(
    candidateLafea4.authority,
    'CST_DKT_TRI3_THIN_SHELL_V1',
    'LAFEA.4 authority changed in LAFEA.3 cleanup proposal',
  );

  const reconstructedBaseline = structuredClone(candidateProjection);
  const baselineLafea3 = requireStage(reconstructedBaseline, 'LAFEA.3');
  baselineLafea3.limitation = PROTECTED_LAFEA3_LIMITATION;
  baselineLafea3.limitations[1] = PROTECTED_LAFEA3_LIMITATIONS[1];

  assert.equal(
    hashRegistryProjection(reconstructedBaseline),
    readiness.registryBaselineHash,
    'registry cleanup proposal changes semantics outside the two permitted LAFEA.3 wording fields',
  );

  return Object.freeze({
    schema: LAFEA1371_REGISTRY_CLEANUP_PROPOSAL_SCHEMA,
    status: 'PASS',
    disposition: 'STRUCTURALLY_ADMISSIBLE_FOR_HUMAN_WORDING_REVIEW',
    issue: 1371,
    section: 17,
    qualifiedRepositoryHead: readiness.qualifiedRepositoryHead,
    registryBaselineHash: readiness.registryBaselineHash,
    productionPaths: Object.freeze(productionPaths),
    permittedRegistryFieldsChanged: Object.freeze([
      'LAFEA.3.limitation',
      'LAFEA.3.limitations[1]',
    ]),
    wordingApproved: false,
    engineeringEvidenceRecomputed: false,
    registryMutationPerformedByGuard: false,
    mergeAuthorityGranted: false,
    releaseAuthorityGranted: false,
  });
}

function requireReadiness(readiness) {
  assert.ok(readiness && typeof readiness === 'object' && !Array.isArray(readiness));
  assert.equal(readiness.schema, LAFEA1371_REGISTRY_CLOSURE_READINESS_SCHEMA);
  assert.equal(readiness.status, 'PASS');
  assert.equal(readiness.disposition, 'READY_FOR_REGISTRY_CLEANUP_PR');
  assert.match(readiness.qualifiedRepositoryHead ?? '', /^[0-9a-f]{40}$/u);
  assert.match(readiness.registryBaselineHash ?? '', /^sha256:[0-9a-f]{64}$/u);
  assert.equal(readiness.cleanupProposalMayNowBeOpened, true);
  assert.equal(readiness.cleanupWordingAuthorizedByThisGate, false);
  assert.equal(readiness.registryMutationPerformed, false);
  assert.equal(readiness.releaseAuthorityGranted, false);
}

function requireStage(registry, stageId) {
  const entry = registry.find((item) => item.stageId === stageId);
  assert.ok(entry, `registry projection missing ${stageId}`);
  return entry;
}
