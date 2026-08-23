import { freezeDeep } from '../dataset-utils.js';

export const SUPPORT_LOAD_STATIC_ACCOUNTING_SCHEMA = 'support-load-static-accounting/v1';

/**
 * Allocates one known vertical load without inventing structural connectivity.
 * Bracketed loads use the statically determinate lever rule. A load outside the
 * qualified support span transfers its vertical force to the nearest qualified
 * support and retains the missing first moment as an explicit cantilever/member
 * transfer demand. With no qualified support the complete force and first
 * moment remain unallocated.
 */
export function allocateSupportPointLoad({ chainageMm, forceN, supports } = {}) {
  const x = finite(chainageMm, 'chainageMm');
  const force = finite(forceN, 'forceN');
  const stations = normalizeSupports(supports);

  if (stations.length === 0) {
    return freezeDeep({
      schema: SUPPORT_LOAD_STATIC_ACCOUNTING_SCHEMA,
      disposition: 'UNALLOCATED_NO_QUALIFIED_SUPPORT',
      allocations: [],
      boundaryTransfers: [],
      unallocated: [{
        applicationChainageMm: x,
        verticalForceN: force,
        firstMomentNmm: force * x,
      }],
    });
  }

  const exact = stations.find((support) => support.chainageMm === x);
  if (exact) {
    return resolvedPoint('REACTION_RESOLVED_ON_SUPPORT', force, exact);
  }

  const lower = [...stations].reverse().find((support) => support.chainageMm < x);
  const upper = stations.find((support) => support.chainageMm > x);
  if (lower && upper) {
    const span = upper.chainageMm - lower.chainageMm;
    return freezeDeep({
      schema: SUPPORT_LOAD_STATIC_ACCOUNTING_SCHEMA,
      disposition: 'REACTION_RESOLVED_BRACKETED',
      allocations: [
        allocation(lower, force * (upper.chainageMm - x) / span),
        allocation(upper, force * (x - lower.chainageMm) / span),
      ],
      boundaryTransfers: [],
      unallocated: [],
    });
  }

  const boundary = lower || upper;
  const eccentricityMm = x - boundary.chainageMm;
  return freezeDeep({
    schema: SUPPORT_LOAD_STATIC_ACCOUNTING_SCHEMA,
    disposition: 'OVERHANG_CANTILEVER_TRANSFER',
    allocations: [allocation(boundary, force)],
    boundaryTransfers: [{
      supportSiteId: boundary.siteId,
      applicationChainageMm: x,
      supportChainageMm: boundary.chainageMm,
      eccentricityMm,
      verticalForceN: force,
      momentDemandNmm: force * eccentricityMm,
    }],
    unallocated: [],
  });
}

/** Split a uniform load at support stations and preserve every piece's custody. */
export function allocateSupportUniformLoad({ startMm, endMm, forceN, supports } = {}) {
  const start = finite(startMm, 'startMm');
  const end = finite(endMm, 'endMm');
  const force = finite(forceN, 'forceN');
  const stations = normalizeSupports(supports);
  const lower = Math.min(start, end);
  const upper = Math.max(start, end);
  const length = upper - lower;
  if (!(length > 0)) {
    return allocateSupportPointLoad({ chainageMm: (start + end) / 2, forceN: force, supports: stations });
  }

  const cuts = [
    lower,
    ...stations.map((row) => row.chainageMm).filter((value) => value > lower && value < upper),
    upper,
  ];
  const allocations = [];
  const boundaryTransfers = [];
  const unallocated = [];
  const dispositions = new Set();
  for (let index = 0; index < cuts.length - 1; index += 1) {
    const pieceStart = cuts[index];
    const pieceEnd = cuts[index + 1];
    const pieceForceN = force * (pieceEnd - pieceStart) / length;
    const piece = allocateSupportPointLoad({
      chainageMm: (pieceStart + pieceEnd) / 2,
      forceN: pieceForceN,
      supports: stations,
    });
    dispositions.add(piece.disposition);
    allocations.push(...piece.allocations);
    boundaryTransfers.push(...piece.boundaryTransfers);
    unallocated.push(...piece.unallocated);
  }

  return freezeDeep({
    schema: SUPPORT_LOAD_STATIC_ACCOUNTING_SCHEMA,
    disposition: combinedDisposition(dispositions),
    allocations: mergeAllocations(allocations),
    boundaryTransfers,
    unallocated,
  });
}

