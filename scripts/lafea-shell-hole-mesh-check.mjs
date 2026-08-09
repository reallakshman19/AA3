#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { buildLafeaDiscretizationViewModel } from '../src/workspace/lafea-discretization-view-model.js';
import {
  LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_ORIENTATION,
  LAFEA_SHELL_MIDSURFACE_ORIENTATION_WITH_HOLES,
  LAFEA_SHELL_MIDSURFACE_TOPOLOGY,
  LAFEA_SHELL_MIDSURFACE_TOPOLOGY_WITH_HOLES,
  createLafeaShellAnalysisDomain,
  createLafeaShellMidsurfaceEvidence,
  createLafeaShellMidsurfaceGeometry,
} from '../src/workspace/lafea-shell-midsurface-contract.js';
import {
  LAFEA_SHELL_ELEMENT,
  LAFEA_SHELL_MESH_PRODUCER_SCOPE,
  planLafeaShellAnalysisMesh,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';
import { triangleSource as shellFixture } from './lafea.4-fixtures.mjs';
import { workflowSource as trunnionFixture } from './lafea.5-fixtures.mjs';

const SOURCE_HASH = `sha256:${'c'.repeat(64)}`;
const NEXT_SOURCE_HASH = `sha256:${'d'.repeat(64)}`;
const ROOT2 = Math.sqrt(0.5);
const OUTER = Object.freeze({ x0: 0, y0: 0, x1: 240, y1: 160 });
const PRIMARY_HOLE = Object.freeze({ x0: 80, y0: 50, x1: 160, y1: 110 });
const fixtureByStage = Object.freeze({
  'LAFEA.4': shellFixture,
  'LAFEA.5': trunnionFixture,
});

const rows = [];
for (const stageId of ['LAFEA.4', 'LAFEA.5']) {
  const parent = shellParent(stageId, [PRIMARY_HOLE], SOURCE_HASH);
  const profile = shellProfile(stageId, 20);
  const plan = planLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
  assert.equal(plan.scope, LAFEA_SHELL_MESH_PRODUCER_SCOPE);
  assert.equal(plan.elementFamily, LAFEA_SHELL_ELEMENT);
  assert.equal(plan.resourceDisposition, 'WITHIN_LIMITS');
  assert.equal(plan.estimatedDofs, plan.nodeCount * 5);

  const produced = produceLafeaShellAnalysisMesh({
    midsurfaceEvidence: parent,
    meshProfile: profile,
    plan,
  });
  assert.equal(produced.evidence.qualification, 'PASS');
  assert.equal(produced.evidence.quality.blockingElementIds.length, 0);
  assert.equal(produced.output.lifecycleAuthority, false);
  assert.equal(produced.evidence.sourceHash, SOURCE_HASH);
  assert.equal(produced.evidence.analysisDomainHash, parent.analysisDomainHash);
  assert.equal(produced.evidence.analysisGeometryHash, parent.analysisGeometryHash);
  assert.ok(parent.limitations.includes('NON_NESTED_HOLES_ONLY'));
  assert.ok(!parent.limitations.includes('NO_HOLES'));

  const uvByNode = new Map(produced.evidence.mesh.nodes.map((node) => [
    node.nodeId,
    projectUv(parent.geometry, node),
  ]));
  for (const point of uvByNode.values()) {
    assert.equal(strictlyInsideRect(point, PRIMARY_HOLE), false, `${stageId} node entered hole.`);
  }
  for (const element of produced.evidence.mesh.elements) {
    assert.equal(element.elementType, LAFEA_SHELL_ELEMENT);
    assert.equal(element.nodeIds.length, 3);
    const points = element.nodeIds.map((nodeId) => uvByNode.get(nodeId));
    const centroid = {
      u: points.reduce((sum, point) => sum + point.u, 0) / 3,
      v: points.reduce((sum, point) => sum + point.v, 0) / 3,
    };
    assert.equal(strictlyInsideRect(centroid, PRIMARY_HOLE), false,
      `${stageId} element centroid entered hole.`);
  }

  for (const corner of rectCorners(PRIMARY_HOLE)) {
    assert.ok([...uvByNode.values()].some((point) => distance2(point, corner) <= 1e-16),
      `${stageId} lost a constrained hole corner.`);
  }
  const meshedArea = shellMeshAreaUv(produced.evidence.mesh, uvByNode);
  const expectedArea = rectArea(OUTER) - rectArea(PRIMARY_HOLE);
  assert.ok(Math.abs(meshedArea - expectedArea) <= 1e-6,
    `${stageId} material area mismatch: ${meshedArea} vs ${expectedArea}.`);

  const replay = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
  assert.equal(replay.plan.planHash, produced.plan.planHash);
  assert.equal(replay.output.outputHash, produced.output.outputHash);
  assert.equal(replay.evidence.meshHash, produced.evidence.meshHash);
  assert.equal(replay.evidence.artifactHash, produced.evidence.artifactHash);
  assert.equal(JSON.stringify(replay.evidence.mesh), JSON.stringify(produced.evidence.mesh));

  const workbench = createLafeaWorkbenchOrchestratorStore({
    initialStage: stageId,
    initialDocument: fixtureByStage[stageId](),
    initialSourceHash: SOURCE_HASH,
  });
  assert.equal(workbench.registerShellMidsurfaceEvidence(parent, stageId)?.changed, true);
  assert.equal(workbench.bindAnalysisMeshProfile(profile, stageId)?.changed, true);
  const ready = buildLafeaDiscretizationViewModel(workbench.getState().stages[stageId]);
  assert.equal(ready.generation.available, true);
  assert.equal(ready.actions.canGenerateMesh, true);
  const workbenchPlan = workbench.planAnalysisMesh({}, stageId);
  assert.equal(workbenchPlan?.summary.elementFamily, LAFEA_SHELL_ELEMENT);
  const generated = workbench.generateAnalysisMesh({}, stageId);
  assert.equal(generated?.evidence.qualification, 'PASS');
  let stage = workbench.getState().stages[stageId];
  assert.equal(stage.analysisMeshCustodyProjection.state, 'CURRENT_PASS');
  assert.equal(stage.analysisMeshCustodyProjection.usableForRun, true);
  const generatedVm = buildLafeaDiscretizationViewModel(stage);
  assert.equal(generatedVm.actions.canAdvance, true);
  assert.equal(generatedVm.actions.canRun, true);
  assert.equal(generatedVm.actions.manualRefinementEnabled, false);

  workbench.initializeLifecycle(NEXT_SOURCE_HASH, `SHELL-HOLE-${stageId}-SOURCE-CHANGE`);
  stage = workbench.getState().stages[stageId];
  assert.equal(stage.retainedShellMidsurfaceEvidence, null);
  assert.equal(stage.retainedAnalysisMeshEvidenceV2, null);
  workbench.destroy();

  rows.push({
    stageId,
    nodeCount: plan.nodeCount,
    elementCount: plan.elementCount,
    estimatedDofs: plan.estimatedDofs,
    meshedArea,
    expectedArea,
    meshHash: produced.evidence.meshHash,
    artifactHash: produced.evidence.artifactHash,
    minimumScaledJacobian: produced.evidence.quality.minimumScaledJacobian,
    maximumAspectRatio: produced.evidence.quality.maximumAspectRatio,
    publicWorkbenchCurrentPass: true,
  });
}

// The shell topology contract accepts multiple disjoint non-nested holes and
// delegates their intersection/containment proof to the same canonical planar
// topology authority used by the qualified continuum-hole path.
const twoHoleParent = shellParent('LAFEA.4', [
  { x0: 45, y0: 48, x1: 85, y1: 96 },
  { x0: 155, y0: 56, x1: 195, y1: 104 },
], SOURCE_HASH);
const twoHoleProduced = produceLafeaShellAnalysisMesh({
  midsurfaceEvidence: twoHoleParent,
  meshProfile: shellProfile('LAFEA.4', 20),
});
assert.equal(twoHoleProduced.evidence.qualification, 'PASS');
assert.equal(twoHoleProduced.evidence.quality.blockingElementIds.length, 0);

// Hole-bearing geometry must use the explicit holes orientation policy.
assert.throws(
  () => createLafeaShellMidsurfaceGeometry({
    ...shellGeometryValue('LAFEA.4', [PRIMARY_HOLE]),
    orientationPolicy: LAFEA_SHELL_MIDSURFACE_ORIENTATION,
  }),
  (error) => error?.code === 'LAFEA_SHELL_MIDSURFACE_ORIENTATION_POLICY_INVALID',
);

// A HOLE loop directed CCW is rejected; it is never silently reversed.
assert.throws(
  () => createLafeaShellMidsurfaceGeometry(
    shellGeometryValue('LAFEA.4', [PRIMARY_HOLE], { holeOrientation: 'CCW' }),
  ),
  (error) => error?.code === 'LAFEA_SHELL_MIDSURFACE_HOLE_ORIENTATION_INVALID',
);

// A disjoint hole outside the material boundary fails the canonical topology check.
assert.throws(
  () => createLafeaShellMidsurfaceGeometry(
    shellGeometryValue('LAFEA.4', [{ x0: 300, y0: 40, x1: 340, y1: 90 }]),
  ),
  (error) => error?.code === 'LAFEA_SHELL_MIDSURFACE_HOLE_OUTSIDE_OUTER',
);

// Nested holes remain outside this qualification and fail closed.
assert.throws(
  () => createLafeaShellMidsurfaceGeometry(shellGeometryValue('LAFEA.4', [
    { x0: 70, y0: 40, x1: 170, y1: 120 },
    { x0: 100, y0: 65, x1: 140, y1: 95 },
  ])),
  (error) => error?.code === 'LAFEA_SHELL_MIDSURFACE_NESTED_HOLES_UNSUPPORTED',
);

// Hole geometry cannot be paired with the legacy hole-free domain topology class.
const holeGeometry = createLafeaShellMidsurfaceGeometry(shellGeometryValue('LAFEA.4', [PRIMARY_HOLE]));
const wrongDomain = createLafeaShellAnalysisDomain({
  schema: LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
  stageId: 'LAFEA.4',
  domainId: 'SHELL-HOLE-WRONG-DOMAIN',
  sourceHash: SOURCE_HASH,
  midsurfaceGeometryHash: holeGeometry.semanticHash,
  lengthUnit: 'mm',
  topologyClass: LAFEA_SHELL_MIDSURFACE_TOPOLOGY,
});
assert.throws(
  () => createLafeaShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash: SOURCE_HASH,
    analysisDomain: wrongDomain,
    geometry: holeGeometry,
    producerRef: 'SHELL-HOLE-QUALIFICATION',
  }),
  (error) => error?.code === 'LAFEA_SHELL_MIDSURFACE_EVIDENCE_PARENT_MISMATCH',
);

