import { smoothInteriorPoints } from '../core/lafea-meshing/mesh-smoothing.js';
import { edgeKey, lawsonFlip, upgradeToT6 } from '../core/lafea-meshing/constrained-delaunay-t6.js';
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
import {
  LAFEA_MESH_PRODUCER_OUTPUT_V2_SCHEMA,
  createLafeaMeshProducerOutputV2,
} from './lafea-mesh-producer-v2-contracts.js';
import {
  LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA,
  createLafeaRetainedMeshRefinementCommand,
} from './lafea-mesh-refinement-command.js';
import { estimateLafeaMeshDofs } from './lafea-mesh-dof-policy.js';
import {
  lafeaCoreMeshProducerCapability,
  lafeaCoreMeshProducerQualification,
} from './lafea-mesh-producer-binding.js';
import { LAFEA_MESH_PRODUCER_REF } from './lafea-mesh-producer-registry.js';

export const LAFEA_RETAINED_MESH_REFINEMENT_PLAN_SCHEMA =
  'lafea-retained-mesh-refinement-plan/v1';
export const LAFEA_RETAINED_MESH_REFINEMENT_RESULT_SCHEMA =
  'lafea-retained-mesh-refinement-result/v1';
export const LAFEA_RETAINED_MESH_REFINEMENT_POLICY = Object.freeze({
  minimumTargetRatio: 0.25,
  influenceRadiusGlobalFactor: 2,
  boundaryClearanceLocalFactor: 0.30,
  pointClearanceLocalFactor: 0.18,
  maximumTargets: 64,
});

const ROW_HEIGHT_FACTOR = Math.sqrt(3) / 2;

/**
 * Build an auditable refinement plan against one exact retained v2 mesh.
 * Parent canonical NODE/ELEMENT IDs are resolved to coordinates before the
 * plan is hashed, so replay cannot silently retarget a later mesh revision.
 */
export function planLafeaRetainedMeshRefinement({
  stage, meshProfile: meshProfileValue, parentEvidence: parentValue, command: commandValue,
}) {
  const parentEvidence = validateLafeaAnalysisMeshEvidenceV2(parentValue);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(meshProfileValue);
  const command = requireCommand(commandValue);
  requireCurrentParents(stage, parentEvidence, meshProfile);

  if (command.stageId !== 'LAFEA.3' || parentEvidence.stageId !== 'LAFEA.3') {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_STAGE_NOT_QUALIFIED');
  }
  if (command.parentMeshArtifactHash !== parentEvidence.artifactHash
    || command.parentMeshHash !== parentEvidence.meshHash) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_PARENT_MESH_STALE');
  }
  if (!command.executionAuthorized) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_NOT_AUTHORIZED');
  }

  const elementFamily = meshProfile.fields.continuumElement;
  if (!['T3', 'T6'].includes(elementFamily)) {
    fail(elementFamily === 'Q8'
      ? 'LAFEA_RETAINED_MESH_REFINEMENT_Q8_NOT_QUALIFIED'
      : 'LAFEA_RETAINED_MESH_REFINEMENT_ELEMENT_FAMILY_NOT_QUALIFIED');
  }
  if (parentEvidence.mesh.elements.some((row) => row.elementType !== elementFamily)) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_PARENT_FAMILY_MISMATCH');
  }

  const globalTargetElementLength = meshProfile.fields.globalTargetSize;
  if (!(command.targetElementLength < globalTargetElementLength)) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_TARGET_MUST_BE_SMALLER_THAN_GLOBAL');
  }
  if (command.targetElementLength
      < globalTargetElementLength * LAFEA_RETAINED_MESH_REFINEMENT_POLICY.minimumTargetRatio) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_TARGET_RATIO_BELOW_QUALIFIED_LIMIT');
  }

  const targets = resolveTargets(parentEvidence.mesh, command.targetType, command.targetIds);
  const influenceRadius = Math.max(
    globalTargetElementLength * LAFEA_RETAINED_MESH_REFINEMENT_POLICY.influenceRadiusGlobalFactor,
    command.targetElementLength * 3,
  );
  const capability = lafeaCoreMeshProducerCapability();
  const qualification = lafeaCoreMeshProducerQualification();
  if (!capability.supportsLocalRefinement
    || !capability.generationModes.includes('REFINEMENT_REGENERATION')
    || !qualification.localRefinementAuthorized
    || !qualification.authorizedGenerationModes.includes('REFINEMENT_REGENERATION')) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_PRODUCER_NOT_QUALIFIED');
  }

  const base = {
    schema: LAFEA_RETAINED_MESH_REFINEMENT_PLAN_SCHEMA,
    stageId: 'LAFEA.3',
    generationMode: 'REFINEMENT_REGENERATION',
    parentMeshArtifactHash: parentEvidence.artifactHash,
    parentMeshHash: parentEvidence.meshHash,
    parentPlanHash: parentEvidence.authority.planHash,
    sourceHash: parentEvidence.sourceHash,
    analysisDomainHash: parentEvidence.analysisDomainHash,
    analysisGeometryHash: parentEvidence.analysisGeometryHash,
    meshProfileHash: meshProfile.semanticHash,
    elementFamily,
    commandHash: command.semanticHash,
    refinementKind: command.kind,
    targetType: command.targetType,
    targetIds: [...command.targetIds],
    targetElementLength: command.targetElementLength,
    globalTargetElementLength,
    influenceRadius,
    targets,
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
      schema: 'lafea-retained-mesh-refinement-plan-hash-input/v1', plan: base,
    }),
  });
}

