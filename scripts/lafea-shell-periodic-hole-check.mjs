#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { BASE_LIMITATIONS, createCanonicalLocalShellModel } from '../src/core/local-shell/index.js';
import { buildShellElementEvidence } from '../src/core/local-shell/element.js';
import { baseSource, triangleSource as shellFixture } from './lafea.4-fixtures.mjs';
import { workflowSource as trunnionFixture } from './lafea.5-fixtures.mjs';
import {
  LAFEA_SHELL_PERIODIC_HOLE_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_PERIODIC_HOLE_ORIENTATION,
  LAFEA_SHELL_PERIODIC_HOLE_TOPOLOGY,
  createLafeaPeriodicHoleShellAnalysisDomain,
  createLafeaPeriodicHoleShellMidsurfaceEvidence,
  createLafeaPeriodicHoleShellMidsurfaceGeometry,
  periodicHoleMaterialLigamentQualification,
  periodicHoleShellFrameAtPoint3d,
  periodicHoleShellPoint3d,
  validateLafeaPeriodicHoleShellMidsurfaceEvidence,
} from '../src/workspace/lafea-shell-periodic-hole-midsurface-contract.js';
import { validateLafeaAnyShellMidsurfaceEvidence } from '../src/workspace/lafea-shell-midsurface-dispatch.js';
import {
  LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES,
  LAFEA_SHELL_ELEMENT,
  LAFEA_SHELL_HOLE_MINIMUM_ELEMENTS_ACROSS_LIGAMENT,
  LAFEA_SHELL_PERIODIC_HOLE_MESH_PLAN_SCHEMA,
  LAFEA_SHELL_PERIODIC_HOLE_MESH_STRATEGY,
  planLafeaShellAnalysisMesh,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';
import { buildLafeaDiscretizationViewModel } from '../src/workspace/lafea-discretization-view-model.js';

assert.ok(BASE_LIMITATIONS.includes('NO_AUTOMATIC_OR_ADAPTIVE_MESHING'));

const SOURCE_HASH = `sha256:${'e'.repeat(64)}`;
const NEXT_SOURCE_HASH = `sha256:${'d'.repeat(64)}`;
const ROOT2 = Math.sqrt(0.5);
const RADIUS = 100;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CANONICAL_SEAM = Math.PI * RADIUS;
const AXIAL_MIN = 0;
const AXIAL_MAX = 120;
const HOLE = Object.freeze({ holeId: 'SEAM-HOLE-1', uMin: 300, uMax: 328, vMin: 40, vMax: 80 });
const fixtureByStage = { 'LAFEA.4': shellFixture, 'LAFEA.5': trunnionFixture };
const rows = [];

for (const stageId of ['LAFEA.4', 'LAFEA.5']) {
  const parent = periodicHoleParent(stageId, SOURCE_HASH, HOLE);
  assert.equal(validateLafeaPeriodicHoleShellMidsurfaceEvidence(parent).semanticHash, parent.semanticHash);
  assert.equal(validateLafeaAnyShellMidsurfaceEvidence(parent).semanticHash, parent.semanticHash);

  const ligament = periodicHoleMaterialLigamentQualification(parent.geometry);
  close(ligament.lowerAxialLigament, 40, 1e-12);
  close(ligament.upperAxialLigament, 40, 1e-12);
  close(ligament.circumferentialReturnLigament, CIRCUMFERENCE - 28, 1e-10);
  close(ligament.minimumMaterialLigament, 40, 1e-12);

  assert.throws(
    () => planLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: shellProfile(stageId, 60, 'COARSE') }),
    (error) => error?.code === 'LAFEA_SHELL_PERIODIC_HOLE_TARGET_TOO_COARSE_FOR_LIGAMENT',
  );

  const profile = shellProfile(stageId, 20, 'ACCEPTED');
  const plan = planLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
  assert.equal(plan.schema, LAFEA_SHELL_PERIODIC_HOLE_MESH_PLAN_SCHEMA);
  assert.equal(plan.strategy, LAFEA_SHELL_PERIODIC_HOLE_MESH_STRATEGY);
  assert.equal(plan.holeCount, 1);
  assert.equal(plan.periodicDirection, 'U');
  assert.equal(plan.seamGapCount, 1);
  assert.equal(plan.physicalBoundaryLoopCount, 3);
  assert.equal(plan.eulerCharacteristic, -1);
  assert.equal(plan.seamPairCount, plan.seamNodeCount);
  assert.equal(plan.seamEdgeCount, plan.seamNodeCount - 2);
  close(plan.minimumMaterialLigament, 40, 1e-12);
  close(plan.maximumQualifiedTargetElementLength, 20, 1e-12);
  assert.equal(plan.minimumElementsAcrossLigament, LAFEA_SHELL_HOLE_MINIMUM_ELEMENTS_ACROSS_LIGAMENT);
  assert.equal(plan.requestedTargetElementLength, 20);
  assert.equal(plan.effectiveTargetElementLength, 20);
  close(
    plan.curvatureTargetElementLength,
    RADIUS * LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES * Math.PI / 180,
    1e-12,
  );
  assert.ok(plan.minimumFacetDirectorAlignment >= Math.cos(15 * Math.PI / 180) - 1e-12);
  assert.ok(plan.maximumFacetNormalDeviationDegrees <= 15 + 1e-9);
  assert.equal(plan.estimatedDofs, plan.nodeCount * 5);

  const result = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile, plan });
  assert.equal(result.evidence.qualification, 'PASS');
  assert.equal(result.evidence.quality.blockingElementIds.length, 0);
  assert.equal(
    result.evidence.quality.gateResults.find((row) => row.metric === 'SCALED_JACOBIAN').blockingThreshold,
    0.2,
  );
  assert.ok(result.evidence.mesh.elements.every((row) => row.elementType === LAFEA_SHELL_ELEMENT));
  assertNoDuplicatePhysicalNodes(result.evidence.mesh.nodes);
  assertCylinderAndHoleEmpty(result.evidence.mesh, parent.geometry, HOLE);
  assertHoleCornersRetained(result.evidence.mesh, parent.geometry, HOLE);
  qualifyPhysicalTopology(result.evidence.mesh, 3, -1);
  qualifyHoleAdjacentFacetAgainstLocalShell(result.evidence.mesh, parent.geometry, HOLE);

  const replay = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
  assert.equal(replay.plan.planHash, result.plan.planHash);
  assert.equal(replay.evidence.meshHash, result.evidence.meshHash);
  assert.equal(replay.evidence.artifactHash, result.evidence.artifactHash);
  assert.equal(JSON.stringify(replay.evidence.mesh), JSON.stringify(result.evidence.mesh));

  const fine = produceLafeaShellAnalysisMesh({
    midsurfaceEvidence: parent,
    meshProfile: shellProfile(stageId, 10, 'FINE'),
  });
  assert.equal(fine.evidence.qualification, 'PASS');
  assert.equal(fine.evidence.quality.blockingElementIds.length, 0);
  assert.equal(fine.plan.physicalBoundaryLoopCount, 3);
  assert.equal(fine.plan.eulerCharacteristic, -1);
  assert.ok(fine.evidence.mesh.nodes.length > result.evidence.mesh.nodes.length);
  assert.ok(fine.evidence.mesh.elements.length > result.evidence.mesh.elements.length);
  assertCylinderAndHoleEmpty(fine.evidence.mesh, parent.geometry, HOLE);
  qualifyPhysicalTopology(fine.evidence.mesh, 3, -1);

  checkWorkbench(stageId, parent, profile);

  rows.push({
    stageId,
    radius: RADIUS,
    canonicalSeamU: CANONICAL_SEAM,
    holeU: [HOLE.uMin, HOLE.uMax],
    holeV: [HOLE.vMin, HOLE.vMax],
    minimumMaterialLigament: plan.minimumMaterialLigament,
    maximumQualifiedTargetElementLength: plan.maximumQualifiedTargetElementLength,
    effectiveTargetElementLength: plan.effectiveTargetElementLength,
    nodeCount: result.evidence.mesh.nodes.length,
    elementCount: result.evidence.mesh.elements.length,
    fine10NodeCount: fine.evidence.mesh.nodes.length,
    fine10ElementCount: fine.evidence.mesh.elements.length,
    seamNodeCount: plan.seamNodeCount,
    seamEdgeCount: plan.seamEdgeCount,
    seamGapCount: plan.seamGapCount,
    physicalBoundaryLoopCount: plan.physicalBoundaryLoopCount,
    eulerCharacteristic: plan.eulerCharacteristic,
    minimumFacetDirectorAlignment: plan.minimumFacetDirectorAlignment,
    maximumFacetNormalDeviationDegrees: plan.maximumFacetNormalDeviationDegrees,
    localShellFacetCompatible: true,
    publicWorkbenchCurrentPass: true,
    artifactHash: result.evidence.artifactHash,
  });
}

