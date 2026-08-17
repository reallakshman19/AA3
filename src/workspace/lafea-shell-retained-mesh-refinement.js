import { smoothInteriorPoints } from '../core/lafea-meshing/mesh-smoothing.js';
import { edgeKey, lawsonFlip } from '../core/lafea-meshing/constrained-delaunay-t6.js';
import { insertInteriorPoint } from '../core/lafea-meshing/interior-refinement-t6.js';
import { canonicalLafeaAnalysisMeshProfile } from './lafea-analysis-mesh-contract.js';
import {
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
  LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  createLafeaAnalysisMeshEvidenceV2,
  validateLafeaAnalysisMeshEvidenceV2,
} from './lafea-analysis-mesh-evidence-v2.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { estimateLafeaMeshDofs } from './lafea-mesh-dof-policy.js';
import {
  LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA,
  createLafeaRetainedMeshRefinementCommand,
} from './lafea-mesh-refinement-command.js';
import {
  lafeaCoreMeshProducerCapability,
  lafeaCoreMeshProducerQualification,
} from './lafea-mesh-producer-binding.js';
import {
  LAFEA_MESH_PRODUCER_REF,
  lafeaMeshProducerLocalRefinementFamilies,
} from './lafea-mesh-producer-registry.js';
import {
  LAFEA_SHELL_SURFACE_KINDS,
  shellMidsurfaceKind,
  shellMidsurfacePoint3dAny,
  validateLafeaAnyShellMidsurfaceEvidence,
} from './lafea-shell-midsurface-dispatch.js';
import { cylindricalShellUvAtPoint3d } from './lafea-shell-curved-midsurface-contract.js';
import { curvedHoleShellUvAtPoint3d } from './lafea-shell-curved-hole-midsurface-contract.js';

export const LAFEA4_SHELL_RETAINED_REFINEMENT_PLAN_SCHEMA =
  'lafea4-shell-retained-refinement-plan/v1';
export const LAFEA4_SHELL_RETAINED_REFINEMENT_RESULT_SCHEMA =
  'lafea4-shell-retained-refinement-result/v1';
export const LAFEA4_SHELL_RETAINED_REFINEMENT_POLICY = Object.freeze({
  scope: 'NONPERIODIC_CYLINDRICAL_TRI3_UV_INTERIOR_REGENERATION_V1',
  influenceRadiusGlobalFactor: 2,
  boundaryClearanceLocalFactor: 0.30,
  pointClearanceLocalFactor: 0.18,
  smoothingRounds: 3,
  boundarySegmentationPolicy: 'PRESERVE_PARENT_BOUNDARY_EDGES_EXACTLY_V1',
  transitionPolicy: 'TARGET_RATIO_BOUNDED_BY_ADJACENT_SIZE_POLICY_V1',
});

const SHELL_TRI3 = 'CST_DKT_TRI3_THIN_SHELL_V1';
const ROW_HEIGHT_FACTOR = Math.sqrt(3) / 2;
const ALLOWED_SURFACES = new Set([
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL,
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_HOLES,
]);

/**
 * Plan one retained LAFEA.4 shell refinement in exact midsurface UV space.
 *
 * The first qualified shell-local increment deliberately preserves all parent
 * boundary edges. It inserts only interior UV points, restores a conforming
 * constrained triangulation, and maps every child node back to the exact
 * midsurface. A deeper than 1/adjacentSizeRatioMax target requires an explicit
 * graded transition field and therefore fails closed in this revision.
 */
