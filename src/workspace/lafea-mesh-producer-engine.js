/**
 * The bound analysis-mesh producer: the single place where the qualified core
 * mesher (`src/core/lafea-meshing`) is executed for the LAFEA workbench.
 *
 * Responsibilities, and nothing beyond them: discretize retained analysis
 * geometry under the governed mesh profile, mesh hole-free or multiply-
 * connected planar regions, optionally recombine T6 pairs to Q8, and weld the
 * physical node positions into canonical `lafea-analysis-mesh/v1` content.
 * This module creates no lifecycle evidence and asserts no authority.
 *
 * Disclosed limitations:
 *   - mapped Q8 remains restricted to hole-free exactly-four-curve regions;
 *   - any unstructured Q8 request is rejected unless recombination produces
 *     Q8 for every element; partial T6+Q8 is never relabelled or accepted;
 *   - splines remain outside the qualified core geometry scope.
 */
import { upgradeToT6 } from '../core/lafea-meshing/constrained-delaunay-t6.js';
import {
  curveSegmentCount,
  discretizeCurveIntoQuadraticEdges,
} from '../core/lafea-meshing/boundary-discretization.js';
import {
  triangulateRefinedRegionAsIndexTriples,
} from '../core/lafea-meshing/interior-refinement-t6.js';
import { recombineToQ8 } from '../core/lafea-meshing/q8-recombination.js';
import { mappedTransfiniteMesh } from '../core/lafea-meshing/mapped-mitc-mesh.js';
import { arcSweepAngle } from '../core/lafea-geometry/vertex-curve.js';
import {
  LAFEA_MESH_TOPOLOGY_REGION_ID,
  lafeaMeshTopologySupported,
} from './lafea-mesh-geometry-topology-adapter.js';

export const LAFEA_MESH_PRODUCER_ENGINE_SCHEMA = 'lafea-mesh-producer-engine/v1';
export const LAFEA_MESH_PRODUCER_ENGINE_ID = 'LAFEA_CORE_MESHER';
export const LAFEA_MESH_PRODUCER_ENGINE_REVISION = 'LAFEA.10.T6Q8.V3';
export const LAFEA_MESH_ENGINE_ELEMENT_FAMILIES = Object.freeze(['T3', 'T6', 'Q8']);

/** Planar continuum: two translational degrees of freedom per node. */
const DOFS_PER_NODE = 2;

export const LAFEA_MESH_ENGINE_STRATEGIES = Object.freeze([
  'MAPPED_TRANSFINITE', 'CONSTRAINED_DELAUNAY',
]);

/**
 * @param {Readonly<object>} adapter Output of `buildLafeaMeshTopology`.
 * @param {{targetElementLength:number, curvatureToleranceDegrees:number,
 *   elementFamily:string}} configuration
 */
export function generateLafeaAnalysisMesh(adapter, configuration) {
  const family = requireFamily(configuration.elementFamily);
  if (!lafeaMeshTopologySupported(adapter)) fail('LAFEA_MESH_ENGINE_TOPOLOGY_NOT_SUPPORTED');
  const targetSize = requirePositive(configuration.targetElementLength, 'TARGET_ELEMENT_LENGTH');
  const curvatureDegrees = requirePositive(
    configuration.curvatureToleranceDegrees, 'CURVATURE_TOLERANCE_DEGREES',
  );
  if (curvatureDegrees > 180) fail('LAFEA_MESH_ENGINE_CURVATURE_TOLERANCE_DEGREES_INVALID');
  const curvatureRadians = degreesToRadians(curvatureDegrees);

  const { topology } = adapter;
  const region = topology.regions.find((row) => row.regionId === LAFEA_MESH_TOPOLOGY_REGION_ID);
  if (!region) fail('LAFEA_MESH_ENGINE_REGION_NOT_FOUND');
  const curveById = new Map(topology.curves.map((curve) => [curve.curveId, curve]));
  const vertexById = new Map(topology.vertices.map((vertex) => [vertex.vertexId, vertex]));
  const outerLoop = topology.loops.find((loop) => loop.loopId === region.outerLoopId);
  if (!outerLoop) fail('LAFEA_MESH_ENGINE_OUTER_LOOP_NOT_FOUND');
  const sizing = {
    targetSize,
    chordErrorLimit: chordErrorLimitForRegion(region, topology, curveById, targetSize),
    curvatureRadians,
  };

  const mapped = family === 'Q8' && region.holeLoopIds.length === 0
    ? tryMappedMesh(outerLoop, curveById, vertexById, sizing)
    : null;
  const result = mapped ?? unstructuredMesh(
    topology, region, outerLoop, curveById, vertexById, sizing, family,
  );

  requireRequestedFamilySatisfied(result.coreElements, family);
  const mesh = weld(result.coreElements, family);
  return freeze({
    schema: LAFEA_MESH_PRODUCER_ENGINE_SCHEMA,
    producerId: LAFEA_MESH_PRODUCER_ENGINE_ID,
    producerRevision: LAFEA_MESH_PRODUCER_ENGINE_REVISION,
    elementFamily: family,
    strategy: result.strategy,
    strategyReason: result.strategyReason,
    mesh,
    nodeCount: mesh.nodes.length,
    elementCount: mesh.elements.length,
    estimatedDofs: mesh.nodes.length * DOFS_PER_NODE,
    boundarySegmentCount: result.boundarySegmentCount,
    holeCount: result.holeCount ?? 0,
    interiorPointCount: result.interiorPointCount ?? 0,
    ...characteristicLengths(mesh),
  });
}