/** Preview a child mesh/evidence without mutating workbench custody. */
export function previewLafeaRetainedMeshRefinement(input) {
  const parentEvidence = validateLafeaAnalysisMeshEvidenceV2(input.parentEvidence);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(input.meshProfile);
  const command = requireCommand(input.command);
  const plan = planLafeaRetainedMeshRefinement({
    stage: input.stage, meshProfile, parentEvidence, command,
  });
  const generated = refineParentMesh(parentEvidence.mesh, plan);
  const capability = lafeaCoreMeshProducerCapability();
  const qualification = lafeaCoreMeshProducerQualification();
  const estimatedDofs = estimateLafeaMeshDofs('LAFEA.3', generated.mesh.nodes.length);
  if (generated.mesh.nodes.length > capability.maximumNodes
    || generated.mesh.elements.length > capability.maximumElements
    || estimatedDofs > capability.maximumEstimatedDofs) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_RESOURCE_LIMIT_EXCEEDED');
  }

  const output = createLafeaMeshProducerOutputV2({
    schema: LAFEA_MESH_PRODUCER_OUTPUT_V2_SCHEMA,
    stageId: 'LAFEA.3',
    intentHash: command.semanticHash,
    planHash: plan.planHash,
    capabilityHash: capability.capabilityHash,
    qualificationHash: qualification.qualificationHash,
    producerId: capability.producerId,
    producerRevision: capability.producerRevision,
    sourceHash: plan.sourceHash,
    analysisDomainHash: plan.analysisDomainHash,
    analysisGeometryHash: plan.analysisGeometryHash,
    meshProfileHash: plan.meshProfileHash,
    elementFamily: plan.elementFamily,
    mesh: generated.mesh,
  });
  const evidence = createLafeaAnalysisMeshEvidenceV2({
    schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
    stageId: 'LAFEA.3',
    sourceHash: output.sourceHash,
    analysisDomainHash: output.analysisDomainHash,
    analysisGeometryHash: output.analysisGeometryHash,
    meshProfile,
    mesh: output.mesh,
    authority: {
      schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
      stageId: 'LAFEA.3',
      authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
      status: 'ACCEPTED_BY_STAGE_CONTRACT',
      producerRef: LAFEA_MESH_PRODUCER_REF,
      sourceHash: output.sourceHash,
      analysisDomainHash: output.analysisDomainHash,
      analysisGeometryHash: output.analysisGeometryHash,
      meshProfileHash: output.meshProfileHash,
      meshHash: output.meshHash,
      capabilityHash: output.capabilityHash,
      qualificationHash: output.qualificationHash,
      planHash: output.planHash,
    },
  });
  return freeze({
    schema: LAFEA_RETAINED_MESH_REFINEMENT_RESULT_SCHEMA,
    plan,
    output,
    evidence,
    parentEvidenceHash: parentEvidence.artifactHash,
    localPointCount: generated.localPointCount,
    estimatedDofs,
    changed: evidence.meshHash !== parentEvidence.meshHash,
    qualification: evidence.qualification,
  });
}