export function planLafea4ShellRetainedMeshRefinement({
  stage,
  midsurfaceEvidence: midsurfaceValue,
  meshProfile: profileValue,
  parentEvidence: parentValue,
  command: commandValue,
}) {
  const parentEvidence = validateLafeaAnalysisMeshEvidenceV2(parentValue);
  const midsurfaceEvidence = validateLafeaAnyShellMidsurfaceEvidence(midsurfaceValue);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(profileValue);
  const command = requireCommand(commandValue);

  requireLafea4Parents(stage, midsurfaceEvidence, parentEvidence, meshProfile);
  if (command.stageId !== 'LAFEA.4') fail('LAFEA4_SHELL_REFINEMENT_COMMAND_STAGE_INVALID');
  if (command.parentMeshArtifactHash !== parentEvidence.artifactHash
    || command.parentMeshHash !== parentEvidence.meshHash) {
    fail('LAFEA4_SHELL_REFINEMENT_PARENT_MESH_STALE');
  }
  if (!command.executionAuthorized) fail('LAFEA4_SHELL_REFINEMENT_COMMAND_NOT_AUTHORIZED');
  if (!lafeaMeshProducerLocalRefinementFamilies('LAFEA.4').includes(SHELL_TRI3)) {
    fail('LAFEA4_SHELL_REFINEMENT_PRODUCER_SCOPE_NOT_QUALIFIED');
  }
  if (meshProfile.fields.shellElement !== SHELL_TRI3
    || parentEvidence.mesh.elements.some((row) => row.elementType !== SHELL_TRI3)) {
    fail('LAFEA4_SHELL_REFINEMENT_PARENT_FAMILY_MISMATCH');
  }

  const surfaceKind = shellMidsurfaceKind(midsurfaceEvidence);
  if (!ALLOWED_SURFACES.has(surfaceKind)) {
    fail(surfaceKind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_PERIODIC
      ? 'LAFEA4_SHELL_REFINEMENT_PERIODIC_NOT_QUALIFIED'
      : 'LAFEA4_SHELL_REFINEMENT_SURFACE_KIND_NOT_QUALIFIED');
  }

  const globalTargetElementLength = meshProfile.fields.globalTargetSize;
  if (!(command.targetElementLength < globalTargetElementLength)) {
    fail('LAFEA4_SHELL_REFINEMENT_TARGET_MUST_BE_SMALLER_THAN_GLOBAL');
  }
  const adjacentSizeRatioMax = meshProfile.fields.adjacentSizeRatioMax;
  const minimumTargetRatio = 1 / adjacentSizeRatioMax;
  const targetRatio = command.targetElementLength / globalTargetElementLength;
  if (targetRatio < minimumTargetRatio - 64 * Number.EPSILON) {
    fail('LAFEA4_SHELL_REFINEMENT_TARGET_REQUIRES_GRADED_TRANSITION');
  }

  const triangulation = parentUvTriangulation(
    parentEvidence.mesh,
    midsurfaceEvidence.geometry,
    surfaceKind,
  );
  const targets = resolveTargetsUv(
    parentEvidence.mesh,
    triangulation.uvByNodeId,
    command.targetType,
    command.targetIds,
  );
  const influenceRadius = Math.max(
    globalTargetElementLength * LAFEA4_SHELL_RETAINED_REFINEMENT_POLICY.influenceRadiusGlobalFactor,
    command.targetElementLength * 3,
  );
  const capability = lafeaCoreMeshProducerCapability();
  const qualification = lafeaCoreMeshProducerQualification();
  if (!capability.supportsLocalRefinement
    || !capability.generationModes.includes('REFINEMENT_REGENERATION')
    || !qualification.localRefinementAuthorized
    || !qualification.authorizedGenerationModes.includes('REFINEMENT_REGENERATION')) {
    fail('LAFEA4_SHELL_REFINEMENT_PRODUCER_NOT_QUALIFIED');
  }

  const base = {
    schema: LAFEA4_SHELL_RETAINED_REFINEMENT_PLAN_SCHEMA,
    stageId: 'LAFEA.4',
    generationMode: 'REFINEMENT_REGENERATION',
    scope: LAFEA4_SHELL_RETAINED_REFINEMENT_POLICY.scope,
    surfaceKind,
    parentMeshArtifactHash: parentEvidence.artifactHash,
    parentMeshHash: parentEvidence.meshHash,
    parentPlanHash: parentEvidence.authority.planHash,
    sourceHash: parentEvidence.sourceHash,
    analysisDomainHash: parentEvidence.analysisDomainHash,
    analysisGeometryHash: parentEvidence.analysisGeometryHash,
    midsurfaceEvidenceHash: midsurfaceEvidence.semanticHash,
    meshProfileHash: meshProfile.semanticHash,
    elementFamily: SHELL_TRI3,
    commandHash: command.semanticHash,
    targetType: command.targetType,
    targetIds: [...command.targetIds],
    targets,
    targetElementLength: command.targetElementLength,
    globalTargetElementLength,
    targetRatio,
    adjacentSizeRatioMax,
    minimumTargetRatio,
    influenceRadius,
    boundarySegmentationPolicy: LAFEA4_SHELL_RETAINED_REFINEMENT_POLICY.boundarySegmentationPolicy,
    transitionPolicy: LAFEA4_SHELL_RETAINED_REFINEMENT_POLICY.transitionPolicy,
    parentBoundaryEdgeCount: triangulation.boundaryEdgeKeys.size,
    capabilityHash: capability.capabilityHash,
    qualificationHash: qualification.qualificationHash,
    producerId: capability.producerId,
    producerRevision: capability.producerRevision,
    producerRef: LAFEA_MESH_PRODUCER_REF,
    repeatabilityPolicy: capability.repeatabilityPolicy,
  };
  return freeze({
    ...base,
    planHash: canonicalLafeaSha256({
      schema: 'lafea4-shell-retained-refinement-plan-hash-input/v1',
      plan: base,
    }),
  });
}

