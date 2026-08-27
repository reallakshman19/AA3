#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import {
  createLafeaMockDocument,
  createLafeaMockDomainAndGeometryEvidence,
  createLafeaMockMeshProfile,
} from '../src/workspace/lafea-simulated-source-provider.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';
import {
  assertLafeaExecutionCustody,
  closeRelative,
} from './lib/lafea1371-custody-assertions.mjs';

const STAGE_ID = 'LAFEA.3';
const ROUTE = 'DOMAIN_FIRST_COMPILED_SOLVER_MODEL';
const LOAD_CASE_ID = 'CASE-A';
const GP1 = Object.freeze({ pointId: 'GP1', xi: 1 / 6, eta: 1 / 6 });

const source = await createLafeaMockDocument(STAGE_ID);
const normalized = requireLafeaStageComposition(STAGE_ID).normalizeDocument(source);
const authority = issueLafeaSourceAuthority(
  STAGE_ID,
  normalized,
  'IMPLEMENTATION-AUTHORIZATION-GATE/LAFEA3/DIRECT-LOADED-ELEMENT',
);
const parents = await createLafeaMockDomainAndGeometryEvidence(STAGE_ID, authority.sourceHash);
const profile = createLafeaMockMeshProfile(STAGE_ID);
const store = createLafeaWorkbenchOrchestratorStore({
  initialStage: STAGE_ID,
  initialDocument: normalized,
  initialSourceHash: authority.sourceHash,
});

