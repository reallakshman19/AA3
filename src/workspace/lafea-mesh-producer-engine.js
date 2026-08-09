/**
 * The bound analysis-mesh producer: the single place where the qualified core
 * mesher (`src/core/lafea-meshing`) is executed for the LAFEA workbench.
 *
 * Responsibilities, and nothing beyond them: discretize the retained analysis
 * geometry's boundary under a declared target size and curvature tolerance,
 * triangulate it (constrained Delaunay, T6 default), optionally recombine to
 * Q8, then weld the per-element physical node positions the core returns into
 * a canonical `lafea-analysis-mesh/v1` node/element list. This module creates
 * no lifecycle evidence and asserts no authority — see
 * `lafea-mesh-producer-binding.js` for the governed envelope.
 *
 * Two disclosed limitations, surfaced as errors rather than approximated:
 *   - a region with hole loops is rejected (`HOLES_NOT_YET_SUPPORTED` in the
 *     core constrained-Delaunay pass);
 *   - splines are outside the core geometry scope and never reach here.
 */
import {
  boundaryEdgeLookup,
  triangulateRegionAsIndexTriples,
  upgradeToT6,
} from '../core/lafea-meshing/constrained-delaunay-t6.js';
import {
  curveSegmentCount,
  discretizeCurveIntoQuadraticEdges,
  discretizeLoop,
} from '../core/lafea-meshing/boundary-discretization.js';
import { recombineToQ8 } from '../core/lafea-meshing/q8-recombination.js';
import { mappedTransfiniteMesh } from '../core/lafea-meshing/mapped-mitc-mesh.js';
import { arcSweepAngle } from '../core/lafea-geometry/vertex-curve.js';
import {
  LAFEA_MESH_TOPOLOGY_REGION_ID,
  lafeaMeshTopologySupported,
} from './lafea-mesh-geometry-topology-adapter.js';

export const LAFEA_MESH_PRODUCER_ENGINE_SCHEMA = 'lafea-mesh-producer-engine/v1';
export const LAFEA_MESH_PRODUCER_ENGINE_ID = 'LAFEA_CORE_MESHER';
export const LAFEA_MESH_PRODUCER_ENGINE_REVISION = 'LAFEA.10.T6Q8.V1';
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
  if (!lafeaMeshTopologySupported(adapter)) {
    fail('LAFEA_MESH_ENGINE_HOLES_NOT_SUPPORTED');
  }
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
  const sizing = {
    targetSize,
    chordErrorLimit: chordErrorLimitFor(outerLoop, curveById, targetSize),
    curvatureRadians,
  };

  const mapped = family === 'Q8'
    ? tryMappedMesh(outerLoop, curveById, vertexById, sizing)
    : null;
  const result = mapped ?? unstructuredMesh(outerLoop, curveById, vertexById, sizing, family);

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
    ...characteristicLengths(mesh),
  });
}

/**
 * Unstructured fallback: discretize the boundary ring, ear-clip, Lawson-flip,
 * then upgrade to T6 (optionally recombining pairs into Q8).
 *
 * Disclosed limitation: this pass triangulates the boundary polygon only — it
 * inserts no interior (Steiner) points. On a region that is not close to
 * convex-and-well-proportioned, refining the boundary therefore produces more
 * slivers rather than a better mesh, and the profile's own quality gates will
 * report WARNING or BLOCK. That is the honest outcome, not a defect in the
 * gates: interior point insertion / Delaunay refinement is follow-up scope in
 * the core mesher. Prefer the mapped strategy where the topology permits.
 */
function unstructuredMesh(outerLoop, curveById, vertexById, sizing, family) {
  const discretized = discretizeLoop(outerLoop, curveById, vertexById, {
    targetSize: sizing.targetSize,
    chordErrorLimit: sizing.chordErrorLimit,
    minimumSegmentsByCurveId: minimumSegmentsByCurveId(
      outerLoop, curveById, vertexById, sizing.curvatureRadians,
    ),
  });
  const lookup = boundaryEdgeLookup(discretized.edges, discretized.ringCorners);
  const indexTriples = triangulateRegionAsIndexTriples(discretized.ringCorners);
  const coreElements = family === 'Q8'
    ? recombineToQ8(indexTriples, discretized.ringCorners, lookup, true)
    : upgradeToT6(
      indexTriples.points, discretized.ringCorners, indexTriples.triangleTriples, lookup,
    );
  return {
    strategy: 'CONSTRAINED_DELAUNAY',
    strategyReason: family === 'Q8'
      ? 'MAPPED_TOPOLOGY_NOT_AVAILABLE'
      : 'UNSTRUCTURED_ELEMENT_FAMILY_REQUESTED',
    coreElements,
    boundarySegmentCount: discretized.edges.length,
  };
}

