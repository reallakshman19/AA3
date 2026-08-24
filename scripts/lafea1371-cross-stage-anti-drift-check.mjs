#!/usr/bin/env node
import assert from 'node:assert/strict';

import { PROFILE_KINDS, canonicalProfile } from '../src/core/lafea-profile-contract/index.js';
import {
  assertLafeaExecutionCustody,
  assertMeshChangeRevokesOldAuthority,
  assertSourceEditRevokesOldAuthority,
  closeRelative,
  maxContinuumDisplacement,
  maxContinuumVonMises,
} from './lib/lafea1371-custody-assertions.mjs';
import {
  createLafeaMockDocument,
  createLafeaMockDomainAndGeometryEvidence,
  createLafeaMockMeshProfile,
} from '../src/workspace/lafea-simulated-source-provider.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { createLafeaLiveWorkbenchViewportModel } from '../src/workspace/lafea-live-workbench-viewport.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';

const CONTINUUM_ROUTE = 'DOMAIN_FIRST_COMPILED_SOLVER_MODEL';
const SHELL_ROUTE = 'SHELL_RETAINED_MESH_COMPILED_SOLVER_MODEL';
const MODULUS_BEFORE = 200000;
const MODULUS_AFTER = 210000;
const MODULUS_FACTOR = MODULUS_AFTER / MODULUS_BEFORE;
const DISPLACEMENT_FACTOR = 1 / MODULUS_FACTOR;

const continuumA = await runContinuumSample('A');
const continuumB = await runContinuumSample('B');
assert.equal(continuumA.snapshot.sourceHash, continuumB.snapshot.sourceHash);
assert.equal(continuumA.snapshot.meshHash, continuumB.snapshot.meshHash);
assert.equal(continuumA.snapshot.meshArtifactHash, continuumB.snapshot.meshArtifactHash);
assert.equal(continuumA.snapshot.solverModelHash, continuumB.snapshot.solverModelHash);
assert.equal(continuumA.snapshot.compiledExecutionHash, continuumB.snapshot.compiledExecutionHash);
const continuumViewportIdentity = assertViewportRetainedMeshIdentity(continuumA.stage, 137103);

const baselineCase = continuumA.stage.execution.result.loadCaseResults
  .find((row) => row.loadCaseId === 'CASE-A');
assert.ok(baselineCase, 'LAFEA.3 CASE-A baseline is required');
const baselineDisplacement = maxContinuumDisplacement(baselineCase);
const baselineStress = maxContinuumVonMises(baselineCase);
assert.ok(baselineDisplacement > 0);
assert.ok(baselineStress > 0);

const continuumBeforeEdit = continuumA.store.getState().stages['LAFEA.3'];
assert.equal(continuumBeforeEdit.document.materials.find((row) => row.materialId === 'MAT').elasticModulus, MODULUS_BEFORE);
continuumA.store.setScalar('LAFEA.3.material.elasticModulus', 'MAT', String(MODULUS_AFTER));
const continuumInvalidated = continuumA.store.getState().stages['LAFEA.3'];
assert.equal(continuumInvalidated.document.materials.find((row) => row.materialId === 'MAT').elasticModulus, MODULUS_AFTER);
assertSourceEditRevokesOldAuthority(continuumBeforeEdit, continuumInvalidated);

const editedAuthority = continuumInvalidated.sourceAuthority;
assert.ok(editedAuthority);
const editedParents = await createLafeaMockDomainAndGeometryEvidence(
  'LAFEA.3',
  editedAuthority.sourceHash,
);
continuumA.store.activateDomainFirstProfile('LAFEA.3');
continuumA.store.registerAnalysisDomain(editedParents.domain, 'LAFEA.3');
continuumA.store.registerAnalysisGeometryEvidence(editedParents.geometryEvidence, 'LAFEA.3');
continuumA.store.bindAnalysisMeshProfile(continuumA.profile, 'LAFEA.3');
const editedMesh = continuumA.store.generateAnalysisMesh({}, 'LAFEA.3');
assert.equal(
  editedMesh.evidence.meshHash,
  continuumA.snapshot.meshHash,
  'E-only edit must reproduce the same deterministic mesh content for unchanged geometry/profile.',
);
assert.notEqual(
  editedMesh.evidence.artifactHash,
  continuumA.snapshot.meshArtifactHash,
  'E-only edit must create new parent-bound mesh evidence even when mesh content is unchanged.',
);
continuumA.store.prepareContinuumForRun('LAFEA.3');
continuumA.store.run();
const continuumAfterEdit = continuumA.store.getState().stages['LAFEA.3'];
const continuumAfterSnapshot = assertLafeaExecutionCustody(continuumAfterEdit, {
  route: CONTINUUM_ROUTE,
  resultAccepted: (result) => assert.equal(result.qualification?.state, 'ACCEPTED'),
});
assert.notEqual(continuumAfterSnapshot.sourceHash, continuumA.snapshot.sourceHash);
assert.equal(continuumAfterSnapshot.meshHash, continuumA.snapshot.meshHash);
assert.notEqual(continuumAfterSnapshot.meshArtifactHash, continuumA.snapshot.meshArtifactHash);
assert.notEqual(continuumAfterSnapshot.solverModelHash, continuumA.snapshot.solverModelHash);
assert.notEqual(continuumAfterSnapshot.compiledExecutionHash, continuumA.snapshot.compiledExecutionHash);
const editedContinuumViewportIdentity = assertViewportRetainedMeshIdentity(continuumAfterEdit, 137113);
assert.equal(editedContinuumViewportIdentity.meshHash, continuumViewportIdentity.meshHash);
assert.notEqual(editedContinuumViewportIdentity.artifactHash, continuumViewportIdentity.artifactHash);

