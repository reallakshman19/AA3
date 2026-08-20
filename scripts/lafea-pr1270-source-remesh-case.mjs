#!/usr/bin/env node
import assert from 'node:assert/strict';

import {
  canonicalProfile,
  defaultProfileFields,
  PROFILE_KINDS,
} from '../src/core/lafea-profile-contract/index.js';
import {
  qualifyRefinedMeshAdjacentSizeRatio,
  refinementTransitionLadder,
} from '../src/core/lafea-meshing/refinement-fields.js';
import {
  insertInteriorPoint,
  triangulateRefinedRegionAsIndexTriples,
} from '../src/core/lafea-meshing/interior-refinement-t6.js';
import { lawsonFlip, upgradeToT6, edgeKey } from '../src/core/lafea-meshing/constrained-delaunay-t6.js';
import { smoothInteriorPoints } from '../src/core/lafea-meshing/mesh-smoothing.js';
import { createLafeaAnalysisGeometry } from '../src/workspace/lafea-analysis-geometry-contract.js';
import { createLafeaAnalysisGeometryEvidence } from '../src/workspace/lafea-analysis-geometry-evidence.js';
import { createLafeaContinuumAnalysisDomain } from '../src/workspace/lafea-continuum-analysis-domain.js';
import { qualifyLafeaAnalysisMesh } from '../src/workspace/lafea-analysis-mesh-quality.js';
import {
  buildLafeaMeshTopology,
  LAFEA_MESH_TOPOLOGY_REGION_ID,
} from '../src/workspace/lafea-mesh-geometry-topology-adapter.js';
import {
  lafeaMeshGenerationConfiguration,
  produceLafeaAnalysisMeshEvidence,
} from '../src/workspace/lafea-mesh-producer-binding.js';

const SOURCE_HASH = `sha256:${'e'.repeat(64)}`;
const family = requiredEnum(process.env.PR1270_FAMILY, ['T3', 'T6'], 'family');
const globalTarget = positive(process.env.PR1270_HGLOBAL ?? '30', 'global');
const localTarget = positive(process.env.PR1270_HLOCAL, 'local');
const width = positive(process.env.PR1270_WIDTH, 'width');
const height = positive(process.env.PR1270_HEIGHT, 'height');
const xf = fraction(process.env.PR1270_XF, 'xf');
const yf = fraction(process.env.PR1270_YF, 'yf');
const caseId = process.env.PR1270_CASE_ID ?? 'SOURCE_REMESH_CASE';
const growth = 1.5;
const boundaryClearanceFactor = 0.20;
const pointClearanceFactor = 0.20;
const smoothingRounds = 3;
const minimumElementsPerBand = 2;

const geometry = plateGeometry(width, height, caseId);
const stage = stageFor(geometry, caseId);
const profile = meshProfileFor(family, globalTarget, caseId);
const parent = produceLafeaAnalysisMeshEvidence(
  stage, lafeaMeshGenerationConfiguration(profile),
).evidence;
assert.equal(parent.qualification, 'PASS');

const requestedPoint = { x: width * xf, y: height * yf };
const targetElementId = nearestElement(parent.mesh, requestedPoint);
const target = elementCentroid(parent.mesh, targetElementId);
const transition = buildTransition(localTarget, globalTarget, growth, minimumElementsPerBand);
const subdivided = subdivideLineGeometryForSizeField(geometry, [target], transition);
const first = generateSourceRemesh(subdivided.geometry, [target], transition, profile, family, {
  boundaryClearanceFactor, pointClearanceFactor, smoothingRounds,
});
const second = generateSourceRemesh(subdivided.geometry, [target], transition, profile, family, {
  boundaryClearanceFactor, pointClearanceFactor, smoothingRounds,
});
assert.equal(JSON.stringify(second.mesh), JSON.stringify(first.mesh), 'source remesh replay must be byte-identical');
assert.equal(second.insertedPointCount, first.insertedPointCount);

const quality = qualifyLafeaAnalysisMesh('LAFEA.3', first.mesh, profile);
const adjacency = qualifyRefinedMeshAdjacentSizeRatio(first.mesh, profile.fields.adjacentSizeRatioMax);
const parentLocalCorners = localCornerCount(parent.mesh, target, transition.influenceRadius);
const childLocalCorners = localCornerCount(first.mesh, target, transition.influenceRadius);
const localStats = localCharacteristicStats(first.mesh, target, Math.max(2 * localTarget, globalTarget));
const boundary = boundaryAudit(first.mesh, width, height, family);