/**
 * Structured strategy: a logically-4-sided region is meshed by transfinite
 * (Coons) blending, which places true interior nodes and is exact on every
 * boundary node — including curved sides, since the boundary points come from
 * the analytic curve. Opposite sides are discretized to a common density so
 * the mapped grid is well-formed.
 *
 * Returns null when the region is not 4-sided, so the caller can fall back
 * explicitly rather than receive a silently degraded mapped mesh.
 */
function tryMappedMesh(outerLoop, curveById, vertexById, sizing) {
  if (outerLoop.curveIds.length !== 4) return null;
  const curves = outerLoop.curveIds.map((curveId) => curveById.get(curveId));
  const counts = curves.map((curve) => curveSegmentCount(curve, vertexById, {
    targetSize: sizing.targetSize,
    chordErrorLimit: sizing.chordErrorLimit,
    minimumSegments: minimumSegmentsFor(curve, vertexById, sizing.curvatureRadians),
  }));
  // Sides 0/2 and 1/3 are opposite each other around the loop.
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
  };
}

/** Corner and true analytic midside points interleaved: 2n+1 points. */
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

/**
 * Weld the per-element physical node positions the core returns into a shared
 * node table. Coordinates for a shared corner or midside are produced by the
 * same expression over the same operands in every element that touches them,
 * so they are bit-identical and welding is exact — no distance tolerance is
 * applied, and none is needed.
 */
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
    nodeId: nodeIdByKey.get(node.key),
    x: node.x,
    y: node.y,
    z: 0,
  }));

  const elements = elementNodeKeys
    .map((keys) => ({
      nodeIds: keys.map((key) => nodeIdByKey.get(key)),
      elementType: elementTypeFor(family, keys.length),
    }))
    .sort((left, right) => compareIdLists(left.nodeIds, right.nodeIds))
    .map((element, index) => ({
      elementId: elementId(index),
      elementType: element.elementType,
      nodeIds: element.nodeIds,
    }));

  return freeze({ schema: 'lafea-analysis-mesh/v1', meshIdentity: meshIdentity(family), nodes, elements });
}

/**
 * Q8 recombination is partial by design: unpaired triangles stay T6. The
 * element type therefore follows the actual node count rather than the
 * requested family, so a mixed mesh is reported truthfully.
 */
function elementTypeFor(family, nodeCount) {
  if (family === 'T3') return 'T3';
  if (nodeCount === 8) return 'Q8';
  if (nodeCount === 6) return 'T6';
  fail('LAFEA_MESH_ENGINE_ELEMENT_NODE_COUNT_UNEXPECTED');
  return null;
}

/**
 * Per-element characteristic length is the longest corner-to-corner edge —
 * an explicit choice, reported alongside the mesh rather than folded into a
 * single unqualified "element size".
 */
function characteristicLengths(mesh) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const lengths = mesh.elements.map((element) => {
    const cornerCount = element.elementType === 'Q8' ? 4 : 3;
    const corners = element.nodeIds.slice(0, cornerCount).map((id) => nodeById.get(id));
    let longest = 0;
    for (let index = 0; index < corners.length; index += 1) {
      const a = corners[index];
      const b = corners[(index + 1) % corners.length];
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
 * The declared angular curvature tolerance is enforced exactly, per arc, as a
 * minimum quadratic-edge count. This is the documented `minimumSegmentsByCurveId`
 * hook rather than a second, radius-blind size control.
 */
function minimumSegmentsByCurveId(loop, curveById, vertexById, curvatureRadians) {
  const minimums = new Map();
  for (const curveId of loop.curveIds) {
    const curve = curveById.get(curveId);
    if (curve.type !== 'ARC') continue;
    const sweep = Math.abs(arcSweepAngle(curve, vertexById));
    minimums.set(curveId, Math.max(1, Math.ceil(sweep / curvatureRadians)));
  }
  return minimums;
}

/**
 * The core arc branch requires a positive chord-error limit, but the intent
 * contract declares curvature control as an angle only. Rather than invent a
 * second, undeclared chord-error control, the limit is set to the largest arc
 * radius present: that saturates the core's ratio at 1, giving the coarsest
 * angle it will ever ask for (pi per segment, so at most 2 segments on a full
 * circle). The declared angular tolerance is therefore always the binding
 * control, exactly and without round-off.
 */
function chordErrorLimitFor(loop, curveById, targetSize) {
  const radii = loop.curveIds
    .map((curveId) => curveById.get(curveId))
    .filter((curve) => curve.type === 'ARC')
    .map((curve) => curve.arc.radius);
  if (!radii.length) return targetSize;
  return Math.max(...radii);
}

function requireFamily(value) {
  if (!LAFEA_MESH_ENGINE_ELEMENT_FAMILIES.includes(value)) {
    fail('LAFEA_MESH_ENGINE_ELEMENT_FAMILY_NOT_SUPPORTED');
  }
  return value;
}
function requirePositive(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    fail(`LAFEA_MESH_ENGINE_${field}_INVALID`);
  }
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
