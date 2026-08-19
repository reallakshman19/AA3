import { LafeaMeshingError } from './errors.js';
import { exactKeys, nonEmptyString } from '../shared-analysis-contract/validation.js';
import { finiteNumber, positiveNumber } from '../shared-analysis-contract/numeric.js';

/**
 * Distance-field local refinement (spec §10.2): a target element size at any
 * point is the minimum of the global target size and every declared
 * refinement seed's own local sizing function. Geometric growth away from a
 * seed keeps the adjacent-size ratio bounded by the declared growth ratio —
 * this is the mechanism `adjacentSizeRatioMax` (spec §10.3) is checked
 * against downstream, not enforced by construction alone.
 */

const SEED_FIELDS = Object.freeze(['seedId', 'origin', 'localSize', 'label']);
const TRANSITION_COMPARE_EPSILON_FACTOR = 64;
const MAXIMUM_TRANSITION_STEPS = 256;

export function canonicalRefinementSeed(source) {
  exactKeys(source, SEED_FIELDS, 'refinementSeed');
  const seedId = nonEmptyString(source.seedId, 'refinementSeed.seedId');
  exactKeys(source.origin, ['x', 'y'], `refinementSeed.${seedId}.origin`);
  return Object.freeze({
    seedId,
    origin: Object.freeze({ x: finiteNumber(source.origin.x, `refinementSeed.${seedId}.origin.x`), y: finiteNumber(source.origin.y, `refinementSeed.${seedId}.origin.y`) }),
    localSize: positiveNumber(source.localSize, `refinementSeed.${seedId}.localSize`),
    label: nonEmptyString(source.label, `refinementSeed.${seedId}.label`),
  });
}

export function canonicalRefinementSeedSet(source) {
  if (!Array.isArray(source)) throw new LafeaMeshingError('refinementSeeds must be an array', 'NOT_AN_ARRAY');
  const seen = new Set();
  const seeds = source.map((seed) => {
    const canonical = canonicalRefinementSeed(seed);
    if (seen.has(canonical.seedId)) throw new LafeaMeshingError(`Duplicate refinement seed: ${canonical.seedId}`, 'DUPLICATE_SEED');
    seen.add(canonical.seedId);
    return canonical;
  });
  return Object.freeze(seeds);
}

/**
 * Target element size at `point`: the minimum of the global target size and
 * every seed's geometric-growth sizing function `localSize * growthRatio ^
 * (distance / localSize)`.
 *
 * @param {{x:number,y:number}} point Query point.
 * @param {readonly object[]} seeds Canonical refinement seeds.
 * @param {number} globalTargetSize Field ceiling away from every seed.
 * @param {number} growthRatioMax The mesh profile's `adjacentSizeRatioMax`.
 * @returns {number} Target size at `point`, always positive.
 */
export function sizeAt(point, seeds, globalTargetSize, growthRatioMax) {
  positiveNumber(globalTargetSize, 'globalTargetSize');
  if (!(growthRatioMax > 1)) throw new LafeaMeshingError('growthRatioMax must exceed 1', 'INVALID_GROWTH_RATIO');
  let size = globalTargetSize;
  for (const seed of seeds) {
    const distance = Math.hypot(point.x - seed.origin.x, point.y - seed.origin.y);
    const seedSize = seed.localSize * Math.pow(growthRatioMax, distance / seed.localSize);
    size = Math.min(size, seedSize);
  }
  return size;
}

/**
 * Deterministic engineering preview of the coarsening ladder from a local
 * target back to the global target under a declared maximum adjacent-size
 * growth ratio.
 *
 * This is a sizing-policy calculation, not a claim that a specific generated
 * mesh contains elements at every listed size. The downstream mesh-quality
 * gate must still prove the actual adjacent element-size ratio.
 *
 * For each successive preview level `h_i -> h_(i+1)`:
 *
 *   h_(i+1) <= growthRatioMax * h_i
 *
 * and the final level is exactly `globalTargetSize`.
 */
export function refinementTransitionLadder(globalTargetSize, localTargetSize, growthRatioMax) {
  positiveNumber(globalTargetSize, 'globalTargetSize');
  positiveNumber(localTargetSize, 'localTargetSize');
  if (!(growthRatioMax > 1) || !Number.isFinite(growthRatioMax)) {
    throw new LafeaMeshingError('growthRatioMax must be finite and exceed 1', 'INVALID_GROWTH_RATIO');
  }
  if (!(localTargetSize < globalTargetSize)) {
    throw new LafeaMeshingError(
      'localTargetSize must be smaller than globalTargetSize',
      'LOCAL_TARGET_NOT_REFINED',
    );
  }

  const rawStepCount = Math.log(globalTargetSize / localTargetSize) / Math.log(growthRatioMax);
  if (!Number.isFinite(rawStepCount)) {
    throw new LafeaMeshingError('Refinement transition step count is non-finite', 'INVALID_TRANSITION_STEP_COUNT');
  }
  const epsilon = TRANSITION_COMPARE_EPSILON_FACTOR * Number.EPSILON
    * Math.max(1, Math.abs(rawStepCount));
  const growthStepCount = Math.ceil(rawStepCount - epsilon);
  if (!(growthStepCount >= 1 && growthStepCount <= MAXIMUM_TRANSITION_STEPS)) {
    throw new LafeaMeshingError(
      'Refinement transition step count exceeds the supported preview envelope',
      'TRANSITION_STEP_LIMIT_EXCEEDED',
    );
  }

  const levels = [localTargetSize];
  for (let step = 1; step < growthStepCount; step += 1) {
    levels.push(Math.min(
      globalTargetSize,
      localTargetSize * Math.pow(growthRatioMax, step),
    ));
  }
  levels.push(globalTargetSize);

  const ratios = levels.slice(1).map((value, index) => value / levels[index]);
  const ratioTolerance = TRANSITION_COMPARE_EPSILON_FACTOR * Number.EPSILON
    * Math.max(1, growthRatioMax);
  if (ratios.some((ratio) => !(ratio > 1 && ratio <= growthRatioMax + ratioTolerance))) {
    throw new LafeaMeshingError(
      'Derived refinement transition violates the declared growth ratio',
      'TRANSITION_GROWTH_RATIO_VIOLATION',
    );
  }

  return Object.freeze({
    globalTargetSize,
    localTargetSize,
    growthRatioMax,
    localToGlobalRatio: localTargetSize / globalTargetSize,
    growthStepCount,
    levels: Object.freeze(levels),
    adjacentRatios: Object.freeze(ratios),
    maximumObservedRatio: Math.max(...ratios),
    formula: 'N=CEIL(LOG(H_GLOBAL/H_LOCAL)/LOG(G_MAX)); H_i=MIN(H_GLOBAL,H_LOCAL*G_MAX^i)',
    authority: 'SIZING_POLICY_PREVIEW_ACTUAL_MESH_MUST_PASS_ADJACENCY_GATE',
  });
}
