#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { BASE_LIMITATIONS, createCanonicalLocalShellModel } from '../src/core/local-shell/index.js';
import { buildShellElementEvidence } from '../src/core/local-shell/element.js';
import { baseSource, triangleSource as shellFixture } from './lafea.4-fixtures.mjs';
import { workflowSource as trunnionFixture } from './lafea.5-fixtures.mjs';
import {
  LAFEA_SHELL_PERIODIC_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_PERIODIC_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_PERIODIC_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_PERIODIC_ORIENTATION,
  LAFEA_SHELL_PERIODIC_TOPOLOGY,
  createLafeaPeriodicShellAnalysisDomain,
  createLafeaPeriodicShellMidsurfaceEvidence,
  createLafeaPeriodicShellMidsurfaceGeometry,
  periodicCylindricalShellFrameAtPoint3d,
  periodicCylindricalShellFrameAtUv,
  periodicCylindricalShellPoint3d,
  validateLafeaPeriodicShellMidsurfaceEvidence,
} from '../src/workspace/lafea-shell-periodic-midsurface-contract.js';
import {
  shellMidsurfaceFrameAtPoint3dAny,
  validateLafeaAnyShellMidsurfaceEvidence,
} from '../src/workspace/lafea-shell-midsurface-dispatch.js';
import {
  LAFEA_SHELL_CURVED_MINIMUM_FACET_DIRECTOR_ALIGNMENT,
  LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES,
  LAFEA_SHELL_ELEMENT,
  LAFEA_SHELL_PERIODIC_MESH_PLAN_SCHEMA,
  LAFEA_SHELL_PERIODIC_MESH_STRATEGY,
  planLafeaShellAnalysisMesh,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { normalizeLafeaStageDocument } from '../src/workspace/lafea-workbench-model.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';
import { buildLafeaDiscretizationViewModel } from '../src/workspace/lafea-discretization-view-model.js';

assert.ok(BASE_LIMITATIONS.includes('NO_AUTOMATIC_OR_ADAPTIVE_MESHING'));

const SOURCE_HASH = `sha256:${'9'.repeat(64)}`;
const NEXT_SOURCE_HASH = `sha256:${'b'.repeat(64)}`;
const ROOT2 = Math.sqrt(0.5);
const RADIUS = 100;
const UMIN = -Math.PI * RADIUS;
const UMAX = Math.PI * RADIUS;
const AXIAL_SPAN = 120;
const fixtureByStage = { 'LAFEA.4': shellFixture, 'LAFEA.5': trunnionFixture };
const expectedCompilerBlock = {
  'LAFEA.4': 'LAFEA4_SHELL_SOLVER_CONSTRAINT_MAPPING_REQUIRED',
  'LAFEA.5': 'LAFEA5_SHELL_SOLVER_SOURCE_MESH_PARENT_REQUIRED',
};
const rows = [];

for (const stageId of ['LAFEA.4', 'LAFEA.5']) {
  const parent = periodicParent(stageId, SOURCE_HASH);
  assert.equal(validateLafeaPeriodicShellMidsurfaceEvidence(parent).semanticHash, parent.semanticHash);
  assert.equal(validateLafeaAnyShellMidsurfaceEvidence(parent).semanticHash, parent.semanticHash);
  checkAnalyticPeriodicity(parent.geometry);

  const coarseProfile = shellProfile(stageId, 60);
  const fineProfile = shellProfile(stageId, 20);
  const coarsePlan = planLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: coarseProfile });
  assert.equal(coarsePlan.schema, LAFEA_SHELL_PERIODIC_MESH_PLAN_SCHEMA);
  assert.equal(coarsePlan.strategy, LAFEA_SHELL_PERIODIC_MESH_STRATEGY);
  assert.equal(coarsePlan.periodicDirection, 'U');
  close(coarsePlan.angularSpanDegrees, 360, 1e-9);
  assert.equal(coarsePlan.axialSpan, AXIAL_SPAN);
  const expectedCurvatureTarget = RADIUS * LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES * Math.PI / 180;
  close(coarsePlan.curvatureTargetElementLength, expectedCurvatureTarget, 1e-12);
  close(coarsePlan.effectiveTargetElementLength, expectedCurvatureTarget, 1e-12);
  assert.equal(coarsePlan.seamPairCount, coarsePlan.seamNodeCount);
  assert.equal(coarsePlan.seamEdgeCount, coarsePlan.seamNodeCount - 1);
  assert.equal(coarsePlan.physicalBoundaryLoopCount, 2);
  assert.equal(coarsePlan.eulerCharacteristic, 0);
  assert.ok(coarsePlan.minimumFacetDirectorAlignment >= LAFEA_SHELL_CURVED_MINIMUM_FACET_DIRECTOR_ALIGNMENT - 1e-12);
  assert.ok(coarsePlan.maximumFacetNormalDeviationDegrees <= LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES + 1e-9);
  assert.equal(coarsePlan.estimatedDofs, coarsePlan.nodeCount * 5);

  const coarse = produceLafeaShellAnalysisMesh({
    midsurfaceEvidence: parent,
    meshProfile: coarseProfile,
    plan: coarsePlan,
  });
  assert.equal(coarse.evidence.qualification, 'PASS');
  assert.equal(coarse.evidence.quality.blockingElementIds.length, 0);
  assert.ok(coarse.evidence.mesh.elements.every((row) => row.elementType === LAFEA_SHELL_ELEMENT));
  assertCylinderNodes(coarse.evidence.mesh.nodes, parent.geometry);
  qualifyAnnulusTopology(coarse.evidence.mesh);
  assertNoDuplicatePhysicalNodes(coarse.evidence.mesh.nodes);
  qualifySeamFacetAgainstLocalShell(coarse.evidence.mesh, parent.geometry);

  const replay = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: coarseProfile });
  assert.equal(replay.plan.planHash, coarse.plan.planHash);
  assert.equal(replay.evidence.meshHash, coarse.evidence.meshHash);
  assert.equal(replay.evidence.artifactHash, coarse.evidence.artifactHash);
  assert.equal(JSON.stringify(replay.evidence.mesh), JSON.stringify(coarse.evidence.mesh));

  const fine = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: fineProfile });
  assert.equal(fine.plan.effectiveTargetElementLength, 20);
  assert.equal(fine.evidence.qualification, 'PASS');
  assert.equal(fine.evidence.quality.blockingElementIds.length, 0);
  assert.ok(fine.evidence.mesh.nodes.length > coarse.evidence.mesh.nodes.length);
  assert.ok(fine.evidence.mesh.elements.length > coarse.evidence.mesh.elements.length);
  assert.equal(fine.plan.eulerCharacteristic, 0);
  assert.equal(fine.plan.physicalBoundaryLoopCount, 2);

  checkWorkbench(stageId, coarseProfile);
  rows.push({
    stageId,
    radius: RADIUS,
    angularSpanDegrees: coarse.plan.angularSpanDegrees,
    requestedTarget: coarse.plan.requestedTargetElementLength,
    effectiveTarget: coarse.plan.effectiveTargetElementLength,
    nodeCount: coarse.evidence.mesh.nodes.length,
    elementCount: coarse.evidence.mesh.elements.length,
    estimatedDofs: coarse.plan.estimatedDofs,
    seamNodeCount: coarse.plan.seamNodeCount,
    seamEdgeCount: coarse.plan.seamEdgeCount,
    physicalBoundaryLoopCount: coarse.plan.physicalBoundaryLoopCount,
    eulerCharacteristic: coarse.plan.eulerCharacteristic,
    minimumFacetDirectorAlignment: coarse.plan.minimumFacetDirectorAlignment,
    maximumFacetNormalDeviationDegrees: coarse.plan.maximumFacetNormalDeviationDegrees,
    artifactHash: coarse.evidence.artifactHash,
  });
}

