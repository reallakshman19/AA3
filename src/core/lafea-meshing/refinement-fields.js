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

/** Deterministic coarsening preview from local target back to global target. */
export function refinementTransitionLadder(globalTargetSize, localTargetSize, growthRatioMax) {
  positiveNumber(globalTargetSize, 'globalTargetSize');
  positiveNumber(localTargetSize, 'localTargetSize');
  if (!(growthRatioMax > 1) || !Number.isFinite(growthRatioMax)) {
    throw new LafeaMeshingError('growthRatioMax must be finite and exceed 1', 'INVALID_GROWTH_RATIO');
  }
  if (!(localTargetSize < globalTargetSize)) {
    throw new LafeaMeshingError('localTargetSize must be smaller than globalTargetSize', 'LOCAL_TARGET_NOT_REFINED');
  }

  const rawStepCount = Math.log(globalTargetSize / localTargetSize) / Math.log(growthRatioMax);
  if (!Number.isFinite(rawStepCount)) {
    throw new LafeaMeshingError('Refinement transition step count is non-finite', 'INVALID_TRANSITION_STEP_COUNT');
  }
  const epsilon = TRANSITION_COMPARE_EPSILON_FACTOR * Number.EPSILON
    * Math.max(1, Math.abs(rawStepCount));
  const growthStepCount = Math.ceil(rawStepCount - epsilon);
  if (!(growthStepCount >= 1 && growthStepCount <= MAXIMUM_TRANSITION_STEPS)) {
    throw new LafeaMeshingError('Refinement transition step count exceeds the supported preview envelope', 'TRANSITION_STEP_LIMIT_EXCEEDED');
  }

  const levels = [localTargetSize];
  for (let step = 1; step < growthStepCount; step += 1) {
    levels.push(Math.min(globalTargetSize, localTargetSize * Math.pow(growthRatioMax, step)));
  }
  levels.push(globalTargetSize);
  const adjacentRatios = levels.slice(1).map((value, index) => value / levels[index]);
  const tolerance = policyTolerance(growthRatioMax);
  if (adjacentRatios.some((ratio) => !(ratio > 1 && ratio <= growthRatioMax + tolerance))) {
    throw new LafeaMeshingError('Derived refinement transition violates the declared growth ratio', 'TRANSITION_GROWTH_RATIO_VIOLATION');
  }
  return Object.freeze({
    globalTargetSize,
    localTargetSize,
    growthRatioMax,
    localToGlobalRatio: localTargetSize / globalTargetSize,
    growthStepCount,
    levels: Object.freeze(levels),
    adjacentRatios: Object.freeze(adjacentRatios),
    maximumObservedRatio: Math.max(...adjacentRatios),
    formula: 'N=CEIL(LOG(H_GLOBAL/H_LOCAL)/LOG(G_MAX)); H_i=MIN(H_GLOBAL,H_LOCAL*G_MAX^i)',
    authority: 'SIZING_POLICY_PREVIEW_ACTUAL_MESH_MUST_PASS_ADJACENCY_GATE',
  });
}

/**
 * Qualify the actual local-to-global size transition of a conforming triangular
 * mesh. Characteristic length is the longest corner edge; adjacency is shared
 * corner edge. No threshold is embedded here: callers supply the governed
 * profile value.
 */
export function qualifyRefinedMeshAdjacentSizeRatio(mesh, maximumAllowed) {
  if (!(Number.isFinite(maximumAllowed) && maximumAllowed > 1)) {
    throw new LafeaMeshingError('maximumAllowed must be finite and exceed 1', 'INVALID_ADJACENT_SIZE_RATIO_LIMIT');
  }
  if (!mesh?.nodes?.length || !mesh?.elements?.length) {
    throw new LafeaMeshingError('A non-empty mesh is required', 'REFINED_MESH_REQUIRED');
  }

  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const characteristicLength = new Map();
  const edgeUsers = new Map();
  for (const element of mesh.elements) {
    if (!['T3', 'T6'].includes(element.elementType)) {
      throw new LafeaMeshingError('Only T3/T6 triangular refinement is qualified', 'REFINED_MESH_FAMILY_INVALID');
    }
    const ids = element.nodeIds.slice(0, 3);
    const corners = ids.map((id) => nodeById.get(id));
    if (corners.some((node) => !node)) {
      throw new LafeaMeshingError('Mesh connectivity references a missing node', 'REFINED_MESH_NODE_MISSING');
    }
    characteristicLength.set(element.elementId, longestCornerEdge(corners));
    ids.forEach((a, index) => {
      const b = ids[(index + 1) % ids.length];
      const key = a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
      const users = edgeUsers.get(key) ?? [];
      users.push(element.elementId);
      edgeUsers.set(key, users);
    });
  }

  const adjacencies = [];
  for (const [edgeKey, rawElementIds] of edgeUsers.entries()) {
    const elementIds = [...new Set(rawElementIds)].sort();
    if (elementIds.length !== 2) continue;
    const values = elementIds.map((id) => characteristicLength.get(id));
    const ratio = Math.max(...values) / Math.min(...values);
    adjacencies.push(Object.freeze({
      nodeIds: Object.freeze(edgeKey.split('\u0000')),
      elementIds: Object.freeze(elementIds),
      minimumCharacteristicLength: Math.min(...values),
      maximumCharacteristicLength: Math.max(...values),
      ratio,
      status: ratio > maximumAllowed + policyTolerance(maximumAllowed) ? 'BLOCK' : 'OK',
    }));
  }
  adjacencies.sort((left, right) => right.ratio - left.ratio
    || left.nodeIds.join('\u0000').localeCompare(right.nodeIds.join('\u0000')));
  const violatingAdjacencies = adjacencies.filter((row) => row.status === 'BLOCK');
  return Object.freeze({
    schema: 'lafea-refined-mesh-adjacent-size-ratio/v1',
    definition: 'MAX_LONGEST_CORNER_EDGE_RATIO_ACROSS_SHARED_CORNER_EDGE_V1',
    maximumAllowed,
    maximumObserved: adjacencies[0]?.ratio ?? 1,
    adjacentEdgeCount: adjacencies.length,
    violatingAdjacencyCount: violatingAdjacencies.length,
    violatingAdjacencies: Object.freeze(violatingAdjacencies),
    blockingElementIds: Object.freeze([...new Set(
      violatingAdjacencies.flatMap((row) => row.elementIds),
    )].sort()),
    qualification: violatingAdjacencies.length ? 'BLOCK' : 'PASS',
  });
}

function longestCornerEdge(corners) {
  const lengths = corners.map((node, index) => {
    const next = corners[(index + 1) % corners.length];
    return Math.hypot(next.x - node.x, next.y - node.y, (next.z ?? 0) - (node.z ?? 0));
  });
  const longest = Math.max(...lengths);
  if (!(longest > 0)) throw new LafeaMeshingError('Degenerate refined element', 'REFINED_MESH_DEGENERATE_ELEMENT');
  return longest;
}

function policyTolerance(value) {
  return TRANSITION_COMPARE_EPSILON_FACTOR * Number.EPSILON * Math.max(1, Math.abs(value));
}
