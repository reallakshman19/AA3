import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA4_SHELL_GRADED_TRANSITION_PLAN_SCHEMA =
  'lafea4-shell-graded-transition-plan/v1';
export const LAFEA4_SHELL_GRADED_TRANSITION_POLICY = Object.freeze({
  executionScope: 'QUALIFICATION_HARNESS_ONLY',
  minimumElementsPerTransitionBand: 2,
  boundarySubdivisionPolicy: 'SPLIT_PARENT_UV_EDGE_PRESERVE_PARENT_EDGE_ID_V1',
  sizeFieldPolicy: 'PIECEWISE_RADIAL_BANDS_GROWTH_BOUNDED_V1',
  productionBindingAuthorized: false,
  releaseQualified: false,
});

/** Deterministic grading/boundary plan; this module does not execute a mesh. */
export function buildLafea4ShellGradedTransitionPlan(value) {
  const globalSize = positive(value?.globalTargetElementLength, 'GLOBAL_TARGET');
  const localSize = positive(value?.localTargetElementLength, 'LOCAL_TARGET');
  const growth = positive(value?.adjacentSizeRatioMax, 'ADJACENT_SIZE_RATIO_MAX');
  if (!(localSize < globalSize)) fail('LAFEA4_GRADED_TRANSITION_LOCAL_NOT_SMALLER_THAN_GLOBAL');
  if (!(growth > 1)) fail('LAFEA4_GRADED_TRANSITION_GROWTH_MUST_EXCEED_ONE');
  const minimumElementsPerBand = integerAtLeast(
    value?.minimumElementsPerTransitionBand
      ?? LAFEA4_SHELL_GRADED_TRANSITION_POLICY.minimumElementsPerTransitionBand,
    1,
    'MINIMUM_ELEMENTS_PER_BAND',
  );
  const targets = canonicalTargets(value?.targets);
  const boundaryEdges = canonicalBoundaryEdges(value?.boundaryEdges ?? []);

  const levels = sizeLevels(localSize, globalSize, growth);
  const transitionLevelCount = levels.length - 1;
  const theoreticalMinimumTransitionLevelCount = Math.ceil(
    Math.log(globalSize / localSize) / Math.log(growth),
  );
  if (transitionLevelCount !== theoreticalMinimumTransitionLevelCount) {
    fail('LAFEA4_GRADED_TRANSITION_LEVEL_COUNT_INTERNAL_MISMATCH');
  }

  let radius = 0;
  const bands = levels.slice(0, -1).map((size, index) => {
    const innerRadius = radius;
    const width = minimumElementsPerBand * size;
    radius += width;
    return Object.freeze({
      bandIndex: index,
      targetElementLength: size,
      innerRadius,
      outerRadius: radius,
      width,
      elementsAcrossBand: minimumElementsPerBand,
      growthToNext: levels[index + 1] / size,
    });
  });
  const influenceRadius = radius;

  const boundarySubdivisions = boundaryEdges.map((edge) => {
    const midpoint = {
      u: (edge.start.u + edge.end.u) / 2,
      v: (edge.start.v + edge.end.v) / 2,
    };
    // Use the closest point on the entire parent edge, not merely its midpoint.
    // This is conservative for a long edge crossing more than one size band:
    // the whole edge is split at the finest size required anywhere on it.
    const distanceToNearestTarget = nearestTargetToSegmentDistance(edge, targets);
    const requestedSize = sizeAtDistance(distanceToNearestTarget, levels, bands);
    const length = Math.hypot(edge.end.u - edge.start.u, edge.end.v - edge.start.v);
    const segmentCount = Math.max(1, Math.ceil(length / requestedSize));
    const segmentLength = length / segmentCount;
    const splitFractions = Object.freeze(
      Array.from({ length: Math.max(0, segmentCount - 1) }, (_, index) => (
        (index + 1) / segmentCount
      )),
    );
    return Object.freeze({
      parentBoundaryEdgeId: edge.parentBoundaryEdgeId,
      role: edge.role,
      start: edge.start,
      end: edge.end,
      parentLength: length,
      midpoint,
      distanceToNearestTarget,
      requestedTargetElementLength: requestedSize,
      segmentCount,
      segmentLength,
      splitFractions,
      parentIdentityPreserved: true,
    });
  });

  const ratios = levels.slice(0, -1).map((size, index) => levels[index + 1] / size);
  const maximumPlannedGrowthRatio = Math.max(...ratios);
  if (maximumPlannedGrowthRatio > growth + 64 * Number.EPSILON) {
    fail('LAFEA4_GRADED_TRANSITION_PLANNED_GROWTH_EXCEEDS_POLICY');
  }

  const core = {
    schema: LAFEA4_SHELL_GRADED_TRANSITION_PLAN_SCHEMA,
    executionScope: LAFEA4_SHELL_GRADED_TRANSITION_POLICY.executionScope,
    productionBindingAuthorized: false,
    globalTargetElementLength: globalSize,
    localTargetElementLength: localSize,
    adjacentSizeRatioMax: growth,
    minimumElementsPerTransitionBand: minimumElementsPerBand,
    theoreticalMinimumTransitionLevelCount,
    transitionLevelCount,
    levels: Object.freeze(levels),
    levelRatios: Object.freeze(ratios),
    maximumPlannedGrowthRatio,
    bands: Object.freeze(bands),
    influenceRadius,
    targets,
    boundarySubdivisions: Object.freeze(boundarySubdivisions),
    boundarySubdivisionPolicy: LAFEA4_SHELL_GRADED_TRANSITION_POLICY.boundarySubdivisionPolicy,
    sizeFieldPolicy: LAFEA4_SHELL_GRADED_TRANSITION_POLICY.sizeFieldPolicy,
    releaseQualified: false,
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea4-shell-graded-transition-plan-hash-input/v1', plan: core,
    }),
  });
}

