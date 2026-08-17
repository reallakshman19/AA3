import { smoothInteriorPoints } from '../core/lafea-meshing/mesh-smoothing.js';
import {
  insertInteriorPoint,
  triangulateRefinedRegionAsIndexTriples,
} from '../core/lafea-meshing/interior-refinement-t6.js';
import { lawsonFlip } from '../core/lafea-meshing/constrained-delaunay-t6.js';
import { createLafeaAnalysisGeometry } from './lafea-analysis-geometry-contract.js';
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
  LAFEA_MESH_TOPOLOGY_REGION_ID,
  buildLafeaMeshTopology,
} from './lafea-mesh-geometry-topology-adapter.js';
import {
  LAFEA_SHELL_SURFACE_KINDS,
  shellMidsurfaceKind,
  shellMidsurfaceParameterGeometry,
  shellMidsurfacePoint3dAny,
  validateLafeaAnyShellMidsurfaceEvidence,
} from './lafea-shell-midsurface-dispatch.js';
import { cylindricalShellUvAtPoint3d } from './lafea-shell-curved-midsurface-contract.js';
import { curvedHoleShellUvAtPoint3d } from './lafea-shell-curved-hole-midsurface-contract.js';
import {
  buildLafea4ShellGradedTransitionPlan,
  lafea4ShellGradedSizeAt,
} from './lafea4-shell-graded-transition-plan.js';
import {
  LAFEA4_GRADED_REFINEMENT_CAPABILITY,
  LAFEA4_GRADED_REFINEMENT_PRODUCER_REF,
  LAFEA4_GRADED_REFINEMENT_QUALIFICATION,
  validateLafea4GradedRefinementCommand,
} from './lafea4-shell-graded-refinement-authority.js';

export const LAFEA4_GRADED_REFINEMENT_PLAN_SCHEMA =
  'lafea4-shell-graded-refinement-execution-plan/v1';
export const LAFEA4_GRADED_REFINEMENT_RESULT_SCHEMA =
  'lafea4-shell-graded-refinement-result/v1';
export const LAFEA4_GRADED_REFINEMENT_EXECUTION_POLICY = Object.freeze({
  executionScope: 'QUALIFICATION_HARNESS_ONLY',
  candidateBoundaryClearanceFactor: 0.20,
  candidatePointClearanceFactor: 0.20,
  smoothingRounds: 3,
  productionBindingAuthorized: false,
  releaseQualified: false,
});

const SHELL_TRI3 = 'CST_DKT_TRI3_THIN_SHELL_V1';
const ROW_HEIGHT = Math.sqrt(3) / 2;
const ALLOWED_SURFACES = new Set([
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL,
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_HOLES,
]);