/** Produce a custody-eligible child. BLOCK evidence is never returned as accepted. */
export function produceLafeaRetainedMeshRefinement(input) {
  const result = previewLafeaRetainedMeshRefinement(input);
  if (!result.changed) fail('LAFEA_RETAINED_MESH_REFINEMENT_NO_MESH_CHANGE');
  if (result.qualification !== 'PASS') {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_QUALITY_BLOCKED');
  }
  return result;
}

/** Fixed round count keeps the refined child deterministic. */
const REFINEMENT_SMOOTHING_ROUNDS = 3;

function refineParentMesh(parentMesh, plan) {
  const triangulation = parentTriangulation(parentMesh, plan.elementFamily);
  const points = triangulation.points.map((point) => ({ ...point }));
  const triangles = triangulation.triangles.map((row) => [...row]);
  const constraints = new Set(triangulation.boundaryEdgeKeys);
  const candidates = localCandidates(plan.targets, plan.targetElementLength, plan.influenceRadius);
  let localPointCount = 0;
  for (const candidate of candidates) {
    if (!farFromBoundary(candidate, points, constraints,
      plan.targetElementLength * LAFEA_RETAINED_MESH_REFINEMENT_POLICY.boundaryClearanceLocalFactor)) {
      continue;
    }
    if (!farFromPoints(candidate, points,
      plan.targetElementLength * LAFEA_RETAINED_MESH_REFINEMENT_POLICY.pointClearanceLocalFactor)) {
      continue;
    }
    if (insertInteriorPoint(points, triangles, constraints, candidate)) localPointCount += 1;
  }
  if (!localPointCount) fail('LAFEA_RETAINED_MESH_REFINEMENT_NO_LOCAL_POINTS_INSERTED');
  let restored = lawsonFlip(points, triangles, constraints);

  // Local insertion leaves a size transition between the refined patch and the
  // surrounding parent elements. Relax it with the same quality-guarded
  // smoothing the global refinement uses, pinning every node on a constrained
  // edge so the retained boundary and the parent's own geometry cannot move.
  const fixedIndices = new Set();
  for (const key of constraints) {
    const [left, right] = key.split(':').map(Number);
    fixedIndices.add(left);
    fixedIndices.add(right);
  }
  for (let round = 0; round < REFINEMENT_SMOOTHING_ROUNDS; round += 1) {
    const working = restored.map((triangle) => [...triangle]);
    smoothInteriorPoints(points, working, fixedIndices);
    restored = lawsonFlip(points, working, constraints);
  }
  const coreElements = plan.elementFamily === 'T6'
    ? upgradeToT6(points, [], restored, triangulation.boundaryMidpoints)
    : restored.map((triple, elementIndex) => freeze({
      elementIndex,
      elementType: 'T3',
      nodes: freeze(triple.map((index) => ({ x: points[index].x, y: points[index].y }))),
    }));
  return freeze({
    mesh: weld(coreElements, plan.elementFamily, plan.producerRevision),
    localPointCount,
  });
}

