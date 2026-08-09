#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { BASE_LIMITATIONS, createCanonicalLocalShellModel } from '../src/core/local-shell/index.js';
import { buildShellElementEvidence } from '../src/core/local-shell/element.js';
import { baseSource, triangleSource as shellFixture } from './lafea.4-fixtures.mjs';
import { workflowSource as trunnionFixture } from './lafea.5-fixtures.mjs';
import {
  LAFEA_SHELL_CURVED_HOLE_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_ORIENTATION,
  LAFEA_SHELL_CURVED_HOLE_TOPOLOGY,
  createLafeaCurvedHoleShellAnalysisDomain,
  createLafeaCurvedHoleShellMidsurfaceEvidence,
  createLafeaCurvedHoleShellMidsurfaceGeometry,
  curvedHoleShellFrameAtPoint3d,
  curvedHoleShellUvAtPoint3d,
  validateLafeaCurvedHoleShellMidsurfaceEvidence,
} from '../src/workspace/lafea-shell-curved-hole-midsurface-contract.js';
import { validateLafeaAnyShellMidsurfaceEvidence } from '../src/workspace/lafea-shell-midsurface-dispatch.js';
import {
  LAFEA_SHELL_CURVED_HOLE_MESH_PLAN_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_MESH_STRATEGY,
  LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES,
  LAFEA_SHELL_ELEMENT,
  LAFEA_SHELL_HOLE_MINIMUM_ELEMENTS_ACROSS_LIGAMENT,
  planLafeaShellAnalysisMesh,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';
import { buildLafeaDiscretizationViewModel } from '../src/workspace/lafea-discretization-view-model.js';

assert.ok(BASE_LIMITATIONS.includes('NO_AUTOMATIC_OR_ADAPTIVE_MESHING'));

const SOURCE_HASH = `sha256:${'c'.repeat(64)}`;
const NEXT_SOURCE_HASH = `sha256:${'d'.repeat(64)}`;
const ROOT2 = Math.sqrt(0.5);
const RADIUS = 100;
const HALF_SPAN = Math.PI * RADIUS / 4;
const AXIAL_SPAN = 120;
const fixtureByStage = { 'LAFEA.4': shellFixture, 'LAFEA.5': trunnionFixture };
const rows = [];

for (const stageId of ['LAFEA.4', 'LAFEA.5']) {
  const parent = curvedHoleParent(stageId, SOURCE_HASH, oneHole());
  assert.equal(validateLafeaCurvedHoleShellMidsurfaceEvidence(parent).semanticHash, parent.semanticHash);
  assert.equal(validateLafeaAnyShellMidsurfaceEvidence(parent).semanticHash, parent.semanticHash);

  const coarseProfile = shellProfile(stageId, 60, 'COARSE-REJECT');
  assert.throws(
    () => planLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: coarseProfile }),
    (error) => error?.code === 'LAFEA_SHELL_CURVED_HOLE_TARGET_TOO_COARSE_FOR_LIGAMENT',
  );

  const acceptedProfile = shellProfile(stageId, 20, 'ACCEPTED');
  const plan = planLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: acceptedProfile });
  assert.equal(plan.schema, LAFEA_SHELL_CURVED_HOLE_MESH_PLAN_SCHEMA);
  assert.equal(plan.strategy, LAFEA_SHELL_CURVED_HOLE_MESH_STRATEGY);
  assert.equal(plan.holeCount, 1);
  close(plan.radius, RADIUS, 1e-12);
  close(plan.angularSpanDegrees, 90, 1e-9);
  close(plan.axialSpan, AXIAL_SPAN, 1e-12);
  close(plan.minimumMaterialLigament, 45, 1e-10);
  close(plan.maximumQualifiedTargetElementLength, 22.5, 1e-10);
  assert.equal(plan.minimumElementsAcrossLigament, LAFEA_SHELL_HOLE_MINIMUM_ELEMENTS_ACROSS_LIGAMENT);
  assert.equal(plan.requestedTargetElementLength, 20);
  assert.equal(plan.effectiveTargetElementLength, 20);
  const curvatureTarget = RADIUS * LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES * Math.PI / 180;
  close(plan.curvatureTargetElementLength, curvatureTarget, 1e-12);
  assert.ok(plan.minimumFacetDirectorAlignment >= Math.cos(15 * Math.PI / 180) - 1e-12);
  assert.ok(plan.maximumFacetNormalDeviationDegrees <= 15 + 1e-9);
  assert.equal(plan.estimatedDofs, plan.nodeCount * 5);

  const result = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: acceptedProfile, plan });
  assert.equal(result.evidence.qualification, 'PASS');
  assert.equal(result.evidence.quality.blockingElementIds.length, 0);
  assert.ok(result.evidence.mesh.elements.every((row) => row.elementType === LAFEA_SHELL_ELEMENT));
  assertCylinderAndHole(result.evidence.mesh, parent.geometry, [oneHolePolygon()]);
  assertHoleCornersRetained(result.evidence.mesh, parent.geometry, oneHolePolygon());
  qualifyHoleAdjacentFacetAgainstLocalShell(result.evidence.mesh, parent.geometry, oneHolePolygon());

  const replay = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: acceptedProfile });
  assert.equal(replay.plan.planHash, result.plan.planHash);
  assert.equal(replay.evidence.meshHash, result.evidence.meshHash);
  assert.equal(replay.evidence.artifactHash, result.evidence.artifactHash);
  assert.equal(JSON.stringify(replay.evidence.mesh), JSON.stringify(result.evidence.mesh));

  const fineProfile = shellProfile(stageId, 10, 'FINE');
  const fine = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: fineProfile });
  assert.equal(fine.evidence.qualification, 'PASS');
  assert.equal(fine.evidence.quality.blockingElementIds.length, 0);
  assert.ok(fine.evidence.mesh.nodes.length > result.evidence.mesh.nodes.length);
  assert.ok(fine.evidence.mesh.elements.length > result.evidence.mesh.elements.length);
  assertCylinderAndHole(fine.evidence.mesh, parent.geometry, [oneHolePolygon()]);

  const twoParent = curvedHoleParent(stageId, SOURCE_HASH, twoHoles());
  const twoProfile = shellProfile(stageId, 15, 'TWO-HOLE');
  const two = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: twoParent, meshProfile: twoProfile });
  assert.equal(two.plan.holeCount, 2);
  close(two.plan.minimumMaterialLigament, 40, 1e-10);
  close(two.plan.maximumQualifiedTargetElementLength, 20, 1e-10);
  assert.equal(two.evidence.qualification, 'PASS');
  assert.equal(two.evidence.quality.blockingElementIds.length, 0);
  assertCylinderAndHole(two.evidence.mesh, twoParent.geometry, twoHolePolygons());

  checkWorkbench(stageId, parent, acceptedProfile);

  rows.push({
    stageId,
    radius: RADIUS,
    angularSpanDegrees: plan.angularSpanDegrees,
    requestedRejectedTarget: 60,
    curvatureTarget,
    minimumMaterialLigament: plan.minimumMaterialLigament,
    maximumQualifiedTargetElementLength: plan.maximumQualifiedTargetElementLength,
    acceptedTarget: plan.effectiveTargetElementLength,
    nodeCount: result.evidence.mesh.nodes.length,
    elementCount: result.evidence.mesh.elements.length,
    estimatedDofs: plan.estimatedDofs,
    fineNodeCount: fine.evidence.mesh.nodes.length,
    fineElementCount: fine.evidence.mesh.elements.length,
    twoHoleNodeCount: two.evidence.mesh.nodes.length,
    twoHoleElementCount: two.evidence.mesh.elements.length,
    minimumFacetDirectorAlignment: plan.minimumFacetDirectorAlignment,
    maximumFacetNormalDeviationDegrees: plan.maximumFacetNormalDeviationDegrees,
    artifactHash: result.evidence.artifactHash,
  });
}

