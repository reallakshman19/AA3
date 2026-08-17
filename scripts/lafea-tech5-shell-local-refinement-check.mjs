#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  canonicalProfile,
  PROFILE_KINDS,
} from '../src/core/lafea-profile-contract/index.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import {
  LAFEA_SHELL_ELEMENT,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';
import {
  LAFEA4_SHELL_REFINEMENT_CAPABILITY,
  LAFEA4_SHELL_REFINEMENT_COMMAND_SCHEMA,
  LAFEA4_SHELL_REFINEMENT_PRODUCER_REF,
  LAFEA4_SHELL_REFINEMENT_QUALIFICATION,
  createLafea4ShellRefinementCommand,
} from '../src/workspace/lafea4-shell-refinement-authority.js';
import {
  planLafea4ShellRetainedMeshRefinement,
  produceLafea4ShellRetainedMeshRefinement,
} from '../src/workspace/lafea-shell-retained-mesh-refinement.js';
import { cylindricalShellUvAtPoint3d } from '../src/workspace/lafea-shell-curved-midsurface-contract.js';
import { lafeaMeshProducerLocalRefinementFamilies } from '../src/workspace/lafea-mesh-producer-registry.js';
import { cylindricalSource } from './lafea.4-fixtures.mjs';

const GLOBAL_TARGET_MM = 15;
const LOCAL_TARGET_MM = 11.25;
const DEEP_TARGET_MM = 9.9;
const ADJACENT_LIMIT = 1.5;
const EXPECTED_MINIMUM_TARGET_RATIO = 1 / ADJACENT_LIMIT;
const ROUND_TRIP_TOLERANCE_MM = 1e-8;
const CYLINDER_RADIUS_MM = 100;

// Use the exact visible LAFEA.4 sample topology: R=100 mm, L=50 mm,
// 60-degree span, 26 source nodes and 24 source triangles.
const source = cylindricalSource(12);
source.modelIdentity = 'CYLINDRICAL_PIPE_SHELL_BENCHMARK';
const sourceAuthority = issueLafeaSourceAuthority(
  'LAFEA.4', source, 'TECH5-LAFEA4-SHELL-LOCAL-REFINEMENT',
);
const midsurface = createLafeaSimulatedShellMidsurfaceEvidence(
  'LAFEA.4', sourceAuthority.sourceHash, source,
);
assert.ok(midsurface);

const profile = canonicalProfile(PROFILE_KINDS.MESH, {
  schema: 'lafea-mesh-profile/v1',
  profileIdentity: 'LAFEA4_TECH5_CYLINDER_LOCAL_REFINEMENT_H15',
  sourceRevision: 'TECH5-FROZEN-V1',
  semanticHash: undefined,
  fields: {
    continuumElement: 'T3',
    shellElement: LAFEA_SHELL_ELEMENT,
    globalTargetSize: GLOBAL_TARGET_MM,
    adjacentSizeRatioMax: ADJACENT_LIMIT,
    aspectRatioWarn: 5,
    aspectRatioBlock: 10,
    scaledJacobianWarn: 0.5,
    scaledJacobianBlock: 0.2,
    adaptiveLevels: 3,
  },
});

const parent = produceLafeaShellAnalysisMesh({
  midsurfaceEvidence: midsurface,
  meshProfile: profile,
}).evidence;
assert.equal(parent.qualification, 'PASS');
assert.equal(parent.quality.blockingElementIds.length, 0);

// The shell refiner is deliberately separate from the byte-stable LAFEA.3
// core-producer local-refinement registry.
assert.deepEqual(lafeaMeshProducerLocalRefinementFamilies('LAFEA.4'), []);
assert.equal(LAFEA4_SHELL_REFINEMENT_CAPABILITY.stageId, 'LAFEA.4');
assert.equal(LAFEA4_SHELL_REFINEMENT_CAPABILITY.elementFamily, LAFEA_SHELL_ELEMENT);
assert.deepEqual(
  LAFEA4_SHELL_REFINEMENT_CAPABILITY.surfaceKinds,
  ['CYLINDRICAL', 'CYLINDRICAL_HOLES'],
);
assert.equal(LAFEA4_SHELL_REFINEMENT_QUALIFICATION.releaseQualified, false);
assert.equal(
  LAFEA4_SHELL_REFINEMENT_QUALIFICATION.capabilityHash,
  LAFEA4_SHELL_REFINEMENT_CAPABILITY.capabilityHash,
);

const target = nearestElementToUv(parent.mesh, midsurface.geometry, { u: 0, v: 25 });
assert.ok(target.distance < GLOBAL_TARGET_MM, 'expected an interior target near the requested fixed UV point');

