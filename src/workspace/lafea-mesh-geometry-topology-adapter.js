/**
 * Translation from retained `lafea-analysis-geometry/v1` into the canonical
 * core meshing topology (`src/core/lafea-geometry/topology.js`).
 *
 * This module performs no meshing and creates no evidence. It only renames
 * and re-shapes an already-validated planar geometry so the qualified core
 * mesher can consume it: analysis-geometry *segments* become core *curves*,
 * `CIRCULAR_ARC` becomes `ARC` with its centre/radius/direction carried
 * analytically, and the single OUTER loop plus its HOLE loops become one
 * bounded region. Orientation is not corrected here — the analysis-geometry
 * contract already guarantees OUTER counter-clockwise and HOLE clockwise, and
 * a violation is surfaced as an error rather than silently repaired.
 */
import { canonicalTopology } from '../core/lafea-geometry/topology.js';
import { validateLafeaAnalysisGeometry } from './lafea-analysis-geometry-contract.js';

export const LAFEA_MESH_TOPOLOGY_ADAPTER_SCHEMA = 'lafea-mesh-topology-adapter/v1';
export const LAFEA_MESH_TOPOLOGY_REGION_ID = 'LAFEA3_ANALYSIS_REGION';

/**
 * @param {Readonly<object>} geometryValue Retained `lafea-analysis-geometry/v1`.
 * @returns {Readonly<{schema:string, regionId:string, topology:object,
 *   analysisGeometryHash:string, lengthUnit:string, holeLoopIds:readonly string[],
 *   segmentIdByCurveId:Readonly<Record<string,string>>}>}
 */
export function buildLafeaMeshTopology(geometryValue) {
  const geometry = validateLafeaAnalysisGeometry(geometryValue);
  const outerLoops = geometry.loops.filter((loop) => loop.role === 'OUTER');
  if (outerLoops.length !== 1) fail('LAFEA_MESH_TOPOLOGY_OUTER_LOOP_COUNT_INVALID');
  const holeLoops = geometry.loops.filter((loop) => loop.role === 'HOLE');

  const topology = canonicalTopology({
    schema: 'lafea-geometry-topology/v1',
    vertices: geometry.vertices.map((vertex) => ({
      vertexId: vertex.vertexId,
      x: vertex.x,
      y: vertex.y,
    })),
    curves: geometry.segments.map(toCurve),
    loops: geometry.loops.map((loop) => ({
      loopId: loop.loopId,
      curveIds: [...loop.segmentIds],
    })),
    regions: [{
      regionId: LAFEA_MESH_TOPOLOGY_REGION_ID,
      outerLoopId: outerLoops[0].loopId,
      holeLoopIds: holeLoops.map((loop) => loop.loopId),
    }],
  });

  return freeze({
    schema: LAFEA_MESH_TOPOLOGY_ADAPTER_SCHEMA,
    regionId: LAFEA_MESH_TOPOLOGY_REGION_ID,
    topology,
    analysisGeometryHash: geometry.semanticHash,
    lengthUnit: geometry.lengthUnit,
    holeLoopIds: holeLoops.map((loop) => loop.loopId),
    segmentIdByCurveId: Object.fromEntries(
      geometry.segments.map((segment) => [segment.segmentId, segment.segmentId]),
    ),
  });
}

/**
 * The core constrained-Delaunay pass triangulates a simple polygon boundary
 * and rejects a region with holes (`HOLES_NOT_YET_SUPPORTED`). Callers use
 * this to report that limitation up front instead of failing mid-generation.
 */
export function lafeaMeshTopologySupported(adapter) {
  return adapter.holeLoopIds.length === 0;
}

function toCurve(segment) {
  if (segment.type === 'LINE') {
    return {
      curveId: segment.segmentId,
      type: 'LINE',
      startVertexId: segment.startVertexId,
      endVertexId: segment.endVertexId,
      arc: null,
    };
  }
  if (segment.type !== 'CIRCULAR_ARC') fail('LAFEA_MESH_TOPOLOGY_SEGMENT_TYPE_UNSUPPORTED');
  return {
    curveId: segment.segmentId,
    type: 'ARC',
    startVertexId: segment.startVertexId,
    endVertexId: segment.endVertexId,
    arc: {
      center: { x: segment.centerX, y: segment.centerY },
      radius: segment.radius,
      direction: segment.sweep,
    },
  };
}

function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
