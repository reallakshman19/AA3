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
 *   - mapped Q8 remains restricted to hole-free logical four-sided regions;
 *     declared feature vertices may split a logical side into multiple curves;
 *   - a uniform Q8 request that recombination cannot satisfy for every element
 *     falls back to centroid subdivision, which is all-quad by construction.
 *     Partial T6+Q8 is still never relabelled or accepted;
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
import { logicalFourSideCurveChains } from '../core/lafea-meshing/logical-four-side-chains.js';
import { subdivideTrianglesToQ8 } from '../core/lafea-meshing/quad-subdivision-q8.js';
import { recombineToQ8 } from '../core/lafea-meshing/q8-recombination.js';
import { mappedTransfiniteMesh } from '../core/lafea-meshing/mapped-mitc-mesh.js';
import { arcSweepAngle, curveLength } from '../core/lafea-geometry/vertex-curve.js';
import { estimateLafeaMeshDofs } from './lafea-mesh-dof-policy.js';
import {
  LAFEA_MESH_TOPOLOGY_REGION_ID,
  lafeaMeshTopologySupported,
} from './lafea-mesh-geometry-topology-adapter.js';

export const LAFEA_MESH_PRODUCER_ENGINE_SCHEMA = 'lafea-mesh-producer-engine/v1';
export const LAFEA_MESH_PRODUCER_ENGINE_ID = 'LAFEA_CORE_MESHER';
export const LAFEA_MESH_PRODUCER_ENGINE_REVISION = 'LAFEA.10.T6Q8.V4';
export const LAFEA_MESH_ENGINE_ELEMENT_FAMILIES = Object.freeze(['T3', 'T6', 'Q8']);