checkAdversarialContracts();

console.log(JSON.stringify({
  schema: 'lafea-shell-curved-hole-check/v1',
  status: 'PASS',
  rows,
  qualifiedScope: {
    surface: 'ANALYTIC_CYLINDER',
    parameterization: 'U_ARC_LENGTH_V_AXIAL',
    outerPatch: 'SINGLE_RECTANGULAR_NON_WRAPPING_MAX_180_DEGREES',
    holes: 'STRAIGHT_DISJOINT_NON_NESTED_POLYGONAL_HOLES',
    sizing: 'MIN_CURVATURE_AND_PROFILE_SUBJECT_TO_TWO_ELEMENTS_ACROSS_MIN_LIGAMENT',
    elementFamily: LAFEA_SHELL_ELEMENT,
  },
  exclusions: [
    'FULL_CYLINDER_PERIODIC_HOLE_INTERACTION',
    'MULTI_PATCH_SEAMS',
    'CONE_SPHERE_NURBS_FREEFORM',
    'OFFSET_SURFACE_GENERATION',
    'THICKNESS_TRANSITION_MESHING',
    'SHELL_LOCAL_REFINEMENT',
  ],
}, null, 2));

function curvedHoleParent(stageId, sourceHash, topology) {
  const geometry = createLafeaCurvedHoleShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId,
    geometryId: `CURVED-HOLE-${stageId}-${topology.label}`,
    lengthUnit: 'mm',
    surface: {
      kind: 'CYLINDER',
      axisOrigin: { x: 10, y: -20, z: 30 },
      axisDirection: { x: ROOT2, y: ROOT2, z: 0 },
      radialDirection: { x: 0, y: 0, z: 1 },
      radius: RADIUS,
    },
    orientationPolicy: LAFEA_SHELL_CURVED_HOLE_ORIENTATION,
    vertices: topology.vertices,
    segments: topology.segments,
    loops: topology.loops,
  });
  const domain = createLafeaCurvedHoleShellAnalysisDomain({
    schema: LAFEA_SHELL_CURVED_HOLE_ANALYSIS_DOMAIN_SCHEMA,
    stageId,
    domainId: `CURVED-HOLE-${stageId}-${topology.label}-DOMAIN`,
    sourceHash,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_CURVED_HOLE_TOPOLOGY,
  });
  return createLafeaCurvedHoleShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_INTAKE_SCHEMA,
    stageId,
    sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: 'DECLARED-CYLINDRICAL-HOLE-MIDSURFACE',
  });
}