export function previewLafea4ShellRetainedMeshRefinement(input) {
  const parentEvidence = validateLafeaAnalysisMeshEvidenceV2(input.parentEvidence);
  const midsurfaceEvidence = validateLafeaAnyShellMidsurfaceEvidence(input.midsurfaceEvidence);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(input.meshProfile);
  const command = requireCommand(input.command);
  const plan = planLafea4ShellRetainedMeshRefinement({
    stage: input.stage,
    midsurfaceEvidence,
    meshProfile,
    parentEvidence,
    command,
  });
  const generated = refineParentInUv(parentEvidence.mesh, midsurfaceEvidence.geometry, plan);
  const capability = lafeaCoreMeshProducerCapability();
  const estimatedDofs = estimateLafeaMeshDofs('LAFEA.4', generated.mesh.nodes.length);
  if (generated.mesh.nodes.length > capability.maximumNodes
    || generated.mesh.elements.length > capability.maximumElements
    || estimatedDofs > capability.maximumEstimatedDofs) {
    fail('LAFEA4_SHELL_REFINEMENT_RESOURCE_LIMIT_EXCEEDED');
  }

  const meshHash = canonicalLafeaSha256({
    schema: 'lafea-analysis-mesh-content-hash-input/v1',
    mesh: generated.mesh,
  });
  const evidence = createLafeaAnalysisMeshEvidenceV2({
    schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash: plan.sourceHash,
    analysisDomainHash: plan.analysisDomainHash,
    analysisGeometryHash: plan.analysisGeometryHash,
    meshProfile,
    mesh: generated.mesh,
    authority: {
      schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
      stageId: 'LAFEA.4',
      authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
      status: 'ACCEPTED_BY_STAGE_CONTRACT',
      producerRef: LAFEA_MESH_PRODUCER_REF,
      sourceHash: plan.sourceHash,
      analysisDomainHash: plan.analysisDomainHash,
      analysisGeometryHash: plan.analysisGeometryHash,
      meshProfileHash: plan.meshProfileHash,
      meshHash,
      capabilityHash: plan.capabilityHash,
      qualificationHash: plan.qualificationHash,
      planHash: plan.planHash,
    },
  });

  return freeze({
    schema: LAFEA4_SHELL_RETAINED_REFINEMENT_RESULT_SCHEMA,
    plan,
    evidence,
    parentEvidenceHash: parentEvidence.artifactHash,
    localPointCount: generated.localPointCount,
    estimatedDofs,
    parentBoundaryEdgeCount: generated.parentBoundaryEdgeCount,
    childBoundaryEdgeCount: generated.childBoundaryEdgeCount,
    boundaryPreserved: generated.boundaryPreserved,
    maximumSurfaceRoundTripUvError: generated.maximumSurfaceRoundTripUvError,
    changed: evidence.meshHash !== parentEvidence.meshHash,
    qualification: evidence.qualification,
  });
}

