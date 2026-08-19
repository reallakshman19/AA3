import { refinementTransitionLadder } from '../core/lafea-meshing/refinement-fields.js';

const ROW_HEIGHT_FACTOR = Math.sqrt(3) / 2;
const DISTANCE_TOLERANCE = 1e-12;
const LOCAL_CORE_ELEMENT_COUNT = 1;

/**
 * Return the minimum radial reach needed to place one local-size core element
 * and the requested number of elements across every intermediate governed
 * transition band. The global level is owned by the retained parent mesh.
 */
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
 * Deterministic LAFEA.3 local-refinement sizing field.
 *
 * `influenceRadius` is the total custody radius of the refined zone. It is not
 * merely the local-core radius. One local-size element is retained around the
 * target, then every intermediate level from the governed adjacent-size ladder
 * receives the required transition-band width. The final global level is not
 * populated because the retained parent mesh owns the outer region.
 *
 * The construction therefore cannot silently extend refinement beyond the
 * plan's declared radius. The actual generated child is still qualified by the
 * independent shared-edge adjacency gate before custody; planned grading is
 * never treated as proof of acceptance.
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
  const requiredInfluenceRadius = minimumLafea3RetainedRefinementInfluenceRadius({
    localTargetElementLength,
    globalTargetElementLength,
    adjacentSizeRatioMax,
    minimumElementsPerTransitionBand,
  });
  if (!(influenceRadius + DISTANCE_TOLERANCE >= requiredInfluenceRadius)) {
    fail('LAFEA3_RETAINED_REFINEMENT_INFLUENCE_RADIUS_TOO_SMALL_FOR_GRADED_TRANSITION');
  }

  const canonicalTargets = canonicalTargetPoints(targets);
  const localCoreRadius = localTargetElementLength * LOCAL_CORE_ELEMENT_COUNT;
  let outerRadius = localCoreRadius;
  const bands = [{
    bandIndex: 0,
    targetElementLength: transition.levels[0],
    innerRadius: 0,
    outerRadius,
    elementsAcrossBand: LOCAL_CORE_ELEMENT_COUNT,
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
  if (outerRadius > influenceRadius + DISTANCE_TOLERANCE) {
    fail('LAFEA3_RETAINED_REFINEMENT_GRADED_TRANSITION_EXCEEDS_INFLUENCE_RADIUS');
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
    requiredInfluenceRadius,
    localCoreRadius,
    bands: bands.map(freeze),
    transitionOuterRadius: outerRadius,
    unmodifiedParentAnnulusWidth: Math.max(0, influenceRadius - outerRadius),
    candidates: [...candidatesByKey.values()].sort((a, b) => (
      a.bandIndex - b.bandIndex || a.y - b.y || a.x - b.x
    )),
  });
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