const stage = Object.freeze({
  stageId: 'LAFEA.4',
  sourceAuthority,
});
const command = createLafea4ShellRefinementCommand({
  schema: LAFEA4_SHELL_REFINEMENT_COMMAND_SCHEMA,
  commandId: 'TECH5-LAFEA4-CYLINDER-ELEMENT-LOCAL-H11_25',
  stageId: 'LAFEA.4',
  parentMeshArtifactHash: parent.artifactHash,
  parentMeshHash: parent.meshHash,
  kind: 'TARGET_LENGTH',
  targetType: 'ELEMENT',
  targetIds: [target.elementId],
  targetElementLength: LOCAL_TARGET_MM,
  lengthUnit: 'mm',
  reason: 'TECH5 exact-UV conforming shell local-refinement qualification',
});
assert.equal(command.executionAuthorized, true);

const result = produceLafea4ShellRetainedMeshRefinement({
  stage,
  midsurfaceEvidence: midsurface,
  meshProfile: profile,
  parentEvidence: parent,
  command,
});
const replay = produceLafea4ShellRetainedMeshRefinement({
  stage,
  midsurfaceEvidence: midsurface,
  meshProfile: profile,
  parentEvidence: parent,
  command,
});

assert.equal(result.plan.targetRatio, LOCAL_TARGET_MM / GLOBAL_TARGET_MM);
close(result.plan.minimumTargetRatio, EXPECTED_MINIMUM_TARGET_RATIO, 1e-14);
assert.equal(result.plan.producerRef, LAFEA4_SHELL_REFINEMENT_PRODUCER_REF);
assert.equal(result.evidence.qualification, 'PASS');
assert.equal(result.evidence.status, 'CURRENT');
assert.equal(result.evidence.quality.blockingElementIds.length, 0);
assert.ok(result.localPointCount > 0);
assert.ok(result.evidence.mesh.nodes.length > parent.mesh.nodes.length);
assert.ok(result.evidence.mesh.elements.length > parent.mesh.elements.length);
assert.notEqual(result.evidence.meshHash, parent.meshHash);

assert.equal(result.boundaryPreserved, true);
assert.equal(result.childBoundaryEdgeCount, result.parentBoundaryEdgeCount);
assert.ok(
  result.maximumSurfaceRoundTripUvError <= ROUND_TRIP_TOLERANCE_MM,
  `UV round-trip error ${result.maximumSurfaceRoundTripUvError} exceeds ${ROUND_TRIP_TOLERANCE_MM}`,
);

const adjacency = gate(result.evidence, 'ADJACENT_SIZE_RATIO');
const scaledJacobian = gate(result.evidence, 'SCALED_JACOBIAN');
const topology = gate(result.evidence, 'SHELL_ORIENTATION_TOPOLOGY');
assert.equal(adjacency.blockingThreshold, ADJACENT_LIMIT);
assert.ok(adjacency.value <= ADJACENT_LIMIT + 64 * Number.EPSILON);
assert.ok(scaledJacobian.value > 0.2);
assert.equal(topology.status, 'OK');
assert.equal(result.evidence.quality.shellOrientationTopology.nonManifoldEdgeCount, 0);

// No child node is an approximate chord point: every node must lie on the
// exact R=100 mm cylinder, and inverse UV mapping must remain valid.
let maximumRadiusError = 0;
for (const node of result.evidence.mesh.nodes) {
  const radial = Math.hypot(node.y, node.z);
  maximumRadiusError = Math.max(maximumRadiusError, Math.abs(radial - CYLINDER_RADIUS_MM));
  assert.doesNotThrow(() => cylindricalShellUvAtPoint3d(midsurface.geometry, node));
}
assert.ok(maximumRadiusError <= 1e-10, `maximum cylinder radius error=${maximumRadiusError}`);

// Deterministic replay is part of the qualification, not merely an expected
// implementation property.
assert.equal(replay.plan.planHash, result.plan.planHash);
assert.equal(replay.evidence.meshHash, result.evidence.meshHash);
assert.equal(replay.evidence.artifactHash, result.evidence.artifactHash);
assert.equal(JSON.stringify(replay.evidence.mesh), JSON.stringify(result.evidence.mesh));