export function produceLafea4ShellRetainedMeshRefinement(input) {
  const result = previewLafea4ShellRetainedMeshRefinement(input);
  if (!result.changed) fail('LAFEA4_SHELL_REFINEMENT_NO_MESH_CHANGE');
  if (!result.boundaryPreserved) fail('LAFEA4_SHELL_REFINEMENT_BOUNDARY_CHANGED');
  if (result.qualification !== 'PASS') fail('LAFEA4_SHELL_REFINEMENT_QUALITY_BLOCKED');
  return result;
}

function refineParentInUv(parentMesh, geometry, plan) {
  const triangulation = parentUvTriangulation(parentMesh, geometry, plan.surfaceKind);
  const points = triangulation.points.map((point) => ({ ...point }));
  const triangles = triangulation.triangles.map((row) => [...row]);
  const constraints = new Set(triangulation.boundaryEdgeKeys);
  const candidates = localCandidates(plan.targets, plan.targetElementLength, plan.influenceRadius);
  let localPointCount = 0;
  for (const candidate of candidates) {
    if (!farFromBoundary(
      candidate,
      points,
      constraints,
      plan.targetElementLength * LAFEA4_SHELL_RETAINED_REFINEMENT_POLICY.boundaryClearanceLocalFactor,
    )) continue;
    if (!farFromPoints(
      candidate,
      points,
      plan.targetElementLength * LAFEA4_SHELL_RETAINED_REFINEMENT_POLICY.pointClearanceLocalFactor,
    )) continue;
    if (insertInteriorPoint(points, triangles, constraints, candidate)) localPointCount += 1;
  }
  if (!localPointCount) fail('LAFEA4_SHELL_REFINEMENT_NO_LOCAL_POINTS_INSERTED');

  let restored = lawsonFlip(points, triangles, constraints);
  const fixedIndices = new Set();
  for (const key of constraints) {
    const [left, right] = key.split(':').map(Number);
    fixedIndices.add(left);
    fixedIndices.add(right);
  }
  for (let round = 0; round < LAFEA4_SHELL_RETAINED_REFINEMENT_POLICY.smoothingRounds; round += 1) {
    const working = restored.map((triangle) => [...triangle]);
    smoothInteriorPoints(points, working, fixedIndices);
    restored = lawsonFlip(points, working, constraints);
  }

  const uvMesh = weldUvTriangulation(points, restored, plan.producerRevision);
  const parentBoundarySignature = triangulation.boundarySignature;
  const childTopology = uvBoundaryTopology(uvMesh);
  const boundaryPreserved = sameStringArray(parentBoundarySignature, childTopology.signature);
  const mesh = mapUvMeshToExactShell(uvMesh, geometry);
  const maximumSurfaceRoundTripUvError = maximumUvRoundTripError(
    uvMesh,
    mesh,
    geometry,
    plan.surfaceKind,
  );
  return freeze({
    mesh,
    localPointCount,
    parentBoundaryEdgeCount: parentBoundarySignature.length,
    childBoundaryEdgeCount: childTopology.signature.length,
    boundaryPreserved,
    maximumSurfaceRoundTripUvError,
  });
}

