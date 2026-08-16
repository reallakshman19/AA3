#!/usr/bin/env node
import assert from 'node:assert/strict';

import {
  PROFILE_KINDS,
  canonicalProfile,
} from '../src/core/lafea-profile-contract/index.js';
import {
  calculateLocalShell,
} from '../src/core/local-shell/index.js';
import {
  calculateLocalTrunnionFootprint,
} from '../src/core/local-trunnion-footprint/index.js';
import { createLafeaMockDocument } from '../src/workspace/advanced-mock-data.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import { produceLafeaShellAnalysisMesh } from '../src/workspace/lafea-shell-mesh-producer.js';
import {
  createLafea5SourceShellParent,
  planLafea5SourceShellMeshAdoption,
  produceLafea5SourceShellMeshAdoption,
} from '../src/workspace/lafea-source-shell-mesh-adoption.js';
import { compileLafeaShellSolverModel } from '../src/workspace/lafea-shell-solver-model.js';

const SHELL_ELEMENT = 'CST_DKT_TRI3_THIN_SHELL_V1';

const lafea4 = structuredClone(createLafeaMockDocument('LAFEA.4'));
lafea4.loadCases = [{
  loadCaseId: 'PRESSURE',
  nodalLoads: [],
  pressureLoads: lafea4.elements.map((element, index) => ({
    pressureLoadId: `P-${index + 1}`,
    elementId: element.elementId,
    pressure: 1.2,
    sense: 'ALONG_ELEMENT_NORMAL',
    sourceReference: `COMPILED-PRESSURE-${index + 1}`,
  })),
  sourceReference: 'COMPILED-PRESSURE-CASE',
}];
const authority4 = issueLafeaSourceAuthority('LAFEA.4', lafea4, 'SHELL-COMPILED-CHECK/LAFEA4');
const parent4 = createLafeaSimulatedShellMidsurfaceEvidence(
  'LAFEA.4', authority4.sourceHash, lafea4,
);
const produced4 = produceLafeaShellAnalysisMesh({
  midsurfaceEvidence: parent4,
  meshProfile: shellProfile('LAFEA.4', 15),
});
assert.equal(produced4.evidence.qualification, 'PASS');
assert.equal(produced4.evidence.quality.shellOrientationTopology?.qualification, 'PASS');
const compiled4 = compileLafeaShellSolverModel({
  stageId: 'LAFEA.4',
  sourceHash: authority4.sourceHash,
  source: lafea4,
  midsurfaceEvidence: parent4,
  meshEvidence: produced4.evidence,
});
assert.equal(compiled4.status, 'COMPILED');
assert.equal(compiled4.parents.meshHash, produced4.evidence.meshHash);
assert.equal(compiled4.mappingMode, 'PARAMETRIC_MIDSURFACE_UNIFORM_REGION_TRANSFER_V1');
assert.equal(compiled4.canonicalShellModel.nodes.length, produced4.evidence.mesh.nodes.length);
assert.equal(compiled4.canonicalShellModel.elements.length, produced4.evidence.mesh.elements.length);
assert.equal(
  compiled4.canonicalShellModel.loadCases[0].pressureLoads.length,
  produced4.evidence.mesh.elements.length,
);
const result4 = calculateLocalShell(compiled4.canonicalShellModel);
assert.equal(result4.qualification.accepted, true, result4.qualification.summary);
assert.equal(result4.canonicalModelSemanticHash, compiled4.kernelModelHash);
const pressureCase4 = result4.loadCaseResults.find((row) => row.loadCaseId === 'PRESSURE');
assert.ok(pressureCase4);
assert.equal(pressureCase4.forceEquilibrium.qualification.accepted, true);
assert.equal(pressureCase4.momentEquilibrium.qualification.accepted, true);
assert.ok(pressureCase4.appliedLoadEvidence.contributions.length > 0);
assert.ok(
  pressureCase4.appliedLoadEvidence.contributions.some(
    (row) => Math.hypot(...row.totalForce) > 0,
  ),
  'Nontrivial pressure benchmark must retain nonzero compiled surface loading.',
);

const nodalLoad4 = structuredClone(lafea4);
nodalLoad4.loadCases = [{
  loadCaseId: 'UNMAPPED-NODAL',
  nodalLoads: [{
    loadId: 'F-UNMAPPED',
    nodeId: nodalLoad4.nodes[0].nodeId,
    fx: 10, fy: 0, fz: 0, m1: 0, m2: 0,
    sourceReference: 'UNMAPPED-NODAL-SOURCE',
  }],
  pressureLoads: [],
  sourceReference: 'UNMAPPED-NODAL-CASE',
}];
const nodalAuthority4 = issueLafeaSourceAuthority(
  'LAFEA.4', nodalLoad4, 'SHELL-COMPILED-CHECK/LAFEA4-NODAL-NEGATIVE',
);
const nodalParent4 = createLafeaSimulatedShellMidsurfaceEvidence(
  'LAFEA.4', nodalAuthority4.sourceHash, nodalLoad4,
);
const nodalProduced4 = produceLafeaShellAnalysisMesh({
  midsurfaceEvidence: nodalParent4,
  meshProfile: shellProfile('LAFEA.4', 15, 'NODAL-NEGATIVE'),
});
assert.throws(
  () => compileLafeaShellSolverModel({
    stageId: 'LAFEA.4',
    sourceHash: nodalAuthority4.sourceHash,
    source: nodalLoad4,
    midsurfaceEvidence: nodalParent4,
    meshEvidence: nodalProduced4.evidence,
  }),
  (error) => error?.code === 'LAFEA4_SHELL_SOLVER_NODAL_LOAD_MAPPING_REQUIRED',
  'A remeshed LAFEA.4 model must reject source-node loads until a qualified load-transfer rule exists.',
);