function oneHole() {
  return topologyWithHoles('ONE', [oneHolePolygon()]);
}
function twoHoles() {
  return topologyWithHoles('TWO', twoHolePolygons());
}
function oneHolePolygon() {
  return [
    { u: -20, v: 45 }, { u: -20, v: 75 },
    { u: 20, v: 75 }, { u: 20, v: 45 },
  ];
}
function twoHolePolygons() {
  return [[
    { u: -38, v: 40 }, { u: -38, v: 70 },
    { u: -20, v: 70 }, { u: -20, v: 40 },
  ], [
    { u: 20, v: 40 }, { u: 20, v: 70 },
    { u: 38, v: 70 }, { u: 38, v: 40 },
  ]];
}
function topologyWithHoles(label, holes) {
  const vertices = [
    { vertexId: 'O1', u: -HALF_SPAN, v: 0 },
    { vertexId: 'O2', u: HALF_SPAN, v: 0 },
    { vertexId: 'O3', u: HALF_SPAN, v: AXIAL_SPAN },
    { vertexId: 'O4', u: -HALF_SPAN, v: AXIAL_SPAN },
  ];
  const segments = [
    seg('OS1', 'O1', 'O2'), seg('OS2', 'O2', 'O3'),
    seg('OS3', 'O3', 'O4'), seg('OS4', 'O4', 'O1'),
  ];
  const loops = [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['OS1', 'OS2', 'OS3', 'OS4'] }];
  holes.forEach((polygon, holeIndex) => {
    const prefix = `H${holeIndex + 1}`;
    polygon.forEach((point, index) => vertices.push({ vertexId: `${prefix}V${index + 1}`, ...point }));
    const ids = polygon.map((_, index) => `${prefix}V${index + 1}`);
    const segmentIds = ids.map((id, index) => `${prefix}S${index + 1}`);
    ids.forEach((id, index) => segments.push(seg(segmentIds[index], id, ids[(index + 1) % ids.length])));
    loops.push({ loopId: prefix, role: 'HOLE', segmentIds });
  });
  return { label, vertices, segments, loops };
}
function seg(segmentId, startVertexId, endVertexId) { return { segmentId, startVertexId, endVertexId }; }

function shellProfile(stageId, target, suffix) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `CURVED_HOLE_${stageId.replace('.', '_')}_${suffix}_${target}`,
    sourceRevision: 'R9-CANDIDATE',
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

