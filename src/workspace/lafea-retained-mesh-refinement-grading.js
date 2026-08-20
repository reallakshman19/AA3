import { refinementTransitionLadder } from '../core/lafea-meshing/refinement-fields.js';

const DISTANCE_TOLERANCE = 1e-12;
const LOCAL_CORE_ELEMENT_COUNT = 1;
const BALANCING_LIMIT = 256;
const QUALIFIED_GROWTH = 1.5;
const MINIMUM_INCLUDED_ANGLE_DEG = 75;
const MAXIMUM_SIDE_LENGTH_RATIO = 300 / 90;
const MINIMUM_TARGET_PARAMETRIC_OFFSET = 0.15;

export const LAFEA3_RETAINED_REFINEMENT_MAPPED_POLICY = Object.freeze({
  construction: 'SOURCE_AFFINE_BALANCED_METRIC_GRID_V1',
  maximumTargets: 1,
  segmentType: 'LINE',
  outerSegmentCount: 4,
  holesQualified: false,
  minimumIncludedAngleDeg: MINIMUM_INCLUDED_ANGLE_DEG,
  maximumSideLengthRatio: MAXIMUM_SIDE_LENGTH_RATIO,
  minimumTargetParametricOffset: MINIMUM_TARGET_PARAMETRIC_OFFSET,
  adjacentSizeRatioMax: QUALIFIED_GROWTH,
  elementFamilies: Object.freeze(['T3', 'T6']),
});

/** Minimum radius retained for plan/UI lineage; actual acceptance is topology-based. */
export function minimumLafea3RetainedRefinementInfluenceRadius({
  localTargetElementLength,
  globalTargetElementLength,
  adjacentSizeRatioMax,
  minimumElementsPerTransitionBand = 2,
}) {
  const transition = refinementTransitionLadder(
    globalTargetElementLength,
    localTargetElementLength,
    adjacentSizeRatioMax,
  );
  if (!Number.isInteger(minimumElementsPerTransitionBand)
    || minimumElementsPerTransitionBand < 1) {
    fail('LAFEA3_RETAINED_REFINEMENT_TRANSITION_BAND_WIDTH_INVALID');
  }
  const localCoreRadius = localTargetElementLength * LOCAL_CORE_ELEMENT_COUNT;
  const transitionWidth = transition.levels
    .slice(1, -1)
    .reduce((sum, targetElementLength) => (
      sum + minimumElementsPerTransitionBand * targetElementLength
    ), 0);
  return localCoreRadius + transitionWidth;
}

/**
 * Source-authoritative mapped regeneration for the first qualified LAFEA.3
 * local-refinement envelope. The target is an exact grid station and the two
 * parametric axes are independently balanced in metric space. Planned spacing
 * is never proof: the retained v2 evidence constructor independently recomputes
 * mesh quality and shared-edge adjacency before custody.
 */