assert.equal(rows[0].nodeCount, rows[1].nodeCount);
assert.equal(rows[0].elementCount, rows[1].elementCount);
assert.equal(rows[0].estimatedDofs, rows[1].estimatedDofs);
assert.ok(LAFEA_SHELL_MESH_PRODUCER_SCOPE.includes('NON_NESTED_HOLES'));

console.log(JSON.stringify({
  schema: 'lafea-shell-hole-mesh-check/v1',
  status: 'PASS',
  scope: LAFEA_SHELL_MESH_PRODUCER_SCOPE,
  topologyClass: LAFEA_SHELL_MIDSURFACE_TOPOLOGY_WITH_HOLES,
  orientationPolicy: LAFEA_SHELL_MIDSURFACE_ORIENTATION_WITH_HOLES,
  rows,
  multipleDisjointHolesQualified: true,
  nestedHolesQualified: false,
  shellLocalRefinementQualified: false,
  remainingExclusions: [
    'CURVED_MIDSURFACE',
    'MULTI_PATCH_SEAMS',
    'OFFSET_SURFACE_GENERATION',
    'THICKNESS_TRANSITION_MESHING',
    'SHELL_LOCAL_REFINEMENT',
  ],
}, null, 2));

function shellParent(stageId, holes, sourceHash) {
  const geometry = createLafeaShellMidsurfaceGeometry(shellGeometryValue(stageId, holes));
  const domain = createLafeaShellAnalysisDomain({
    schema: LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
    stageId,
    domainId: `SHELL-HOLE-${stageId}-DOMAIN`,
    sourceHash,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: holes.length
      ? LAFEA_SHELL_MIDSURFACE_TOPOLOGY_WITH_HOLES
      : LAFEA_SHELL_MIDSURFACE_TOPOLOGY,
  });
  return createLafeaShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA,
    stageId,
    sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: 'SHELL-HOLE-QUALIFICATION',
  });
}