const lafea5 = structuredClone(createLafeaMockDocument('LAFEA.5'));
const authority5 = issueLafeaSourceAuthority('LAFEA.5', lafea5, 'SHELL-COMPILED-CHECK/LAFEA5');
const parent5 = createLafea5SourceShellParent({
  sourceHash: authority5.sourceHash,
  shellTemplate: lafea5.shellTemplate,
});
const profile5 = shellProfile('LAFEA.5', 15);
const plan5 = planLafea5SourceShellMeshAdoption({ parent: parent5, meshProfile: profile5 });
const produced5 = produceLafea5SourceShellMeshAdoption({
  parent: parent5,
  meshProfile: profile5,
  plan: plan5,
});
const compiled5 = compileLafeaShellSolverModel({
  stageId: 'LAFEA.5',
  sourceHash: authority5.sourceHash,
  source: lafea5,
  midsurfaceEvidence: parent5,
  meshEvidence: produced5.evidence,
});
assert.equal(compiled5.status, 'COMPILED');
assert.equal(compiled5.mappingMode, 'LOSSLESS_TRUNNION_SOURCE_SHELL_BINDING_V1');
assert.equal(compiled5.parents.meshHash, produced5.evidence.meshHash);
assert.equal(compiled5.transferEvidence.nodeCoordinateMutation, false);
assert.equal(compiled5.transferEvidence.connectivityMutation, false);
const result5 = calculateLocalTrunnionFootprint(compiled5.canonicalInput);
assert.equal(result5.qualification.accepted, true, result5.qualification.summary);
assert.equal(result5.canonicalWorkflowModelHash, compiled5.kernelModelHash);
assertGeneratedShellMatchesRetained(produced5.evidence.mesh, result5.generatedShellModel);
assert.ok(result5.loadDistributionEvidence.length > 0);
assert.ok(result5.rawShellResult?.loadCaseResults?.length > 0);

console.log(JSON.stringify({
  schema: 'lafea-shell-compiled-execution-check/v1',
  status: 'PASS',
  lafea4: {
    sourceElements: lafea4.elements.length,
    retainedNodes: produced4.evidence.mesh.nodes.length,
    retainedElements: produced4.evidence.mesh.elements.length,
    solverModelHash: compiled4.solverModelHash,
    solverModelBindingHash: compiled4.solverModelBindingHash,
    resultKernelModelHash: result4.canonicalModelSemanticHash,
    pressureContributionCount: pressureCase4.appliedLoadEvidence.contributions.length,
    forceEquilibrium: pressureCase4.forceEquilibrium.qualification.accepted,
    momentEquilibrium: pressureCase4.momentEquilibrium.qualification.accepted,
    unsupportedNodalLoadRejected: true,
  },
  lafea5: {
    retainedNodes: produced5.evidence.mesh.nodes.length,
    retainedElements: produced5.evidence.mesh.elements.length,
    solverModelHash: compiled5.solverModelHash,
    solverModelBindingHash: compiled5.solverModelBindingHash,
    canonicalWorkflowModelHash: result5.canonicalWorkflowModelHash,
    generatedShellModelHash: result5.canonicalShellModelHash,
    workflowLoadCaseCount: result5.loadDistributionEvidence.length,
    losslessRetainedMeshExecutionBinding: true,
  },
}, null, 2));

function shellProfile(stageId, target, suffix = 'QUALIFIED') {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `SHELL_COMPILED_${stageId.replace('.', '_')}_${suffix}`,
    sourceRevision: 'SHELL-COMPILED-CHECK-V1',
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: SHELL_ELEMENT,
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

function assertGeneratedShellMatchesRetained(retained, generated) {
  assert.ok(generated);
  assert.equal(generated.nodes.length, retained.nodes.length);
  assert.equal(generated.elements.length, retained.elements.length);
  const nodeById = new Map(generated.nodes.map((row) => [row.nodeId, row]));
  for (const node of retained.nodes) {
    assert.deepEqual(nodeById.get(node.nodeId)?.position, [node.x, node.y, node.z]);
  }
  const elementById = new Map(generated.elements.map((row) => [row.elementId, row]));
  for (const element of retained.elements) {
    assert.deepEqual(
      [...elementById.get(element.elementId).nodeIds].sort(),
      [...element.nodeIds].sort(),
    );
  }
}