export function buildLafea3MappedRetainedRefinementMesh({
  geometry,
  targets,
  elementFamily,
  localTargetElementLength,
  globalTargetElementLength,
  adjacentSizeRatioMax,
  producerRevision,
}) {
  if (!LAFEA3_RETAINED_REFINEMENT_MAPPED_POLICY.elementFamilies.includes(elementFamily)) {
    fail('LAFEA3_RETAINED_REFINEMENT_MAPPED_FAMILY_NOT_QUALIFIED');
  }
  if (!close(adjacentSizeRatioMax, QUALIFIED_GROWTH)) {
    fail('LAFEA3_RETAINED_REFINEMENT_MAPPED_GROWTH_NOT_QUALIFIED');
  }
  positive(localTargetElementLength, 'LOCAL_TARGET');
  positive(globalTargetElementLength, 'GLOBAL_TARGET');
  if (!(localTargetElementLength < globalTargetElementLength)) {
    fail('LAFEA3_RETAINED_REFINEMENT_MAPPED_TARGET_NOT_LOCAL');
  }
  if (!Array.isArray(targets) || targets.length !== 1) {
    fail('LAFEA3_RETAINED_REFINEMENT_MAPPED_SINGLE_TARGET_ONLY');
  }

  const frame = qualifiedAffineFrame(geometry);
  const target = mappedTarget(frame, targets[0]);
  const uAxis = balancedMetricAxis(
    0, frame.lengthA, target.u,
    localTargetElementLength, globalTargetElementLength, adjacentSizeRatioMax,
  );
  const vAxis = balancedMetricAxis(
    0, frame.lengthB, target.v,
    localTargetElementLength, globalTargetElementLength, adjacentSizeRatioMax,
  );
  const rawElements = [];
  for (let j = 0; j < vAxis.coordinates.length - 1; j += 1) {
    for (let i = 0; i < uAxis.coordinates.length - 1; i += 1) {
      const p00 = mapPoint(frame, uAxis.coordinates[i], vAxis.coordinates[j]);
      const p10 = mapPoint(frame, uAxis.coordinates[i + 1], vAxis.coordinates[j]);
      const p11 = mapPoint(frame, uAxis.coordinates[i + 1], vAxis.coordinates[j + 1]);
      const p01 = mapPoint(frame, uAxis.coordinates[i], vAxis.coordinates[j + 1]);
      rawElements.push(rawElement(elementFamily, p00, p10, p11));
      rawElements.push(rawElement(elementFamily, p00, p11, p01));
    }
  }
  const mesh = weld(rawElements, elementFamily, producerRevision);
  const interiorGridPointCount = Math.max(
    1,
    (uAxis.coordinates.length - 2) * (vAxis.coordinates.length - 2),
  );
  return freeze({
    mesh,
    localPointCount: interiorGridPointCount,
    construction: {
      policy: LAFEA3_RETAINED_REFINEMENT_MAPPED_POLICY.construction,
      includedAngleDeg: frame.minimumIncludedAngleDeg,
      sideLengthRatio: frame.sideLengthRatio,
      targetU: target.u,
      targetV: target.v,
      targetUFraction: target.u / frame.lengthA,
      targetVFraction: target.v / frame.lengthB,
      uIntervalCount: uAxis.coordinates.length - 1,
      vIntervalCount: vAxis.coordinates.length - 1,
      maximumAxisIntervalRatio: Math.max(uAxis.maximumRatio, vAxis.maximumRatio),
      balancingInsertions: uAxis.balancingInsertions + vAxis.balancingInsertions,
    },
  });
}

function qualifiedAffineFrame(geometry) {
  if (!geometry || geometry.stageId !== 'LAFEA.3'
    || !Array.isArray(geometry.vertices)
    || !Array.isArray(geometry.segments)
    || !Array.isArray(geometry.loops)) {
    fail('LAFEA3_RETAINED_REFINEMENT_SOURCE_GEOMETRY_NOT_QUALIFIED');
  }
  if (geometry.loops.length !== 1 || geometry.loops[0].role !== 'OUTER'
    || geometry.vertices.length !== 4 || geometry.segments.length !== 4
    || geometry.segments.some((segment) => segment.type !== 'LINE')) {
    fail('LAFEA3_RETAINED_REFINEMENT_SOURCE_GEOMETRY_NOT_QUALIFIED');
  }
  const corners = orderedLoopCorners(geometry);
  const [p0, p1, p2, p3] = corners;
  const a = subtract(p1, p0);
  const b = subtract(p3, p0);
  const lengthA = Math.hypot(a.x, a.y);
  const lengthB = Math.hypot(b.x, b.y);
  const scale = Math.max(1, lengthA, lengthB);
  const tolerance = 1e-9 * scale;
  if (!(lengthA > tolerance) || !(lengthB > tolerance)) {
    fail('LAFEA3_RETAINED_REFINEMENT_SOURCE_GEOMETRY_NOT_QUALIFIED');
  }
  const expectedP2 = { x: p0.x + a.x + b.x, y: p0.y + a.y + b.y };
  if (Math.hypot(p2.x - expectedP2.x, p2.y - expectedP2.y) > tolerance) {
    fail('LAFEA3_RETAINED_REFINEMENT_SOURCE_GEOMETRY_NOT_AFFINE_PARALLELOGRAM');
  }
  const determinant = cross(a, b);
  if (!(determinant > tolerance * tolerance)) {
    fail('LAFEA3_RETAINED_REFINEMENT_SOURCE_GEOMETRY_ORIENTATION_INVALID');
  }
  const angle = Math.acos(clamp(dot(a, b) / (lengthA * lengthB))) * 180 / Math.PI;
  const minimumIncludedAngleDeg = Math.min(angle, 180 - angle);
  if (minimumIncludedAngleDeg + 1e-10 < MINIMUM_INCLUDED_ANGLE_DEG) {
    fail('LAFEA3_RETAINED_REFINEMENT_SOURCE_GEOMETRY_ANGLE_NOT_QUALIFIED');
  }
  const sideLengthRatio = Math.max(lengthA, lengthB) / Math.min(lengthA, lengthB);
  if (sideLengthRatio > MAXIMUM_SIDE_LENGTH_RATIO + 1e-12) {
    fail('LAFEA3_RETAINED_REFINEMENT_SOURCE_GEOMETRY_ASPECT_NOT_QUALIFIED');
  }
  return { origin: p0, a, b, lengthA, lengthB, determinant, minimumIncludedAngleDeg, sideLengthRatio };
}

