#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { createLafeaMockDocument } from '../src/workspace/advanced-mock-data.js';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import { lafeaAnalysisMeshContentHash } from '../src/workspace/lafea-analysis-mesh-contract.js';
import {
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
  LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  createLafeaAnalysisMeshEvidenceV2,
} from '../src/workspace/lafea-analysis-mesh-evidence-v2.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { LAFEA_SHELL_ELEMENT, produceLafeaShellAnalysisMesh } from '../src/workspace/lafea-shell-mesh-producer.js';
import {
  createLafea5SourceShellParent,
  planLafea5SourceShellMeshAdoption,
  produceLafea5SourceShellMeshAdoption,
} from '../src/workspace/lafea-source-shell-mesh-adoption.js';
import { compileLafeaShellSolverModel } from '../src/workspace/lafea-shell-solver-model.js';
import { normalizeLafeaStageDocument } from '../src/workspace/lafea-workbench-model.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';
import {
  LAFEA4_SHELL_SOLVER_COMPANION_AUTHORIZATION_EFFECT,
} from '../src/workspace/lafea4-shell-solver-companion-custody.js';

const definition = JSON.parse(fs.readFileSync(
  new URL('../validation/lafea4-refinement/solver-execution-companion-binding-v1.json', import.meta.url),
  'utf8',
));
assert.equal(definition.productionBindingAuthorized, false);
assert.equal(definition.releaseQualified, false);
assert.equal(
  definition.authorizationEffect,
  LAFEA4_SHELL_SOLVER_COMPANION_AUTHORIZATION_EFFECT,
);

// ---------------------------------------------------------------------------
// LAFEA.4 real product chain: Sample -> retained companion -> compiler -> run.
// ---------------------------------------------------------------------------
const raw4 = structuredClone(createLafeaMockDocument('LAFEA.4'));
raw4.loadCases = [{
  loadCaseId: 'TECH12C-PRESSURE',
  nodalLoads: [],
  pressureLoads: raw4.elements.map((element, index) => ({
    pressureLoadId: `TECH12C-P-${index + 1}`,
    elementId: element.elementId,
    pressure: 1.2,
    sense: 'ALONG_ELEMENT_NORMAL',
    sourceReference: `TECH12C-PRESSURE-${index + 1}`,
  })),
  sourceReference: 'TECH12C-PRESSURE-CASE',
}];
const document4 = normalizeLafeaStageDocument('LAFEA.4', raw4);
const authority4 = issueLafeaSourceAuthority(
  'LAFEA.4', document4, 'TECH12C-SOLVER-COMPANION-SOURCE',
);
const midsurface4 = createLafeaSimulatedShellMidsurfaceEvidence(
  'LAFEA.4', authority4.sourceHash, document4,
);
const profile4 = shellProfile('LAFEA4_TECH12C_H15', 'TECH12C-R1', 15);
const workbench4 = createLafeaWorkbenchOrchestratorStore({
  initialStage: 'LAFEA.4',
  initialDocument: document4,
  initialSourceHash: authority4.sourceHash,
});
assert.equal(workbench4.registerShellMidsurfaceEvidence(midsurface4, 'LAFEA.4')?.changed, true);
assert.equal(workbench4.bindAnalysisMeshProfile(profile4, 'LAFEA.4')?.changed, true);
const generated4 = workbench4.generateAnalysisMesh({}, 'LAFEA.4');
assert.equal(generated4?.evidence.qualification, 'PASS');
assert.ok(generated4?.parentNormalCompanion);
assert.equal(generated4.parentNormalCompanion.candidateQualification, 'PASS');
const companionHash4 = generated4.parentNormalCompanion.semanticHash;