export const LAFEA_MESH_ENGINE_STRATEGIES = Object.freeze([
  'MAPPED_TRANSFINITE', 'CONSTRAINED_DELAUNAY', 'QUAD_SUBDIVISION',
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
    estimatedDofs: estimateLafeaMeshDofs(adapter.stageId, mesh.nodes.length),
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
  // Uniform Q8 over an unstructured triangulation: prefer pair recombination,
  // which preserves the refined element sizing, and fall back to centroid
  // subdivision when recombination cannot pair every triangle. Subdivision is
  // all-quad by construction, so the request no longer has to be rejected.
  let subdivided = false;
  let coreElements;
  if (family === 'Q8') {
    const recombined = recombineToQ8(
      refined, refined.ringCorners, refined.edgesByCornerPair, true,
    );
    if (recombined.every((element) => element.elementType === 'Q8')) {
      coreElements = recombined;
    } else {
      coreElements = subdivideTrianglesToQ8(refined, curveById, vertexById);
      subdivided = true;
    }
  } else {
    coreElements = upgradeToT6(
      refined.points,
      refined.ringCorners,
      refined.triangleTriples,
      refined.edgesByCornerPair,
    );
  }
  return {
    strategy: subdivided ? 'QUAD_SUBDIVISION' : 'CONSTRAINED_DELAUNAY',
    strategyReason: subdivided
      ? 'UNIFORM_Q8_BY_CENTROID_SUBDIVISION'
      : region.holeLoopIds.length > 0
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

/** Structured strategy: a hole-free logical quadrilateral uses Coons blending. */
function tryMappedMesh(outerLoop, curveById, vertexById, sizing) {
  const chains = logicalFourSideCurveChains(outerLoop, curveById, vertexById);
  if (!chains) return null;

  const baseCounts = chains.map((chain) => chain.map((curve) => curveSegmentCount(curve, vertexById, {
    targetSize: sizing.targetSize,
    chordErrorLimit: sizing.chordErrorLimit,
    minimumSegments: minimumSegmentsFor(curve, vertexById, sizing.curvatureRadians),
  })));
  const naturalTotals = baseCounts.map((counts) => counts.reduce((sum, count) => sum + count, 0));
  const alongCount = Math.max(naturalTotals[0], naturalTotals[2]);
  const acrossCount = Math.max(naturalTotals[1], naturalTotals[3]);
  const targetTotals = [alongCount, acrossCount, alongCount, acrossCount];
  const allocatedCounts = chains.map((chain, index) => allocateChainSegmentCounts(
    chain, baseCounts[index], targetTotals[index], vertexById,
  ));

  // Opposite along-sides (bottom/top, chains[0]/[2]) are forced to the same
  // segment count as each other, and likewise opposite across-sides (left/
  // right, chains[1]/[3]) to each other -- but a mapped region's two chain
  // pairs need not be "radial" or "angular" specifically; which pair carries
  // a physical-length mismatch depends on the shape (e.g. B02C's
  // quarter-annulus: chains[0]/[2] are the hole/outer arcs, a 10x length
  // mismatch, while chains[1]/[3], the two equal-length radial lines, match
  // exactly). Uniform spacing along a chain whose OWN opposite-pair is
  // mismatched pins its cells to a constant width while the perpendicular
  // direction's cell width scales with whichever mismatched side it sits on,
  // forcing element aspect ratio toward that mismatch ratio at the shorter
  // side. Grading each family's spacing by its perpendicular pair's length
  // ratio keeps cells closer to square. Both biases are exactly 1 (the
  // original, unaffected uniform behavior) whenever any side is a
  // multi-curve chain or both pairs are already equal length -- e.g. every
  // rectangle-based mapped mesh (opposite sides always equal), so this is a
  // no-op there.
  const gradingEligible = chains.every((chain) => chain.length === 1);
  const alongGradingBias = gradingEligible ? computeGradingBias(chains[1][0], chains[3][0], vertexById) : 1;
  const acrossGradingBias = gradingEligible ? computeGradingBias(chains[2][0], chains[0][0], vertexById) : 1;

  const bottom = quadraticChain(chains[0], vertexById, allocatedCounts[0], alongGradingBias);
  const right = quadraticChain(chains[1], vertexById, allocatedCounts[1], acrossGradingBias);
  const top = quadraticChain(chains[2], vertexById, allocatedCounts[2], 1 / alongGradingBias).slice().reverse();
  const left = quadraticChain(chains[3], vertexById, allocatedCounts[3], 1 / acrossGradingBias).slice().reverse();

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

function allocateChainSegmentCounts(curves, baseCounts, targetTotal, vertexById) {
  const counts = [...baseCounts];
  let total = counts.reduce((sum, count) => sum + count, 0);
  while (total < targetTotal) {
    let selected = 0;
    let longestCurrentSegment = -Infinity;
    for (let index = 0; index < curves.length; index += 1) {
      const currentSegmentLength = curveLength(curves[index], vertexById) / counts[index];
      if (currentSegmentLength > longestCurrentSegment) {
        selected = index;
        longestCurrentSegment = currentSegmentLength;
      }
    }
    counts[selected] += 1;
    total += 1;
  }
  return counts;
}

function quadraticChain(curves, vertexById, segmentCounts, bias = 1) {
  const chain = [];
  curves.forEach((curve, curveIndex) => {
    const segmentCount = segmentCounts[curveIndex];
    const { cornerPoints, midPoints } = discretizeCurveIntoQuadraticEdges(
      curve, vertexById, segmentCount, { bias },
    );
    if (curveIndex === 0) chain.push(cornerPoints[0].point);
    for (let index = 0; index < segmentCount; index += 1) {
      chain.push(midPoints[index].point, cornerPoints[index + 1].point);
    }
  });
  return chain;
}

function minimumSegmentsFor(curve, vertexById, curvatureRadians) {
  if (curve.type !== 'ARC') return 1;
  return Math.max(1, Math.ceil(Math.abs(arcSweepAngle(curve, vertexById)) / curvatureRadians));
}

/**
 * Geometric grading bias for one chain-pair (e.g. bottom/top), computed from
 * the physical length ratio of the OTHER, perpendicular chain-pair's curves
 * (e.g. right/left): `farCurve`'s length divided by `nearCurve`'s length.
 * The caller only calls this once every one of the four logical sides is a
 * single curve, so a logical side split into multiple curves by a declared
 * feature vertex keeps the original uniform behavior rather than extending
 * an untested grading path to a chain topology this fix was never evidenced
 * against. Returns exactly 1 whenever `farCurve`/`nearCurve` are already
 * equal length -- e.g. every rectangle-based mapped mesh (opposite sides
 * always equal, in both chain-pairs), so this is a no-op there.
 */
function computeGradingBias(farCurve, nearCurve, vertexById) {
  const farLength = curveLength(farCurve, vertexById);
  const nearLength = curveLength(nearCurve, vertexById);
  if (!(farLength > 0) || !(nearLength > 0)) return 1;
  return farLength / nearLength;
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