checkAdversarialContracts();

console.log(JSON.stringify({
  schema: 'lafea-shell-periodic-hole-check/v2',
  status: 'PASS',
  qualityThresholdsRelaxed: false,
  rows,
  qualifiedScope: {
    surface: 'ANALYTIC_FULL_CYLINDER',
    parameterization: 'U_ARC_LENGTH_V_AXIAL_CANONICAL_PERIODIC_CHART',
    hole: 'ONE_AXIS_ALIGNED_RECTANGLE_CROSSING_CANONICAL_SEAM',
    cutChartRepresentation: 'TWO_MATCHED_SEAM_NOTCHES_WELDED_TO_ONE_PHYSICAL_HOLE',
    expectedPhysicalBoundaryLoops: 3,
    expectedEulerCharacteristic: -1,
    sizing: 'MIN_CURVATURE_AND_PROFILE_SUBJECT_TO_TWO_ELEMENTS_ACROSS_PHYSICAL_LIGAMENT',
    qualityPolicy: 'BLOCK_IS_FAIL_CLOSED_NO_AUTOREPAIR',
    elementFamily: LAFEA_SHELL_ELEMENT,
  },
  exclusions: [
    'MULTIPLE_PERIODIC_HOLES',
    'NON_RECTANGULAR_PERIODIC_HOLES',
    'HOLES_NOT_CROSSING_CANONICAL_SEAM_IN_THIS_PARENT_CLASS',
    'MULTI_PATCH_SEAMS',
    'CONE_SPHERE_NURBS_FREEFORM',
    'OFFSET_SURFACE_GENERATION',
    'THICKNESS_TRANSITION_MESHING',
    'SHELL_LOCAL_REFINEMENT',
  ],
}, null, 2));