assert.notEqual(quality.worstStatus, 'BLOCK');
assert.equal(adjacency.qualification, 'PASS');
assert.equal(adjacency.violatingAdjacencyCount, 0);
assert.ok(first.insertedPointCount > 0, 'graded source remesh inserted no interior points');
assert.ok(childLocalCorners > parentLocalCorners,
  `local corner density did not increase: ${parentLocalCorners} -> ${childLocalCorners}`);
assert.equal(boundary.offGeometryCornerCount, 0);
assert.equal(boundary.offGeometryMidsideCount, 0);
assert.equal(boundary.nonManifoldBoundaryOwnerCount, 0);

console.log(`PR1270_SOURCE_REMESH_CASE=${JSON.stringify({
  caseId, family, globalTarget, localTarget, targetRatio: localTarget / globalTarget,
  width, height, xf, yf, targetElementId, target,
  transitionLevels: transition.levels, influenceRadius: transition.influenceRadius,
  parentNodes: parent.mesh.nodes.length, childNodes: first.mesh.nodes.length,
  parentElements: parent.mesh.elements.length, childElements: first.mesh.elements.length,
  parentLocalCorners, childLocalCorners, localCornerGain: childLocalCorners - parentLocalCorners,
  insertedPointCount: first.insertedPointCount,
  sourceBoundarySegmentCount: geometry.segments.length,
  subdividedBoundarySegmentCount: subdivided.geometry.segments.length,
  boundaryLineage: subdivided.lineage,
  localStats,
  qualityWorstStatus: quality.worstStatus,
  qualityBlockingElementCount: quality.blockingElementIds.length,
  qualityWarningElementCount: quality.warningElementIds.length,
  maximumAllowed: adjacency.maximumAllowed,
  maximumObserved: adjacency.maximumObserved,
  violatingAdjacencyCount: adjacency.violatingAdjacencyCount,
  boundary,
  qualification: 'PASS',
})}`);

function buildTransition(local, global, adjacentRatio, minimumElements) {
  const ladder = refinementTransitionLadder(global, local, adjacentRatio);
  let radius = 0;
  const bands = ladder.levels.slice(0, -1).map((size, index) => {
    const innerRadius = radius;
    const widthValue = minimumElements * size;
    radius += widthValue;
    return Object.freeze({
      bandIndex: index, targetElementLength: size,
      innerRadius, outerRadius: radius, width: widthValue,
    });
  });
  return Object.freeze({
    levels: Object.freeze([...ladder.levels]), bands: Object.freeze(bands),
    influenceRadius: radius, adjacentRatio,
  });
}

function sizeAtDistance(distance, transition) {
  for (const band of transition.bands) {
    if (distance <= band.outerRadius + 1e-12) return band.targetElementLength;
  }
  return transition.levels.at(-1);
}

function subdivideLineGeometryForSizeField(geometryValue, targets, transition) {
  const vertices = geometryValue.vertices.map((row) => ({ vertexId: row.vertexId, x: row.x, y: row.y }));
  const vertexById = new Map(vertices.map((row) => [row.vertexId, row]));
  const segments = [];
  const replacement = new Map();
  const lineage = [];
  for (const segment of geometryValue.segments) {
    if (segment.type !== 'LINE') throw new Error('PR1270_SOURCE_REMESH_DIAG_LINE_ONLY');
    const start = vertexById.get(segment.startVertexId);
    const end = vertexById.get(segment.endVertexId);
    const distance = Math.min(...targets.map((target) => pointSegmentDistance(target, start, end)));
    const requested = sizeAtDistance(distance, transition);
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    const count = Math.max(1, Math.ceil(length / requested));
    const ids = [segment.startVertexId];
    for (let index = 1; index < count; index += 1) {
      const t = index / count;
      const vertexId = `${segment.segmentId}:SUBV:${String(index).padStart(3, '0')}`;
      vertices.push({
        vertexId,
        x: start.x + t * (end.x - start.x),
        y: start.y + t * (end.y - start.y),
      });
      ids.push(vertexId);
    }
    ids.push(segment.endVertexId);
    const children = [];
    for (let index = 0; index < count; index += 1) {
      const segmentId = `${segment.segmentId}:SUB:${String(index + 1).padStart(3, '0')}`;
      segments.push({ segmentId, type: 'LINE', startVertexId: ids[index], endVertexId: ids[index + 1] });
      children.push(segmentId);
    }
    replacement.set(segment.segmentId, children);
    lineage.push(Object.freeze({
      parentSegmentId: segment.segmentId, requestedTargetElementLength: requested,
      parentLength: length, childSegmentCount: count, childSegmentIds: Object.freeze(children),
    }));
  }
  const loops = geometryValue.loops.map((loop) => ({
    loopId: loop.loopId, role: loop.role,
    segmentIds: loop.segmentIds.flatMap((segmentId) => replacement.get(segmentId)),
  }));
  const child = createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1', stageId: 'LAFEA.3',
    geometryId: `${geometryValue.geometryId}:GRADED_DIAG`,
    coordinateSystemId: geometryValue.coordinateSystemId,
    lengthUnit: geometryValue.lengthUnit,
    orientationPolicy: geometryValue.orientationPolicy,
    vertices, segments, loops,
  });
  return Object.freeze({ geometry: child, lineage: Object.freeze(lineage) });
}