function orderedLoopCorners(geometry) {
  const vertexById = new Map(geometry.vertices.map((row) => [row.vertexId, row]));
  const segmentById = new Map(geometry.segments.map((row) => [row.segmentId, row]));
  const loopSegments = geometry.loops[0].segmentIds.map((id) => segmentById.get(id));
  if (loopSegments.some((row) => !row)) fail('LAFEA3_RETAINED_REFINEMENT_SOURCE_GEOMETRY_LOOP_INVALID');
  const first = loopSegments[0];
  const ids = [first.startVertexId, first.endVertexId];
  let current = first.endVertexId;
  for (let index = 1; index < loopSegments.length; index += 1) {
    const segment = loopSegments[index];
    if (segment.startVertexId === current) current = segment.endVertexId;
    else if (segment.endVertexId === current) current = segment.startVertexId;
    else fail('LAFEA3_RETAINED_REFINEMENT_SOURCE_GEOMETRY_LOOP_INVALID');
    ids.push(current);
  }
  if (ids.at(-1) !== ids[0] || new Set(ids.slice(0, -1)).size !== 4) {
    fail('LAFEA3_RETAINED_REFINEMENT_SOURCE_GEOMETRY_LOOP_INVALID');
  }
  const corners = ids.slice(0, -1).map((id) => vertexById.get(id));
  if (corners.some((row) => !row)) fail('LAFEA3_RETAINED_REFINEMENT_SOURCE_GEOMETRY_LOOP_INVALID');
  const twiceArea = corners.reduce((sum, point, index) => {
    const next = corners[(index + 1) % corners.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0);
  if (!(twiceArea > 0)) fail('LAFEA3_RETAINED_REFINEMENT_SOURCE_GEOMETRY_ORIENTATION_INVALID');
  return corners;
}

function mappedTarget(frame, value) {
  const x = finite(value?.x, 'TARGET_X');
  const y = finite(value?.y, 'TARGET_Y');
  const r = { x: x - frame.origin.x, y: y - frame.origin.y };
  const s = cross(r, frame.b) / frame.determinant;
  const t = cross(frame.a, r) / frame.determinant;
  const minimum = MINIMUM_TARGET_PARAMETRIC_OFFSET;
  if (s < minimum - 1e-10 || s > 1 - minimum + 1e-10
    || t < minimum - 1e-10 || t > 1 - minimum + 1e-10) {
    fail('LAFEA3_RETAINED_REFINEMENT_TARGET_LOCATION_NOT_QUALIFIED');
  }
  return { u: s * frame.lengthA, v: t * frame.lengthB };
}

function balancedMetricAxis(minimum, maximum, target, local, global, growth) {
  if (!(minimum < target && target < maximum)) {
    fail('LAFEA3_RETAINED_REFINEMENT_MAPPED_TARGET_NOT_INTERIOR');
  }
  const beta = 1 - 1 / growth;
  const cutoffDistance = (global - local) / beta;
  const cutoffMetric = Math.log(global / local) / beta;
  const metricDistance = (distance) => distance <= cutoffDistance
    ? Math.log((local + beta * distance) / local) / beta
    : cutoffMetric + (distance - cutoffDistance) / global;
  const physicalDistance = (metricValue) => metricValue <= cutoffMetric
    ? local * (Math.exp(beta * metricValue) - 1) / beta
    : cutoffDistance + global * (metricValue - cutoffMetric);
  const leftMetric = metricDistance(target - minimum);
  const rightMetric = metricDistance(maximum - target);
  const epsilon = 64 * Number.EPSILON * Math.max(1, leftMetric, rightMetric, growth);
  let leftCount = Math.max(1, Math.ceil(leftMetric - epsilon));
  let rightCount = Math.max(1, Math.ceil(rightMetric - epsilon));
  let balancingInsertions = 0;
  for (; balancingInsertions <= BALANCING_LIMIT; balancingInsertions += 1) {
    const leftFirst = physicalDistance(leftMetric / leftCount);
    const rightFirst = physicalDistance(rightMetric / rightCount);
    const ratio = Math.max(leftFirst, rightFirst) / Math.min(leftFirst, rightFirst);
    if (ratio <= growth + epsilon) break;
    if (leftFirst >= rightFirst) leftCount += 1;
    else rightCount += 1;
  }
  if (balancingInsertions > BALANCING_LIMIT) {
    fail('LAFEA3_RETAINED_REFINEMENT_MAPPED_BALANCING_LIMIT_EXCEEDED');
  }
  const leftStep = leftMetric / leftCount;
  const rightStep = rightMetric / rightCount;
  const left = [];
  for (let index = leftCount; index >= 1; index -= 1) {
    left.push(target - physicalDistance(index * leftStep));
  }
  const right = [];
  for (let index = 1; index <= rightCount; index += 1) {
    right.push(target + physicalDistance(index * rightStep));
  }
  const coordinates = [...left, target, ...right];
  coordinates[0] = minimum;
  coordinates[coordinates.length - 1] = maximum;
  const intervals = coordinates.slice(1).map((coordinate, index) => coordinate - coordinates[index]);
  const ratios = intervals.slice(1).map((interval, index) => (
    Math.max(interval, intervals[index]) / Math.min(interval, intervals[index])
  ));
  return {
    coordinates,
    maximumRatio: ratios.length ? Math.max(...ratios) : 1,
    balancingInsertions,
  };
}

function mapPoint(frame, u, v) {
  return {
    x: frame.origin.x + (u / frame.lengthA) * frame.a.x + (v / frame.lengthB) * frame.b.x,
    y: frame.origin.y + (u / frame.lengthA) * frame.a.y + (v / frame.lengthB) * frame.b.y,
  };
}
function rawElement(family, p0, p1, p2) {
  return family === 'T3'
    ? [p0, p1, p2]
    : [p0, p1, p2, midpoint(p0, p1), midpoint(p1, p2), midpoint(p2, p0)];
}
function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function weld(rawElements, family, revision) {
  const byKey = new Map();
  const keysByElement = rawElements.map((nodes) => nodes.map((node) => {
    const key = `${node.x},${node.y}`;
    if (!byKey.has(key)) byKey.set(key, { x: node.x, y: node.y });
    return key;
  }));
  const ordered = [...byKey.entries()].sort(([, a], [, b]) => a.x - b.x || a.y - b.y);
  const idByKey = new Map(ordered.map(([key], index) => [key, `N${String(index + 1).padStart(6, '0')}`]));
  const nodes = ordered.map(([key, node]) => ({ nodeId: idByKey.get(key), x: node.x, y: node.y, z: 0 }));
  const elements = keysByElement
    .map((keys) => ({ elementType: family, nodeIds: keys.map((key) => idByKey.get(key)) }))
    .sort((a, b) => compareIdLists(a.nodeIds, b.nodeIds))
    .map((row, index) => ({ elementId: `E${String(index + 1).padStart(6, '0')}`, ...row }));
  return freeze({
    schema: 'lafea-analysis-mesh/v1',
    meshIdentity: `LAFEA_CORE_MESHER:${revision}:LOCAL_REFINEMENT:${family}`,
    nodes,
    elements,
  });
}
function compareIdLists(left, right) {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return left.length - right.length;
}
function subtract(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
function cross(a, b) { return a.x * b.y - a.y * b.x; }
function dot(a, b) { return a.x * b.x + a.y * b.y; }
function clamp(value) { return Math.max(-1, Math.min(1, value)); }
function close(a, b) { return Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b)); }
function positive(value, field) { const out = finite(value, field); if (!(out > 0)) fail(`LAFEA3_RETAINED_REFINEMENT_${field}_INVALID`); return out; }
function finite(value, field) { if (typeof value !== 'number' || !Number.isFinite(value)) fail(`LAFEA3_RETAINED_REFINEMENT_${field}_INVALID`); return value; }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
