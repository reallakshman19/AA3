import { createLafeaAnalysisGeometry } from './lafea-analysis-geometry-contract.js';
import {
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
  LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  createLafeaAnalysisMeshEvidenceV2,
} from './lafea-analysis-mesh-evidence-v2.js';
import { canonicalLafeaAnalysisMeshProfile } from './lafea-analysis-mesh-contract.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { estimateLafeaMeshDofs } from './lafea-mesh-dof-policy.js';
import { buildLafeaMeshTopology } from './lafea-mesh-geometry-topology-adapter.js';
import { generateLafeaAnalysisMesh } from './lafea-mesh-producer-engine.js';
import {
  LAFEA_MESH_PRODUCER_MAXIMUM_ELEMENTS,
  LAFEA_MESH_PRODUCER_MAXIMUM_ESTIMATED_DOFS,
  LAFEA_MESH_PRODUCER_MAXIMUM_NODES,
  LAFEA_MESH_PRODUCER_REF,
  lafeaMeshProducerBound,
} from './lafea-mesh-producer-registry.js';
import {
  lafeaCoreMeshProducerCapability,
  lafeaCoreMeshProducerQualification,
} from './lafea-mesh-producer-binding.js';
import {
  multiPatchShellPoint3d,
  validateLafeaMultiPatchShellMidsurfaceEvidence,
} from './lafea-shell-multipatch-midsurface-contract.js';

export const LAFEA_SHELL_MULTIPATCH_MESH_PLAN_SCHEMA = 'lafea-shell-multipatch-mesh-plan/v1';
export const LAFEA_SHELL_MULTIPATCH_MESH_OUTPUT_SCHEMA = 'lafea-shell-multipatch-mesh-output/v1';
export const LAFEA_SHELL_MULTIPATCH_MESH_SCOPE =
  'PLANAR_TWO_RECTANGULAR_PATCHES_CONFORMING_FULL_EDGE_SEAM_CST_DKT_TRI3_V1';
export const LAFEA_SHELL_MULTIPATCH_MESH_STRATEGY =
  'PATCHWISE_TRIANGULATION_CANONICAL_CONFORMING_SEAM_WELD';
export const LAFEA_SHELL_MULTIPATCH_ELEMENT = 'CST_DKT_TRI3_THIN_SHELL_V1';
const EPS = 1e-9;