checkAdversarialContracts();

console.log(JSON.stringify({
  schema: 'lafea-shell-periodic-cylinder-check/v1',
  status: 'PASS',
  rows,
  qualifiedScope: {
    surface: 'ANALYTIC_CYLINDER',
    parameterization: 'U_ARC_LENGTH_V_AXIAL',
    patch: 'FULL_CYLINDER_SINGLE_PERIODIC_U_CHART',
    seamPolicy: 'IDENTIFY_UMIN_UMAX_BY_V_V1',
    expectedEulerCharacteristic: 0,
    physicalBoundaryLoops: 2,
    curvatureTargetAngleDegrees: LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES,
    elementFamily: LAFEA_SHELL_ELEMENT,
  },
  exclusions: [
    'CURVED_HOLES', 'MULTI_PATCH_SEAMS', 'CONE_SPHERE_NURBS_FREEFORM',
    'OFFSET_SURFACE_GENERATION', 'THICKNESS_TRANSITION_MESHING',
    'SHELL_LOCAL_REFINEMENT',
  ],
}, null, 2));

function periodicParent(stageId, sourceHash) {
  const geometry = createLafeaPeriodicShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_PERIODIC_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId,
    geometryId: `PERIODIC-${stageId}-CYLINDER-360`,
    lengthUnit: 'mm',
    surface: {
      kind: 'CYLINDER',
      axisOrigin: { x: 10, y: -20, z: 30 },
      axisDirection: { x: ROOT2, y: ROOT2, z: 0 },
      radialDirection: { x: 0, y: 0, z: 1 },
      radius: RADIUS,
    },
    orientationPolicy: LAFEA_SHELL_PERIODIC_ORIENTATION,
    vertices: [
      { vertexId: 'V1', u: UMIN, v: 0 },
      { vertexId: 'V2', u: UMAX, v: 0 },
      { vertexId: 'V3', u: UMAX, v: AXIAL_SPAN },
      { vertexId: 'V4', u: UMIN, v: AXIAL_SPAN },
    ],
    segments: [
      { segmentId: 'S1', startVertexId: 'V1', endVertexId: 'V2' },
      { segmentId: 'S2', startVertexId: 'V2', endVertexId: 'V3' },
      { segmentId: 'S3', startVertexId: 'V3', endVertexId: 'V4' },
      { segmentId: 'S4', startVertexId: 'V4', endVertexId: 'V1' },
    ],
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
  });
  const domain = createLafeaPeriodicShellAnalysisDomain({
    schema: LAFEA_SHELL_PERIODIC_ANALYSIS_DOMAIN_SCHEMA,
    stageId,
    domainId: `PERIODIC-${stageId}-DOMAIN`,
    sourceHash,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_PERIODIC_TOPOLOGY,
  });
  return createLafeaPeriodicShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_PERIODIC_MIDSURFACE_INTAKE_SCHEMA,
    stageId,
    sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: 'PERIODIC-CYLINDER-DECLARED-MIDSURFACE',
  });
}