export function planLafea4GradedShellRefinement(input) {
  const parent = validateLafeaAnalysisMeshEvidenceV2(input.parentEvidence);
  const midsurface = validateLafeaAnyShellMidsurfaceEvidence(input.midsurfaceEvidence);
  const profile = canonicalLafeaAnalysisMeshProfile(input.meshProfile);
  const command = validateLafea4GradedRefinementCommand(input.command);
  requireParents(parent, midsurface, profile, command);

  const surfaceKind = shellMidsurfaceKind(midsurface);
  if (!ALLOWED_SURFACES.has(surfaceKind)) {
    fail(surfaceKind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_PERIODIC
      ? 'LAFEA4_GRADED_REFINEMENT_PERIODIC_NOT_QUALIFIED'
      : 'LAFEA4_GRADED_REFINEMENT_SURFACE_NOT_QUALIFIED');
  }
  if (command.lengthUnit !== midsurface.geometry.lengthUnit) {
    fail('LAFEA4_GRADED_REFINEMENT_LENGTH_UNIT_MISMATCH');
  }
  if (!(command.targetElementLength < profile.fields.globalTargetSize)) {
    fail('LAFEA4_GRADED_REFINEMENT_TARGET_NOT_SMALLER_THAN_GLOBAL');
  }

  const capability = LAFEA4_GRADED_REFINEMENT_CAPABILITY;
  const qualification = LAFEA4_GRADED_REFINEMENT_QUALIFICATION;
  if (capability.executionScope !== 'QUALIFICATION_HARNESS_ONLY'
    || qualification.authorizedExecutionScope !== capability.executionScope
    || qualification.capabilityHash !== capability.capabilityHash
    || qualification.productionBindingAuthorized !== false
    || qualification.releaseQualified !== false) {
    fail('LAFEA4_GRADED_REFINEMENT_QUALIFICATION_AUTHORITY_INVALID');
  }

  const targets = targetUvs(parent.mesh, midsurface.geometry, surfaceKind, command);
  const parameterGeometry = shellMidsurfaceParameterGeometry(midsurface);
  const boundaryEdges = geometryBoundaryEdges(parameterGeometry);
  const transitionPlan = buildLafea4ShellGradedTransitionPlan({
    globalTargetElementLength: profile.fields.globalTargetSize,
    localTargetElementLength: command.targetElementLength,
    adjacentSizeRatioMax: profile.fields.adjacentSizeRatioMax,
    targets,
    boundaryEdges,
  });
  const subdivided = subdivideParameterGeometry(parameterGeometry, transitionPlan);
  const core = {
    schema: LAFEA4_GRADED_REFINEMENT_PLAN_SCHEMA,
    stageId: 'LAFEA.4',
    executionScope: capability.executionScope,
    productionBindingAuthorized: false,
    surfaceKind,
    parentMeshArtifactHash: parent.artifactHash,
    parentMeshHash: parent.meshHash,
    sourceHash: parent.sourceHash,
    analysisDomainHash: parent.analysisDomainHash,
    analysisGeometryHash: parent.analysisGeometryHash,
    midsurfaceEvidenceHash: midsurface.semanticHash,
    meshProfileHash: profile.semanticHash,
    commandHash: command.semanticHash,
    transitionPlanHash: transitionPlan.semanticHash,
    subdividedParameterGeometryHash: subdivided.geometry.semanticHash,
    elementFamily: SHELL_TRI3,
    targetElementLength: command.targetElementLength,
    globalTargetElementLength: profile.fields.globalTargetSize,
    adjacentSizeRatioMax: profile.fields.adjacentSizeRatioMax,
    targets,
    transitionLevelCount: transitionPlan.transitionLevelCount,
    transitionLevels: transitionPlan.levels,
    transitionInfluenceRadius: transitionPlan.influenceRadius,
    parentBoundarySegmentCount: parameterGeometry.segments.length,
    subdividedBoundarySegmentCount: subdivided.geometry.segments.length,
    boundaryLineage: subdivided.lineage,
    capabilityHash: capability.capabilityHash,
    qualificationHash: qualification.qualificationHash,
    producerId: capability.producerId,
    producerRevision: capability.producerRevision,
    producerRef: LAFEA4_GRADED_REFINEMENT_PRODUCER_REF,
    releaseQualified: false,
  };
  return freeze({
    ...core,
    transitionPlan,
    subdividedParameterGeometry: subdivided.geometry,
    planHash: canonicalLafeaSha256({
      schema: 'lafea4-shell-graded-refinement-execution-plan-hash-input/v1', plan: core,
    }),
  });
}

