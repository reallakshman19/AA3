#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { BASE_LIMITATIONS, createCanonicalLocalShellModel } from '../src/core/local-shell/index.js';
import { buildShellElementEvidence } from '../src/core/local-shell/element.js';
import { baseSource, triangleSource as shellFixture } from './lafea.4-fixtures.mjs';
import { workflowSource as trunnionFixture } from './lafea.5-fixtures.mjs';
import {
  LAFEA_SHELL_MIDSURFACE_ORIENTATION,
} from '../src/workspace/lafea-shell-midsurface-contract.js';
import {
  LAFEA_SHELL_OFFSET_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_OFFSET_NORMAL_RULE,
  LAFEA_SHELL_REFERENCE_SURFACE_GEOMETRY_SCHEMA,
  createLafeaShellOffsetMidsurfaceEvidence,
  createLafeaShellReferenceSurfaceGeometry,
  validateLafeaShellOffsetMidsurfaceEvidence,
} from '../src/workspace/lafea-shell-offset-midsurface-contract.js';
import {
  shellMidsurfaceFrameAtPoint3dAny,
  validateLafeaAnyShellMidsurfaceEvidence,
} from '../src/workspace/lafea-shell-midsurface-dispatch.js';
import {
  LAFEA_SHELL_ELEMENT,
  planLafeaShellAnalysisMesh,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';
import { buildLafeaDiscretizationViewModel } from '../src/workspace/lafea-discretization-view-model.js';

assert.ok(BASE_LIMITATIONS.includes('NO_AUTOMATIC_OR_ADAPTIVE_MESHING'));

const SOURCE_HASH = `sha256:${'b'.repeat(64)}`;
const NEXT_SOURCE_HASH = `sha256:${'c'.repeat(64)}`;
const ROOT2 = Math.sqrt(0.5);
const THICKNESS = 0.02;
const HALF_T = THICKNESS / 2;
const TARGET = 0.03;
const fixtureByStage = { 'LAFEA.4': shellFixture, 'LAFEA.5': trunnionFixture };
const rows = [];

for (const stageId of ['LAFEA.4', 'LAFEA.5']) {
  const reference = referenceSurface(stageId);
  const normal = cross(reference.axisU, reference.axisV);
  close(norm(normal), 1, 1e-12);

  const parents = Object.fromEntries(['MIDSURFACE', 'TOP_OFFSET', 'BOTTOM_OFFSET'].map((convention) => [
    convention,
    createLafeaShellOffsetMidsurfaceEvidence({
      schema: LAFEA_SHELL_OFFSET_MIDSURFACE_INTAKE_SCHEMA,
      stageId,
      sourceHash: SOURCE_HASH,
      referenceSurface: reference,
      thickness: THICKNESS,
      offsetConvention: convention,
      producerRef: 'DECLARED-PLANAR-REFERENCE-SURFACE-OFFSET',
    }),
  ]));

  for (const parent of Object.values(parents)) {
    assert.equal(validateLafeaShellOffsetMidsurfaceEvidence(parent).semanticHash, parent.semanticHash);
    assert.equal(validateLafeaAnyShellMidsurfaceEvidence(parent).semanticHash, parent.semanticHash);
    assert.equal(parent.normalRule, LAFEA_SHELL_OFFSET_NORMAL_RULE);
    assert.equal(parent.thickness, THICKNESS);
  }

  assert.equal(parents.MIDSURFACE.signedReferenceToMidsurfaceOffset, 0);
  close(parents.TOP_OFFSET.signedReferenceToMidsurfaceOffset, -HALF_T, 1e-15);
  close(parents.BOTTOM_OFFSET.signedReferenceToMidsurfaceOffset, HALF_T, 1e-15);
  assertOriginShift(reference.origin, parents.MIDSURFACE.geometry.origin, normal, 0);
  assertOriginShift(reference.origin, parents.TOP_OFFSET.geometry.origin, normal, -HALF_T);
  assertOriginShift(reference.origin, parents.BOTTOM_OFFSET.geometry.origin, normal, HALF_T);
  close(distance3(parents.TOP_OFFSET.geometry.origin, parents.BOTTOM_OFFSET.geometry.origin), THICKNESS, 1e-12);
  const midpoint = average3(parents.TOP_OFFSET.geometry.origin, parents.BOTTOM_OFFSET.geometry.origin);
  close(distance3(midpoint, reference.origin), 0, 1e-12);

  const profile = shellProfile(stageId);
  const produced = {};
  for (const convention of ['MIDSURFACE', 'TOP_OFFSET', 'BOTTOM_OFFSET']) {
    const parent = parents[convention];
    const plan = planLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
    assert.equal(plan.targetElementLength, TARGET);
    assert.equal(plan.midsurfaceEvidenceHash, parent.semanticHash);
    const result = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile, plan });
    assert.equal(result.evidence.qualification, 'PASS');
    assert.equal(result.evidence.quality.blockingElementIds.length, 0);
    assert.ok(result.evidence.mesh.elements.every((row) => row.elementType === LAFEA_SHELL_ELEMENT));
    assertNodesOnDerivedPlane(result.evidence.mesh.nodes, parent.geometry);
    qualifyGeneratedFacetAgainstLocalShell(result.evidence.mesh, parent.geometry);
    const replay = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
    assert.equal(replay.plan.planHash, result.plan.planHash);
    assert.equal(replay.evidence.meshHash, result.evidence.meshHash);
    assert.equal(replay.evidence.artifactHash, result.evidence.artifactHash);
    assert.equal(JSON.stringify(replay.evidence.mesh), JSON.stringify(result.evidence.mesh));
    produced[convention] = result;
  }

  assertTopologyInvariant(produced.MIDSURFACE.evidence.mesh, produced.TOP_OFFSET.evidence.mesh);
  assertTopologyInvariant(produced.MIDSURFACE.evidence.mesh, produced.BOTTOM_OFFSET.evidence.mesh);
  assertUniformTranslation(
    produced.MIDSURFACE.evidence.mesh,
    produced.TOP_OFFSET.evidence.mesh,
    scale3(normal, -HALF_T),
  );
  assertUniformTranslation(
    produced.MIDSURFACE.evidence.mesh,
    produced.BOTTOM_OFFSET.evidence.mesh,
    scale3(normal, HALF_T),
  );

  checkWorkbench(stageId, parents.TOP_OFFSET, profile);
  rows.push({
    stageId,
    thickness: THICKNESS,
    target: TARGET,
    nodes: produced.TOP_OFFSET.evidence.mesh.nodes.length,
    elements: produced.TOP_OFFSET.evidence.mesh.elements.length,
    topOffset: parents.TOP_OFFSET.signedReferenceToMidsurfaceOffset,
    bottomOffset: parents.BOTTOM_OFFSET.signedReferenceToMidsurfaceOffset,
    topArtifactHash: produced.TOP_OFFSET.evidence.artifactHash,
    bottomArtifactHash: produced.BOTTOM_OFFSET.evidence.artifactHash,
  });
}