const compiled4 = compileLafeaShellSolverModel({
  stageId: 'LAFEA.4',
  sourceHash: authority4.sourceHash,
  source: document4,
  midsurfaceEvidence: midsurface4,
  meshEvidence: generated4.evidence,
});
assert.equal(compiled4.parents.parentNormalCompanionHash, companionHash4);
assert.equal(compiled4.parentNormalCustody.parentNormalCompanionHash, companionHash4);
assert.equal(compiled4.parentNormalCustody.companionCandidateQualification, 'PASS');
assert.equal(
  compiled4.parentNormalCustody.authorizationEffect,
  definition.authorizationEffect,
);
assert.equal(compiled4.parentNormalCustody.executionAuthorizationChanged, false);
assert.equal(compiled4.parentNormalCustody.releaseQualificationChanged, false);
assert.equal(compiled4.executionAuthorized, true);
assert.equal(compiled4.releaseQualified, false);

let stage4 = workbench4.getState().stages['LAFEA.4'];
assert.equal(stage4.shellSolverModelProjection.state, 'CURRENT_PASS');
assert.equal(stage4.shellSolverModelProjection.parentNormalCompanionHash, companionHash4);
assert.equal(
  stage4.shellSolverModelProjection.parentNormalAuthorizationEffect,
  definition.authorizationEffect,
);
assert.equal(stage4.shellSolverModelProjection.parentNormalCandidateQualification, 'PASS');
assert.equal(stage4.shellSolverModelProjection.solverModelHash, compiled4.solverModelHash);
assert.equal(stage4.shellSolverModelProjection.solverModelBindingHash, compiled4.solverModelBindingHash);

workbench4.run();
stage4 = workbench4.getState().stages['LAFEA.4'];
assert.equal(stage4.execution?.status, 'QUALIFIED');
assert.equal(stage4.execution?.parentNormalCompanionHash, companionHash4);
assert.equal(stage4.execution?.parentNormalAuthorizationEffect, definition.authorizationEffect);
assert.equal(stage4.execution?.parentNormalCandidateQualification, 'PASS');
assert.equal(stage4.execution?.solverModelHash, compiled4.solverModelHash);
assert.equal(stage4.execution?.solverModelBindingHash, compiled4.solverModelBindingHash);

const expectedExecutionMeshBindingHash = canonicalLafeaSha256({
  schema: 'lafea-shell-execution-mesh-binding/v1',
  stageId: 'LAFEA.4',
  retainedMeshHash: stage4.execution.meshHash,
  parentNormalCompanionHash: companionHash4,
  parentNormalAuthorizationEffect: definition.authorizationEffect,
  solverModelHash: stage4.execution.solverModelHash,
  solverModelBindingHash: stage4.execution.solverModelBindingHash,
  executedKernelModelHash: stage4.execution.executedKernelModelHash,
  executionMeshProofHash: stage4.execution.executionMeshProofHash,
});
assert.equal(stage4.execution.executionMeshBindingHash, expectedExecutionMeshBindingHash);

const resultHash4 = canonicalLafeaSha256({
  schema: 'lafea-shell-authoritative-result-hash-input/v1',
  stageId: 'LAFEA.4',
  result: stage4.execution.result,
});
const expectedCompiledExecutionHash = canonicalLafeaSha256({
  schema: 'lafea-shell-compiled-execution-hash-input/v1',
  stageId: 'LAFEA.4',
  sourceHash: stage4.execution.sourceHash,
  analysisDomainHash: stage4.execution.analysisDomainHash,
  analysisGeometryHash: stage4.execution.analysisGeometryHash,
  meshHash: stage4.execution.meshHash,
  meshProfileHash: stage4.execution.meshProfileHash,
  parentNormalCompanionHash: companionHash4,
  parentNormalAuthorizationEffect: definition.authorizationEffect,
  solverModelHash: stage4.execution.solverModelHash,
  executionMeshBindingHash: stage4.execution.executionMeshBindingHash,
  resultHash: resultHash4,
});
assert.equal(stage4.execution.compiledExecutionHash, expectedCompiledExecutionHash);