function generateSourceRemesh(geometryValue, targets, transition, meshProfile, elementFamily, policy) {
  const adapter = buildLafeaMeshTopology(geometryValue);
  const base = triangulateRefinedRegionAsIndexTriples(
    adapter.topology, LAFEA_MESH_TOPOLOGY_REGION_ID,
    {
      targetSize: transition.levels.at(-1),
      chordErrorLimit: Math.max(1e-9, transition.levels.at(-1) * 1e-6),
      adjacentSizeRatioMax: transition.adjacentRatio,
    },
  );
  const points = base.points.map((point) => ({ x: point.x, y: point.y }));
  let triangles = base.triangleTriples.map((row) => [...row]);
  const constraints = new Set(base.boundaryEdgeKeys);
  const fixed = new Set(base.boundaryRings.flatMap((ring) => ring.globalIndices));
  let insertedPointCount = 0;
  for (const candidate of gradedCandidates(targets, transition)) {
    const desired = candidate.desired;
    if (!farFromBoundary(candidate, points, constraints, desired * policy.boundaryClearanceFactor)) continue;
    if (!farFromPoints(candidate, points, desired * policy.pointClearanceFactor)) continue;
    if (insertInteriorPoint(points, triangles, constraints, candidate)) insertedPointCount += 1;
  }
  triangles = lawsonFlip(points, triangles, constraints);
  for (let round = 0; round < policy.smoothingRounds; round += 1) {
    const working = triangles.map((row) => [...row]);
    smoothInteriorPoints(points, working, fixed);
    triangles = lawsonFlip(points, working, constraints);
  }
  const coreElements = elementFamily === 'T6'
    ? upgradeToT6(points, base.ringCorners, triangles, base.edgesByCornerPair)
    : triangles.map((triple, elementIndex) => Object.freeze({
      elementIndex, elementType: 'T3',
      nodes: Object.freeze(triple.map((index) => ({ x: points[index].x, y: points[index].y }))),
    }));
  return Object.freeze({ mesh: weld(coreElements, elementFamily), insertedPointCount });
}

function gradedCandidates(targets, transition) {
  const rows = new Map();
  const rowFactor = Math.sqrt(3) / 2;
  for (const band of transition.bands) {
    const spacing = band.targetElementLength;
    const rowHeight = spacing * rowFactor;
    for (const target of targets) {
      const rowLimit = Math.ceil(band.outerRadius / rowHeight) + 1;
      const colLimit = Math.ceil(band.outerRadius / spacing) + 1;
      for (let row = -rowLimit; row <= rowLimit; row += 1) {
        const y = target.y + row * rowHeight;
        const offset = Math.abs(row) % 2 ? spacing / 2 : 0;
        for (let col = -colLimit; col <= colLimit; col += 1) {
          const x = target.x + col * spacing + offset;
          const distance = Math.min(...targets.map((candidate) => Math.hypot(x - candidate.x, y - candidate.y)));
          if (distance > band.outerRadius + 1e-12) continue;
          if (band.bandIndex > 0 && distance <= band.innerRadius + 1e-12) continue;
          const desired = sizeAtDistance(distance, transition);
          if (Math.abs(desired - spacing) > 1e-12 * Math.max(1, spacing)) continue;
          const key = `${x},${y}`;
          if (!rows.has(key)) rows.set(key, { x, y, desired });
        }
      }
    }
  }
  return [...rows.values()].sort((a, b) => a.desired - b.desired || a.y - b.y || a.x - b.x);
}

