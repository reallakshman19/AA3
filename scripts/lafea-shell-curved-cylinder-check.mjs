#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { BASE_LIMITATIONS, createCanonicalLocalShellModel } from '../src/core/local-shell/index.js';
import { buildShellElementEvidence } from '../src/core/local-shell/element.js';
import { baseSource, triangleSource as shellFixture } from './lafea.4-fixtures.mjs';
import { workflowSource as trunnionFixture } from './lafea.5-fixtures.mjs';
import {
  LAFEA_SHELL_CURVED_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_CURVED_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_CURVED_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_CURVED_ORIENTATION,
  LAFEA_SHELL_CURVED_TOPOLOGY,
  createLafeaCurvedShellAnalysisDomain,
  createLafeaCurvedShellMidsurfaceEvidence,
  createLafeaCurvedShellMidsurfaceGeometry,
  cylindricalShellFrameAtPoint3d,
  cylindricalShellFrameAtUv,
  cylindricalShellPoint3d,
  validateLafeaCurvedShellMidsurfaceEvidence,
} from '../src/workspace/lafea-shell-curved-midsurface-contract.js';
import {
  shellMidsurfaceFrameAtPoint3dAny,
  validateLafeaAnyShellMidsurfaceEvidence,
} from '../src/workspace/lafea-shell-midsurface-dispatch.js';
import {
  LAFEA_SHELL_CURVED_MESH_PLAN_SCHEMA,
  LAFEA_SHELL_CURVED_MESH_STRATEGY,
  LAFEA_SHELL_CURVED_MINIMUM_FACET_DIRECTOR_ALIGNMENT,
  LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES,
  LAFEA_SHELL_ELEMENT,
  planLafeaShellAnalysisMesh,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { normalizeLafeaStageDocument } from '../src/workspace/lafea-workbench-model.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';
import { buildLafeaDiscretizationViewModel } from '../src/workspace/lafea-discretization-view-model.js';

assert.ok(BASE_LIMITATIONS.includes('NO_AUTOMATIC_OR_ADAPTIVE_MESHING'));

const SOURCE_HASH = `sha256:${'7'.repeat(64)}`;
const NEXT_SOURCE_HASH = `sha256:${'8'.repeat(64)}`;
const ROOT2 = Math.sqrt(0.5);
const RADIUS = 100;
const U90 = Math.PI * RADIUS / 2;
const AXIAL_SPAN = 120;
const fixtureByStage = { 'LAFEA.4': shellFixture, 'LAFEA.5': trunnionFixture };
const expectedCompilerBlock = {
  'LAFEA.4': 'LAFEA4_SHELL_SOLVER_CONSTRAINT_MAPPING_REQUIRED',
  'LAFEA.5': 'LAFEA5_SHELL_SOLVER_SOURCE_MESH_PARENT_REQUIRED',
};
const rows = [];

for (const stageId of ['LAFEA.4', 'LAFEA.5']) {
  const parent = cylindricalParent(stageId, SOURCE_HASH);
  const rebuilt = validateLafeaCurvedShellMidsurfaceEvidence(parent);
  assert.equal(rebuilt.semanticHash, parent.semanticHash);
  assert.equal(validateLafeaAnyShellMidsurfaceEvidence(parent).semanticHash, parent.semanticHash);

  checkAnalyticSurface(parent.geometry);

  const coarseProfile = shellProfile(stageId, 60);
  const fineProfile = shellProfile(stageId, 20);
  const coarsePlan = planLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: coarseProfile });
  assert.equal(coarsePlan.schema, LAFEA_SHELL_CURVED_MESH_PLAN_SCHEMA);
  assert.equal(coarsePlan.strategy, LAFEA_SHELL_CURVED_MESH_STRATEGY);
  assert.equal(coarsePlan.requestedTargetElementLength, 60);
  const expectedCurvatureTarget = RADIUS * LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES * Math.PI / 180;
  close(coarsePlan.curvatureTargetElementLength, expectedCurvatureTarget, 1e-12);
  close(coarsePlan.effectiveTargetElementLength, expectedCurvatureTarget, 1e-12);
  close(coarsePlan.angularSpanDegrees, 90, 1e-10);
  assert.equal(coarsePlan.axialSpan, AXIAL_SPAN);
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
  qualifyOneGeneratedFacetAgainstLocalShell(coarse.evidence.mesh, parent.geometry);

  const coarseReplay = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: coarseProfile });
  assert.equal(coarseReplay.plan.planHash, coarse.plan.planHash);
  assert.equal(coarseReplay.evidence.meshHash, coarse.evidence.meshHash);
  assert.equal(coarseReplay.evidence.artifactHash, coarse.evidence.artifactHash);
  assert.equal(JSON.stringify(coarseReplay.evidence.mesh), JSON.stringify(coarse.evidence.mesh));

  const fine = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: fineProfile });
  assert.equal(fine.plan.requestedTargetElementLength, 20);
  assert.equal(fine.plan.effectiveTargetElementLength, 20);
  assert.equal(fine.evidence.qualification, 'PASS');
  assert.equal(fine.evidence.quality.blockingElementIds.length, 0);
  assert.ok(fine.evidence.mesh.nodes.length > coarse.evidence.mesh.nodes.length);
  assert.ok(fine.evidence.mesh.elements.length > coarse.evidence.mesh.elements.length);
  assert.ok(fine.plan.minimumFacetDirectorAlignment >= coarse.plan.minimumFacetDirectorAlignment - 1e-12);

  checkWorkbench(stageId, coarseProfile);
  rows.push({
    stageId,
    radius: RADIUS,
    angularSpanDegrees: coarse.plan.angularSpanDegrees,
    requestedTarget: coarse.plan.requestedTargetElementLength,
    effectiveTarget: coarse.plan.effectiveTargetElementLength,
    coarseNodes: coarse.evidence.mesh.nodes.length,
    coarseElements: coarse.evidence.mesh.elements.length,
    fineNodes: fine.evidence.mesh.nodes.length,
    fineElements: fine.evidence.mesh.elements.length,
    minimumFacetDirectorAlignment: coarse.plan.minimumFacetDirectorAlignment,
    maximumFacetNormalDeviationDegrees: coarse.plan.maximumFacetNormalDeviationDegrees,
    artifactHash: coarse.evidence.artifactHash,
  });
}