const fakeCompanionHash = `sha256:${'0'.repeat(64)}`;
assert.notEqual(fakeCompanionHash, companionHash4);
const mutatedExecutionMeshBindingHash = canonicalLafeaSha256({
  schema: 'lafea-shell-execution-mesh-binding/v1',
  stageId: 'LAFEA.4',
  retainedMeshHash: stage4.execution.meshHash,
  parentNormalCompanionHash: fakeCompanionHash,
  parentNormalAuthorizationEffect: definition.authorizationEffect,
  solverModelHash: stage4.execution.solverModelHash,
  solverModelBindingHash: stage4.execution.solverModelBindingHash,
  executedKernelModelHash: stage4.execution.executedKernelModelHash,
  executionMeshProofHash: stage4.execution.executionMeshProofHash,
});
assert.notEqual(mutatedExecutionMeshBindingHash, stage4.execution.executionMeshBindingHash);

const mutatedSolverModelBindingHash = canonicalLafeaSha256({
  schema: 'lafea-shell-solver-model-binding/v1',
  stageId: 'LAFEA.4',
  sourceHash: authority4.sourceHash,
  meshHash: generated4.evidence.meshHash,
  parentNormalCompanionHash: fakeCompanionHash,
  parentNormalAuthorizationEffect: definition.authorizationEffect,
  solverModelHash: compiled4.solverModelHash,
  kernelModelHash: compiled4.kernelModelHash,
  mappingMode: compiled4.mappingMode,
});
assert.notEqual(mutatedSolverModelBindingHash, compiled4.solverModelBindingHash);

// ---------------------------------------------------------------------------
// Adversarial reversed retained mesh: custody BLOCK is carried, not activated.
// Do not execute this fixture.
// ---------------------------------------------------------------------------
const reversedMesh = {
  ...structuredClone(generated4.evidence.mesh),
  meshIdentity: `${generated4.evidence.mesh.meshIdentity}:TECH12C-GLOBAL-REVERSE`,
  elements: generated4.evidence.mesh.elements.map((element) => ({
    ...structuredClone(element),
    nodeIds: [element.nodeIds[0], element.nodeIds[2], element.nodeIds[1]],
  })),
};
const reversedMeshHash = lafeaAnalysisMeshContentHash(reversedMesh);
const reversedEvidence = createLafeaAnalysisMeshEvidenceV2({
  schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  stageId: 'LAFEA.4',
  sourceHash: authority4.sourceHash,
  analysisDomainHash: midsurface4.analysisDomainHash,
  analysisGeometryHash: midsurface4.analysisGeometryHash,
  meshProfile: profile4,
  mesh: reversedMesh,
  authority: {
    schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
    stageId: 'LAFEA.4',
    authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
    status: 'ACCEPTED_BY_STAGE_CONTRACT',
    producerRef: 'TECH12C-GLOBAL-REVERSE-NONEXECUTED-FIXTURE',
    sourceHash: authority4.sourceHash,
    analysisDomainHash: midsurface4.analysisDomainHash,
    analysisGeometryHash: midsurface4.analysisGeometryHash,
    meshProfileHash: profile4.semanticHash,
    meshHash: reversedMeshHash,
    capabilityHash: canonicalLafeaSha256({ schema: 'tech12c-reverse-capability/v1' }),
    qualificationHash: canonicalLafeaSha256({ schema: 'tech12c-reverse-upstream/v1' }),
    planHash: canonicalLafeaSha256({ schema: 'tech12c-reverse-plan/v1' }),
  },
});
assert.equal(reversedEvidence.qualification, definition.adversarialReversedMesh.existingMeshQualification);
assert.equal(
  reversedEvidence.quality.shellOrientationTopology.qualification,
  definition.adversarialReversedMesh.existingOrientationTopology,
);
const reversedCompiled = compileLafeaShellSolverModel({
  stageId: 'LAFEA.4',
  sourceHash: authority4.sourceHash,
  source: document4,
  midsurfaceEvidence: midsurface4,
  meshEvidence: reversedEvidence,
});
assert.equal(
  reversedCompiled.parentNormalCustody.companionCandidateQualification,
  definition.adversarialReversedMesh.companionCandidateQualification,
);
assert.equal(reversedCompiled.parentNormalCustody.companionWouldBlockIfActivated, true);
assert.equal(
  reversedCompiled.parentNormalCustody.authorizationEffect,
  definition.adversarialReversedMesh.authorizationEffectMustRemain,
);
assert.equal(
  reversedCompiled.executionAuthorized,
  definition.adversarialReversedMesh.solverExecutionAuthorizedMustRemain,
);
assert.equal(reversedCompiled.releaseQualified, false);

