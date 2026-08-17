#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import {
  LAFEA_SHELL_CURVED_HOLE_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_ORIENTATION,
  LAFEA_SHELL_CURVED_HOLE_TOPOLOGY,
  createLafeaCurvedHoleShellAnalysisDomain,
  createLafeaCurvedHoleShellMidsurfaceEvidence,
  createLafeaCurvedHoleShellMidsurfaceGeometry,
  curvedHoleShellUvAtPoint3d,
} from '../src/workspace/lafea-shell-curved-hole-midsurface-contract.js';
import {
  LAFEA_SHELL_ELEMENT,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';
import {
  LAFEA4_GRADED_REFINEMENT_COMMAND_SCHEMA,
  LAFEA4_GRADED_REFINEMENT_PRODUCER_REF,
  LAFEA4_GRADED_REFINEMENT_QUALIFICATION,
  createLafea4GradedRefinementCommand,
} from '../src/workspace/lafea4-shell-graded-refinement-authority.js';
import {
  previewLafea4GradedShellRefinement,
  produceLafea4GradedShellRefinement,
} from '../src/workspace/lafea4-shell-graded-refinement-executor.js';
import { createLafea4ShellGeometricQualityEvidence } from '../src/workspace/lafea4-shell-geometric-quality-evidence.js';

const definition = JSON.parse(fs.readFileSync(
  new URL('../validation/lafea4-refinement/graded-executor-curved-hole-v1.json', import.meta.url),
  'utf8',
));
assert.equal(definition.benchmarkQualified, false);
assert.equal(definition.releaseQualified, false);
assert.equal(LAFEA4_GRADED_REFINEMENT_QUALIFICATION.productionBindingAuthorized, false);
assert.equal(LAFEA4_GRADED_REFINEMENT_QUALIFICATION.releaseQualified, false);

const SOURCE_HASH = `sha256:${'7'.repeat(64)}`;
const geometry = curvedHoleGeometry(definition.geometry);
const domain = createLafeaCurvedHoleShellAnalysisDomain({
  schema: LAFEA_SHELL_CURVED_HOLE_ANALYSIS_DOMAIN_SCHEMA,
  stageId: 'LAFEA.4',
  domainId: 'TECH7-CURVED-HOLE-DOMAIN',
  sourceHash: SOURCE_HASH,
  midsurfaceGeometryHash: geometry.semanticHash,
  lengthUnit: 'mm',
  topologyClass: LAFEA_SHELL_CURVED_HOLE_TOPOLOGY,
});
const midsurface = createLafeaCurvedHoleShellMidsurfaceEvidence({
  schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_INTAKE_SCHEMA,
  stageId: 'LAFEA.4',
  sourceHash: SOURCE_HASH,
  analysisDomain: domain,
  geometry,
  producerRef: 'TECH7-FROZEN-CURVED-HOLE-PARENT',
});
const profile = canonicalProfile(PROFILE_KINDS.MESH, {
  schema: 'lafea-mesh-profile/v1',
  profileIdentity: 'LAFEA4_TECH7_CURVED_HOLE_H15',
  sourceRevision: 'TECH7-FROZEN-V1',
  semanticHash: undefined,
  fields: {
    continuumElement: 'T3',
    shellElement: LAFEA_SHELL_ELEMENT,
    globalTargetSize: definition.mesh.globalTargetMm,
    adjacentSizeRatioMax: definition.mesh.adjacentSizeRatioMax,
    aspectRatioWarn: definition.mesh.aspectRatioWarning,
    aspectRatioBlock: definition.mesh.aspectRatioBlock,
    scaledJacobianWarn: definition.mesh.scaledJacobianWarning,
    scaledJacobianBlock: definition.mesh.scaledJacobianBlock,
    adaptiveLevels: 3,
  },
});
const parent = produceLafeaShellAnalysisMesh({
  midsurfaceEvidence: midsurface,
  meshProfile: profile,
}).evidence;
assert.equal(parent.qualification, 'PASS');
assert.equal(parent.quality.blockingElementIds.length, 0);

const target = nearestElementToUv(
  parent.mesh,
  geometry,
  { u: definition.target.uMm, v: definition.target.vMm },
);
assert.ok(target.distance < definition.mesh.globalTargetMm);
const command = createLafea4GradedRefinementCommand({
  schema: LAFEA4_GRADED_REFINEMENT_COMMAND_SCHEMA,
  commandId: 'TECH7-CURVED-HOLE-H3_75',
  stageId: 'LAFEA.4',
  parentMeshArtifactHash: parent.artifactHash,
  parentMeshHash: parent.meshHash,
  targetType: 'ELEMENT',
  targetIds: [target.elementId],
  targetElementLength: definition.mesh.localTargetMm,
  lengthUnit: 'mm',
  reason: 'TECH7 frozen curved-hole graded-refinement qualification',
});
assert.equal(command.executionScope, 'QUALIFICATION_HARNESS_ONLY');
assert.equal(command.productionBindingAuthorized, false);

const input = {
  parentEvidence: parent,
  midsurfaceEvidence: midsurface,
  meshProfile: profile,
  command,
};
const preview = previewLafea4GradedShellRefinement(input);
const previewAdjacency = gate(preview.evidence, 'ADJACENT_SIZE_RATIO');
const previewGeometric = createLafea4ShellGeometricQualityEvidence({
  meshEvidence: preview.evidence,
  midsurfaceEvidence: midsurface,
});
if (preview.evidence.qualification !== 'PASS'
  || previewAdjacency.value > definition.acceptance.maximumAdjacentSizeRatio + 64 * Number.EPSILON) {
  console.error(JSON.stringify({
    schema: 'lafea-tech7-graded-refinement-block-witness/v1',
    status: 'BLOCKED_CANDIDATE',
    meshQualification: preview.evidence.qualification,
    maximumAllowed: definition.acceptance.maximumAdjacentSizeRatio,
    maximumObserved: preview.evidence.quality.adjacentSizeRatio?.maximumObserved ?? previewAdjacency.value,
    violatingAdjacencyCount:
      preview.evidence.quality.adjacentSizeRatio?.violatingAdjacencyCount ?? null,
    violatingAdjacencies:
      preview.evidence.quality.adjacentSizeRatio?.violatingAdjacencies ?? [],
    blockingElementIds: preview.evidence.quality.blockingElementIds,
    informationalGeometry: geometricSummary(previewGeometric),
  }, null, 2));
}
assert.equal(preview.evidence.qualification, 'PASS',
  'TECH7 preview child is quality-blocked; see emitted block witness');
assert.ok(
  previewAdjacency.value <= definition.acceptance.maximumAdjacentSizeRatio + 64 * Number.EPSILON,
  `TECH7 preview adjacent ratio ${previewAdjacency.value} exceeds ${definition.acceptance.maximumAdjacentSizeRatio}`,
);

// Only after the previewed child passes the measured gates may the fail-closed
// producer path be invoked. This keeps the product authority strict while
// preserving actionable qualification evidence when a candidate is blocked.
const result = produceLafea4GradedShellRefinement(input);
const replay = produceLafea4GradedShellRefinement(input);
const geometric = createLafea4ShellGeometricQualityEvidence({
  meshEvidence: result.evidence,
  midsurfaceEvidence: midsurface,
});
const geometricReplay = createLafea4ShellGeometricQualityEvidence({
  meshEvidence: replay.evidence,
  midsurfaceEvidence: midsurface,
});

assert.equal(result.executionScope, 'QUALIFICATION_HARNESS_ONLY');
assert.equal(result.productionBindingAuthorized, false);
assert.equal(result.releaseQualified, false);
assert.equal(result.plan.producerRef, LAFEA4_GRADED_REFINEMENT_PRODUCER_REF);
assert.equal(result.plan.transitionLevelCount, definition.mesh.expectedTransitionCount);
arrayClose(result.plan.transitionLevels, definition.mesh.expectedTransitionLevelsMm);
assert.equal(result.boundaryMatchesPlan, true);
assert.equal(result.childBoundaryEdgeCount, result.expectedBoundaryEdgeCount);
assert.ok(result.insertedGradedPointCount >= definition.acceptance.gradedPointCountMinimum);
assert.notEqual(result.evidence.meshHash, parent.meshHash);
assert.ok(result.evidence.mesh.nodes.length > parent.mesh.nodes.length);
assert.ok(result.evidence.mesh.elements.length > parent.mesh.elements.length);
assert.equal(result.evidence.qualification, 'PASS');
assert.equal(result.evidence.quality.blockingElementIds.length, 0);

const adjacency = gate(result.evidence, 'ADJACENT_SIZE_RATIO');
const scaledJacobian = gate(result.evidence, 'SCALED_JACOBIAN');
const topology = gate(result.evidence, 'SHELL_ORIENTATION_TOPOLOGY');
assert.ok(adjacency.value <= definition.acceptance.maximumAdjacentSizeRatio + 64 * Number.EPSILON);
assert.ok(scaledJacobian.value > definition.acceptance.minimumScaledJacobianExclusive);
assert.equal(topology.status, definition.acceptance.orientationTopologyStatus);
assert.equal(result.evidence.quality.shellOrientationTopology.nonManifoldEdgeCount, 0);
assert.ok(
  result.maximumSurfaceRoundTripUvError <= definition.acceptance.maximumSurfaceRoundTripUvErrorMm,
  `UV round-trip error ${result.maximumSurfaceRoundTripUvError}`,
);

assert.equal(geometric.meshHash, result.evidence.meshHash);
assert.equal(geometric.meshArtifactHash, result.evidence.artifactHash);
assert.equal(geometric.midsurfaceEvidenceHash, midsurface.semanticHash);
assert.equal(geometric.gateDisposition, 'NOT_GATED');
assert.equal(geometric.qualification, 'NOT_GATED');
assert.equal(geometric.engineeringAuthority, false);
assert.equal(geometric.releaseQualified, false);
assert.equal(geometric.metrics.hOverT.status, 'UNAVAILABLE_THICKNESS_BASIS_NOT_SUPPLIED');
assert.equal(geometricReplay.semanticHash, geometric.semanticHash);

const holeLineage = result.plan.boundaryLineage.filter((row) => row.role === 'HOLE');
assert.equal(holeLineage.length, 4);
const holeChildSegmentCount = holeLineage.reduce((sum, row) => sum + row.childSegmentIds.length, 0);
assert.ok(holeChildSegmentCount > 4, 'graded refinement must add true hole-boundary segments');
assert.ok(holeLineage.some((row) => row.childSegmentIds.length >= 2));

let maximumRadiusError = 0;
for (const node of result.evidence.mesh.nodes) {
  const radius = Math.hypot(node.y, node.z);
  maximumRadiusError = Math.max(maximumRadiusError, Math.abs(radius - definition.geometry.radiusMm));
  assert.doesNotThrow(() => curvedHoleShellUvAtPoint3d(geometry, node));
}
assert.ok(maximumRadiusError <= definition.acceptance.maximumCylinderRadiusErrorMm);

assert.equal(replay.plan.planHash, result.plan.planHash);
assert.equal(replay.evidence.meshHash, result.evidence.meshHash);
assert.equal(replay.evidence.artifactHash, result.evidence.artifactHash);
assert.equal(JSON.stringify(replay.evidence.mesh), JSON.stringify(result.evidence.mesh));

console.log(JSON.stringify({
  check: 'lafea-tech7-graded-refinement-executor',
  status: 'PASS',
  qualificationId: definition.qualificationId,
  target: {
    requestedUv: definition.target,
    selectedElementId: target.elementId,
    selectedElementCentroidUv: { u: target.u, v: target.v },
    selectionDistanceMm: target.distance,
  },
  grading: {
    globalTargetMm: definition.mesh.globalTargetMm,
    localTargetMm: definition.mesh.localTargetMm,
    levelsMm: result.plan.transitionLevels,
    transitionCount: result.plan.transitionLevelCount,
    influenceRadiusMm: result.plan.transitionInfluenceRadius,
    holeFrontConstruction: definition.mesh.holeFrontConstruction,
  },
  mesh: {
    parentNodes: parent.mesh.nodes.length,
    childNodes: result.evidence.mesh.nodes.length,
    parentElements: parent.mesh.elements.length,
    childElements: result.evidence.mesh.elements.length,
    insertedGradedPointCount: result.insertedGradedPointCount,
    originalHoleBoundarySegments: 4,
    childHoleBoundarySegments: holeChildSegmentCount,
    expectedBoundaryEdges: result.expectedBoundaryEdgeCount,
    childBoundaryEdges: result.childBoundaryEdgeCount,
  },
  quality: {
    maximumAdjacentSizeRatio: adjacency.value,
    minimumScaledJacobian: scaledJacobian.value,
    orientationTopology: topology.status,
    blockingElementCount: result.evidence.quality.blockingElementIds.length,
  },
  informationalGeometry: geometricSummary(geometric),
  geometry: {
    maximumSurfaceRoundTripUvErrorMm: result.maximumSurfaceRoundTripUvError,
    maximumCylinderRadiusErrorMm: maximumRadiusError,
  },
  deterministicReplay: true,
  productionBindingAuthorized: false,
  releaseQualified: false,
}, null, 2));

function curvedHoleGeometry(source) {
  const u0 = source.uMinMm; const u1 = source.uMaxMm;
  const v0 = source.vMinMm; const v1 = source.vMaxMm;
  const h = source.hole;
  return createLafeaCurvedHoleShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.4',
    geometryId: 'TECH7-CURVED-HOLE-R100',
    lengthUnit: 'mm',
    surface: {
      kind: 'CYLINDER',
      axisOrigin: { x: 0, y: 0, z: 0 },
      axisDirection: { x: 1, y: 0, z: 0 },
      radialDirection: { x: 0, y: 0, z: 1 },
      radius: source.radiusMm,
    },
    orientationPolicy: LAFEA_SHELL_CURVED_HOLE_ORIENTATION,
    vertices: [
      { vertexId: 'O1', u: u0, v: v0 },
      { vertexId: 'O2', u: u1, v: v0 },
      { vertexId: 'O3', u: u1, v: v1 },
      { vertexId: 'O4', u: u0, v: v1 },
      { vertexId: 'H1', u: h.uMinMm, v: h.vMinMm },
      { vertexId: 'H2', u: h.uMinMm, v: h.vMaxMm },
      { vertexId: 'H3', u: h.uMaxMm, v: h.vMaxMm },
      { vertexId: 'H4', u: h.uMaxMm, v: h.vMinMm },
    ],
    segments: [
      segment('OS1', 'O1', 'O2'), segment('OS2', 'O2', 'O3'),
      segment('OS3', 'O3', 'O4'), segment('OS4', 'O4', 'O1'),
      segment('HS1', 'H1', 'H2'), segment('HS2', 'H2', 'H3'),
      segment('HS3', 'H3', 'H4'), segment('HS4', 'H4', 'H1'),
    ],
    loops: [
      { loopId: 'OUTER', role: 'OUTER', segmentIds: ['OS1', 'OS2', 'OS3', 'OS4'] },
      { loopId: 'HOLE', role: 'HOLE', segmentIds: ['HS1', 'HS2', 'HS3', 'HS4'] },
    ],
  });
}
function segment(segmentId, startVertexId, endVertexId) {
  return { segmentId, startVertexId, endVertexId };
}
function nearestElementToUv(mesh, geometry, targetUv) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  let best = null;
  for (const element of mesh.elements) {
    const rows = element.nodeIds.map((id) => curvedHoleShellUvAtPoint3d(geometry, nodeById.get(id)));
    const u = rows.reduce((sum, row) => sum + row.u, 0) / rows.length;
    const v = rows.reduce((sum, row) => sum + row.v, 0) / rows.length;
    const distance = Math.hypot(u - targetUv.u, v - targetUv.v);
    if (!best || distance < best.distance) best = { elementId: element.elementId, u, v, distance };
  }
  return best;
}
function gate(evidence, metric) {
  const row = evidence.quality.gateResults.find((candidate) => candidate.metric === metric);
  assert.ok(row, `missing mesh-quality gate ${metric}`);
  return row;
}
function geometricSummary(evidence) {
  return {
    schema: evidence.schema,
    semanticHash: evidence.semanticHash,
    gateDisposition: evidence.gateDisposition,
    minimumSignedSurfaceJacobian: evidence.metrics.signedSurfaceJacobian.minimum,
    negativeOrZeroSignedJacobianElements:
      evidence.metrics.signedSurfaceJacobian.negativeOrZeroElementCount,
    determinantRatio: evidence.metrics.facetDeterminantRatio.maximum,
    maximumAngleDegrees: evidence.metrics.maximumAngleDegrees.maximum,
    maximumShellNormalTransitionDegrees: evidence.metrics.shellNormalContinuityDegrees.maximum,
    maximumChordMidpointDeviation: evidence.metrics.curvatureChordMidpointDeviation.maximum,
    hOverTStatus: evidence.metrics.hOverT.status,
  };
}
function arrayClose(actual, expected, tolerance = 1e-12) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => assert.ok(
    Math.abs(value - expected[index]) <= tolerance * Math.max(1, Math.abs(expected[index])),
    `${value} != ${expected[index]}`,
  ));
}