function periodicHoleParent(stageId, sourceHash, hole) {
  const geometry = createLafeaPeriodicHoleShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId,
    geometryId: `PERIODIC-HOLE-${stageId}`,
    lengthUnit: 'mm',
    surface: {
      kind: 'CYLINDER',
      axisOrigin: { x: 10, y: -20, z: 30 },
      axisDirection: { x: ROOT2, y: ROOT2, z: 0 },
      radialDirection: { x: 0, y: 0, z: 1 },
      radius: RADIUS,
    },
    axialRange: { vMin: AXIAL_MIN, vMax: AXIAL_MAX },
    seamCrossingHole: hole,
    orientationPolicy: LAFEA_SHELL_PERIODIC_HOLE_ORIENTATION,
  });
  const domain = createLafeaPeriodicHoleShellAnalysisDomain({
    schema: LAFEA_SHELL_PERIODIC_HOLE_ANALYSIS_DOMAIN_SCHEMA,
    stageId,
    domainId: `PERIODIC-HOLE-${stageId}-DOMAIN`,
    sourceHash,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_PERIODIC_HOLE_TOPOLOGY,
  });
  return createLafeaPeriodicHoleShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_INTAKE_SCHEMA,
    stageId,
    sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: 'DECLARED-PERIODIC-SEAM-HOLE-MIDSURFACE',
  });
}

function shellProfile(stageId, target, label) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `PERIODIC_HOLE_${stageId.replace('.', '_')}_${label}_${target}`,
    sourceRevision: 'R10',
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