// ---------------------------------------------------------------------------
// LAFEA.5 remains explicit NOT_APPLICABLE.
// ---------------------------------------------------------------------------
const document5 = normalizeLafeaStageDocument('LAFEA.5', createLafeaMockDocument('LAFEA.5'));
const authority5 = issueLafeaSourceAuthority(
  'LAFEA.5', document5, 'TECH12C-LAFEA5-NOT-APPLICABLE',
);
const parent5 = createLafea5SourceShellParent({
  sourceHash: authority5.sourceHash,
  shellTemplate: document5.shellTemplate,
});
const profile5 = shellProfile('LAFEA5_TECH12C_H15', 'TECH12C-R1', 15);
const plan5 = planLafea5SourceShellMeshAdoption({ parent: parent5, meshProfile: profile5 });
const produced5 = produceLafea5SourceShellMeshAdoption({
  parent: parent5,
  meshProfile: profile5,
  plan: plan5,
});
const compiled5 = compileLafeaShellSolverModel({
  stageId: 'LAFEA.5',
  sourceHash: authority5.sourceHash,
  source: document5,
  midsurfaceEvidence: parent5,
  meshEvidence: produced5.evidence,
});
assert.equal(compiled5.parents.parentNormalCompanionHash, null);
assert.equal(compiled5.parentNormalCustody.status, 'NOT_APPLICABLE');
assert.equal(
  compiled5.parentNormalCustody.authorizationEffect,
  definition.nonApplicablePolicy.authorizationEffect,
);

console.log(JSON.stringify({
  check: 'lafea-tech12c-solver-execution-companion-binding',
  status: 'PASS',
  qualificationId: definition.qualificationId,
  lafea4: {
    meshHash: generated4.evidence.meshHash,
    companionHash: companionHash4,
    solverModelHash: compiled4.solverModelHash,
    solverModelBindingHash: compiled4.solverModelBindingHash,
    executionMeshProofHash: stage4.execution.executionMeshProofHash,
    executionMeshBindingHash: stage4.execution.executionMeshBindingHash,
    compiledExecutionHash: stage4.execution.compiledExecutionHash,
    authorizationEffect: stage4.execution.parentNormalAuthorizationEffect,
    candidateQualification: stage4.execution.parentNormalCandidateQualification,
    companionHashSensitivityProved: true,
  },
  adversarialReversedMesh: {
    executed: false,
    existingMeshQualification: reversedEvidence.qualification,
    existingOrientationTopology: reversedEvidence.quality.shellOrientationTopology.qualification,
    companionCandidateQualification:
      reversedCompiled.parentNormalCustody.companionCandidateQualification,
    authorizationEffect: reversedCompiled.parentNormalCustody.authorizationEffect,
    executionAuthorizedUnchanged: reversedCompiled.executionAuthorized,
  },
  lafea5: {
    parentNormalCompanionHash: compiled5.parents.parentNormalCompanionHash,
    parentNormalCustodyStatus: compiled5.parentNormalCustody.status,
    authorizationEffect: compiled5.parentNormalCustody.authorizationEffect,
  },
  productionBindingAuthorized: false,
  releaseQualified: false,
}, null, 2));

workbench4.destroy();

function shellProfile(profileIdentity, sourceRevision, globalTargetSize) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity,
    sourceRevision,
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: LAFEA_SHELL_ELEMENT,
      globalTargetSize,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.5,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}