export function planLafeaMultiPatchShellAnalysisMesh({
  midsurfaceEvidence: evidenceValue,
  meshProfile: profileValue,
}) {
  const evidence = validateLafeaMultiPatchShellMidsurfaceEvidence(evidenceValue);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(profileValue);
  const stageId = evidence.stageId;
  requireProfile(meshProfile);
  requireBinding(stageId);
  const capability = lafeaCoreMeshProducerCapability();
  const qualification = lafeaCoreMeshProducerQualification();
  const geometry = evidence.geometry;
  const patchRows = geometry.patches.map((patch) => {
    const generated = generateLafeaAnalysisMesh(
      buildLafeaMeshTopology(toAnalysisGeometry(patch.geometry)),
      {
        targetElementLength: meshProfile.fields.globalTargetSize,
        curvatureToleranceDegrees: 15,
        elementFamily: 'T3',
      },
    );
    return freeze({ patchId: patch.patchId, geometry: patch.geometry, generated });
  });
  const joined = joinPatchMeshes(geometry, patchRows, stageId);
  const mesh = joined.mesh;
  const estimatedDofs = estimateLafeaMeshDofs(stageId, mesh.nodes.length);
  const resourceDisposition = resourceDispositionFor(mesh, estimatedDofs);
  const characteristic = characteristicLengths(mesh);
  const core = {
    schema: LAFEA_SHELL_MULTIPATCH_MESH_PLAN_SCHEMA,
    stageId,
    generationMode: 'AUTOMATIC_MESH',
    strategy: LAFEA_SHELL_MULTIPATCH_MESH_STRATEGY,
    scope: LAFEA_SHELL_MULTIPATCH_MESH_SCOPE,
    sourceHash: evidence.sourceHash,
    analysisDomainHash: evidence.analysisDomainHash,
    analysisGeometryHash: evidence.analysisGeometryHash,
    meshProfileHash: meshProfile.semanticHash,
    elementFamily: LAFEA_SHELL_MULTIPATCH_ELEMENT,
    targetElementLength: meshProfile.fields.globalTargetSize,
    lengthUnit: geometry.lengthUnit,
    patchCount: geometry.patches.length,
    seamCount: geometry.seams.length,
    seamId: geometry.seams[0].seamId,
    seamLength: joined.seamLength,
    seamNodeCount: joined.seamNodeCount,
    seamEdgeCount: joined.seamEdgeCount,
    unweldedNodeCount: joined.unweldedNodeCount,
    weldedNodeCount: joined.weldedNodeCount,
    nodeCount: mesh.nodes.length,
    elementCount: mesh.elements.length,
    estimatedDofs,
    authorityArea: joined.authorityArea,
    meshedArea: joined.meshedArea,
    areaError: joined.areaError,
    maximumSeamPairDistance: joined.maximumSeamPairDistance,
    seamConforming: true,
    maximumEdgeOwnerCount: joined.maximumEdgeOwnerCount,
    minimumFacetDirectorAlignment: joined.minimumFacetDirectorAlignment,
    characteristicLengthMin: characteristic.min,
    characteristicLengthMedian: characteristic.median,
    characteristicLengthMax: characteristic.max,
    patchSummaries: patchRows.map((row) => freeze({
      patchId: row.patchId,
      nodeCount: row.generated.mesh.nodes.length,
      elementCount: row.generated.mesh.elements.length,
      strategy: row.generated.strategy,
      strategyReason: row.generated.strategyReason,
    })),
    resourceDisposition,
    capabilityHash: capability.capabilityHash,
    qualificationHash: qualification.qualificationHash,
    producerRef: LAFEA_MESH_PRODUCER_REF,
    producerId: capability.producerId,
    producerRevision: capability.producerRevision,
    repeatabilityPolicy: capability.repeatabilityPolicy,
    midsurfaceEvidenceHash: evidence.semanticHash,
  };
  return freeze({
    ...core,
    mesh,
    planHash: canonicalLafeaSha256({
      schema: 'lafea-shell-multipatch-mesh-plan-hash-input/v1', plan: core,
    }),
  });
}