function assertCylinderAndHole(mesh, geometry, holePolygons) {
  const uvById = new Map();
  for (const node of mesh.nodes) {
    const uv = curvedHoleShellUvAtPoint3d(geometry, node);
    uvById.set(node.nodeId, uv);
    const frame = curvedHoleShellFrameAtPoint3d(geometry, node);
    close(norm(frame.director), 1, 1e-12);
    assert.ok(!holePolygons.some((hole) => pointStrictlyInside(uv, hole)),
      `node ${node.nodeId} entered a cylindrical hole in UV`);
  }
  for (const element of mesh.elements) {
    const rows = element.nodeIds.map((nodeId) => uvById.get(nodeId));
    const centroid = {
      u: rows.reduce((sum, row) => sum + row.u, 0) / rows.length,
      v: rows.reduce((sum, row) => sum + row.v, 0) / rows.length,
    };
    assert.ok(!holePolygons.some((hole) => pointStrictlyInside(centroid, hole)),
      `element ${element.elementId} centroid entered a cylindrical hole in UV`);
  }
}

function assertHoleCornersRetained(mesh, geometry, holePolygon) {
  const uvNodes = mesh.nodes.map((node) => curvedHoleShellUvAtPoint3d(geometry, node));
  for (const corner of holePolygon) {
    assert.ok(uvNodes.some((uv) => distance2(uv, corner) <= 1e-8),
      `missing constrained curved-hole corner ${JSON.stringify(corner)}`);
  }
}