export function lafea4ShellGradedSizeAt(plan, u, v) {
  if (!plan || plan.schema !== LAFEA4_SHELL_GRADED_TRANSITION_PLAN_SCHEMA) {
    fail('LAFEA4_GRADED_TRANSITION_PLAN_REQUIRED');
  }
  const query = { u: finite(u, 'U'), v: finite(v, 'V') };
  return sizeAtDistance(nearestDistance(query, plan.targets), plan.levels, plan.bands);
}

function sizeLevels(local, global, growth) {
  const levels = [local];
  let current = local;
  while (current * growth < global - 64 * Number.EPSILON * Math.max(1, global)) {
    current *= growth;
    levels.push(current);
    if (levels.length > 128) fail('LAFEA4_GRADED_TRANSITION_LEVEL_LIMIT');
  }
  levels.push(global);
  return levels;
}
function sizeAtDistance(distance, levels, bands) {
  for (let index = 0; index < bands.length; index += 1) {
    if (distance <= bands[index].outerRadius + 64 * Number.EPSILON) return levels[index];
  }
  return levels.at(-1);
}
function canonicalTargets(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) {
    fail('LAFEA4_GRADED_TRANSITION_TARGETS_INVALID');
  }
  const seen = new Set();
  return Object.freeze(value.map((row) => {
    const targetId = text(row?.targetId, 'TARGET_ID');
    if (seen.has(targetId)) fail('LAFEA4_GRADED_TRANSITION_TARGET_ID_DUPLICATE');
    seen.add(targetId);
    return Object.freeze({ targetId, u: finite(row.u, 'TARGET_U'), v: finite(row.v, 'TARGET_V') });
  }).sort((a, b) => a.targetId.localeCompare(b.targetId)));
}
function canonicalBoundaryEdges(value) {
  if (!Array.isArray(value)) fail('LAFEA4_GRADED_TRANSITION_BOUNDARY_EDGES_INVALID');
  const seen = new Set();
  return Object.freeze(value.map((row) => {
    const id = text(row?.parentBoundaryEdgeId, 'BOUNDARY_EDGE_ID');
    if (seen.has(id)) fail('LAFEA4_GRADED_TRANSITION_BOUNDARY_EDGE_ID_DUPLICATE');
    seen.add(id);
    const start = point(row?.start, 'BOUNDARY_START');
    const end = point(row?.end, 'BOUNDARY_END');
    if (Math.hypot(end.u - start.u, end.v - start.v) <= 0) {
      fail('LAFEA4_GRADED_TRANSITION_BOUNDARY_EDGE_DEGENERATE');
    }
    return Object.freeze({
      parentBoundaryEdgeId: id,
      role: member(row?.role ?? 'OUTER', ['OUTER', 'HOLE'], 'BOUNDARY_ROLE'),
      start,
      end,
    });
  }).sort((a, b) => a.parentBoundaryEdgeId.localeCompare(b.parentBoundaryEdgeId)));
}
function nearestDistance(pointValue, targets) {
  return Math.min(...targets.map((target) => Math.hypot(pointValue.u - target.u, pointValue.v - target.v)));
}
function nearestTargetToSegmentDistance(edge, targets) {
  return Math.min(...targets.map((target) => pointSegmentDistance(target, edge.start, edge.end)));
}
function pointSegmentDistance(pointValue, start, end) {
  const du = end.u - start.u;
  const dv = end.v - start.v;
  const length2 = du * du + dv * dv;
  if (!(length2 > 0)) return Math.hypot(pointValue.u - start.u, pointValue.v - start.v);
  const t = Math.max(0, Math.min(1,
    ((pointValue.u - start.u) * du + (pointValue.v - start.v) * dv) / length2));
  return Math.hypot(
    pointValue.u - (start.u + t * du),
    pointValue.v - (start.v + t * dv),
  );
}
function point(value, field) {
  return Object.freeze({ u: finite(value?.u, `${field}_U`), v: finite(value?.v, `${field}_V`) });
}
function positive(value, field) {
  const out = finite(value, field);
  if (!(out > 0)) fail(`LAFEA4_GRADED_TRANSITION_${field}_NOT_POSITIVE`);
  return out;
}
function integerAtLeast(value, minimum, field) {
  if (!Number.isInteger(value) || value < minimum) fail(`LAFEA4_GRADED_TRANSITION_${field}_INVALID`);
  return value;
}
function finite(value, field) {
  if (!Number.isFinite(value)) fail(`LAFEA4_GRADED_TRANSITION_${field}_INVALID`);
  return value;
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA4_GRADED_TRANSITION_${field}_INVALID`);
  return value.trim();
}
function member(value, values, field) {
  if (!values.includes(value)) fail(`LAFEA4_GRADED_TRANSITION_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