function shellProfile(stageId, target) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `PERIODIC_${stageId.replace('.', '_')}_${target}`,
    sourceRevision: 'R9',
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: LAFEA_SHELL_ELEMENT,
      globalTargetSize: target,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}

function checkAnalyticPeriodicity(geometry) {
  const left = periodicCylindricalShellPoint3d(geometry, UMIN, AXIAL_SPAN * 0.37);
  const right = periodicCylindricalShellPoint3d(geometry, UMAX, AXIAL_SPAN * 0.37);
  close(distance(left, right), 0, 1e-9);
  const leftFrame = periodicCylindricalShellFrameAtUv(geometry, UMIN, 0);
  const rightFrame = periodicCylindricalShellFrameAtUv(geometry, UMAX, 0);
  close(dot(leftFrame.director, rightFrame.director), 1, 1e-12);
  close(dot(leftFrame.rotationBasis1, rightFrame.rotationBasis1), 1, 1e-12);
  const recovered = periodicCylindricalShellFrameAtPoint3d(geometry, left);
  close(dot(recovered.director, leftFrame.director), 1, 1e-12);
  close(dot(recovered.rotationBasis1, leftFrame.rotationBasis1), 1, 1e-12);
}

function assertCylinderNodes(nodes, geometry) {
  const origin = geometry.surface.axisOrigin;
  const axis = geometry.surface.axisDirection;
  for (const node of nodes) {
    const rel = { x: node.x - origin.x, y: node.y - origin.y, z: node.z - origin.z };
    const axial = dot(rel, axis);
    const radial = {
      x: rel.x - axial * axis.x,
      y: rel.y - axial * axis.y,
      z: rel.z - axial * axis.z,
    };
    close(norm(radial), geometry.surface.radius, 1e-8);
    const frame = shellMidsurfaceFrameAtPoint3dAny(geometry, node);
    close(norm(frame.director), 1, 1e-12);
  }
}