checkAdversarialContracts();

console.log(JSON.stringify({
  schema: 'lafea-shell-curved-cylinder-check/v1',
  status: 'PASS',
  rows,
  qualifiedScope: {
    surface: 'ANALYTIC_CYLINDER',
    parameterization: 'U_ARC_LENGTH_V_AXIAL',
    patch: 'SINGLE_RECTANGULAR_NON_WRAPPING',
    maximumPatchAngleDegrees: 180,
    curvatureTargetAngleDegrees: LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES,
    elementFamily: LAFEA_SHELL_ELEMENT,
  },
  exclusions: [
    'CURVED_HOLES', 'FULL_CYLINDER_SEAM_CLOSURE', 'MULTI_PATCH_SEAMS',
    'CONE_SPHERE_NURBS_FREEFORM', 'OFFSET_SURFACE_GENERATION',
    'THICKNESS_TRANSITION_MESHING', 'SHELL_LOCAL_REFINEMENT',
  ],
}, null, 2));

function cylindricalParent(stageId, sourceHash) {
  const geometry = createLafeaCurvedShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_CURVED_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId,
    geometryId: `CURVED-${stageId}-CYLINDER-90`,
    lengthUnit: 'mm',
    surface: {
      kind: 'CYLINDER',
      axisOrigin: { x: 10, y: -20, z: 30 },
      axisDirection: { x: ROOT2, y: ROOT2, z: 0 },
      radialDirection: { x: 0, y: 0, z: 1 },
      radius: RADIUS,
    },
    orientationPolicy: LAFEA_SHELL_CURVED_ORIENTATION,
    vertices: [
      { vertexId: 'V1', u: 0, v: 0 },
      { vertexId: 'V2', u: U90, v: 0 },
      { vertexId: 'V3', u: U90, v: AXIAL_SPAN },
      { vertexId: 'V4', u: 0, v: AXIAL_SPAN },
    ],
    segments: [
      { segmentId: 'S1', startVertexId: 'V1', endVertexId: 'V2' },
      { segmentId: 'S2', startVertexId: 'V2', endVertexId: 'V3' },
      { segmentId: 'S3', startVertexId: 'V3', endVertexId: 'V4' },
      { segmentId: 'S4', startVertexId: 'V4', endVertexId: 'V1' },
    ],
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
  });
  const domain = createLafeaCurvedShellAnalysisDomain({
    schema: LAFEA_SHELL_CURVED_ANALYSIS_DOMAIN_SCHEMA,
    stageId,
    domainId: `CURVED-${stageId}-DOMAIN`,
    sourceHash,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_CURVED_TOPOLOGY,
  });
  return createLafeaCurvedShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_CURVED_MIDSURFACE_INTAKE_SCHEMA,
    stageId,
    sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: 'CURVED-CYLINDER-DECLARED-MIDSURFACE',
  });
}