function parentUvTriangulation(mesh, geometry, surfaceKind) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const cornerIds = [...new Set(mesh.elements.flatMap((element) => element.nodeIds.slice(0, 3)))].sort();
  const pointIndexById = new Map(cornerIds.map((id, index) => [id, index]));
  const uvByNodeId = new Map();
  const points = cornerIds.map((id) => {
    const node = nodeById.get(id);
    if (!node) fail('LAFEA4_SHELL_REFINEMENT_PARENT_NODE_MISSING');
    const uv = uvAtPoint(geometry, surfaceKind, node);
    uvByNodeId.set(id, uv);
    return { x: uv.u, y: uv.v };
  });

  const triangles = [];
  const edgeOwners = new Map();
  for (const element of mesh.elements) {
    if (element.elementType !== SHELL_TRI3 || element.nodeIds.length !== 3) {
      fail('LAFEA4_SHELL_REFINEMENT_PARENT_FAMILY_MISMATCH');
    }
    const triangle = element.nodeIds.map((id) => pointIndexById.get(id));
    if (triangle.some((index) => index === undefined)) {
      fail('LAFEA4_SHELL_REFINEMENT_PARENT_CONNECTIVITY_INVALID');
    }
    normalizeTriangle(triangle, points);
    triangles.push(triangle);
    for (let edge = 0; edge < 3; edge += 1) {
      const key = edgeKey(triangle[edge], triangle[(edge + 1) % 3]);
      edgeOwners.set(key, (edgeOwners.get(key) ?? 0) + 1);
    }
  }
  if ([...edgeOwners.values()].some((count) => count > 2)) {
    fail('LAFEA4_SHELL_REFINEMENT_PARENT_NON_MANIFOLD');
  }
  const boundaryEdgeKeys = new Set(
    [...edgeOwners.entries()].filter(([, count]) => count === 1).map(([key]) => key),
  );
  return {
    points,
    triangles,
    uvByNodeId,
    boundaryEdgeKeys,
    boundarySignature: boundarySignature(points, boundaryEdgeKeys),
  };
}

function resolveTargetsUv(mesh, uvByNodeId, targetType, targetIds) {
  const elementById = new Map(mesh.elements.map((element) => [element.elementId, element]));
  return freeze(targetIds.map((targetId) => {
    if (targetType === 'NODE') {
      const uv = uvByNodeId.get(targetId);
      if (!uv) fail('LAFEA4_SHELL_REFINEMENT_TARGET_NODE_NOT_FOUND');
      return freeze({ targetId, targetType, u: uv.u, v: uv.v });
    }
    const element = elementById.get(targetId);
    if (!element) fail('LAFEA4_SHELL_REFINEMENT_TARGET_ELEMENT_NOT_FOUND');
    const corners = element.nodeIds.map((id) => uvByNodeId.get(id));
    if (corners.some((row) => !row)) fail('LAFEA4_SHELL_REFINEMENT_TARGET_CONNECTIVITY_INVALID');
    return freeze({
      targetId,
      targetType,
      u: corners.reduce((sum, row) => sum + row.u, 0) / 3,
      v: corners.reduce((sum, row) => sum + row.v, 0) / 3,
    });
  }));
}

function localCandidates(targets, spacing, radius) {
  const rows = Math.ceil(radius / (spacing * ROW_HEIGHT_FACTOR));
  const columns = Math.ceil(radius / spacing) + 1;
  const candidates = new Map();
  for (const target of [...targets].sort((a, b) => a.targetId.localeCompare(b.targetId))) {
    for (let row = -rows; row <= rows; row += 1) {
      const y = target.v + row * spacing * ROW_HEIGHT_FACTOR;
      const xOffset = Math.abs(row) % 2 ? spacing / 2 : 0;
      for (let column = -columns; column <= columns; column += 1) {
        const x = target.u + column * spacing + xOffset;
        if (Math.hypot(x - target.u, y - target.v) > radius + 1e-12) continue;
        const key = `${x},${y}`;
        if (!candidates.has(key)) candidates.set(key, { x, y });
      }
    }
  }
  return [...candidates.values()].sort((a, b) => a.y - b.y || a.x - b.x);
}