/** General unstructured fallback for both simply and multiply connected regions. */
function unstructuredMesh(topology, region, outerLoop, curveById, vertexById, sizing, family) {
  const refined = triangulateRefinedRegionAsIndexTriples(topology, region.regionId, {
    targetSize: sizing.targetSize,
    chordErrorLimit: sizing.chordErrorLimit,
    minimumSegmentsByCurveId: minimumSegmentsByRegion(
      region, topology, curveById, vertexById, sizing.curvatureRadians,
    ),
  });
  const coreElements = family === 'Q8'
    ? recombineToQ8(refined, refined.ringCorners, refined.edgesByCornerPair, true)
    : upgradeToT6(
      refined.points,
      refined.ringCorners,
      refined.triangleTriples,
      refined.edgesByCornerPair,
    );
  return {
    strategy: 'CONSTRAINED_DELAUNAY',
    strategyReason: region.holeLoopIds.length > 0
      ? 'MULTIPLY_CONNECTED_REGION_CONSTRAINED'
      : family === 'Q8'
        ? 'MAPPED_TOPOLOGY_NOT_AVAILABLE'
        : 'UNSTRUCTURED_INTERIOR_REFINEMENT',
    coreElements,
    boundarySegmentCount: refined.boundarySegmentCount,
    holeCount: refined.holeCount,
    interiorPointCount: refined.interiorPointCount,
  };
}

/** Structured strategy: a hole-free four-curve region uses transfinite blending. */
function tryMappedMesh(outerLoop, curveById, vertexById, sizing) {
  if (outerLoop.curveIds.length !== 4) return null;
  const curves = outerLoop.curveIds.map((curveId) => curveById.get(curveId));
  const counts = curves.map((curve) => curveSegmentCount(curve, vertexById, {
    targetSize: sizing.targetSize,
    chordErrorLimit: sizing.chordErrorLimit,
    minimumSegments: minimumSegmentsFor(curve, vertexById, sizing.curvatureRadians),
  }));
  const alongCount = Math.max(counts[0], counts[2]);
  const acrossCount = Math.max(counts[1], counts[3]);

  const bottom = quadraticChain(curves[0], vertexById, alongCount);
  const right = quadraticChain(curves[1], vertexById, acrossCount);
  const top = quadraticChain(curves[2], vertexById, alongCount).slice().reverse();
  const left = quadraticChain(curves[3], vertexById, acrossCount).slice().reverse();

  let mapped;
  try {
    mapped = mappedTransfiniteMesh(bottom, top, left, right);
  } catch (error) {
    if (error.code === 'MAPPED_MESH_TOPOLOGY_MISMATCH') return null;
    throw error;
  }
  return {
    strategy: 'MAPPED_TRANSFINITE',
    strategyReason: 'FOUR_SIDED_REGION_MAPPED',
    coreElements: mapped.elements,
    boundarySegmentCount: 2 * (alongCount + acrossCount),
    holeCount: 0,
    interiorPointCount: mapped.interiorPointCount ?? 0,
  };
}

function quadraticChain(curve, vertexById, segmentCount) {
  const { cornerPoints, midPoints } = discretizeCurveIntoQuadraticEdges(
    curve, vertexById, segmentCount,
  );
  const chain = [];
  for (let index = 0; index < segmentCount; index += 1) {
    chain.push(cornerPoints[index].point, midPoints[index].point);
  }
  chain.push(cornerPoints[segmentCount].point);
  return chain;
}

function minimumSegmentsFor(curve, vertexById, curvatureRadians) {
  if (curve.type !== 'ARC') return 1;
  return Math.max(1, Math.ceil(Math.abs(arcSweepAngle(curve, vertexById)) / curvatureRadians));
}