// Quantitative fail-closed transition rule. With global h=15 mm and adjacent
// ratio <=1.5, an ungraded first local target must satisfy h_local >= 10 mm.
// 9.9/15 = 0.66 < 2/3, so the plan must reject it before generating topology.
const deepCommand = createLafea4ShellRefinementCommand({
  schema: LAFEA4_SHELL_REFINEMENT_COMMAND_SCHEMA,
  commandId: 'TECH5-LAFEA4-CYLINDER-DEEP-H9_9',
  stageId: 'LAFEA.4',
  parentMeshArtifactHash: parent.artifactHash,
  parentMeshHash: parent.meshHash,
  kind: 'TARGET_LENGTH',
  targetType: 'ELEMENT',
  targetIds: [target.elementId],
  targetElementLength: DEEP_TARGET_MM,
  lengthUnit: 'mm',
  reason: 'TECH5 negative control for missing graded transition',
});
assert.throws(
  () => planLafea4ShellRetainedMeshRefinement({
    stage,
    midsurfaceEvidence: midsurface,
    meshProfile: profile,
    parentEvidence: parent,
    command: deepCommand,
  }),
  (error) => error?.code === 'LAFEA4_SHELL_REFINEMENT_TARGET_REQUIRES_GRADED_TRANSITION',
);

// Parent custody is mandatory and stale-safe.
const staleCommand = createLafea4ShellRefinementCommand({
  schema: LAFEA4_SHELL_REFINEMENT_COMMAND_SCHEMA,
  commandId: 'TECH5-LAFEA4-CYLINDER-STALE-PARENT',
  stageId: 'LAFEA.4',
  parentMeshArtifactHash: parent.artifactHash,
  parentMeshHash: `sha256:${'0'.repeat(64)}`,
  kind: 'TARGET_LENGTH',
  targetType: 'ELEMENT',
  targetIds: [target.elementId],
  targetElementLength: LOCAL_TARGET_MM,
  lengthUnit: 'mm',
  reason: 'TECH5 stale-parent negative control',
});
assert.throws(
  () => planLafea4ShellRetainedMeshRefinement({
    stage,
    midsurfaceEvidence: midsurface,
    meshProfile: profile,
    parentEvidence: parent,
    command: staleCommand,
  }),
  (error) => error?.code === 'LAFEA4_SHELL_REFINEMENT_PARENT_MESH_STALE',
);

console.log(JSON.stringify({
  check: 'lafea-tech5-shell-local-refinement',
  status: 'PASS',
  authority: {
    producerRef: result.plan.producerRef,
    capabilityHash: result.plan.capabilityHash,
    qualificationHash: result.plan.qualificationHash,
    releaseQualified: LAFEA4_SHELL_REFINEMENT_QUALIFICATION.releaseQualified,
  },
  sizing: {
    globalTargetMm: GLOBAL_TARGET_MM,
    localTargetMm: LOCAL_TARGET_MM,
    targetRatio: result.plan.targetRatio,
    adjacentSizeRatioMax: ADJACENT_LIMIT,
    minimumUngradedTargetRatio: result.plan.minimumTargetRatio,
    minimumUngradedTargetMm: GLOBAL_TARGET_MM / ADJACENT_LIMIT,
    rejectedDeepTargetMm: DEEP_TARGET_MM,
  },
  topology: {
    parentNodes: parent.mesh.nodes.length,
    childNodes: result.evidence.mesh.nodes.length,
    parentElements: parent.mesh.elements.length,
    childElements: result.evidence.mesh.elements.length,
    localPointCount: result.localPointCount,
    parentBoundaryEdges: result.parentBoundaryEdgeCount,
    childBoundaryEdges: result.childBoundaryEdgeCount,
    boundaryPreserved: result.boundaryPreserved,
    nonManifoldEdges: result.evidence.quality.shellOrientationTopology.nonManifoldEdgeCount,
  },
  geometry: {
    maximumSurfaceRoundTripUvError: result.maximumSurfaceRoundTripUvError,
    maximumRadiusError,
  },
  quality: {
    maximumAdjacentSizeRatio: adjacency.value,
    minimumScaledJacobian: scaledJacobian.value,
    orientationTopology: topology.status,
  },
  deterministicReplay: replay.evidence.meshHash === result.evidence.meshHash,
}, null, 2));

function nearestElementToUv(mesh, geometry, targetUv) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  let best = null;
  for (const element of mesh.elements) {
    const corners = element.nodeIds.map((id) => {
      const node = nodeById.get(id);
      return cylindricalShellUvAtPoint3d(geometry, node);
    });
    const u = corners.reduce((sum, row) => sum + row.u, 0) / corners.length;
    const v = corners.reduce((sum, row) => sum + row.v, 0) / corners.length;
    const distance = Math.hypot(u - targetUv.u, v - targetUv.v);
    if (!best || distance < best.distance) best = { elementId: element.elementId, u, v, distance };
  }
  return best;
}

function gate(evidence, metric) {
  const row = evidence.quality.gateResults.find((candidate) => candidate.metric === metric);
  assert.ok(row, `missing retained mesh-quality gate ${metric}`);
  return row;
}

function close(actual, expected, relativeTolerance) {
  assert.ok(
    Math.abs(actual - expected) <= relativeTolerance * Math.max(1, Math.abs(expected)),
    `${actual} != ${expected}`,
  );
}