function qualifyAnnulusTopology(mesh) {
  const edgeRows = edgeIncidence(mesh);
  assert.ok([...edgeRows.values()].every((row) => row.count <= 2));
  const boundary = [...edgeRows.values()].filter((row) => row.count === 1);
  const components = boundaryComponents(boundary);
  assert.equal(components.length, 2);
  assert.ok(components.every((component) => component.closed));
  assert.equal(mesh.nodes.length - edgeRows.size + mesh.elements.length, 0);
}

function assertNoDuplicatePhysicalNodes(nodes) {
  const key = (value) => Math.round(value * 1e8);
  const keys = nodes.map((node) => `${key(node.x)}|${key(node.y)}|${key(node.z)}`);
  assert.equal(new Set(keys).size, keys.length, 'periodic seam must not retain duplicate physical DOFs');
}

function qualifySeamFacetAgainstLocalShell(mesh, geometry) {
  const seamDirection = {
    x: -geometry.surface.radialDirection.x,
    y: -geometry.surface.radialDirection.y,
    z: -geometry.surface.radialDirection.z,
  };
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const seamNodeIds = mesh.nodes
    .filter((node) => dot(shellMidsurfaceFrameAtPoint3dAny(geometry, node).director, seamDirection) > 1 - 1e-10)
    .map((node) => node.nodeId);
  const seamSet = new Set(seamNodeIds);
  const element = mesh.elements.find((row) => row.nodeIds.some((nodeId) => seamSet.has(nodeId)));
  assert.ok(element, 'expected at least one seam-adjacent shell facet');
  const nodes = element.nodeIds.map((nodeId) => {
    const point = nodeById.get(nodeId);
    const frame = shellMidsurfaceFrameAtPoint3dAny(geometry, point);
    return {
      nodeId,
      position: [point.x, point.y, point.z],
      director: vector(frame.director),
      rotationBasis1: vector(frame.rotationBasis1),
      rotationBasis2: vector(frame.rotationBasis2),
      sourceReference: `PERIODIC-MESH:${nodeId}`,
    };
  });
  const source = baseSource({
    modelIdentity: 'PERIODIC-MESH-SEAM-FACET-COMPATIBILITY',
    sourceAncestry: ['lafea-shell-periodic-cylinder-check/v1'],
    nodes,
    elements: [{
      elementId: 'PERIODIC-E1',
      nodeIds: [...element.nodeIds],
      materialId: 'MAT',
      thickness: 2,
      sourceReference: 'PERIODIC-MESH:E1',
    }],
    constraints: [],
    loadCases: [{ loadCaseId: 'LC', nodalLoads: [], pressureLoads: [], sourceReference: 'LC-SRC' }],
  });
  const model = createCanonicalLocalShellModel(source);
  const evidence = buildShellElementEvidence(model);
  assert.equal(evidence.length, 1);
  assert.ok(evidence[0].directorAlignment.every((row) => row.accepted));
  assert.ok(evidence[0].qualification.rigidTranslation.accepted);
  assert.ok(evidence[0].qualification.rigidRotation.scaledQualification.accepted);
}