function qualifyHoleAdjacentFacetAgainstLocalShell(mesh, geometry, holePolygon) {
  const corner = holePolygon[0];
  const node = mesh.nodes.find((row) => distance2(curvedHoleShellUvAtPoint3d(geometry, row), corner) <= 1e-8);
  assert.ok(node, 'expected hole-corner node');
  const element = mesh.elements.find((row) => row.nodeIds.includes(node.nodeId));
  assert.ok(element, 'expected hole-adjacent element');
  const nodeById = new Map(mesh.nodes.map((row) => [row.nodeId, row]));
  const shellNodes = element.nodeIds.map((nodeId) => {
    const point = nodeById.get(nodeId);
    const frame = curvedHoleShellFrameAtPoint3d(geometry, point);
    return {
      nodeId,
      position: [point.x, point.y, point.z],
      director: vector(frame.director),
      rotationBasis1: vector(frame.rotationBasis1),
      rotationBasis2: vector(frame.rotationBasis2),
      sourceReference: `CURVED-HOLE-MESH:${nodeId}`,
    };
  });
  const source = baseSource({
    modelIdentity: 'CURVED-HOLE-MESH-FACET-COMPATIBILITY',
    sourceAncestry: ['lafea-shell-curved-hole-check/v1'],
    nodes: shellNodes,
    elements: [{
      elementId: 'CURVED-HOLE-E1',
      nodeIds: [...element.nodeIds],
      materialId: 'MAT', thickness: 2,
      sourceReference: 'CURVED-HOLE-MESH:E1',
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

function checkWorkbench(stageId, parent, profile) {
  const workbench = createLafeaWorkbenchOrchestratorStore({
    initialStage: stageId,
    initialDocument: fixtureByStage[stageId](),
    initialSourceHash: SOURCE_HASH,
  });
  assert.equal(workbench.registerShellMidsurfaceEvidence(parent, stageId)?.changed, true);
  assert.equal(workbench.bindAnalysisMeshProfile(profile, stageId)?.changed, true);
  const planned = workbench.planAnalysisMesh({}, stageId);
  assert.equal(planned.summary.strategy, LAFEA_SHELL_CURVED_HOLE_MESH_STRATEGY);
  assert.equal(planned.configuration.effectiveTargetElementLength, 20);
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
  workbench.initializeLifecycle(NEXT_SOURCE_HASH, `CURVED-HOLE-${stageId}-SOURCE-CHANGE`);
  stage = workbench.getState().stages[stageId];
  assert.equal(stage.retainedShellMidsurfaceEvidence, null);
  assert.equal(stage.retainedAnalysisMeshEvidenceV2, null);
  workbench.destroy();
}

function checkAdversarialContracts() {
  const valid = curvedHoleParent('LAFEA.4', SOURCE_HASH, oneHole());
  const base = inputGeometry(valid.geometry);

  const reversed = inputGeometry(valid.geometry);
  reversed.loops = reversed.loops.map((loop) => loop.role !== 'HOLE' ? loop : {
    ...loop,
    segmentIds: [...loop.segmentIds].reverse().map((segmentId) => segmentId),
  });
  assert.throws(() => createLafeaCurvedHoleShellMidsurfaceGeometry(reversed));

  const touching = topologyWithHoles('TOUCHING', [[
    { u: -20, v: 0 }, { u: -20, v: 30 }, { u: 20, v: 30 }, { u: 20, v: 0 },
  ]]);
  assert.throws(() => curvedHoleParent('LAFEA.4', SOURCE_HASH, touching),
    (error) => ['LAFEA_SHELL_CURVED_HOLE_OUTSIDE_OUTER', 'LAFEA_SHELL_CURVED_HOLE_PARAMETRIC_TOPOLOGY_INVALID'].includes(error?.code));

  const outside = topologyWithHoles('OUTSIDE', [[
    { u: -20, v: -10 }, { u: -20, v: 20 }, { u: 20, v: 20 }, { u: 20, v: -10 },
  ]]);
  assert.throws(() => curvedHoleParent('LAFEA.4', SOURCE_HASH, outside));

  const nested = topologyWithHoles('NESTED', [
    [{ u: -30, v: 35 }, { u: -30, v: 85 }, { u: 30, v: 85 }, { u: 30, v: 35 }],
    [{ u: -10, v: 50 }, { u: -10, v: 70 }, { u: 10, v: 70 }, { u: 10, v: 50 }],
  ]);
  assert.throws(() => curvedHoleParent('LAFEA.4', SOURCE_HASH, nested),
    (error) => error?.code === 'LAFEA_SHELL_CURVED_HOLE_NESTED_HOLES_NOT_QUALIFIED');

  const overlapping = topologyWithHoles('OVERLAP', [
    [{ u: -40, v: 40 }, { u: -40, v: 75 }, { u: 5, v: 75 }, { u: 5, v: 40 }],
    [{ u: -5, v: 50 }, { u: -5, v: 85 }, { u: 40, v: 85 }, { u: 40, v: 50 }],
  ]);
  assert.throws(() => curvedHoleParent('LAFEA.4', SOURCE_HASH, overlapping),
    (error) => error?.code === 'LAFEA_SHELL_CURVED_HOLE_LOOPS_INTERSECT');

  const tooWide = inputGeometry(valid.geometry);
  const u = Math.PI * RADIUS * 0.51;
  tooWide.vertices = tooWide.vertices.map((row) => {
    if (row.vertexId === 'O1' || row.vertexId === 'O4') return { ...row, u: -u };
    if (row.vertexId === 'O2' || row.vertexId === 'O3') return { ...row, u };
    return row;
  });
  assert.throws(() => createLafeaCurvedHoleShellMidsurfaceGeometry(tooWide),
    (error) => error?.code === 'LAFEA_SHELL_CURVED_HOLE_PATCH_ANGLE_EXCEEDS_180_DEGREES');

  const badBasis = inputGeometry(valid.geometry);
  badBasis.surface = { ...badBasis.surface, axisDirection: { x: 1, y: 0, z: 0 }, radialDirection: { x: 1, y: 0, z: 0 } };
  assert.throws(() => createLafeaCurvedHoleShellMidsurfaceGeometry(badBasis),
    (error) => error?.code === 'LAFEA_SHELL_CURVED_HOLE_CYLINDER_BASIS_NOT_ORTHOGONAL');

  assert.equal(base.orientationPolicy, LAFEA_SHELL_CURVED_HOLE_ORIENTATION);
}

function inputGeometry(geometry) {
  return {
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
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

function pointStrictlyInside(point, polygon) {
  if (pointOnBoundary(point, polygon)) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]; const b = polygon[j];
    if (((a.v > point.v) !== (b.v > point.v))
      && point.u < (b.u - a.u) * (point.v - a.v) / (b.v - a.v) + a.u) inside = !inside;
  }
  return inside;
}
function pointOnBoundary(point, polygon) {
  return polygon.some((a, index) => pointOnSegment(point, a, polygon[(index + 1) % polygon.length]));
}
function pointOnSegment(p, a, b) {
  const cross = (p.u - a.u) * (b.v - a.v) - (p.v - a.v) * (b.u - a.u);
  if (Math.abs(cross) > 1e-8) return false;
  return (p.u - a.u) * (p.u - b.u) + (p.v - a.v) * (p.v - b.v) <= 1e-8;
}
function distance2(a, b) { return Math.hypot(a.u - b.u, a.v - b.v); }
function vector(value) { return [value.x, value.y, value.z]; }
function norm(value) { return Math.hypot(value.x, value.y, value.z); }
function close(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} within ${tolerance}`);
}