function parentTriangulation(mesh, family) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const cornerIds = [...new Set(mesh.elements.flatMap((element) => element.nodeIds.slice(0, 3)))].sort();
  const pointIndexById = new Map(cornerIds.map((id, index) => [id, index]));
  const points = cornerIds.map((id) => {
    const node = nodeById.get(id);
    if (!node || node.z !== 0) fail('LAFEA_RETAINED_MESH_REFINEMENT_PARENT_NOT_PLANAR_XY');
    return { x: node.x, y: node.y };
  });
  const triangles = [];
  const edgeOwners = new Map();
  const midsides = new Map();
  for (const element of mesh.elements) {
    if (element.elementType !== family) fail('LAFEA_RETAINED_MESH_REFINEMENT_PARENT_FAMILY_MISMATCH');
    const corner = element.nodeIds.slice(0, 3).map((id) => pointIndexById.get(id));
    if (corner.some((index) => index === undefined)) fail('LAFEA_RETAINED_MESH_REFINEMENT_PARENT_CONNECTIVITY_INVALID');
    const original = [...corner];
    normalizeTriangle(corner, points);
    triangles.push(corner);
    for (let edge = 0; edge < 3; edge += 1) {
      const a = original[edge]; const b = original[(edge + 1) % 3];
      const key = edgeKey(a, b);
      edgeOwners.set(key, (edgeOwners.get(key) ?? 0) + 1);
      if (family === 'T6') {
        const mid = nodeById.get(element.nodeIds[3 + edge]);
        if (!mid) fail('LAFEA_RETAINED_MESH_REFINEMENT_PARENT_MIDSIDE_INVALID');
        midsides.set(key, { x: mid.x, y: mid.y });
      }
    }
  }
  const boundaryEdgeKeys = new Set(
    [...edgeOwners.entries()].filter(([, owners]) => owners === 1).map(([key]) => key),
  );
  if ([...edgeOwners.values()].some((owners) => owners > 2)) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_PARENT_NON_MANIFOLD');
  }
  const boundaryMidpoints = new Map();
  if (family === 'T6') {
    for (const key of boundaryEdgeKeys) {
      const mid = midsides.get(key);
      boundaryMidpoints.set(key, {
        curveId: null,
        midPoint: { point: { x: mid.x, y: mid.y } },
      });
    }
  }
  return { points, triangles, boundaryEdgeKeys, boundaryMidpoints };
}

function resolveTargets(mesh, targetType, ids) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const elementById = new Map(mesh.elements.map((element) => [element.elementId, element]));
  return freeze(ids.map((targetId) => {
    if (targetType === 'NODE') {
      const node = nodeById.get(targetId);
      if (!node) fail('LAFEA_RETAINED_MESH_REFINEMENT_TARGET_NODE_NOT_FOUND');
      return freeze({ targetId, targetType, x: node.x, y: node.y, z: node.z });
    }
    const element = elementById.get(targetId);
    if (!element) fail('LAFEA_RETAINED_MESH_REFINEMENT_TARGET_ELEMENT_NOT_FOUND');
    const corners = element.nodeIds.slice(0, 3).map((id) => nodeById.get(id));
    if (corners.some((node) => !node)) fail('LAFEA_RETAINED_MESH_REFINEMENT_TARGET_CONNECTIVITY_INVALID');
    return freeze({
      targetId,
      targetType,
      x: corners.reduce((sum, node) => sum + node.x, 0) / 3,
      y: corners.reduce((sum, node) => sum + node.y, 0) / 3,
      z: corners.reduce((sum, node) => sum + node.z, 0) / 3,
    });
  }));
}