function assertCylinderAndHoleEmpty(mesh, geometry, hole) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  for (const node of mesh.nodes) assertPointOnCylinderOutsideHole(node, geometry, hole, `node ${node.nodeId}`);
  for (const element of mesh.elements) {
    const points = element.nodeIds.map((nodeId) => nodeById.get(nodeId));
    const centroid = {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
      z: points.reduce((sum, point) => sum + point.z, 0) / points.length,
    };
    assertPhysicalPointOutsideHole(centroid, geometry, hole, `element ${element.elementId} centroid`);
  }
}

function assertPointOnCylinderOutsideHole(point, geometry, hole, label) {
  const origin = geometry.surface.axisOrigin;
  const axis = geometry.surface.axisDirection;
  const rel = subtract(point, origin);
  const v = dot(rel, axis);
  const radial = subtract(rel, scale(axis, v));
  close(norm(radial), geometry.surface.radius, 1e-8);
  assertPhysicalPointOutsideHole(point, geometry, hole, label);
  const frame = periodicHoleShellFrameAtPoint3d(geometry, physicalPoint(point));
  close(norm(frame.director), 1, 1e-12);
}

function assertPhysicalPointOutsideHole(point, geometry, hole, label) {
  const origin = geometry.surface.axisOrigin;
  const axis = geometry.surface.axisDirection;
  const radial0 = geometry.surface.radialDirection;
  const tangent0 = cross(axis, radial0);
  const rel = subtract(point, origin);
  const v = dot(rel, axis);
  const radial = subtract(rel, scale(axis, v));
  const radialLength = norm(radial);
  assert.ok(radialLength > 0, `${label}: radial projection is undefined`);
  const radialUnit = scale(radial, 1 / radialLength);
  const canonicalU = Math.atan2(dot(radialUnit, tangent0), dot(radialUnit, radial0)) * geometry.surface.radius;
  const centerU = 0.5 * (hole.uMin + hole.uMax);
  const u = unwrapNear(canonicalU, centerU, CIRCUMFERENCE);
  const strictlyInsideHole = u > hole.uMin + 1e-8 && u < hole.uMax - 1e-8
    && v > hole.vMin + 1e-8 && v < hole.vMax - 1e-8;
  assert.equal(strictlyInsideHole, false, `${label} lies inside physical seam hole`);
}

function assertHoleCornersRetained(mesh, geometry, hole) {
  const corners = holeCorners(geometry, hole);
  for (const corner of corners) {
    assert.ok(mesh.nodes.some((node) => distance(node, corner) <= 1e-8), 'physical hole corner not retained');
  }
}

function holeCorners(geometry, hole) {
  return [
    [hole.uMin, hole.vMin], [hole.uMin, hole.vMax],
    [hole.uMax, hole.vMax], [hole.uMax, hole.vMin],
  ].map(([u, v]) => periodicHoleShellPoint3d(geometry, u, v));
}

function qualifyHoleAdjacentFacetAgainstLocalShell(mesh, geometry, hole) {
  const corner = periodicHoleShellPoint3d(geometry, hole.uMin, hole.vMin);
  const node = mesh.nodes.find((row) => distance(row, corner) <= 1e-8);
  assert.ok(node, 'expected periodic seam-hole corner node');
  const element = mesh.elements.find((row) => row.nodeIds.includes(node.nodeId));
  assert.ok(element, 'expected periodic seam-hole adjacent element');
  const nodeById = new Map(mesh.nodes.map((row) => [row.nodeId, row]));
  const shellNodes = element.nodeIds.map((nodeId) => {
    const point = nodeById.get(nodeId);
    const frame = periodicHoleShellFrameAtPoint3d(geometry, physicalPoint(point));
    return {
      nodeId,
      position: [point.x, point.y, point.z],
      director: vector(frame.director),
      rotationBasis1: vector(frame.rotationBasis1),
      rotationBasis2: vector(frame.rotationBasis2),
      sourceReference: `PERIODIC-SEAM-HOLE-MESH:${nodeId}`,
    };
  });
  const source = baseSource({
    modelIdentity: 'PERIODIC-SEAM-HOLE-MESH-FACET-COMPATIBILITY',
    sourceAncestry: ['lafea-shell-periodic-hole-check/v2'],
    nodes: shellNodes,
    elements: [{
      elementId: 'PERIODIC-SEAM-HOLE-E1',
      nodeIds: [...element.nodeIds],
      materialId: 'MAT',
      thickness: 2,
      sourceReference: 'PERIODIC-SEAM-HOLE-MESH:E1',
    }],
    constraints: [],
    loadCases: [{ loadCaseId: 'LC', nodalLoads: [], pressureLoads: [], sourceReference: 'LC-SRC' }],
  });
  const evidence = buildShellElementEvidence(createCanonicalLocalShellModel(source));
  assert.equal(evidence.length, 1);
  assert.ok(evidence[0].directorAlignment.every((row) => row.accepted));
  assert.ok(evidence[0].qualification.rigidTranslation.accepted);
  assert.ok(evidence[0].qualification.rigidRotation.scaledQualification.accepted);
}