function mapUvMeshToExactShell(uvMesh, geometry) {
  return freeze({
    schema: 'lafea-analysis-mesh/v1',
    meshIdentity: `${uvMesh.meshIdentity}:EXACT_MIDSURFACE`,
    nodes: uvMesh.nodes.map((node) => ({
      nodeId: node.nodeId,
      ...shellMidsurfacePoint3dAny(geometry, node.u, node.v),
    })),
    elements: uvMesh.elements.map((element) => ({
      elementId: element.elementId,
      elementType: SHELL_TRI3,
      nodeIds: [...element.nodeIds],
    })),
  });
}

function maximumUvRoundTripError(uvMesh, shellMesh, geometry, surfaceKind) {
  const uvById = new Map(uvMesh.nodes.map((row) => [row.nodeId, row]));
  let maximum = 0;
  for (const node of shellMesh.nodes) {
    const intended = uvById.get(node.nodeId);
    const recovered = uvAtPoint(geometry, surfaceKind, node);
    maximum = Math.max(maximum, Math.hypot(recovered.u - intended.u, recovered.v - intended.v));
  }
  return maximum;
}

function weldUvTriangulation(points, triangles, revision) {
  const used = new Set(triangles.flat());
  const ordered = [...used]
    .map((index) => ({ index, u: points[index].x, v: points[index].y }))
    .sort((a, b) => a.u - b.u || a.v - b.v);
  const nodeIdByIndex = new Map(ordered.map((row, index) => [row.index, nodeId(index)]));
  const nodes = ordered.map((row, index) => ({
    nodeId: nodeId(index),
    u: row.u,
    v: row.v,
  }));
  const elements = triangles
    .map((triangle) => ({ nodeIds: triangle.map((index) => nodeIdByIndex.get(index)) }))
    .sort((a, b) => compareIdLists(a.nodeIds, b.nodeIds))
    .map((row, index) => ({
      elementId: elementId(index),
      elementType: SHELL_TRI3,
      nodeIds: row.nodeIds,
    }));
  return freeze({
    schema: 'lafea4-shell-uv-refined-mesh/v1',
    meshIdentity: `LAFEA_CORE_MESHER:${revision}:LAFEA4_LOCAL_REFINEMENT`,
    nodes,
    elements,
  });
}

function uvBoundaryTopology(uvMesh) {
  const uvById = new Map(uvMesh.nodes.map((node) => [node.nodeId, node]));
  const owners = new Map();
  for (const element of uvMesh.elements) {
    for (let edge = 0; edge < 3; edge += 1) {
      const a = element.nodeIds[edge];
      const b = element.nodeIds[(edge + 1) % 3];
      const key = a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
      owners.set(key, (owners.get(key) ?? 0) + 1);
    }
  }
  if ([...owners.values()].some((count) => count > 2)) {
    fail('LAFEA4_SHELL_REFINEMENT_CHILD_NON_MANIFOLD');
  }
  const edges = [...owners.entries()].filter(([, count]) => count === 1).map(([key]) => {
    const [a, b] = key.split('\u0000');
    return [uvById.get(a), uvById.get(b)];
  });
  return freeze({
    signature: freeze(edges.map(([a, b]) => coordinateEdgeKey(a.u, a.v, b.u, b.v)).sort()),
  });
}

function boundarySignature(points, boundaryEdgeKeys) {
  return [...boundaryEdgeKeys].map((key) => {
    const [a, b] = key.split(':').map(Number);
    return coordinateEdgeKey(points[a].x, points[a].y, points[b].x, points[b].y);
  }).sort();
}