function localCandidates(targets, spacing, radius) {
  const rows = Math.ceil(radius / (spacing * ROW_HEIGHT_FACTOR));
  const columns = Math.ceil(radius / spacing) + 1;
  const candidates = new Map();
  for (const target of [...targets].sort((a, b) => a.targetId.localeCompare(b.targetId))) {
    for (let row = -rows; row <= rows; row += 1) {
      const y = target.y + row * spacing * ROW_HEIGHT_FACTOR;
      const xOffset = Math.abs(row) % 2 ? spacing / 2 : 0;
      for (let column = -columns; column <= columns; column += 1) {
        const x = target.x + column * spacing + xOffset;
        if (Math.hypot(x - target.x, y - target.y) > radius + 1e-12) continue;
        const key = `${x},${y}`;
        if (!candidates.has(key)) candidates.set(key, { x, y });
      }
    }
  }
  return [...candidates.values()].sort((a, b) => a.y - b.y || a.x - b.x);
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
  const dx = b.x - a.x; const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  if (!length2) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1,
    ((point.x - a.x) * dx + (point.y - a.y) * dy) / length2));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function normalizeTriangle(triangle, points) {
  const [a, b, c] = triangle.map((index) => points[index]);
  const twiceArea = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  if (!(Math.abs(twiceArea) > 1e-12)) fail('LAFEA_RETAINED_MESH_REFINEMENT_PARENT_DEGENERATE_ELEMENT');
  if (twiceArea < 0) [triangle[1], triangle[2]] = [triangle[2], triangle[1]];
}

function weld(coreElements, family, revision) {
  const nodeIndexByKey = new Map();
  const welded = [];
  const elementNodeKeys = coreElements.map((element) => element.nodes.map((node) => {
    const key = `${node.x},${node.y}`;
    if (!nodeIndexByKey.has(key)) {
      nodeIndexByKey.set(key, welded.length);
      welded.push({ key, x: node.x, y: node.y });
    }
    return key;
  }));
  const ordered = [...welded].sort((a, b) => a.x - b.x || a.y - b.y);
  const nodeIdByKey = new Map(ordered.map((node, index) => [node.key, nodeId(index)]));
  const nodes = ordered.map((node) => ({
    nodeId: nodeIdByKey.get(node.key), x: node.x, y: node.y, z: 0,
  }));
  const elements = elementNodeKeys
    .map((keys) => ({ elementType: family, nodeIds: keys.map((key) => nodeIdByKey.get(key)) }))
    .sort((a, b) => compareIdLists(a.nodeIds, b.nodeIds))
    .map((row, index) => ({ elementId: elementId(index), ...row }));
  return freeze({
    schema: 'lafea-analysis-mesh/v1',
    meshIdentity: `LAFEA_CORE_MESHER:${revision}:LOCAL_REFINEMENT:${family}`,
    nodes,
    elements,
  });
}

function requireCurrentParents(stage, parentEvidence, meshProfile) {
  if (parentEvidence.qualification !== 'PASS') fail('LAFEA_RETAINED_MESH_REFINEMENT_PARENT_QUALITY_BLOCKED');
  if (parentEvidence.meshProfileHash !== meshProfile.semanticHash) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_PROFILE_MISMATCH');
  }
  const sourceHash = stage?.sourceAuthority?.sourceHash ?? stage?.lifecycle?.source?.sourceHash ?? null;
  if (!sourceHash || parentEvidence.sourceHash !== sourceHash) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_SOURCE_STALE');
  }
  if (stage?.analysisDomainProjection?.state !== 'CURRENT_PASS'
    || parentEvidence.analysisDomainHash !== stage.analysisDomainProjection.analysisDomainHash) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_DOMAIN_STALE');
  }
  if (stage?.analysisGeometryProjection?.state !== 'CURRENT_PASS'
    || parentEvidence.analysisGeometryHash !== stage.analysisGeometryProjection.analysisGeometryHash) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_GEOMETRY_STALE');
  }
}

function requireCommand(value) {
  if (!value || value.schema !== LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_REQUIRED');
  }
  const { semanticHash, status, executionAuthorized, rollbackPolicy, ...input } = value;
  const rebuilt = createLafeaRetainedMeshRefinementCommand(input);
  if (rebuilt.semanticHash !== semanticHash
    || rebuilt.status !== status
    || rebuilt.executionAuthorized !== executionAuthorized
    || rebuilt.rollbackPolicy !== rollbackPolicy) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_TAMPERED');
  }
  return rebuilt;
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