function farFromBoundary(point, points, constraints, clearance) {
  for (const key of constraints) {
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
  if (!(length2 > 0)) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length2));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function weld(coreElements, familyValue) {
  const nodeIndexByKey = new Map();
  const welded = [];
  const elementNodeKeys = coreElements.map((element) => {
    const nodes = familyValue === 'T3' ? element.nodes.slice(0, 3) : element.nodes;
    return nodes.map((node) => {
      const key = `${node.x},${node.y}`;
      if (!nodeIndexByKey.has(key)) {
        nodeIndexByKey.set(key, welded.length);
        welded.push({ key, x: node.x, y: node.y });
      }
      return key;
    });
  });
  const ordered = [...welded].sort((a, b) => a.x - b.x || a.y - b.y);
  const nodeIdByKey = new Map(ordered.map((node, index) => [node.key, `N${String(index + 1).padStart(6, '0')}`]));
  const nodes = ordered.map((node) => ({ nodeId: nodeIdByKey.get(node.key), x: node.x, y: node.y, z: 0 }));
  const elements = elementNodeKeys.map((keys) => ({
    elementType: familyValue,
    nodeIds: keys.map((key) => nodeIdByKey.get(key)),
  })).sort((a, b) => compareIds(a.nodeIds, b.nodeIds))
    .map((row, index) => ({ elementId: `E${String(index + 1).padStart(6, '0')}`, ...row }));
  return Object.freeze({
    schema: 'lafea-analysis-mesh/v1',
    meshIdentity: `PR1270_SOURCE_REMESH_DIAG:${familyValue}`,
    nodes: Object.freeze(nodes), elements: Object.freeze(elements),
  });
}

function boundaryAudit(mesh, w, h, familyValue) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const owners = new Map();
  for (const element of mesh.elements) {
    const corners = element.nodeIds.slice(0, 3);
    for (let edge = 0; edge < 3; edge += 1) {
      const a = corners[edge]; const b = corners[(edge + 1) % 3];
      const key = a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
      const rows = owners.get(key) ?? [];
      rows.push({ element, edge }); owners.set(key, rows);
    }
  }
  let offGeometryCornerCount = 0;
  let offGeometryMidsideCount = 0;
  let nonManifoldBoundaryOwnerCount = 0;
  let boundaryEdgeCount = 0;
  for (const rows of owners.values()) {
    if (rows.length > 2) nonManifoldBoundaryOwnerCount += 1;
    if (rows.length !== 1) continue;
    boundaryEdgeCount += 1;
    const { element, edge } = rows[0];
    const a = nodeById.get(element.nodeIds[edge]);
    const b = nodeById.get(element.nodeIds[(edge + 1) % 3]);
    if (!onRectangle(a, w, h) || !onRectangle(b, w, h)) offGeometryCornerCount += 1;
    if (familyValue === 'T6') {
      const mid = nodeById.get(element.nodeIds[3 + edge]);
      if (!onRectangle(mid, w, h)) offGeometryMidsideCount += 1;
    }
  }
  return { boundaryEdgeCount, offGeometryCornerCount, offGeometryMidsideCount, nonManifoldBoundaryOwnerCount };
}
function onRectangle(node, w, h) {
  const eps = 1e-9 * Math.max(1, w, h);
  return Math.abs(node.x) <= eps || Math.abs(node.x - w) <= eps
    || Math.abs(node.y) <= eps || Math.abs(node.y - h) <= eps;
}
function localCornerCount(mesh, targetValue, radius) {
  const ids = new Set(mesh.elements.flatMap((element) => element.nodeIds.slice(0, 3)));
  return mesh.nodes.filter((node) => ids.has(node.nodeId)
    && Math.hypot(node.x - targetValue.x, node.y - targetValue.y) <= radius).length;
}
function localCharacteristicStats(mesh, targetValue, radius) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const values = [];
  for (const element of mesh.elements) {
    const c = element.nodeIds.slice(0, 3).map((id) => nodeById.get(id));
    const centroid = { x: (c[0].x + c[1].x + c[2].x) / 3, y: (c[0].y + c[1].y + c[2].y) / 3 };
    if (Math.hypot(centroid.x - targetValue.x, centroid.y - targetValue.y) > radius) continue;
    values.push(Math.max(
      Math.hypot(c[1].x - c[0].x, c[1].y - c[0].y),
      Math.hypot(c[2].x - c[1].x, c[2].y - c[1].y),
      Math.hypot(c[0].x - c[2].x, c[0].y - c[2].y),
    ));
  }
  values.sort((a, b) => a - b);
  return {
    count: values.length, minimum: values[0] ?? null,
    median: values.length ? values[Math.floor(values.length / 2)] : null,
    maximum: values.at(-1) ?? null,
  };
}