function minimumSegmentsByRegion(region, topology, curveById, vertexById, curvatureRadians) {
  const minimums = new Map();
  for (const loopId of [region.outerLoopId, ...region.holeLoopIds]) {
    const loop = topology.loops.find((candidate) => candidate.loopId === loopId);
    for (const curveId of loop?.curveIds ?? []) {
      const curve = curveById.get(curveId);
      if (curve?.type !== 'ARC') continue;
      minimums.set(
        curveId,
        Math.max(1, Math.ceil(Math.abs(arcSweepAngle(curve, vertexById)) / curvatureRadians)),
      );
    }
  }
  return minimums;
}

/** Uniform-Q8 authority remains all-Q8-or-reject. */
function requireRequestedFamilySatisfied(coreElements, family) {
  if (family !== 'Q8') return;
  if (coreElements.some((element) => element.elementType !== 'Q8')) {
    fail('LAFEA_MESH_ENGINE_Q8_FULL_RECOMBINATION_REQUIRED');
  }
}

function weld(coreElements, family) {
  const nodeIndexByKey = new Map();
  const welded = [];
  const elementNodeKeys = coreElements.map((element) => {
    const nodes = family === 'T3' ? element.nodes.slice(0, 3) : element.nodes;
    return nodes.map((node) => {
      const key = `${node.x},${node.y}`;
      if (!nodeIndexByKey.has(key)) {
        nodeIndexByKey.set(key, welded.length);
        welded.push({ key, x: node.x, y: node.y });
      }
      return key;
    });
  });

  const ordered = [...welded].sort((left, right) => left.x - right.x || left.y - right.y);
  const nodeIdByKey = new Map(ordered.map((node, index) => [node.key, nodeId(index)]));
  const nodes = ordered.map((node) => ({
    nodeId: nodeIdByKey.get(node.key), x: node.x, y: node.y, z: 0,
  }));
  const elements = elementNodeKeys
    .map((keys) => ({ nodeIds: keys.map((key) => nodeIdByKey.get(key)), elementType: elementTypeFor(family, keys.length) }))
    .sort((left, right) => compareIdLists(left.nodeIds, right.nodeIds))
    .map((element, index) => ({ elementId: elementId(index), elementType: element.elementType, nodeIds: element.nodeIds }));
  return freeze({ schema: 'lafea-analysis-mesh/v1', meshIdentity: meshIdentity(family), nodes, elements });
}

function elementTypeFor(family, nodeCount) {
  if (family === 'T3') return 'T3';
  if (nodeCount === 8) return 'Q8';
  if (nodeCount === 6) return 'T6';
  fail('LAFEA_MESH_ENGINE_ELEMENT_NODE_COUNT_UNEXPECTED');
  return null;
}

function characteristicLengths(mesh) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const lengths = mesh.elements.map((element) => {
    const cornerCount = element.elementType === 'Q8' ? 4 : 3;
    const corners = element.nodeIds.slice(0, cornerCount).map((id) => nodeById.get(id));
    let longest = 0;
    for (let index = 0; index < corners.length; index += 1) {
      const a = corners[index]; const b = corners[(index + 1) % corners.length];
      longest = Math.max(longest, Math.hypot(b.x - a.x, b.y - a.y));
    }
    return longest;
  }).sort((left, right) => left - right);
  return {
    characteristicLengthMin: lengths[0],
    characteristicLengthMedian: lengths[Math.floor((lengths.length - 1) / 2)],
    characteristicLengthMax: lengths[lengths.length - 1],
  };
}

/**
 * Keep the chord-error branch deliberately coarse by using the largest
 * analytic arc radius anywhere on the region boundary; the governed angular
 * curvature tolerance remains the binding segmentation control.
 */
function chordErrorLimitForRegion(region, topology, curveById, targetSize) {
  const radii = [region.outerLoopId, ...region.holeLoopIds].flatMap((loopId) => {
    const loop = topology.loops.find((candidate) => candidate.loopId === loopId);
    return (loop?.curveIds ?? [])
      .map((curveId) => curveById.get(curveId))
      .filter((curve) => curve?.type === 'ARC')
      .map((curve) => curve.arc.radius);
  });
  return radii.length ? Math.max(...radii) : targetSize;
}

function requireFamily(value) {
  if (!LAFEA_MESH_ENGINE_ELEMENT_FAMILIES.includes(value)) fail('LAFEA_MESH_ENGINE_ELEMENT_FAMILY_NOT_SUPPORTED');
  return value;
}
function requirePositive(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) fail(`LAFEA_MESH_ENGINE_${field}_INVALID`);
  return value;
}
function degreesToRadians(value) { return (value * Math.PI) / 180; }
function nodeId(index) { return `N${String(index + 1).padStart(6, '0')}`; }
function elementId(index) { return `E${String(index + 1).padStart(6, '0')}`; }
function meshIdentity(family) { return `${LAFEA_MESH_PRODUCER_ENGINE_ID}:${LAFEA_MESH_PRODUCER_ENGINE_REVISION}:${family}`; }
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