export function previewLafea4GradedShellRefinement(input) {
  const parent = validateLafeaAnalysisMeshEvidenceV2(input.parentEvidence);
  const midsurface = validateLafeaAnyShellMidsurfaceEvidence(input.midsurfaceEvidence);
  const profile = canonicalLafeaAnalysisMeshProfile(input.meshProfile);
  const command = validateLafea4GradedRefinementCommand(input.command);
  const plan = planLafea4GradedShellRefinement({
    parentEvidence: parent, midsurfaceEvidence: midsurface, meshProfile: profile, command,
  });

  const generated = generateUvMesh(plan);
  const shellMesh = mapUvMeshToShell(generated.uvMesh, midsurface.geometry, plan.producerRef);
  const maximumSurfaceRoundTripUvError = uvRoundTripError(
    generated.uvMesh, shellMesh, midsurface.geometry, plan.surfaceKind,
  );
  const estimatedDofs = estimateLafeaMeshDofs('LAFEA.4', shellMesh.nodes.length);
  const capability = LAFEA4_GRADED_REFINEMENT_CAPABILITY;
  if (shellMesh.nodes.length > capability.maximumNodes
    || shellMesh.elements.length > capability.maximumElements
    || estimatedDofs > capability.maximumEstimatedDofs) {
    fail('LAFEA4_GRADED_REFINEMENT_RESOURCE_LIMIT_EXCEEDED');
  }
  if (!generated.boundaryMatchesPlan) fail('LAFEA4_GRADED_REFINEMENT_BOUNDARY_MISMATCH');

  const meshHash = canonicalLafeaSha256({
    schema: 'lafea-analysis-mesh-content-hash-input/v1', mesh: shellMesh,
  });
  const evidence = createLafeaAnalysisMeshEvidenceV2({
    schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash: plan.sourceHash,
    analysisDomainHash: plan.analysisDomainHash,
    analysisGeometryHash: plan.analysisGeometryHash,
    meshProfile: profile,
    mesh: shellMesh,
    authority: {
      schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
      stageId: 'LAFEA.4',
      authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
      status: 'ACCEPTED_BY_STAGE_CONTRACT',
      producerRef: plan.producerRef,
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
    schema: LAFEA4_GRADED_REFINEMENT_RESULT_SCHEMA,
    executionScope: 'QUALIFICATION_HARNESS_ONLY',
    productionBindingAuthorized: false,
    plan,
    evidence,
    estimatedDofs,
    insertedGradedPointCount: generated.insertedGradedPointCount,
    expectedBoundaryEdgeCount: generated.expectedBoundaryEdgeCount,
    childBoundaryEdgeCount: generated.childBoundaryEdgeCount,
    boundaryMatchesPlan: generated.boundaryMatchesPlan,
    maximumSurfaceRoundTripUvError,
    releaseQualified: false,
  });
}

export function produceLafea4GradedShellRefinement(input) {
  const result = previewLafea4GradedShellRefinement(input);
  if (result.evidence.qualification !== 'PASS') {
    fail('LAFEA4_GRADED_REFINEMENT_CHILD_QUALITY_BLOCKED');
  }
  const adjacency = result.evidence.quality.gateResults
    .find((row) => row.metric === 'ADJACENT_SIZE_RATIO');
  if (!adjacency || adjacency.value > result.plan.adjacentSizeRatioMax + 64 * Number.EPSILON) {
    fail('LAFEA4_GRADED_REFINEMENT_ADJACENT_SIZE_GATE_FAILED');
  }
  return result;
}

function generateUvMesh(plan) {
  const adapter = buildLafeaMeshTopology(plan.subdividedParameterGeometry);
  const base = triangulateRefinedRegionAsIndexTriples(
    adapter.topology,
    LAFEA_MESH_TOPOLOGY_REGION_ID,
    {
      targetSize: plan.globalTargetElementLength,
      chordErrorLimit: Math.max(1e-9, plan.globalTargetElementLength * 1e-6),
      adjacentSizeRatioMax: plan.adjacentSizeRatioMax,
    },
  );
  const points = base.points.map((point) => ({ x: point.x, y: point.y }));
  let triangles = base.triangleTriples.map((row) => [...row]);
  const constraints = new Set(base.boundaryEdgeKeys);
  const fixed = new Set(base.boundaryRings.flatMap((ring) => ring.globalIndices));
  const candidates = gradedCandidates(plan.transitionPlan);
  let insertedGradedPointCount = 0;
  for (const candidate of candidates) {
    const desired = lafea4ShellGradedSizeAt(plan.transitionPlan, candidate.x, candidate.y);
    if (!farFromBoundary(candidate, points, constraints,
      desired * LAFEA4_GRADED_REFINEMENT_EXECUTION_POLICY.candidateBoundaryClearanceFactor)) continue;
    if (!farFromPoints(candidate, points,
      desired * LAFEA4_GRADED_REFINEMENT_EXECUTION_POLICY.candidatePointClearanceFactor)) continue;
    if (insertInteriorPoint(points, triangles, constraints, candidate)) insertedGradedPointCount += 1;
  }
  if (!insertedGradedPointCount) fail('LAFEA4_GRADED_REFINEMENT_NO_GRADED_POINTS_INSERTED');
  triangles = lawsonFlip(points, triangles, constraints);
  for (let round = 0; round < LAFEA4_GRADED_REFINEMENT_EXECUTION_POLICY.smoothingRounds; round += 1) {
    const working = triangles.map((row) => [...row]);
    smoothInteriorPoints(points, working, fixed);
    triangles = lawsonFlip(points, working, constraints);
  }
  const uvMesh = weldUvMesh(points, triangles, plan.producerRevision);
  const expectedBoundary = geometryBoundarySignature(plan.subdividedParameterGeometry);
  const childBoundary = uvMeshBoundarySignature(uvMesh);
  return freeze({
    uvMesh,
    insertedGradedPointCount,
    expectedBoundaryEdgeCount: expectedBoundary.length,
    childBoundaryEdgeCount: childBoundary.length,
    boundaryMatchesPlan: sameStrings(expectedBoundary, childBoundary),
  });
}

function gradedCandidates(transitionPlan) {
  const candidates = new Map();
  for (const band of transitionPlan.bands) {
    const spacing = band.targetElementLength;
    const rowHeight = spacing * ROW_HEIGHT;
    for (const target of transitionPlan.targets) {
      const rowLimit = Math.ceil(band.outerRadius / rowHeight) + 1;
      const colLimit = Math.ceil(band.outerRadius / spacing) + 1;
      for (let row = -rowLimit; row <= rowLimit; row += 1) {
        const y = target.v + row * rowHeight;
        const offset = Math.abs(row) % 2 ? spacing / 2 : 0;
        for (let col = -colLimit; col <= colLimit; col += 1) {
          const x = target.u + col * spacing + offset;
          const distance = nearestTargetDistance(x, y, transitionPlan.targets);
          if (distance > band.outerRadius + 1e-12) continue;
          if (band.bandIndex > 0 && distance <= band.innerRadius + 1e-12) continue;
          const desired = lafea4ShellGradedSizeAt(transitionPlan, x, y);
          if (Math.abs(desired - spacing) > 1e-12 * Math.max(1, spacing)) continue;
          const key = `${x},${y}`;
          if (!candidates.has(key)) candidates.set(key, { x, y, desired });
        }
      }
    }
  }
  return [...candidates.values()].sort((a, b) => a.desired - b.desired || a.y - b.y || a.x - b.x);
}

function subdivideParameterGeometry(geometry, transitionPlan) {
  const vertexById = new Map(geometry.vertices.map((row) => [row.vertexId, row]));
  const splitBySegment = new Map(
    transitionPlan.boundarySubdivisions.map((row) => [row.parentBoundaryEdgeId, row]),
  );
  const vertices = geometry.vertices.map((row) => ({ vertexId: row.vertexId, x: row.x, y: row.y }));
  const segments = [];
  const replacement = new Map();
  const lineage = [];

  for (const segment of geometry.segments) {
    if (segment.type !== 'LINE') fail('LAFEA4_GRADED_REFINEMENT_PARAMETER_SEGMENT_NOT_LINE');
    const split = splitBySegment.get(segment.segmentId);
    if (!split) fail('LAFEA4_GRADED_REFINEMENT_BOUNDARY_PLAN_SEGMENT_MISSING');
    const start = vertexById.get(segment.startVertexId);
    const end = vertexById.get(segment.endVertexId);
    const fractions = [0, ...split.splitFractions, 1];
    const ids = [segment.startVertexId];
    for (let index = 1; index < fractions.length - 1; index += 1) {
      const fraction = fractions[index];
      const vertexId = `${segment.segmentId}:SUBV:${String(index).padStart(3, '0')}`;
      vertices.push({
        vertexId,
        x: start.x + fraction * (end.x - start.x),
        y: start.y + fraction * (end.y - start.y),
      });
      ids.push(vertexId);
    }
    ids.push(segment.endVertexId);
    const childIds = [];
    for (let index = 0; index < ids.length - 1; index += 1) {
      const segmentId = `${segment.segmentId}:SUBS:${String(index + 1).padStart(3, '0')}`;
      childIds.push(segmentId);
      segments.push({
        segmentId,
        type: 'LINE',
        startVertexId: ids[index],
        endVertexId: ids[index + 1],
      });
    }
    replacement.set(segment.segmentId, childIds);
    lineage.push(Object.freeze({
      parentBoundaryEdgeId: segment.segmentId,
      childSegmentIds: Object.freeze(childIds),
      splitFractions: split.splitFractions,
      role: split.role,
    }));
  }
  const loops = geometry.loops.map((loop) => ({
    loopId: loop.loopId,
    role: loop.role,
    segmentIds: loop.segmentIds.flatMap((segmentId) => replacement.get(segmentId)),
  }));
  const rebuilt = createLafeaAnalysisGeometry({
    schema: geometry.schema,
    stageId: geometry.stageId,
    geometryId: `${geometry.geometryId}:TECH7_GRADED_BOUNDARY`,
    coordinateSystemId: geometry.coordinateSystemId,
    lengthUnit: geometry.lengthUnit,
    orientationPolicy: geometry.orientationPolicy,
    vertices,
    segments,
    loops,
  });
  return freeze({ geometry: rebuilt, lineage: Object.freeze(lineage) });
}

function geometryBoundaryEdges(geometry) {
  const vertexById = new Map(geometry.vertices.map((row) => [row.vertexId, row]));
  const roleBySegment = new Map();
  geometry.loops.forEach((loop) => loop.segmentIds.forEach((id) => roleBySegment.set(id, loop.role)));
  return geometry.segments.map((segment) => {
    if (segment.type !== 'LINE') fail('LAFEA4_GRADED_REFINEMENT_PARAMETER_SEGMENT_NOT_LINE');
    const a = vertexById.get(segment.startVertexId);
    const b = vertexById.get(segment.endVertexId);
    return Object.freeze({
      parentBoundaryEdgeId: segment.segmentId,
      role: roleBySegment.get(segment.segmentId),
      start: { u: a.x, v: a.y },
      end: { u: b.x, v: b.y },
    });
  });
}

function targetUvs(mesh, geometry, surfaceKind, command) {
  const nodeById = new Map(mesh.nodes.map((row) => [row.nodeId, row]));
  const uvById = new Map(mesh.nodes.map((node) => [node.nodeId, uvAt(geometry, surfaceKind, node)]));
  const elementById = new Map(mesh.elements.map((row) => [row.elementId, row]));
  return Object.freeze(command.targetIds.map((targetId) => {
    if (command.targetType === 'NODE') {
      if (!nodeById.has(targetId)) fail('LAFEA4_GRADED_REFINEMENT_TARGET_NODE_NOT_FOUND');
      const uv = uvById.get(targetId);
      return Object.freeze({ targetId, u: uv.u, v: uv.v });
    }
    const element = elementById.get(targetId);
    if (!element) fail('LAFEA4_GRADED_REFINEMENT_TARGET_ELEMENT_NOT_FOUND');
    const rows = element.nodeIds.slice(0, 3).map((id) => uvById.get(id));
    return Object.freeze({
      targetId,
      u: rows.reduce((sum, row) => sum + row.u, 0) / 3,
      v: rows.reduce((sum, row) => sum + row.v, 0) / 3,
    });
  }));
}

function weldUvMesh(points, triangles, revision) {
  const used = new Set(triangles.flat());
  const ordered = [...used].map((index) => ({ index, u: points[index].x, v: points[index].y }))
    .sort((a, b) => a.u - b.u || a.v - b.v);
  const idByIndex = new Map(ordered.map((row, index) => [row.index, nodeId(index)]));
  const nodes = ordered.map((row, index) => ({ nodeId: nodeId(index), u: row.u, v: row.v }));
  const elements = triangles
    .map((triangle) => ({ nodeIds: triangle.map((index) => idByIndex.get(index)) }))
    .sort((a, b) => compareIds(a.nodeIds, b.nodeIds))
    .map((row, index) => ({ elementId: elementId(index), nodeIds: row.nodeIds }));
  return freeze({
    schema: 'lafea4-graded-uv-mesh/v1',
    meshIdentity: `${LAFEA4_GRADED_REFINEMENT_PRODUCER_REF}:${revision}`,
    nodes,
    elements,
  });
}

function mapUvMeshToShell(uvMesh, geometry, producerRef) {
  return freeze({
    schema: 'lafea-analysis-mesh/v1',
    meshIdentity: `${producerRef}:EXACT_MIDSURFACE`,
    nodes: uvMesh.nodes.map((row) => ({
      nodeId: row.nodeId,
      ...shellMidsurfacePoint3dAny(geometry, row.u, row.v),
    })),
    elements: uvMesh.elements.map((row) => ({
      elementId: row.elementId,
      elementType: SHELL_TRI3,
      nodeIds: [...row.nodeIds],
    })),
  });
}

function geometryBoundarySignature(geometry) {
  const vertices = new Map(geometry.vertices.map((row) => [row.vertexId, row]));
  return geometry.segments.map((segment) => {
    const a = vertices.get(segment.startVertexId);
    const b = vertices.get(segment.endVertexId);
    return coordinateEdgeKey(a.x, a.y, b.x, b.y);
  }).sort();
}
function uvMeshBoundarySignature(mesh) {
  const nodeById = new Map(mesh.nodes.map((row) => [row.nodeId, row]));
  const owners = new Map();
  mesh.elements.forEach((element) => {
    for (let index = 0; index < 3; index += 1) {
      const a = element.nodeIds[index]; const b = element.nodeIds[(index + 1) % 3];
      const key = a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
      owners.set(key, (owners.get(key) ?? 0) + 1);
    }
  });
  if ([...owners.values()].some((count) => count > 2)) fail('LAFEA4_GRADED_REFINEMENT_NON_MANIFOLD');
  return [...owners.entries()].filter(([, count]) => count === 1).map(([key]) => {
    const [aId, bId] = key.split('\u0000');
    const a = nodeById.get(aId); const b = nodeById.get(bId);
    return coordinateEdgeKey(a.u, a.v, b.u, b.v);
  }).sort();
}
function uvRoundTripError(uvMesh, shellMesh, geometry, surfaceKind) {
  const intended = new Map(uvMesh.nodes.map((row) => [row.nodeId, row]));
  let maximum = 0;
  shellMesh.nodes.forEach((node) => {
    const uv = uvAt(geometry, surfaceKind, node);
    const target = intended.get(node.nodeId);
    maximum = Math.max(maximum, Math.hypot(uv.u - target.u, uv.v - target.v));
  });
  return maximum;
}
function farFromBoundary(point, points, constraints, clearance) {
  for (const key of constraints) {
    const [a, b] = key.split(':').map(Number);
    if (pointSegmentDistance(point, points[a], points[b]) < clearance) return false;
  }
  return true;
}
function farFromPoints(point, points, clearance) {
  return points.every((row) => Math.hypot(point.x - row.x, point.y - row.y) >= clearance);
}
function pointSegmentDistance(p, a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y; const l2 = dx * dx + dy * dy;
  if (!l2) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
function uvAt(geometry, surfaceKind, point) {
  if (surfaceKind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL) {
    return cylindricalShellUvAtPoint3d(geometry, point);
  }
  if (surfaceKind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_HOLES) {
    return curvedHoleShellUvAtPoint3d(geometry, point);
  }
  fail('LAFEA4_GRADED_REFINEMENT_SURFACE_NOT_QUALIFIED');
}
function requireParents(parent, midsurface, profile, command) {
  if (parent.stageId !== 'LAFEA.4' || midsurface.stageId !== 'LAFEA.4') {
    fail('LAFEA4_GRADED_REFINEMENT_STAGE_INVALID');
  }
  if (parent.qualification !== 'PASS') fail('LAFEA4_GRADED_REFINEMENT_PARENT_QUALITY_BLOCKED');
  if (parent.meshProfileHash !== profile.semanticHash) fail('LAFEA4_GRADED_REFINEMENT_PROFILE_MISMATCH');
  if (parent.mesh.elements.some((row) => row.elementType !== SHELL_TRI3)
    || profile.fields.shellElement !== SHELL_TRI3) {
    fail('LAFEA4_GRADED_REFINEMENT_ELEMENT_FAMILY_MISMATCH');
  }
  if (parent.sourceHash !== midsurface.sourceHash
    || parent.analysisDomainHash !== midsurface.analysisDomainHash
    || parent.analysisGeometryHash !== midsurface.analysisGeometryHash) {
    fail('LAFEA4_GRADED_REFINEMENT_PARENT_GEOMETRY_STALE');
  }
  if (command.parentMeshArtifactHash !== parent.artifactHash
    || command.parentMeshHash !== parent.meshHash) {
    fail('LAFEA4_GRADED_REFINEMENT_PARENT_MESH_STALE');
  }
  if (!command.executionAuthorized || command.productionBindingAuthorized) {
    fail('LAFEA4_GRADED_REFINEMENT_COMMAND_AUTHORITY_INVALID');
  }
}
function nearestTargetDistance(x, y, targets) {
  return Math.min(...targets.map((row) => Math.hypot(x - row.u, y - row.v)));
}
function coordinateEdgeKey(ax, ay, bx, by) {
  const a = `${ax},${ay}`; const b = `${bx},${by}`;
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}
function sameStrings(a, b) { return a.length === b.length && a.every((value, index) => value === b[index]); }
function nodeId(index) { return `N${String(index + 1).padStart(6, '0')}`; }
function elementId(index) { return `E${String(index + 1).padStart(6, '0')}`; }
function compareIds(a, b) {
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return a.length - b.length;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
