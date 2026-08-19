import { refinementTransitionLadder } from '../core/lafea-meshing/refinement-fields.js';
import { insertInteriorPoint } from '../core/lafea-meshing/interior-refinement-t6.js';
import { edgeKey, lawsonFlip } from '../core/lafea-meshing/constrained-delaunay-t6.js';

const ROW_HEIGHT_FACTOR = Math.sqrt(3) / 2;
const DISTANCE_TOLERANCE = 1e-12;
const RATIO_TOLERANCE = 1e-12;
const LOCAL_CORE_TARGET_LENGTH_FACTOR = 3;

/**
 * Deterministic LAFEA.3 local-refinement sizing field.
 *
 * The retained command influence radius is an upper bound on the fully-local
 * core, not permission to carry the smallest size all the way to a retained
 * coarse boundary. The local core is therefore capped at three local target
 * lengths. Governed transition bands then reconnect that core to the already
 * qualified parent mesh. This prevents a target near a boundary from placing a
 * 15 mm interior lattice directly beside a retained ~30 mm boundary triangle.
 *
 * The last (global) ladder level is intentionally not populated: existing
 * parent points own that region. Actual produced topology remains subject to
 * the measured adjacency gate; this sizing field does not assert acceptance.
 */
export function buildLafea3RetainedRefinementGrading({
  targets,
  localTargetElementLength,
  globalTargetElementLength,
  influenceRadius,
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
  const canonicalTargets = canonicalTargetPoints(targets);
  const localCoreRadius = Math.min(
    influenceRadius,
    localTargetElementLength * LOCAL_CORE_TARGET_LENGTH_FACTOR,
  );
  let outerRadius = localCoreRadius;
  const bands = [{
    bandIndex: 0,
    targetElementLength: transition.levels[0],
    innerRadius: 0,
    outerRadius,
    elementsAcrossBand: LOCAL_CORE_TARGET_LENGTH_FACTOR,
    role: 'LOCAL_CORE',
  }];
  for (let index = 1; index < transition.levels.length - 1; index += 1) {
    const targetElementLength = transition.levels[index];
    const innerRadius = outerRadius;
    const width = minimumElementsPerTransitionBand * targetElementLength;
    outerRadius += width;
    bands.push({
      bandIndex: index,
      targetElementLength,
      innerRadius,
      outerRadius,
      elementsAcrossBand: minimumElementsPerTransitionBand,
      role: 'GRADED_TRANSITION',
    });
  }

  const candidatesByKey = new Map();
  for (const band of bands) {
    for (const target of canonicalTargets) {
      for (const candidate of latticeCandidates(target, band.targetElementLength, band.outerRadius)) {
        const distance = nearestTargetDistance(candidate, canonicalTargets);
        if (distance <= band.innerRadius + DISTANCE_TOLERANCE
          || distance > band.outerRadius + DISTANCE_TOLERANCE) {
          if (!(band.bandIndex === 0 && distance <= band.outerRadius + DISTANCE_TOLERANCE)) continue;
        }
        const key = `${candidate.x},${candidate.y}`;
        const existing = candidatesByKey.get(key);
        if (!existing || band.targetElementLength < existing.targetElementLength) {
          candidatesByKey.set(key, {
            ...candidate,
            bandIndex: band.bandIndex,
            targetElementLength: band.targetElementLength,
          });
        }
      }
    }
  }

  return freeze({
    transition,
    localCoreRadius,
    bands: bands.map(freeze),
    transitionOuterRadius: outerRadius,
    candidates: [...candidatesByKey.values()].sort((a, b) => (
      a.bandIndex - b.bandIndex || a.y - b.y || a.x - b.x
    )),
  });
}

/**
 * Close measured adjacent-size violations on the actual triangulation.
 *
 * Radial size fields are construction guidance only; constrained Delaunay can
 * still connect a small triangle directly to a coarse one. This loop therefore
 * uses the same longest-corner-edge characteristic length as the retained-mesh
 * custody gate. The worst violating shared edge is processed first. Its coarse
 * owner is split at its centroid, the Delaunay property is restored, and the
 * measured topology is re-evaluated. No threshold is weakened.
 */
export function closeLafea3RetainedRefinementAdjacency({
  points,
  triangles,
  constrainedEdgeKeys,
  maximumAdjacentRatio,
  maximumInsertions = Math.max(64, triangles.length * 2),
}) {
  if (!(maximumAdjacentRatio > 1)) {
    fail('LAFEA3_RETAINED_REFINEMENT_ADJACENCY_LIMIT_INVALID');
  }
  if (!Number.isInteger(maximumInsertions) || maximumInsertions < 1) {
    fail('LAFEA3_RETAINED_REFINEMENT_CLOSURE_LIMIT_INVALID');
  }
  let working = triangles.map((triangle) => [...triangle]);
  const initial = triangulationAdjacency(points, working, maximumAdjacentRatio);
  let insertionCount = 0;
  const insertedPointKeys = new Set();

  while (insertionCount < maximumInsertions) {
    const measured = triangulationAdjacency(points, working, maximumAdjacentRatio);
    if (measured.qualification === 'PASS') {
      return {
        triangles: working,
        insertionCount,
        initialMaximumObserved: initial.maximumObserved,
        finalMaximumObserved: measured.maximumObserved,
        finalViolatingAdjacencyCount: 0,
        qualification: 'PASS',
      };
    }

    let inserted = false;
    for (const violation of measured.violations) {
      const coarseTriangleIndex = violation.coarseTriangleIndex;
      const triangle = working[coarseTriangleIndex];
      if (!triangle) continue;
      const centroid = triangleCentroid(triangle, points);
      const key = `${centroid.x},${centroid.y}`;
      if (insertedPointKeys.has(key) || exactPointExists(points, centroid)) continue;
      if (!insertInteriorPoint(points, working, constrainedEdgeKeys, centroid)) continue;
      insertedPointKeys.add(key);
      insertionCount += 1;
      working = lawsonFlip(points, working, constrainedEdgeKeys);
      inserted = true;
      break;
    }
    if (!inserted) {
      const error = new TypeError('LAFEA3_RETAINED_REFINEMENT_ADJACENCY_CLOSURE_STALLED');
      error.code = 'LAFEA3_RETAINED_REFINEMENT_ADJACENCY_CLOSURE_STALLED';
      error.diagnostics = measured;
      throw error;
    }
  }

  const final = triangulationAdjacency(points, working, maximumAdjacentRatio);
  const error = new TypeError('LAFEA3_RETAINED_REFINEMENT_ADJACENCY_CLOSURE_LIMIT_EXCEEDED');
  error.code = 'LAFEA3_RETAINED_REFINEMENT_ADJACENCY_CLOSURE_LIMIT_EXCEEDED';
  error.diagnostics = {
    maximumInsertions,
    insertionCount,
    initialMaximumObserved: initial.maximumObserved,
    finalMaximumObserved: final.maximumObserved,
    finalViolatingAdjacencyCount: final.violatingAdjacencyCount,
  };
  throw error;
}

export function measureLafea3TriangulationAdjacency(points, triangles, maximumAdjacentRatio) {
  return triangulationAdjacency(points, triangles, maximumAdjacentRatio);
}

function triangulationAdjacency(points, triangles, maximumAdjacentRatio) {
  const characteristicLengths = triangles.map((triangle) => triangleCharacteristicLength(triangle, points));
  const owners = new Map();
  triangles.forEach((triangle, triangleIndex) => {
    for (let edge = 0; edge < 3; edge += 1) {
      const key = edgeKey(triangle[edge], triangle[(edge + 1) % 3]);
      const rows = owners.get(key) ?? [];
      rows.push(triangleIndex);
      owners.set(key, rows);
    }
  });

  let maximumObserved = 1;
  let adjacentEdgeCount = 0;
  const violations = [];
  for (const [sharedEdgeKey, edgeOwners] of owners) {
    if (edgeOwners.length !== 2) continue;
    adjacentEdgeCount += 1;
    const [left, right] = edgeOwners;
    const leftLength = characteristicLengths[left];
    const rightLength = characteristicLengths[right];
    const minimum = Math.min(leftLength, rightLength);
    const maximum = Math.max(leftLength, rightLength);
    const ratio = maximum / minimum;
    maximumObserved = Math.max(maximumObserved, ratio);
    if (ratio <= maximumAdjacentRatio + RATIO_TOLERANCE) continue;
    const coarseTriangleIndex = leftLength > rightLength
      ? left
      : rightLength > leftLength
        ? right
        : Math.min(left, right);
    violations.push({
      sharedEdgeKey,
      ownerTriangleIndices: [left, right],
      coarseTriangleIndex,
      minimumCharacteristicLength: minimum,
      maximumCharacteristicLength: maximum,
      ratio,
    });
  }
  violations.sort((a, b) => (
    b.ratio - a.ratio
    || a.sharedEdgeKey.localeCompare(b.sharedEdgeKey)
    || a.coarseTriangleIndex - b.coarseTriangleIndex
  ));
  return {
    maximumAllowed: maximumAdjacentRatio,
    maximumObserved,
    adjacentEdgeCount,
    violatingAdjacencyCount: violations.length,
    violations,
    qualification: violations.length ? 'BLOCK' : 'PASS',
  };
}

function triangleCharacteristicLength(triangle, points) {
  let maximum = 0;
  for (let edge = 0; edge < 3; edge += 1) {
    const a = points[triangle[edge]];
    const b = points[triangle[(edge + 1) % 3]];
    maximum = Math.max(maximum, Math.hypot(b.x - a.x, b.y - a.y));
  }
  return maximum;
}

function triangleCentroid(triangle, points) {
  return {
    x: (points[triangle[0]].x + points[triangle[1]].x + points[triangle[2]].x) / 3,
    y: (points[triangle[0]].y + points[triangle[1]].y + points[triangle[2]].y) / 3,
  };
}

function exactPointExists(points, point) {
  return points.some((candidate) => (
    Math.abs(candidate.x - point.x) <= DISTANCE_TOLERANCE
    && Math.abs(candidate.y - point.y) <= DISTANCE_TOLERANCE
  ));
}

function latticeCandidates(target, spacing, radius) {
  const rows = Math.ceil(radius / (spacing * ROW_HEIGHT_FACTOR));
  const columns = Math.ceil(radius / spacing) + 1;
  const candidates = [];
  for (let row = -rows; row <= rows; row += 1) {
    const y = target.y + row * spacing * ROW_HEIGHT_FACTOR;
    const xOffset = Math.abs(row) % 2 ? spacing / 2 : 0;
    for (let column = -columns; column <= columns; column += 1) {
      const x = target.x + column * spacing + xOffset;
      if (Math.hypot(x - target.x, y - target.y) > radius + DISTANCE_TOLERANCE) continue;
      candidates.push({ x, y });
    }
  }
  return candidates;
}

function canonicalTargetPoints(targets) {
  if (!Array.isArray(targets) || !targets.length) {
    fail('LAFEA3_RETAINED_REFINEMENT_TARGETS_REQUIRED');
  }
  return [...targets]
    .map((target) => ({
      targetId: requiredText(target?.targetId),
      x: finite(target?.x),
      y: finite(target?.y),
    }))
    .sort((a, b) => a.targetId.localeCompare(b.targetId));
}

function nearestTargetDistance(point, targets) {
  return Math.min(...targets.map((target) => Math.hypot(point.x - target.x, point.y - target.y)));
}
function finite(value) {
  if (!Number.isFinite(value)) fail('LAFEA3_RETAINED_REFINEMENT_COORDINATE_INVALID');
  return value;
}
function requiredText(value) {
  if (typeof value !== 'string' || !value.trim()) fail('LAFEA3_RETAINED_REFINEMENT_TARGET_ID_INVALID');
  return value.trim();
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}