checkAdversarialContracts();

console.log(JSON.stringify({
  schema: 'lafea-shell-offset-surface-check/v1',
  status: 'PASS',
  rows,
  qualifiedScope: {
    referenceSurface: 'PLANAR_SINGLE_RECTANGULAR_HOLE_FREE',
    thickness: 'CONSTANT_POSITIVE',
    conventions: ['MIDSURFACE', 'TOP_OFFSET', 'BOTTOM_OFFSET'],
    positiveNormal: 'AXIS_U_CROSS_AXIS_V',
    behavior: 'REFERENCE_SURFACE_TO_ANALYSIS_MIDSURFACE_GEOMETRY_ONLY',
    elementFamily: LAFEA_SHELL_ELEMENT,
  },
  exclusions: [
    'CURVED_OFFSET_SURFACES', 'MULTIPATCH_OFFSET_SURFACES', 'OFFSET_SURFACE_HOLES',
    'VARIABLE_THICKNESS', 'THICKNESS_TRANSITIONS', 'SHELL_STIFFNESS_ECCENTRICITY',
    'SHELL_LOCAL_REFINEMENT',
  ],
}, null, 2));

function referenceSurface(stageId) {
  return createLafeaShellReferenceSurfaceGeometry({
    schema: LAFEA_SHELL_REFERENCE_SURFACE_GEOMETRY_SCHEMA,
    stageId,
    geometryId: `OFFSET-${stageId}-REFERENCE`,
    lengthUnit: 'm',
    origin: { x: 0.01, y: -0.02, z: 0.03 },
    axisU: { x: ROOT2, y: ROOT2, z: 0 },
    axisV: { x: 0, y: 0, z: 1 },
    orientationPolicy: LAFEA_SHELL_MIDSURFACE_ORIENTATION,
    vertices: [
      { vertexId: 'V1', u: 0, v: 0 },
      { vertexId: 'V2', u: 0.2, v: 0 },
      { vertexId: 'V3', u: 0.2, v: 0.12 },
      { vertexId: 'V4', u: 0, v: 0.12 },
    ],
    segments: [
      { segmentId: 'S1', startVertexId: 'V1', endVertexId: 'V2' },
      { segmentId: 'S2', startVertexId: 'V2', endVertexId: 'V3' },
      { segmentId: 'S3', startVertexId: 'V3', endVertexId: 'V4' },
      { segmentId: 'S4', startVertexId: 'V4', endVertexId: 'V1' },
    ],
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
  });
}