try {
  store.activateDomainFirstProfile(STAGE_ID);
  store.registerAnalysisDomain(parents.domain, STAGE_ID);
  store.registerAnalysisGeometryEvidence(parents.geometryEvidence, STAGE_ID);
  store.bindAnalysisMeshProfile(profile, STAGE_ID);
  const generated = store.generateAnalysisMesh({}, STAGE_ID);
  assert.equal(generated?.evidence?.qualification, 'PASS');
  store.prepareContinuumForRun(STAGE_ID);
  store.run();

  const stage = store.getState().stages[STAGE_ID];
  const custody = assertLafeaExecutionCustody(stage, {
    route: ROUTE,
    resultAccepted: (result) => assert.equal(result.qualification?.state, 'ACCEPTED'),
  });
  const meshEvidence = stage.retainedAnalysisMeshEvidenceV2;
  const mesh = meshEvidence.mesh;
  assert.equal(mesh.elements.every((row) => row.elementType === 'T6'), true);

  const caseResult = stage.execution.result.loadCaseResults.find(
    (row) => row.loadCaseId === LOAD_CASE_ID,
  );
  assert.ok(caseResult, `${LOAD_CASE_ID} result is required`);
  const contributions = caseResult.forceEvidence?.contributions
    ?.filter((row) => row.type === 'NODAL_FORCE') ?? [];
  assert.ok(contributions.length > 0, 'compiled CASE-A nodal-force contributions are required');
  for (const row of contributions) {
    assert.ok(Array.isArray(row.nodeIds) && row.nodeIds.length === 1);
    assert.ok(Array.isArray(row.forcePerNode) && row.forcePerNode.length === 1);
  }

  const nodeById = new Map(mesh.nodes.map((row) => [row.nodeId, row]));
  const ranked = mesh.elements.map((element) => {
    const incident = contributions.filter((row) => row.nodeIds.some((id) => element.nodeIds.includes(id)));
    const maximumLoadMagnitude = Math.max(
      0,
      ...incident.flatMap((row) => row.forcePerNode.map(([fx, fy]) => Math.hypot(fx, fy))),
    );
    return { element, incident, maximumLoadMagnitude };
  }).filter((row) => row.incident.length > 0).sort((left, right) => (
    right.maximumLoadMagnitude - left.maximumLoadMagnitude
    || right.incident.length - left.incident.length
    || left.element.elementId.localeCompare(right.element.elementId)
  ));
  assert.ok(ranked.length > 0, 'at least one retained T6 must be incident to an assembled CASE-A nodal load');

  const selectedRank = ranked[0];
  const selected = selectedRank.element;
  assert.equal(selected.nodeIds.length, 6);
  const selectedNodes = selected.nodeIds.map((nodeId) => {
    const node = nodeById.get(nodeId);
    assert.ok(node, `retained node ${nodeId} is required`);
    return { nodeId, x: node.x, y: node.y, z: node.z };
  });
  const loadedNodeIds = [...new Set(selectedRank.incident.flatMap((row) => row.nodeIds))].sort();
  assert.ok(loadedNodeIds.every((nodeId) => selected.nodeIds.includes(nodeId)));

  const hand = independentT6Jacobian(selectedNodes, GP1.xi, GP1.eta);
  const elementEvidence = stage.execution.result.meshEvidence.elementEvidence.find(
    (row) => row.elementId === selected.elementId,
  );
  assert.ok(elementEvidence);
  const solverPoint = elementEvidence.gaussEvidence.find((row) => row.pointId === GP1.pointId);
  assert.ok(solverPoint);
  closeRelative(solverPoint.jacobianDeterminant, hand.determinant, 2e-13, 1e-10);

  const recoveredElement = caseResult.elementResults.find((row) => row.elementId === selected.elementId);
  assert.ok(recoveredElement);
  const recoveredPoint = recoveredElement.gaussPointResults.find((row) => row.pointId === GP1.pointId);
  assert.ok(recoveredPoint);
  closeRelative(recoveredPoint.jacobianDeterminant, hand.determinant, 2e-13, 1e-10);

  const material = normalized.materials.find((row) => row.materialId === 'MAT');
  const sourceCase = normalized.loadCases.find((row) => row.loadCaseId === LOAD_CASE_ID);
  assert.ok(material && sourceCase);

  const receiptBody = Object.freeze({
    schema: 'lafea3-direct-loaded-element-authorization-addendum/v1',
    status: 'PASS',
    selectedBy: 'DIRECT_COMPILED_CASE_A_NODAL_LOAD_INCIDENT_MAX_MAGNITUDE_THEN_ELEMENT_ID',
    selectedElementId: selected.elementId,
    orderedNodeIds: [...selected.nodeIds],
    loadedNodeIds,
    midsideOrdering: Object.freeze({
      node4: 'EDGE_1_2',
      node5: 'EDGE_2_3',
      node6: 'EDGE_3_1',
    }),
    nodes: selectedNodes,
    sectionAndMaterial: Object.freeze({
      thickness: normalized.elements[0].thickness,
      materialId: material.materialId,
      elasticModulus: material.elasticModulus,
      poissonRatio: material.poissonRatio,
    }),
    physicalLoadCase: Object.freeze({
      loadCaseId: sourceCase.loadCaseId,
      sourceNodalForces: structuredClone(sourceCase.nodalForces),
      compiledNodalForceContributions: structuredClone(contributions),
      incidentCompiledContributions: structuredClone(selectedRank.incident),
      compiledContributionHash: canonicalLafeaSha256({
        schema: 'lafea3-case-a-compiled-load-contributions/v1',
        loadCaseId: LOAD_CASE_ID,
        contributions,
      }),
    }),
    integrationPoint: GP1,
    independentMapping: hand,
    solverJacobianDeterminant: solverPoint.jacobianDeterminant,
    recoveredResultJacobianDeterminant: recoveredPoint.jacobianDeterminant,
    trace: Object.freeze({
      sourceHash: authority.sourceHash,
      analysisDomainHash: parents.domain.semanticHash,
      analysisGeometryHash: parents.geometryEvidence.analysisGeometryHash,
      retainedMeshHash: meshEvidence.meshHash,
      retainedMeshArtifactHash: meshEvidence.artifactHash,
      solverModelHash: stage.execution.solverModelHash,
      compiledExecutionHash: stage.execution.compiledExecutionHash,
      recoveryArtifactHash: stage.lifecycle.artifacts.RECOVERY.artifactHash,
      custodySourceHash: custody.sourceHash,
      custodyMeshHash: custody.meshHash,
    }),
    firstFailureModule: 'src/core/local-continuum/t6-element.js::t6BMatrixAt/jacobianAt',
    falsifier: 'SAME_ORDERED_SIX_COORDINATES_AND_GP1_MATCH_HAND_DETJ_WHILE_DIRECT_COMPILED_LOAD_BINDING_IS_PROVEN',
  });
  const receipt = Object.freeze({
    ...receiptBody,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea3-direct-loaded-element-authorization-addendum-hash-input/v1',
      receipt: receiptBody,
    }),
  });
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  store.destroy();
}

function independentT6Jacobian(nodes, xi, eta) {
  assert.equal(nodes.length, 6);
  const dNdXi = [
    4 * xi + 4 * eta - 3,
    4 * xi - 1,
    0,
    4 * (1 - 2 * xi - eta),
    4 * eta,
    -4 * eta,
  ];
  const dNdEta = [
    4 * xi + 4 * eta - 3,
    0,
    4 * eta - 1,
    -4 * xi,
    4 * xi,
    4 * (1 - xi - 2 * eta),
  ];
  let dxDxi = 0;
  let dyDxi = 0;
  let dxDeta = 0;
  let dyDeta = 0;
  for (let index = 0; index < 6; index += 1) {
    dxDxi += dNdXi[index] * nodes[index].x;
    dyDxi += dNdXi[index] * nodes[index].y;
    dxDeta += dNdEta[index] * nodes[index].x;
    dyDeta += dNdEta[index] * nodes[index].y;
  }
  const determinant = dxDxi * dyDeta - dxDeta * dyDxi;
  assert.ok(determinant > 0);
  return Object.freeze({
    xi,
    eta,
    dNdXi,
    dNdEta,
    dxDxi,
    dyDxi,
    dxDeta,
    dyDeta,
    determinant,
  });
}