/** Independent force/first-moment custody check for evaluated known loads. */
export function evaluateSupportLoadAccounting({
  evaluatedForceN,
  evaluatedMomentNmm,
  reactionForceN,
  reactionMomentNmm,
  boundaryTransferMomentNmm = 0,
  unallocatedForceN = 0,
  unallocatedMomentNmm = 0,
  forceToleranceN,
  momentToleranceNmm,
} = {}) {
  const evaluatedForce = finite(evaluatedForceN, 'evaluatedForceN');
  const evaluatedMoment = finite(evaluatedMomentNmm, 'evaluatedMomentNmm');
  const reactionForce = finite(reactionForceN, 'reactionForceN');
  const reactionMoment = finite(reactionMomentNmm, 'reactionMomentNmm');
  const boundaryMoment = finite(boundaryTransferMomentNmm, 'boundaryTransferMomentNmm');
  const unallocatedForce = finite(unallocatedForceN, 'unallocatedForceN');
  const unallocatedMoment = finite(unallocatedMomentNmm, 'unallocatedMomentNmm');
  const forceLimit = nonnegative(forceToleranceN, 'forceToleranceN');
  const momentLimit = nonnegative(momentToleranceNmm, 'momentToleranceNmm');
  const forceResidualN = reactionForce + unallocatedForce - evaluatedForce;
  const accountedMomentNmm = reactionMoment + boundaryMoment + unallocatedMoment;
  const momentResidualNmm = accountedMomentNmm - evaluatedMoment;
  return freezeDeep({
    schema: SUPPORT_LOAD_STATIC_ACCOUNTING_SCHEMA,
    status: Math.abs(forceResidualN) <= forceLimit && Math.abs(momentResidualNmm) <= momentLimit
      ? 'PASSED'
      : 'FAILED',
    passed: Math.abs(forceResidualN) <= forceLimit && Math.abs(momentResidualNmm) <= momentLimit,
    evaluatedForceN: evaluatedForce,
    reactionForceN: reactionForce,
    unallocatedForceN: unallocatedForce,
    forceResidualN,
    evaluatedMomentNmm: evaluatedMoment,
    reactionMomentNmm: reactionMoment,
    boundaryTransferMomentNmm: boundaryMoment,
    unallocatedMomentNmm: unallocatedMoment,
    accountedMomentNmm,
    momentResidualNmm,
  });
}

function resolvedPoint(disposition, force, support) {
  return freezeDeep({
    schema: SUPPORT_LOAD_STATIC_ACCOUNTING_SCHEMA,
    disposition,
    allocations: [allocation(support, force)],
    boundaryTransfers: [],
    unallocated: [],
  });
}

function allocation(support, verticalForceN) {
  return {
    siteId: support.siteId,
    verticalForceN,
    chainageMm: support.chainageMm,
  };
}

function normalizeSupports(value) {
  if (!Array.isArray(value)) throw new TypeError('supports must be an array.');
  const rows = value.map((row, index) => ({
    siteId: identity(row?.siteId, `supports[${index}].siteId`),
    chainageMm: finite(row?.chainageMm, `supports[${index}].chainageMm`),
  })).sort((left, right) => left.chainageMm - right.chainageMm || ascii(left.siteId, right.siteId));
  const ids = new Set();
  rows.forEach((row) => {
    if (ids.has(row.siteId)) throw new RangeError(`Duplicate support site: ${row.siteId}.`);
    ids.add(row.siteId);
  });
  return rows;
}

function mergeAllocations(rows) {
  const map = new Map();
  rows.forEach((row) => map.set(row.siteId, {
    ...row,
    verticalForceN: (map.get(row.siteId)?.verticalForceN ?? 0) + row.verticalForceN,
  }));
  return [...map.values()].sort((left, right) => left.chainageMm - right.chainageMm || ascii(left.siteId, right.siteId));
}

function combinedDisposition(dispositions) {
  if (dispositions.size === 1) return [...dispositions][0];
  if (dispositions.has('UNALLOCATED_NO_QUALIFIED_SUPPORT')) return 'MIXED_WITH_UNALLOCATED_LOAD';
  if (dispositions.has('OVERHANG_CANTILEVER_TRANSFER')) return 'MIXED_WITH_OVERHANG_TRANSFER';
  return 'REACTION_RESOLVED_BRACKETED';
}

function identity(value, label) {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty trimmed string.`);
  }
  return value;
}

function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be finite.`);
  return number;
}

function nonnegative(value, label) {
  const number = finite(value, label);
  if (number < 0) throw new RangeError(`${label} must be non-negative.`);
  return number;
}

function ascii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