function plateGeometry(w, h, id) {
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1', stageId: 'LAFEA.3', geometryId: `${id}-PLATE`,
    coordinateSystemId: 'GLOBAL', lengthUnit: 'mm', orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: [
      { vertexId: 'V1', x: 0, y: 0 }, { vertexId: 'V2', x: w, y: 0 },
      { vertexId: 'V3', x: w, y: h }, { vertexId: 'V4', x: 0, y: h },
    ],
    segments: [line('S1', 'V1', 'V2'), line('S2', 'V2', 'V3'), line('S3', 'V3', 'V4'), line('S4', 'V4', 'V1')],
    loops: [{ loopId: 'L_OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
  });
}
function line(segmentId, startVertexId, endVertexId) { return { segmentId, type: 'LINE', startVertexId, endVertexId }; }
function stageFor(geometryValue, id) {
  const domain = createLafeaContinuumAnalysisDomain({
    schema: 'lafea-continuum-analysis-domain/v1', stageId: 'LAFEA.3', sourceHash: SOURCE_HASH,
    applicationRef: id, units: { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
    formulation: 'PLANE_STRESS', region: { regionId: 'R1', materialRef: 'MAT' },
    physicalCases: [{ caseId: 'C1' }], attachments: [],
  }, geometryValue);
  const evidence = createLafeaAnalysisGeometryEvidence({
    schema: 'lafea-analysis-geometry-evidence/v1', stageId: 'LAFEA.3', sourceHash: SOURCE_HASH,
    analysisDomain: domain, geometry: geometryValue, producerRef: 'PR1270-SOURCE-REMESH-DIAG',
    profileId: 'LAFEA3_DOMAIN_FIRST_GEOMETRY_V1',
  });
  return {
    stageId: 'LAFEA.3', domainFirstProfileActive: true,
    sourceAuthority: { stageId: 'LAFEA.3', sourceHash: SOURCE_HASH },
    retainedAnalysisGeometryEvidence: evidence,
    analysisDomainProjection: { state: 'CURRENT_PASS', analysisDomainHash: domain.semanticHash },
    analysisGeometryProjection: { state: 'CURRENT_PASS', analysisGeometryHash: geometryValue.semanticHash },
  };
}
function meshProfileFor(element, h, id) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1', profileIdentity: `${id}-${element}-${h}`,
    sourceRevision: 'PR1270-SOURCE-REMESH-DIAG', semanticHash: undefined,
    fields: { ...defaultProfileFields(PROFILE_KINDS.MESH), continuumElement: element,
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1', globalTargetSize: h },
  });
}
function nearestElement(mesh, point) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  return mesh.elements.map((element) => {
    const c = element.nodeIds.slice(0, 3).map((id) => nodeById.get(id));
    const x = (c[0].x + c[1].x + c[2].x) / 3;
    const y = (c[0].y + c[1].y + c[2].y) / 3;
    return { id: element.elementId, d: Math.hypot(x - point.x, y - point.y) };
  }).sort((a, b) => a.d - b.d || a.id.localeCompare(b.id))[0].id;
}
function elementCentroid(mesh, elementIdValue) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const element = mesh.elements.find((row) => row.elementId === elementIdValue);
  const c = element.nodeIds.slice(0, 3).map((id) => nodeById.get(id));
  return { x: (c[0].x + c[1].x + c[2].x) / 3, y: (c[0].y + c[1].y + c[2].y) / 3 };
}
function compareIds(left, right) {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return left.length - right.length;
}
function positive(value, label) { const n = Number(value); assert.ok(Number.isFinite(n) && n > 0, label); return n; }
function fraction(value, label) { const n = Number(value); assert.ok(Number.isFinite(n) && n > 0 && n < 1, label); return n; }
function requiredEnum(value, values, label) { assert.ok(values.includes(value), label); return value; }