export function produceLafeaMultiPatchShellAnalysisMesh(input) {
  const evidence = validateLafeaMultiPatchShellMidsurfaceEvidence(input.midsurfaceEvidence);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(input.meshProfile);
  const plan = input.plan ?? planLafeaMultiPatchShellAnalysisMesh({
    midsurfaceEvidence: evidence,
    meshProfile,
  });
  requirePlan(plan, evidence, meshProfile);
  if (plan.resourceDisposition === 'BLOCK') fail('LAFEA_SHELL_MULTIPATCH_RESOURCE_LIMIT_EXCEEDED');
  const meshHash = canonicalLafeaSha256({
    schema: 'lafea-analysis-mesh-content-hash-input/v1', mesh: plan.mesh,
  });
  const outputCore = {
    schema: LAFEA_SHELL_MULTIPATCH_MESH_OUTPUT_SCHEMA,
    stageId: plan.stageId,
    planHash: plan.planHash,
    capabilityHash: plan.capabilityHash,
    qualificationHash: plan.qualificationHash,
    producerId: plan.producerId,
    producerRevision: plan.producerRevision,
    sourceHash: plan.sourceHash,
    analysisDomainHash: plan.analysisDomainHash,
    analysisGeometryHash: plan.analysisGeometryHash,
    meshProfileHash: plan.meshProfileHash,
    elementFamily: LAFEA_SHELL_MULTIPATCH_ELEMENT,
    meshHash,
    mesh: plan.mesh,
    lifecycleAuthority: false,
  };
  const output = freeze({
    ...outputCore,
    outputHash: canonicalLafeaSha256({
      schema: 'lafea-shell-multipatch-mesh-output-hash-input/v1', output: outputCore,
    }),
  });
  const analysisMeshEvidence = createLafeaAnalysisMeshEvidenceV2({
    schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
    stageId: plan.stageId,
    sourceHash: plan.sourceHash,
    analysisDomainHash: plan.analysisDomainHash,
    analysisGeometryHash: plan.analysisGeometryHash,
    meshProfile,
    mesh: plan.mesh,
    authority: {
      schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
      stageId: plan.stageId,
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
  if (analysisMeshEvidence.qualification !== 'PASS') {
    fail('LAFEA_SHELL_MULTIPATCH_MESH_QUALITY_BLOCKED');
  }
  return freeze({ plan, output, evidence: analysisMeshEvidence });
}

function joinPatchMeshes(geometry, patchRows, stageId) {
  const seam = geometry.seams[0];
  const patchById = new Map(patchRows.map((row) => [row.patchId, row]));
  const patchA = patchById.get(seam.patchAId);
  const patchB = patchById.get(seam.patchBId);
  const segmentA = segmentEndpoints(patchA.geometry, seam.segmentAId);
  const seamLength = distance2(segmentA.start, segmentA.end);
  const stationsA = nodesOnSegment(patchA.generated.mesh, segmentA.start, segmentA.end);
  const stationsB = nodesOnSegment(patchB.generated.mesh, segmentA.start, segmentA.end);
  if (stationsA.length !== stationsB.length || stationsA.length < 2) {
    fail('LAFEA_SHELL_MULTIPATCH_NONCONFORMING_SEAM_NODE_COUNT');
  }
  let maximumSeamPairDistance = 0;
  for (let index = 0; index < stationsA.length; index += 1) {
    const a = stationsA[index];
    const b = stationsB[index];
    maximumSeamPairDistance = Math.max(maximumSeamPairDistance, distance2(a, b));
    if (Math.abs(a.t - b.t) > EPS || distance2(a, b) > EPS) {
      fail('LAFEA_SHELL_MULTIPATCH_NONCONFORMING_SEAM_STATIONS');
    }
  }

  const keyByPatchNode = new Map();
  const descriptorByKey = new Map();
  const canonicalPatchRows = [...patchRows].sort((left, right) => left.patchId.localeCompare(right.patchId));
  const seamKeyByPatchNode = new Map();
  stationsA.forEach((station, index) => {
    const key = `SEAM:${String(index).padStart(8, '0')}`;
    seamKeyByPatchNode.set(`${patchA.patchId}:${station.nodeId}`, key);
    seamKeyByPatchNode.set(`${patchB.patchId}:${stationsB[index].nodeId}`, key);
    descriptorByKey.set(key, { u: station.x, v: station.y });
  });
  for (const patch of canonicalPatchRows) {
    for (const node of patch.generated.mesh.nodes) {
      const composite = `${patch.patchId}:${node.nodeId}`;
      const key = seamKeyByPatchNode.get(composite) ?? `PATCH:${patch.patchId}:${node.nodeId}`;
      keyByPatchNode.set(composite, key);
      if (!descriptorByKey.has(key)) descriptorByKey.set(key, { u: node.x, v: node.y });
    }
  }
  const nodeKeys = [...descriptorByKey.keys()].sort(codeUnitCompare);
  const nodeIdByKey = new Map(nodeKeys.map((key, index) => [key, `N${String(index + 1).padStart(6, '0')}`]));
  const nodes = nodeKeys.map((key) => {
    const uv = descriptorByKey.get(key);
    return freeze({
      nodeId: nodeIdByKey.get(key),
      ...multiPatchShellPoint3d(geometry, uv.u, uv.v),
    });
  });
  const elementRows = [];
  for (const patch of canonicalPatchRows) {
    for (const element of patch.generated.mesh.elements) {
      if (element.elementType !== 'T3') fail('LAFEA_SHELL_MULTIPATCH_PATCH_ELEMENT_FAMILY_INVALID');
      const nodeIds = element.nodeIds.slice(0, 3).map((nodeId) => {
        const key = keyByPatchNode.get(`${patch.patchId}:${nodeId}`);
        const finalId = nodeIdByKey.get(key);
        if (!finalId) fail('LAFEA_SHELL_MULTIPATCH_NODE_WELD_MAP_INVALID');
        return finalId;
      });
      elementRows.push({ key: `${patch.patchId}:${element.elementId}`, nodeIds });
    }
  }
  elementRows.sort((left, right) => codeUnitCompare(left.key, right.key));
  const elements = elementRows.map((row, index) => freeze({
    elementId: `E${String(index + 1).padStart(6, '0')}`,
    elementType: LAFEA_SHELL_MULTIPATCH_ELEMENT,
    nodeIds: freeze([...row.nodeIds]),
  }));
  const mesh = freeze({
    schema: 'lafea-analysis-mesh/v1',
    meshIdentity: `${LAFEA_MESH_PRODUCER_REF}:${stageId}:${geometry.geometryId}:MULTIPATCH-SHELL`,
    nodes: freeze(nodes),
    elements: freeze(elements),
  });

  const seamNodeIds = stationsA.map((_, index) => nodeIdByKey.get(`SEAM:${String(index).padStart(8, '0')}`));
  const edgeOwners = edgeOwnerCounts(elements);
  for (let index = 0; index < seamNodeIds.length - 1; index += 1) {
    const owners = edgeOwners.get(edgeKey(seamNodeIds[index], seamNodeIds[index + 1])) ?? 0;
    if (owners !== 2) fail('LAFEA_SHELL_MULTIPATCH_SEAM_EDGE_OWNER_COUNT_INVALID');
  }
  const maximumEdgeOwnerCount = Math.max(...edgeOwners.values());
  if (maximumEdgeOwnerCount > 2) fail('LAFEA_SHELL_MULTIPATCH_NON_MANIFOLD_MESH');

  const authorityArea = geometry.patches.reduce((sum, patch) => sum + polygonArea(patch.geometry), 0);
  const meshedArea = canonicalPatchRows.reduce((sum, patch) => sum + mesh2dArea(patch.generated.mesh), 0);
  const areaError = Math.abs(meshedArea - authorityArea);
  if (areaError > Math.max(1e-8, authorityArea * 1e-10)) {
    fail('LAFEA_SHELL_MULTIPATCH_MATERIAL_AREA_MISMATCH');
  }
  const director = cross3(geometry.axisU, geometry.axisV);
  const pointById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  let minimumFacetDirectorAlignment = 1;
  for (const element of mesh.elements) {
    const points = element.nodeIds.map((nodeId) => pointById.get(nodeId));
    const normal = normalizedCross(subtract3(points[1], points[0]), subtract3(points[2], points[0]));
    minimumFacetDirectorAlignment = Math.min(minimumFacetDirectorAlignment, dot3(normal, director));
  }
  if (minimumFacetDirectorAlignment < 1 - 1e-10) {
    fail('LAFEA_SHELL_MULTIPATCH_FACET_ORIENTATION_INVALID');
  }

  const unweldedNodeCount = patchRows.reduce((sum, row) => sum + row.generated.mesh.nodes.length, 0);
  return freeze({
    mesh,
    seamLength,
    seamNodeCount: seamNodeIds.length,
    seamEdgeCount: seamNodeIds.length - 1,
    unweldedNodeCount,
    weldedNodeCount: unweldedNodeCount - mesh.nodes.length,
    authorityArea,
    meshedArea,
    areaError,
    maximumSeamPairDistance,
    maximumEdgeOwnerCount,
    minimumFacetDirectorAlignment,
  });
}

function toAnalysisGeometry(shellGeometry) {
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: 'LAFEA.3',
    geometryId: `${shellGeometry.geometryId}:MULTIPATCH-PARAMETRIC`,
    coordinateSystemId: 'SHELL_MULTIPATCH_COMMON_UV',
    lengthUnit: shellGeometry.lengthUnit,
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: shellGeometry.vertices.map((row) => ({ vertexId: row.vertexId, x: row.u, y: row.v })),
    segments: shellGeometry.segments.map((row) => ({
      segmentId: row.segmentId,
      type: 'LINE',
      startVertexId: row.startVertexId,
      endVertexId: row.endVertexId,
    })),
    loops: shellGeometry.loops.map((row) => ({
      loopId: row.loopId, role: row.role, segmentIds: [...row.segmentIds],
    })),
  });
}

function nodesOnSegment(mesh, start, end) {
  const dx = end.u - start.u;
  const dy = end.v - start.v;
  const length2 = dx * dx + dy * dy;
  const tolerance = Math.max(EPS, Math.sqrt(length2) * 1e-10);
  const rows = [];
  for (const node of mesh.nodes) {
    const t = ((node.x - start.u) * dx + (node.y - start.v) * dy) / length2;
    if (t < -EPS || t > 1 + EPS) continue;
    const projected = { x: start.u + t * dx, y: start.v + t * dy };
    if (Math.hypot(node.x - projected.x, node.y - projected.y) > tolerance) continue;
    rows.push({ nodeId: node.nodeId, x: node.x, y: node.y, t });
  }
  rows.sort((left, right) => left.t - right.t || left.nodeId.localeCompare(right.nodeId));
  return rows;
}

function segmentEndpoints(geometry, segmentId) {
  const segment = geometry.segments.find((row) => row.segmentId === segmentId);
  if (!segment) fail('LAFEA_SHELL_MULTIPATCH_SEAM_SEGMENT_NOT_FOUND');
  const vertexById = new Map(geometry.vertices.map((row) => [row.vertexId, row]));
  return { start: vertexById.get(segment.startVertexId), end: vertexById.get(segment.endVertexId) };
}
function polygonArea(geometry) {
  const loop = geometry.loops[0];
  const segmentById = new Map(geometry.segments.map((row) => [row.segmentId, row]));
  const vertexById = new Map(geometry.vertices.map((row) => [row.vertexId, row]));
  let twice = 0;
  for (const segmentId of loop.segmentIds) {
    const segment = segmentById.get(segmentId);
    const a = vertexById.get(segment.startVertexId);
    const b = vertexById.get(segment.endVertexId);
    twice += a.u * b.v - b.u * a.v;
  }
  return Math.abs(twice) / 2;
}
function mesh2dArea(mesh) {
  const nodeById = new Map(mesh.nodes.map((row) => [row.nodeId, row]));
  let area = 0;
  for (const element of mesh.elements) {
    const [a, b, c] = element.nodeIds.slice(0, 3).map((id) => nodeById.get(id));
    area += Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;
  }
  return area;
}
function edgeOwnerCounts(elements) {
  const map = new Map();
  for (const element of elements) {
    for (let edge = 0; edge < 3; edge += 1) {
      const key = edgeKey(element.nodeIds[edge], element.nodeIds[(edge + 1) % 3]);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return map;
}
function edgeKey(a, b) { return codeUnitCompare(a, b) <= 0 ? `${a}:${b}` : `${b}:${a}`; }
function characteristicLengths(mesh) {
  const nodeById = new Map(mesh.nodes.map((row) => [row.nodeId, row]));
  const values = [];
  for (const element of mesh.elements) {
    const points = element.nodeIds.map((id) => nodeById.get(id));
    values.push(
      distance3(points[0], points[1]),
      distance3(points[1], points[2]),
      distance3(points[2], points[0]),
    );
  }
  values.sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  const median = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
  return { min: values[0], median, max: values[values.length - 1] };
}
function requireProfile(profile) {
  if (profile.fields.shellElement !== LAFEA_SHELL_MULTIPATCH_ELEMENT) {
    fail('LAFEA_SHELL_MULTIPATCH_PROFILE_ELEMENT_INVALID');
  }
  if (!(profile.fields.globalTargetSize > 0)) fail('LAFEA_SHELL_MULTIPATCH_PROFILE_TARGET_INVALID');
}
function requireBinding(stageId) {
  if (!lafeaMeshProducerBound(stageId, LAFEA_SHELL_MULTIPATCH_ELEMENT)) {
    fail('LAFEA_SHELL_MULTIPATCH_PRODUCER_NOT_BOUND');
  }
  const capability = lafeaCoreMeshProducerCapability();
  const qualification = lafeaCoreMeshProducerQualification();
  for (const scopes of [capability.scopes, qualification.authorizedScopes]) {
    if (!scopes.some((row) => row.stageId === stageId
      && row.elementFamilies.includes(LAFEA_SHELL_MULTIPATCH_ELEMENT))) {
      fail('LAFEA_SHELL_MULTIPATCH_QUALIFICATION_SCOPE_MISSING');
    }
  }
}
function requirePlan(plan, evidence, profile) {
  if (!plan || plan.schema !== LAFEA_SHELL_MULTIPATCH_MESH_PLAN_SCHEMA
    || plan.stageId !== evidence.stageId
    || plan.sourceHash !== evidence.sourceHash
    || plan.analysisDomainHash !== evidence.analysisDomainHash
    || plan.analysisGeometryHash !== evidence.analysisGeometryHash
    || plan.meshProfileHash !== profile.semanticHash
    || plan.elementFamily !== LAFEA_SHELL_MULTIPATCH_ELEMENT
    || plan.midsurfaceEvidenceHash !== evidence.semanticHash
    || plan.strategy !== LAFEA_SHELL_MULTIPATCH_MESH_STRATEGY
    || plan.seamConforming !== true
    || plan.maximumEdgeOwnerCount > 2) {
    fail('LAFEA_SHELL_MULTIPATCH_PLAN_PARENT_OR_SEAM_INVALID');
  }
  const { mesh, planHash, ...core } = plan;
  if (planHash !== canonicalLafeaSha256({
    schema: 'lafea-shell-multipatch-mesh-plan-hash-input/v1', plan: core,
  })) fail('LAFEA_SHELL_MULTIPATCH_PLAN_HASH_INVALID');
  if (!mesh || mesh.elements.some((row) => row.elementType !== LAFEA_SHELL_MULTIPATCH_ELEMENT)) {
    fail('LAFEA_SHELL_MULTIPATCH_PLAN_MESH_INVALID');
  }
}
function resourceDispositionFor(mesh, estimatedDofs) {
  return mesh.nodes.length > LAFEA_MESH_PRODUCER_MAXIMUM_NODES
    || mesh.elements.length > LAFEA_MESH_PRODUCER_MAXIMUM_ELEMENTS
    || estimatedDofs > LAFEA_MESH_PRODUCER_MAXIMUM_ESTIMATED_DOFS
    ? 'BLOCK' : 'WITHIN_LIMITS';
}
function codeUnitCompare(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
function planarCoordinate(value, primary, secondary) {
  const result = value[primary] ?? value[secondary];
  if (!Number.isFinite(result)) fail('LAFEA_SHELL_MULTIPATCH_PLANAR_COORDINATE_INVALID');
  return result;
}
function distance2(a, b) {
  const ax = planarCoordinate(a, 'x', 'u');
  const ay = planarCoordinate(a, 'y', 'v');
  const bx = planarCoordinate(b, 'x', 'u');
  const by = planarCoordinate(b, 'y', 'v');
  return Math.hypot(bx - ax, by - ay);
}
function distance3(a, b) { return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z); }
function subtract3(left, right) { return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z }; }
function cross3(left, right) {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}
function normalizedCross(left, right) {
  const value = cross3(left, right);
  const length = Math.hypot(value.x, value.y, value.z);
  if (!(length > 0)) fail('LAFEA_SHELL_MULTIPATCH_DEGENERATE_FACET');
  return { x: value.x / length, y: value.y / length, z: value.z / length };
}
function dot3(left, right) { return left.x * right.x + left.y * right.y + left.z * right.z; }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