function coordinateEdgeKey(au, av, bu, bv) {
  const a = `${au},${av}`;
  const b = `${bu},${bv}`;
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

function uvAtPoint(geometry, surfaceKind, point) {
  if (surfaceKind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL) {
    return cylindricalShellUvAtPoint3d(geometry, point);
  }
  if (surfaceKind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_HOLES) {
    return curvedHoleShellUvAtPoint3d(geometry, point);
  }
  fail('LAFEA4_SHELL_REFINEMENT_SURFACE_KIND_NOT_QUALIFIED');
}

function farFromBoundary(point, points, boundaryEdgeKeys, clearance) {
  for (const key of boundaryEdgeKeys) {
    const [a, b] = key.split(':').map(Number);
    if (pointSegmentDistance(point, points[a], points[b]) < clearance) return false;
  }
  return true;
}

function farFromPoints(point, points, clearance) {
  return points.every((candidate) => Math.hypot(point.x - candidate.x, point.y - candidate.y) >= clearance);
}

function pointSegmentDistance(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  if (!length2) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1,
    ((point.x - a.x) * dx + (point.y - a.y) * dy) / length2));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function normalizeTriangle(triangle, points) {
  const [a, b, c] = triangle.map((index) => points[index]);
  const twiceArea = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  if (!(Math.abs(twiceArea) > 1e-12)) fail('LAFEA4_SHELL_REFINEMENT_PARENT_DEGENERATE_ELEMENT');
  if (twiceArea < 0) [triangle[1], triangle[2]] = [triangle[2], triangle[1]];
}

function requireLafea4Parents(stage, midsurfaceEvidence, parentEvidence, meshProfile) {
  if (stage?.stageId !== 'LAFEA.4'
    || midsurfaceEvidence.stageId !== 'LAFEA.4'
    || parentEvidence.stageId !== 'LAFEA.4') {
    fail('LAFEA4_SHELL_REFINEMENT_STAGE_INVALID');
  }
  if (parentEvidence.qualification !== 'PASS') fail('LAFEA4_SHELL_REFINEMENT_PARENT_QUALITY_BLOCKED');
  if (parentEvidence.meshProfileHash !== meshProfile.semanticHash) {
    fail('LAFEA4_SHELL_REFINEMENT_PROFILE_MISMATCH');
  }
  const sourceHash = stage?.sourceAuthority?.sourceHash ?? stage?.lifecycle?.source?.sourceHash ?? null;
  if (!sourceHash || sourceHash !== midsurfaceEvidence.sourceHash
    || sourceHash !== parentEvidence.sourceHash) {
    fail('LAFEA4_SHELL_REFINEMENT_SOURCE_STALE');
  }
  if (parentEvidence.analysisDomainHash !== midsurfaceEvidence.analysisDomainHash) {
    fail('LAFEA4_SHELL_REFINEMENT_DOMAIN_STALE');
  }
  if (parentEvidence.analysisGeometryHash !== midsurfaceEvidence.analysisGeometryHash) {
    fail('LAFEA4_SHELL_REFINEMENT_GEOMETRY_STALE');
  }
}

function requireCommand(value) {
  if (!value || value.schema !== LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA) {
    fail('LAFEA4_SHELL_REFINEMENT_COMMAND_REQUIRED');
  }
  const { semanticHash, status, executionAuthorized, rollbackPolicy, ...input } = value;
  const rebuilt = createLafeaRetainedMeshRefinementCommand(input);
  if (rebuilt.semanticHash !== semanticHash
    || rebuilt.status !== status
    || rebuilt.executionAuthorized !== executionAuthorized
    || rebuilt.rollbackPolicy !== rollbackPolicy) {
    fail('LAFEA4_SHELL_REFINEMENT_COMMAND_TAMPERED');
  }
  return rebuilt;
}

function sameStringArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
function nodeId(index) { return `N${String(index + 1).padStart(6, '0')}`; }
function elementId(index) { return `E${String(index + 1).padStart(6, '0')}`; }
function compareIdLists(left, right) {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return left.length - right.length;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
