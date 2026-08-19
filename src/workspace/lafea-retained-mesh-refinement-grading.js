import { refinementTransitionLadder } from '../core/lafea-meshing/refinement-fields.js';

const ROW_HEIGHT_FACTOR = Math.sqrt(3) / 2;
const DISTANCE_TOLERANCE = 1e-12;

/**
 * Deterministic LAFEA.3 local-refinement sizing field.
 *
 * The requested influence radius remains the fully local-size core. Outside
 * that core, one or more radial transition bands reconnect the local lattice
 * to the already-qualified parent global mesh. The last (global) ladder level
 * is intentionally not populated: existing parent points own that region.
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
  let outerRadius = influenceRadius;
  const bands = [{
    bandIndex: 0,
    targetElementLength: transition.levels[0],
    innerRadius: 0,
    outerRadius,
    elementsAcrossBand: null,
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
    bands: bands.map(freeze),
    transitionOuterRadius: outerRadius,
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