function checkWorkbench(stageId, profile) {
  const document = normalizeLafeaStageDocument(stageId, fixtureByStage[stageId]());
  const sourceAuthority = issueLafeaSourceAuthority(
    stageId, document, `PERIODIC-${stageId}-QUALIFIER-SOURCE-AUTHORITY`,
  );
  const parent = periodicParent(stageId, sourceAuthority.sourceHash);
  const workbench = createLafeaWorkbenchOrchestratorStore({
    initialStage: stageId,
    initialDocument: document,
    initialSourceHash: sourceAuthority.sourceHash,
  });
  assert.equal(workbench.registerShellMidsurfaceEvidence(parent, stageId)?.changed, true);
  assert.equal(workbench.bindAnalysisMeshProfile(profile, stageId)?.changed, true);
  const planned = workbench.planAnalysisMesh({}, stageId);
  assert.equal(planned.summary.strategy, LAFEA_SHELL_PERIODIC_MESH_STRATEGY);
  assert.ok(planned.configuration.effectiveTargetElementLength < 60);
  const generated = workbench.generateAnalysisMesh({}, stageId);
  assert.equal(generated.evidence.qualification, 'PASS');
  let stage = workbench.getState().stages[stageId];
  assert.equal(stage.analysisMeshCustodyProjection.state, 'CURRENT_PASS');
  assert.equal(stage.analysisMeshCustodyProjection.usableForRun, false);
  assert.equal(stage.shellSolverModelProjection.state, 'BLOCKED');
  assert.deepEqual(stage.shellSolverModelProjection.reasons, [expectedCompilerBlock[stageId]]);
  assert.deepEqual(stage.analysisMeshCustodyProjection.runBlockingReasons, [
    expectedCompilerBlock[stageId],
  ]);
  const vm = buildLafeaDiscretizationViewModel(stage);
  assert.equal(vm.actions.canRun, false);
  assert.equal(vm.actions.manualRefinementEnabled, false);
  const retainedHash = workbench.selectRetainedAnalysisMeshEvidenceV2(stageId).artifactHash;
  if (stageId === 'LAFEA.4') {
    assert.equal(vm.refinement?.applicable, true);
    assert.equal(vm.refinement?.scopeEligible, false);
    assert.equal(vm.refinement?.productQualified, false);
    assert.equal(vm.refinement?.canRefine, false);
  } else {
    assert.equal(workbench.refineAnalysisMesh({
      targetType: 'ELEMENT', targetIds: ['E000001'], targetElementLength: 10, lengthUnit: 'mm',
    }, stageId), null);
    assert.equal(workbench.getState().diagnostics?.[0]?.code, 'LAFEA_SHELL_LOCAL_REFINEMENT_NOT_QUALIFIED');
  }
  assert.equal(workbench.selectRetainedAnalysisMeshEvidenceV2(stageId).artifactHash, retainedHash);
  workbench.initializeLifecycle(NEXT_SOURCE_HASH, `PERIODIC-${stageId}-SOURCE-CHANGE`);
  stage = workbench.getState().stages[stageId];
  assert.equal(stage.retainedShellMidsurfaceEvidence, null);
  assert.equal(stage.retainedAnalysisMeshEvidenceV2, null);
  workbench.destroy();
}