function shellProfile(stageId, target) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `CURVED_${stageId.replace('.', '_')}_${target}`,
    sourceRevision: 'R8',
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

function checkAnalyticSurface(geometry) {
  const p0 = cylindricalShellPoint3d(geometry, 0, 0);
  close(p0.x, 10, 1e-12); close(p0.y, -20, 1e-12); close(p0.z, 130, 1e-12);
  const frame0 = cylindricalShellFrameAtUv(geometry, 0, 0);
  close(norm(frame0.director), 1, 1e-12);
  close(norm(frame0.rotationBasis1), 1, 1e-12);
  close(norm(frame0.rotationBasis2), 1, 1e-12);
  close(dot(frame0.director, frame0.rotationBasis1), 0, 1e-12);
  close(dot(frame0.director, frame0.rotationBasis2), 0, 1e-12);
  close(dot(frame0.rotationBasis1, frame0.rotationBasis2), 0, 1e-12);
  const handed = cross(frame0.rotationBasis1, frame0.rotationBasis2);
  close(handed.x, frame0.director.x, 1e-12);
  close(handed.y, frame0.director.y, 1e-12);
  close(handed.z, frame0.director.z, 1e-12);

  const sample = cylindricalShellPoint3d(geometry, U90 * 0.37, AXIAL_SPAN * 0.41);
  const recovered = cylindricalShellFrameAtPoint3d(geometry, sample);
  const direct = cylindricalShellFrameAtUv(geometry, U90 * 0.37, AXIAL_SPAN * 0.41);
  close(dot(recovered.director, direct.director), 1, 1e-12);
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
    close(norm(radial), geometry.surface.radius, 1e-9);
    const frame = shellMidsurfaceFrameAtPoint3dAny(geometry, node);
    close(norm(frame.director), 1, 1e-12);
  }
}