function assertNoDuplicatePhysicalNodes(nodes) {
  const key = (value) => Math.round(value * 1e8);
  const keys = nodes.map((node) => `${key(node.x)}|${key(node.y)}|${key(node.z)}`);
  assert.equal(new Set(keys).size, keys.length, 'periodic seam must not retain duplicate physical DOFs');
}

function qualifyPhysicalTopology(mesh, expectedBoundaryLoops, expectedEuler) {
  const edges = new Map();
  for (const element of mesh.elements) {
    const ids = element.nodeIds.slice(0, 3);
    for (const [a, b] of [[ids[0], ids[1]], [ids[1], ids[2]], [ids[2], ids[0]]]) {
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      const row = edges.get(key) ?? { key, a, b, count: 0 };
      row.count += 1;
      edges.set(key, row);
    }
  }
  assert.ok([...edges.values()].every((row) => row.count <= 2));
  const boundary = [...edges.values()].filter((row) => row.count === 1);
  const components = boundaryComponents(boundary);
  assert.equal(components.length, expectedBoundaryLoops);
  assert.ok(components.every((component) => component.closed));
  assert.equal(mesh.nodes.length - edges.size + mesh.elements.length, expectedEuler);
}

function boundaryComponents(edges) {
  const adjacency = new Map();
  for (const edge of edges) {
    adjacency.set(edge.a, [...(adjacency.get(edge.a) ?? []), edge.b]);
    adjacency.set(edge.b, [...(adjacency.get(edge.b) ?? []), edge.a]);
  }
  const pending = new Set(adjacency.keys());
  const rows = [];
  while (pending.size) {
    const first = [...pending].sort()[0];
    const seen = new Set([first]);
    const stack = [first];
    while (stack.length) {
      const current = stack.pop();
      pending.delete(current);
      for (const next of adjacency.get(current) ?? []) {
        if (!seen.has(next)) { seen.add(next); stack.push(next); }
      }
    }
    rows.push({
      nodeCount: seen.size,
      closed: [...seen].every((nodeId) => (adjacency.get(nodeId) ?? []).length === 2),
    });
  }
  return rows;
}