function shellGeometryValue(stageId, holes, options = {}) {
  const vertices = [
    { vertexId: 'O1', u: OUTER.x0, v: OUTER.y0 },
    { vertexId: 'O2', u: OUTER.x1, v: OUTER.y0 },
    { vertexId: 'O3', u: OUTER.x1, v: OUTER.y1 },
    { vertexId: 'O4', u: OUTER.x0, v: OUTER.y1 },
  ];
  const segments = [
    segment('OS1', 'O1', 'O2'),
    segment('OS2', 'O2', 'O3'),
    segment('OS3', 'O3', 'O4'),
    segment('OS4', 'O4', 'O1'),
  ];
  const loops = [{
    loopId: 'OUTER', role: 'OUTER', segmentIds: ['OS1', 'OS2', 'OS3', 'OS4'],
  }];

  holes.forEach((rect, index) => {
    const prefix = `H${index + 1}`;
    const points = options.holeOrientation === 'CCW'
      ? [
        [rect.x0, rect.y0], [rect.x1, rect.y0],
        [rect.x1, rect.y1], [rect.x0, rect.y1],
      ]
      : [
        [rect.x0, rect.y0], [rect.x0, rect.y1],
        [rect.x1, rect.y1], [rect.x1, rect.y0],
      ];
    points.forEach(([u, v], pointIndex) => {
      vertices.push({ vertexId: `${prefix}V${pointIndex + 1}`, u, v });
    });
    const segmentIds = [];
    for (let pointIndex = 0; pointIndex < 4; pointIndex += 1) {
      const segmentId = `${prefix}S${pointIndex + 1}`;
      segmentIds.push(segmentId);
      segments.push(segment(
        segmentId,
        `${prefix}V${pointIndex + 1}`,
        `${prefix}V${((pointIndex + 1) % 4) + 1}`,
      ));
    }
    loops.push({ loopId: `${prefix}_HOLE`, role: 'HOLE', segmentIds });
  });

  return {
    schema: LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId,
    geometryId: `SHELL-HOLE-${stageId}-${holes.length}`,
    lengthUnit: 'mm',
    origin: { x: 12, y: -18, z: 31 },
    axisU: { x: ROOT2, y: ROOT2, z: 0 },
    axisV: { x: 0, y: 0, z: 1 },
    orientationPolicy: holes.length
      ? LAFEA_SHELL_MIDSURFACE_ORIENTATION_WITH_HOLES
      : LAFEA_SHELL_MIDSURFACE_ORIENTATION,
    vertices,
    segments,
    loops,
  };
}