function qualifyOneGeneratedFacetAgainstLocalShell(mesh, geometry) {
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
      sourceReference: `CURVED-MESH:${nodeId}`,
    };
  });
  const source = baseSource({
    modelIdentity: 'CURVED-MESH-FACET-COMPATIBILITY',
    sourceAncestry: ['lafea-shell-curved-cylinder-check/v1'],
    nodes,
    elements: [{
      elementId: 'CURVED-E1',
      nodeIds: [...element.nodeIds],
      materialId: 'MAT',
      thickness: 2,
      sourceReference: 'CURVED-MESH:E1',
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
    stageId, document, `CURVED-${stageId}-QUALIFIER-SOURCE-AUTHORITY`,
  );
  const parent = cylindricalParent(stageId, sourceAuthority.sourceHash);
  const workbench = createLafeaWorkbenchOrchestratorStore({
    initialStage: stageId,
    initialDocument: document,
    initialSourceHash: sourceAuthority.sourceHash,
  });
  assert.equal(workbench.registerShellMidsurfaceEvidence(parent, stageId)?.changed, true);
  assert.equal(workbench.bindAnalysisMeshProfile(profile, stageId)?.changed, true);
  const planned = workbench.planAnalysisMesh({}, stageId);
  assert.equal(planned.summary.strategy, LAFEA_SHELL_CURVED_MESH_STRATEGY);
  assert.equal(planned.configuration.targetElementLength, 60);
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
    assert.equal(vm.refinement?.scopeEligible, true);
    assert.equal(vm.refinement?.productQualified, false);
    assert.equal(vm.refinement?.canRefine, false);
  } else {
    assert.equal(workbench.refineAnalysisMesh({
      targetType: 'ELEMENT', targetIds: ['E000001'], targetElementLength: 10, lengthUnit: 'mm',
    }, stageId), null);
    assert.equal(workbench.getState().diagnostics?.[0]?.code, 'LAFEA_SHELL_LOCAL_REFINEMENT_NOT_QUALIFIED');
  }
  assert.equal(workbench.selectRetainedAnalysisMeshEvidenceV2(stageId).artifactHash, retainedHash);
  workbench.initializeLifecycle(NEXT_SOURCE_HASH, `CURVED-${stageId}-SOURCE-CHANGE`);
  stage = workbench.getState().stages[stageId];
  assert.equal(stage.retainedShellMidsurfaceEvidence, null);
  assert.equal(stage.retainedAnalysisMeshEvidenceV2, null);
  workbench.destroy();
}

function checkAdversarialContracts() {
  const valid = cylindricalParent('LAFEA.4', SOURCE_HASH);
  const baseGeometry = valid.geometry;
  assert.throws(() => createLafeaCurvedShellMidsurfaceGeometry({
    ...inputGeometry(baseGeometry),
    surface: { ...baseGeometry.surface, axisDirection: { x: 1, y: 0, z: 0 }, radialDirection: { x: 1, y: 0, z: 0 } },
  }), (error) => error?.code === 'LAFEA_SHELL_CURVED_CYLINDER_BASIS_NOT_ORTHOGONAL');

  const tooWide = inputGeometry(baseGeometry);
  tooWide.vertices = tooWide.vertices.map((row) => (
    row.vertexId === 'V2' || row.vertexId === 'V3'
      ? { ...row, u: Math.PI * RADIUS * 1.1 }
      : row
  ));
  assert.throws(() => createLafeaCurvedShellMidsurfaceGeometry(tooWide),
    (error) => error?.code === 'LAFEA_SHELL_CURVED_PATCH_ANGLE_EXCEEDS_180_DEGREES');

  const diagonal = inputGeometry(baseGeometry);
  diagonal.vertices = diagonal.vertices.map((row) => (
    row.vertexId === 'V2' ? { ...row, v: 10 } : row
  ));
  assert.throws(() => createLafeaCurvedShellMidsurfaceGeometry(diagonal),
    (error) => ['LAFEA_SHELL_CURVED_PATCH_NOT_RECTANGULAR', 'LAFEA_SHELL_CURVED_BOUNDARY_NOT_ISO_U_OR_ISO_V'].includes(error?.code));

  const wrongKind = inputGeometry(baseGeometry);
  wrongKind.surface = { ...wrongKind.surface, kind: 'SPHERE' };
  assert.throws(() => createLafeaCurvedShellMidsurfaceGeometry(wrongKind),
    (error) => error?.code === 'LAFEA_SHELL_CURVED_SURFACE_KIND_INVALID');

  const holeLike = inputGeometry(baseGeometry);
  holeLike.loops = [{ ...holeLike.loops[0], role: 'HOLE' }];
  assert.throws(() => createLafeaCurvedShellMidsurfaceGeometry(holeLike),
    (error) => error?.code === 'LAFEA_SHELL_CURVED_HOLES_NOT_QUALIFIED');
}

function inputGeometry(geometry) {
  return {
    schema: LAFEA_SHELL_CURVED_MIDSURFACE_GEOMETRY_SCHEMA,
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
function vector(value) { return [value.x, value.y, value.z]; }
function norm(value) { return Math.hypot(value.x, value.y, value.z); }
function dot(left, right) { return left.x * right.x + left.y * right.y + left.z * right.z; }
function cross(left, right) {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}
function close(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} within ${tolerance}`);
}