function shellProfile(stageId) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `OFFSET_${stageId.replace('.', '_')}_${TARGET}`,
    sourceRevision: 'R10', semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: LAFEA_SHELL_ELEMENT,
      globalTargetSize: TARGET,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}

function qualifyGeneratedFacetAgainstLocalShell(mesh, geometry) {
  const element = mesh.elements[0];
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const nodes = element.nodeIds.map((nodeId) => {
    const point = nodeById.get(nodeId);
    const frame = shellMidsurfaceFrameAtPoint3dAny(geometry, point);
    return {
      nodeId,
      position: [point.x, point.y, point.z],
      director: vector(frame.director),
      rotationBasis1: vector(frame.rotationBasis1),
      rotationBasis2: vector(frame.rotationBasis2),
      sourceReference: `OFFSET-MESH:${nodeId}`,
    };
  });
  const source = baseSource({
    modelIdentity: 'OFFSET-SURFACE-FACET-COMPATIBILITY',
    sourceAncestry: ['lafea-shell-offset-surface-check/v1'],
    nodes,
    elements: [{
      elementId: 'OFFSET-E1',
      nodeIds: [...element.nodeIds],
      materialId: 'MAT',
      thickness: THICKNESS,
      sourceReference: 'OFFSET-MESH:E1',
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

function checkWorkbench(stageId, parent, profile) {
  const workbench = createLafeaWorkbenchOrchestratorStore({
    initialStage: stageId,
    initialDocument: fixtureByStage[stageId](),
    initialSourceHash: SOURCE_HASH,
  });
  assert.equal(workbench.registerShellMidsurfaceEvidence(parent, stageId)?.changed, true);
  assert.equal(workbench.bindAnalysisMeshProfile(profile, stageId)?.changed, true);
  const planned = workbench.planAnalysisMesh({}, stageId);
  assert.equal(planned.configuration.targetElementLength, TARGET);
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
    targetType: 'ELEMENT', targetIds: ['E000001'], targetElementLength: 0.01, lengthUnit: 'm',
  }, stageId), null);
  assert.equal(workbench.getState().diagnostics?.[0]?.code, 'LAFEA_SHELL_LOCAL_REFINEMENT_NOT_QUALIFIED');
  assert.equal(workbench.selectRetainedAnalysisMeshEvidenceV2(stageId).artifactHash, retainedHash);
  workbench.initializeLifecycle(NEXT_SOURCE_HASH, `OFFSET-${stageId}-SOURCE-CHANGE`);
  stage = workbench.getState().stages[stageId];
  assert.equal(stage.retainedShellMidsurfaceEvidence, null);
  assert.equal(stage.retainedAnalysisMeshEvidenceV2, null);
  workbench.destroy();
}

function checkAdversarialContracts() {
  const reference = referenceSurface('LAFEA.4');
  assert.throws(() => createLafeaShellOffsetMidsurfaceEvidence({
    schema: LAFEA_SHELL_OFFSET_MIDSURFACE_INTAKE_SCHEMA,
    stageId: 'LAFEA.4', sourceHash: SOURCE_HASH, referenceSurface: reference,
    thickness: 0, offsetConvention: 'TOP_OFFSET', producerRef: 'BAD',
  }), (error) => error?.code === 'LAFEA_SHELL_OFFSET_THICKNESS_INVALID');

  assert.throws(() => createLafeaShellOffsetMidsurfaceEvidence({
    schema: LAFEA_SHELL_OFFSET_MIDSURFACE_INTAKE_SCHEMA,
    stageId: 'LAFEA.4', sourceHash: SOURCE_HASH, referenceSurface: reference,
    thickness: THICKNESS, offsetConvention: 'CENTROID_OFFSET', producerRef: 'BAD',
  }), (error) => error?.code === 'LAFEA_SHELL_OFFSET_CONVENTION_INVALID');

  const nonRectangle = rawReference(reference);
  nonRectangle.vertices.find((row) => row.vertexId === 'V2').v = 0.01;
  assert.throws(() => createLafeaShellReferenceSurfaceGeometry(nonRectangle),
    (error) => error?.code === 'LAFEA_SHELL_OFFSET_RECTANGULAR_REFERENCE_SURFACE_REQUIRED');

  const hole = rawReference(reference);
  hole.loops[0] = { ...hole.loops[0], role: 'HOLE' };
  assert.throws(() => createLafeaShellReferenceSurfaceGeometry(hole),
    (error) => ['LAFEA_SHELL_MIDSURFACE_OUTER_LOOP_COUNT_INVALID', 'LAFEA_SHELL_OFFSET_HOLES_NOT_QUALIFIED'].includes(error?.code));
}

function rawReference(reference) {
  return {
    schema: LAFEA_SHELL_REFERENCE_SURFACE_GEOMETRY_SCHEMA,
    stageId: reference.stageId,
    geometryId: reference.geometryId,
    lengthUnit: reference.lengthUnit,
    origin: { ...reference.origin },
    axisU: { ...reference.axisU },
    axisV: { ...reference.axisV },
    orientationPolicy: reference.orientationPolicy,
    vertices: reference.vertices.map((row) => ({ ...row })),
    segments: reference.segments.map((row) => ({ ...row })),
    loops: reference.loops.map((row) => ({ ...row, segmentIds: [...row.segmentIds] })),
  };
}

function assertOriginShift(referenceOrigin, derivedOrigin, normal, signedOffset) {
  const expected = add3(referenceOrigin, scale3(normal, signedOffset));
  close(distance3(expected, derivedOrigin), 0, 1e-12);
}
function assertNodesOnDerivedPlane(nodes, geometry) {
  const normal = cross(geometry.axisU, geometry.axisV);
  for (const node of nodes) {
    const offset = subtract3(node, geometry.origin);
    close(dot(offset, normal), 0, 1e-9);
  }
}
function assertTopologyInvariant(left, right) {
  assert.equal(left.nodes.length, right.nodes.length);
  assert.deepEqual(left.elements, right.elements);
  assert.deepEqual(left.nodes.map((row) => row.nodeId), right.nodes.map((row) => row.nodeId));
}
function assertUniformTranslation(base, shifted, expectedDelta) {
  const shiftedById = new Map(shifted.nodes.map((row) => [row.nodeId, row]));
  for (const node of base.nodes) {
    const target = shiftedById.get(node.nodeId);
    const delta = subtract3(target, node);
    close(distance3(delta, expectedDelta), 0, 1e-10);
  }
}
function vector(value) { return [value.x, value.y, value.z]; }
function average3(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }; }
function add3(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function subtract3(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function scale3(a, factor) { return { x: a.x * factor, y: a.y * factor, z: a.z * factor }; }
function cross(left, right) {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}
function dot(left, right) { return left.x * right.x + left.y * right.y + left.z * right.z; }
function norm(value) { return Math.hypot(value.x, value.y, value.z); }
function distance3(a, b) { return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z); }
function close(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} within ${tolerance}`);
}