function shellProfile(stageId, globalTargetSize) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `SHELL_HOLE_${stageId.replace('.', '_')}_${globalTargetSize}`,
    sourceRevision: 'SHELL_HOLE_V2',
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: LAFEA_SHELL_ELEMENT,
      globalTargetSize,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}

function projectUv(geometry, node) {
  const dx = node.x - geometry.origin.x;
  const dy = node.y - geometry.origin.y;
  const dz = node.z - geometry.origin.z;
  return {
    u: dx * geometry.axisU.x + dy * geometry.axisU.y + dz * geometry.axisU.z,
    v: dx * geometry.axisV.x + dy * geometry.axisV.y + dz * geometry.axisV.z,
  };
}

function shellMeshAreaUv(mesh, uvByNode) {
  return mesh.elements.reduce((sum, element) => {
    const [a, b, c] = element.nodeIds.map((nodeId) => uvByNode.get(nodeId));
    return sum + Math.abs((b.u - a.u) * (c.v - a.v) - (b.v - a.v) * (c.u - a.u)) / 2;
  }, 0);
}

function strictlyInsideRect(point, rect) {
  const eps = 1e-9;
  return point.u > rect.x0 + eps && point.u < rect.x1 - eps
    && point.v > rect.y0 + eps && point.v < rect.y1 - eps;
}
function rectCorners(rect) {
  return [
    { u: rect.x0, v: rect.y0 }, { u: rect.x0, v: rect.y1 },
    { u: rect.x1, v: rect.y1 }, { u: rect.x1, v: rect.y0 },
  ];
}
function rectArea(rect) { return (rect.x1 - rect.x0) * (rect.y1 - rect.y0); }
function distance2(a, b) { return (a.u - b.u) ** 2 + (a.v - b.v) ** 2; }
function segment(segmentId, startVertexId, endVertexId) {
  return { segmentId, startVertexId, endVertexId };
}