function checkAdversarialContracts() {
  const valid = periodicParent('LAFEA.4', SOURCE_HASH);
  const base = inputGeometry(valid.geometry);

  const shortSpan = inputGeometry(valid.geometry);
  shortSpan.vertices = shortSpan.vertices.map((row) => (
    row.vertexId === 'V2' || row.vertexId === 'V3' ? { ...row, u: UMAX - 10 } : row
  ));
  assert.throws(() => createLafeaPeriodicShellMidsurfaceGeometry(shortSpan),
    (error) => error?.code === 'LAFEA_SHELL_PERIODIC_CANONICAL_FULL_CIRCUMFERENCE_REQUIRED');

  const shiftedChart = inputGeometry(valid.geometry);
  shiftedChart.vertices = shiftedChart.vertices.map((row) => ({ ...row, u: row.u + Math.PI * RADIUS }));
  assert.throws(() => createLafeaPeriodicShellMidsurfaceGeometry(shiftedChart),
    (error) => error?.code === 'LAFEA_SHELL_PERIODIC_CANONICAL_FULL_CIRCUMFERENCE_REQUIRED');

  const badBasis = inputGeometry(valid.geometry);
  badBasis.surface = {
    ...badBasis.surface,
    axisDirection: { x: 1, y: 0, z: 0 },
    radialDirection: { x: 1, y: 0, z: 0 },
  };
  assert.throws(() => createLafeaPeriodicShellMidsurfaceGeometry(badBasis),
    (error) => error?.code === 'LAFEA_SHELL_PERIODIC_CYLINDER_BASIS_NOT_ORTHOGONAL');

  const holeLike = inputGeometry(valid.geometry);
  holeLike.loops = [{ ...holeLike.loops[0], role: 'HOLE' }];
  assert.throws(() => createLafeaPeriodicShellMidsurfaceGeometry(holeLike),
    (error) => error?.code === 'LAFEA_SHELL_PERIODIC_HOLES_NOT_QUALIFIED');

  const zeroAxial = inputGeometry(valid.geometry);
  zeroAxial.vertices = zeroAxial.vertices.map((row) => (
    row.vertexId === 'V3' || row.vertexId === 'V4' ? { ...row, v: 0 } : row
  ));
  assert.throws(() => createLafeaPeriodicShellMidsurfaceGeometry(zeroAxial),
    (error) => error?.code === 'LAFEA_SHELL_PERIODIC_PATCH_NOT_RECTANGULAR');

  assert.equal(base.orientationPolicy, LAFEA_SHELL_PERIODIC_ORIENTATION);
}

function inputGeometry(geometry) {
  return {
    schema: LAFEA_SHELL_PERIODIC_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId: geometry.stageId,
    geometryId: geometry.geometryId,
    lengthUnit: geometry.lengthUnit,
    surface: JSON.parse(JSON.stringify(geometry.surface)),
    orientationPolicy: geometry.orientationPolicy,
    vertices: geometry.vertices.map((row) => ({ ...row })),
    segments: geometry.segments.map((row) => ({ ...row })),
    loops: geometry.loops.map((row) => ({ ...row, segmentIds: [...row.segmentIds] })),
  };
}

function edgeIncidence(mesh) {
  const rows = new Map();
  for (const element of mesh.elements) {
    const ids = element.nodeIds;
    for (const [a, b] of [[ids[0], ids[1]], [ids[1], ids[2]], [ids[2], ids[0]]]) {
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      const row = rows.get(key) ?? { a, b, count: 0 };
      row.count += 1;
      rows.set(key, row);
    }
  }
  return rows;
}

function boundaryComponents(edges) {
  const adjacency = new Map();
  for (const edge of edges) {
    adjacency.set(edge.a, [...(adjacency.get(edge.a) ?? []), edge.b]);
    adjacency.set(edge.b, [...(adjacency.get(edge.b) ?? []), edge.a]);
  }
  const remaining = new Set(adjacency.keys());
  const components = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    const seen = new Set([first]);
    const stack = [first];
    while (stack.length) {
      const current = stack.pop();
      remaining.delete(current);
      for (const next of adjacency.get(current) ?? []) {
        if (!seen.has(next)) { seen.add(next); stack.push(next); }
      }
    }
    components.push({
      nodeCount: seen.size,
      closed: [...seen].every((nodeId) => (adjacency.get(nodeId) ?? []).length === 2),
    });
  }
  return components;
}

function vector(value) { return [value.x, value.y, value.z]; }
function norm(value) { return Math.hypot(value.x, value.y, value.z); }
function dot(left, right) { return left.x * right.x + left.y * right.y + left.z * right.z; }
function distance(left, right) { return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z); }
function close(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} within ${tolerance}`);
}