function checkWorkbench(stageId, parent, profile) {
  const workbench = createLafeaWorkbenchOrchestratorStore({
    initialStage: stageId,
    initialDocument: fixtureByStage[stageId](),
    initialSourceHash: SOURCE_HASH,
  });
  assert.equal(workbench.registerShellMidsurfaceEvidence(parent, stageId)?.changed, true);
  assert.equal(workbench.bindAnalysisMeshProfile(profile, stageId)?.changed, true);
  const planned = workbench.planAnalysisMesh({}, stageId);
  assert.equal(planned.summary.strategy, LAFEA_SHELL_PERIODIC_HOLE_MESH_STRATEGY);
  assert.equal(planned.configuration.effectiveTargetElementLength, 20);
  assert.equal(planned.configuration.physicalBoundaryLoopCount, 3);
  assert.equal(planned.configuration.eulerCharacteristic, -1);
  const generated = workbench.generateAnalysisMesh({}, stageId);
  assert.equal(generated.evidence.qualification, 'PASS');
  let stage = workbench.getState().stages[stageId];
  assert.equal(stage.analysisMeshCustodyProjection.state, 'CURRENT_PASS');
  assert.equal(stage.analysisMeshCustodyProjection.usableForRun, true);
  const vm = buildLafeaDiscretizationViewModel(stage);
  assert.equal(vm.actions.canRun, true);
  assert.equal(vm.actions.manualRefinementEnabled, false);
  const retainedHash = workbench.selectRetainedAnalysisMeshEvidenceV2(stageId).artifactHash;
  assert.equal(workbench.refineAnalysisMesh({
    targetType: 'ELEMENT', targetIds: ['E000001'], targetElementLength: 8, lengthUnit: 'mm',
  }, stageId), null);
  assert.equal(workbench.getState().diagnostics?.[0]?.code, 'LAFEA_SHELL_LOCAL_REFINEMENT_NOT_QUALIFIED');
  assert.equal(workbench.selectRetainedAnalysisMeshEvidenceV2(stageId).artifactHash, retainedHash);
  workbench.initializeLifecycle(NEXT_SOURCE_HASH, `PERIODIC-SEAM-HOLE-${stageId}-SOURCE-CHANGE`);
  stage = workbench.getState().stages[stageId];
  assert.equal(stage.retainedShellMidsurfaceEvidence, null);
  assert.equal(stage.retainedAnalysisMeshEvidenceV2, null);
  workbench.destroy();
}

function checkAdversarialContracts() {
  assert.throws(
    () => periodicHoleParent('LAFEA.4', SOURCE_HASH, { ...HOLE, uMin: 250, uMax: 280 }),
    (error) => error?.code === 'LAFEA_SHELL_PERIODIC_HOLE_MUST_CROSS_CANONICAL_SEAM',
  );
  assert.throws(
    () => periodicHoleParent('LAFEA.4', SOURCE_HASH, { ...HOLE, uMin: 100, uMax: 500 }),
    (error) => error?.code === 'LAFEA_SHELL_PERIODIC_HOLE_UNWRAP_NOT_UNIQUE',
  );
  assert.throws(
    () => periodicHoleParent('LAFEA.4', SOURCE_HASH, { ...HOLE, vMin: 0 }),
    (error) => error?.code === 'LAFEA_SHELL_PERIODIC_HOLE_AXIAL_CONTAINMENT_INVALID',
  );
  assert.throws(
    () => createLafeaPeriodicHoleShellMidsurfaceGeometry({
      schema: LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
      stageId: 'LAFEA.4',
      geometryId: 'BAD-BASIS',
      lengthUnit: 'mm',
      surface: {
        kind: 'CYLINDER', axisOrigin: { x: 0, y: 0, z: 0 },
        axisDirection: { x: 1, y: 0, z: 0 }, radialDirection: { x: 1, y: 0, z: 0 }, radius: RADIUS,
      },
      axialRange: { vMin: AXIAL_MIN, vMax: AXIAL_MAX },
      seamCrossingHole: HOLE,
      orientationPolicy: LAFEA_SHELL_PERIODIC_HOLE_ORIENTATION,
    }),
    (error) => error?.code === 'LAFEA_SHELL_PERIODIC_HOLE_CYLINDER_BASIS_NOT_ORTHOGONAL',
  );
}

function unwrapNear(value, reference, circumference) {
  return value + Math.round((reference - value) / circumference) * circumference;
}
function physicalPoint(value) { return { x: value.x, y: value.y, z: value.z }; }
function vector(value) { return [value.x, value.y, value.z]; }
function subtract(left, right) { return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z }; }
function scale(value, factor) { return { x: value.x * factor, y: value.y * factor, z: value.z * factor }; }
function dot(left, right) { return left.x * right.x + left.y * right.y + left.z * right.z; }
function cross(left, right) {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}
function norm(value) { return Math.hypot(value.x, value.y, value.z); }
function distance(left, right) { return norm(subtract(left, right)); }
function close(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} ~= ${expected} +/- ${tolerance}`);
}