const editedCase = continuumAfterEdit.execution.result.loadCaseResults
  .find((row) => row.loadCaseId === 'CASE-A');
assert.ok(editedCase);
const editedDisplacement = maxContinuumDisplacement(editedCase);
const editedStress = maxContinuumVonMises(editedCase);
closeRelative(
  editedDisplacement,
  baselineDisplacement * DISPLACEMENT_FACTOR,
  2e-8,
  1e-10,
);
closeRelative(editedStress, baselineStress, 2e-8, 1e-8);

const shellA = await runShellSample('A', shellProfile(15, 'A'));
const shellB = await runShellSample('B', shellProfile(15, 'A'));
assert.equal(shellA.snapshot.sourceHash, shellB.snapshot.sourceHash);
assert.equal(shellA.snapshot.meshHash, shellB.snapshot.meshHash);
assert.equal(shellA.snapshot.meshArtifactHash, shellB.snapshot.meshArtifactHash);
assert.equal(shellA.snapshot.solverModelHash, shellB.snapshot.solverModelHash);
assert.equal(shellA.snapshot.compiledExecutionHash, shellB.snapshot.compiledExecutionHash);
const shellViewportIdentity = assertViewportRetainedMeshIdentity(shellA.stage, 137104);

const shellBeforeEdit = shellA.store.getState().stages['LAFEA.4'];
shellA.store.setScalar('LAFEA.4.material.elasticModulus', 'MAT', String(MODULUS_AFTER));
const shellAfterEdit = shellA.store.getState().stages['LAFEA.4'];
assert.equal(shellAfterEdit.document.materials.find((row) => row.materialId === 'MAT').elasticModulus, MODULUS_AFTER);
assertSourceEditRevokesOldAuthority(shellBeforeEdit, shellAfterEdit);

const shellBeforeProfileChange = shellB.store.getState().stages['LAFEA.4'];
shellB.store.bindAnalysisMeshProfile(shellProfile(12, 'PROFILE_EDIT'), 'LAFEA.4');
const shellAfterProfileChange = shellB.store.getState().stages['LAFEA.4'];
assertMeshChangeRevokesOldAuthority(shellBeforeProfileChange, shellAfterProfileChange);

console.log(JSON.stringify({
  schema: 'lafea1371-cross-stage-anti-drift-check/v2',
  status: 'PASS',
  mechanicsPredictionBeforeExecution: {
    edit: `E ${MODULUS_BEFORE} -> ${MODULUS_AFTER} MPa`,
    modulusFactor: MODULUS_FACTOR,
    forceControlledDisplacementFactor: DISPLACEMENT_FACTOR,
    predictedDisplacementChangePercent: (DISPLACEMENT_FACTOR - 1) * 100,
    predictedStressChangePercent: 0,
  },
  lafea3: {
    deterministicReplay: {
      sourceHash: continuumB.snapshot.sourceHash,
      meshHash: continuumB.snapshot.meshHash,
      meshArtifactHash: continuumB.snapshot.meshArtifactHash,
      solverModelHash: continuumB.snapshot.solverModelHash,
      compiledExecutionHash: continuumB.snapshot.compiledExecutionHash,
    },
    viewportRetainedMeshIdentity: continuumViewportIdentity,
    beforeEdit: continuumA.snapshot,
    invalidatedSourceHash: continuumInvalidated.sourceAuthority.sourceHash,
    afterRegeneration: continuumAfterSnapshot,
    viewportAfterRegeneration: editedContinuumViewportIdentity,
    meshContentHashLegallyReused: continuumAfterSnapshot.meshHash === continuumA.snapshot.meshHash,
    meshEvidenceArtifactReissued: continuumAfterSnapshot.meshArtifactHash !== continuumA.snapshot.meshArtifactHash,
    baselineCaseA: {
      maxDisplacement: baselineDisplacement,
      maxAuthoritativeVonMises: baselineStress,
    },
    editedCaseA: {
      maxDisplacement: editedDisplacement,
      displacementRatio: editedDisplacement / baselineDisplacement,
      maxAuthoritativeVonMises: editedStress,
      stressRatio: editedStress / baselineStress,
    },
  },
  lafea4: {
    deterministicReplay: shellB.snapshot,
    viewportRetainedMeshIdentity: shellViewportIdentity,
    sourceEditOldAuthorityRevoked: true,
    meshProfileEditOldAuthorityRevoked: true,
  },
  registryWordingChanged: false,
  registryCleanupState: 'BLOCKED_PENDING_EXECUTED_EXACT_HEAD_EVIDENCE',
  frozenOracleMutation: false,
  releaseAuthorityChanged: false,
}, null, 2));

continuumA.store.destroy();
continuumB.store.destroy();
shellA.store.destroy();
shellB.store.destroy();

async function runContinuumSample(suffix) {
  const stageId = 'LAFEA.3';
  const source = await createLafeaMockDocument(stageId);
  const normalized = requireLafeaStageComposition(stageId).normalizeDocument(source);
  const authority = issueLafeaSourceAuthority(stageId, normalized, `ISSUE-1371/PR-D/LAFEA3/${suffix}`);
  const parents = await createLafeaMockDomainAndGeometryEvidence(stageId, authority.sourceHash);
  const profile = createLafeaMockMeshProfile(stageId);
  const store = createLafeaWorkbenchOrchestratorStore({
    initialStage: stageId,
    initialDocument: normalized,
    initialSourceHash: authority.sourceHash,
  });
  store.activateDomainFirstProfile(stageId);
  store.registerAnalysisDomain(parents.domain, stageId);
  store.registerAnalysisGeometryEvidence(parents.geometryEvidence, stageId);
  store.bindAnalysisMeshProfile(profile, stageId);
  store.generateAnalysisMesh({}, stageId);
  store.prepareContinuumForRun(stageId);
  store.run();
  const stage = store.getState().stages[stageId];
  const snapshot = assertLafeaExecutionCustody(stage, {
    route: CONTINUUM_ROUTE,
    resultAccepted: (result) => assert.equal(result.qualification?.state, 'ACCEPTED'),
  });
  return { store, stage, normalized, authority, parents, profile, snapshot };
}

async function runShellSample(suffix, profile) {
  const stageId = 'LAFEA.4';
  const source = await createLafeaMockDocument(stageId);
  const normalized = requireLafeaStageComposition(stageId).normalizeDocument(source);
  const authority = issueLafeaSourceAuthority(stageId, normalized, `ISSUE-1371/PR-D/LAFEA4/${suffix}`);
  const parent = createLafeaSimulatedShellMidsurfaceEvidence(
    stageId,
    authority.sourceHash,
    normalized,
  );
  const store = createLafeaWorkbenchOrchestratorStore({
    initialStage: stageId,
    initialDocument: normalized,
    initialSourceHash: authority.sourceHash,
  });
  store.registerShellMidsurfaceEvidence(parent, stageId);
  store.bindAnalysisMeshProfile(profile, stageId);
  store.generateAnalysisMesh({}, stageId);
  store.run();
  const stage = store.getState().stages[stageId];
  const snapshot = assertLafeaExecutionCustody(stage, {
    route: SHELL_ROUTE,
    resultAccepted: (result) => assert.equal(result.qualification?.accepted, true),
  });
  return { store, stage, normalized, authority, parent, profile, snapshot };
}

function assertViewportRetainedMeshIdentity(stage, sceneRevision) {
  const evidence = stage.retainedAnalysisMeshEvidenceV2;
  assert.ok(evidence, `${stage.stageId} retained v2 mesh evidence required`);
  const viewport = createLafeaLiveWorkbenchViewportModel({
    stageId: stage.stageId,
    document: stage.document,
    lifecycle: stage.lifecycle,
    lifecycleBinding: stage.lifecycleBinding,
    sceneRevision,
    renderPacket: null,
    selection: null,
    retainedMeshEvidence: evidence,
    analysisMeshCustodyState: stage.analysisMeshCustodyProjection?.state ?? null,
  });
  assert.equal(viewport.retainedMeshIdentity.meshHash, evidence.meshHash,
    `${stage.stageId} viewport content mesh hash must equal retained evidence meshHash`);
  assert.equal(viewport.retainedMeshIdentity.artifactHash, evidence.artifactHash,
    `${stage.stageId} viewport evidence artifact hash must remain separately observable`);
  return Object.freeze({
    meshHash: viewport.retainedMeshIdentity.meshHash,
    artifactHash: viewport.retainedMeshIdentity.artifactHash,
  });
}

function shellProfile(target, suffix) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `ISSUE_1371_PR_D_SHELL_${suffix}_${target}`,
    sourceRevision: 'ISSUE-1371-PR-D',
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize: target,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 3,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}
