/** Semantic comparison for immutable LAFEA run-history entries. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { validateLafeaRunHistoryEntry } from './lafea-run-history.js';

export const LAFEA_RUN_COMPARISON_SCHEMA = 'lafea-run-comparison/v1';

export function compareLafeaRunHistoryEntries(leftValue, rightValue) {
  const left = validateLafeaRunHistoryEntry(leftValue);
  const right = validateLafeaRunHistoryEntry(rightValue);
  const reasons = [];
  const stageComparable = left.stageId === right.stageId;
  const profileComparable = left.evidence.profile.lifecycleProfileId
    === right.evidence.profile.lifecycleProfileId;
  const geometryComparable = left.evidence.geometry.analysisGeometryHash
    === right.evidence.geometry.analysisGeometryHash;
  if (!stageComparable) reasons.push('RUN_STAGE_NOT_COMPARABLE');
  if (!profileComparable) reasons.push('RUN_PROFILE_NOT_COMPARABLE');
  if (!geometryComparable) reasons.push('RUN_GEOMETRY_NOT_IDENTICAL');

  const quantities = stageComparable && profileComparable && geometryComparable
    ? compareQuantities(left.evidence.execution.quantities, right.evidence.execution.quantities)
    : skippedQuantities(left, right, reasons);
  const comparableQuantityCount = quantities.filter((row) => row.status === 'COMPARABLE').length;
  const nonComparableQuantityCount = quantities.filter((row) => row.status === 'NON_COMPARABLE').length;
  const status = !stageComparable || !profileComparable
    ? 'NON_COMPARABLE'
    : nonComparableQuantityCount && !comparableQuantityCount
      ? 'NON_COMPARABLE'
      : nonComparableQuantityCount || !geometryComparable
        ? 'PARTIALLY_COMPARABLE'
        : 'COMPARABLE';

  const base = {
    schema: LAFEA_RUN_COMPARISON_SCHEMA,
    leftRunId: left.runId,
    rightRunId: right.runId,
    status,
    reasons: unique(reasons),
    identity: {
      stage: identityDimension('stageId', left.stageId, right.stageId),
      lifecycleProfile: identityDimension(
        'lifecycleProfileId',
        left.evidence.profile.lifecycleProfileId,
        right.evidence.profile.lifecycleProfileId,
      ),
      source: identityDimension(
        'sourceHash', left.evidence.source.sourceHash, right.evidence.source.sourceHash,
      ),
      geometry: identityDimension(
        'analysisGeometryHash',
        left.evidence.geometry.analysisGeometryHash,
        right.evidence.geometry.analysisGeometryHash,
      ),
      mesh: identityDimension('meshHash', left.evidence.mesh.meshHash, right.evidence.mesh.meshHash),
      solver: identityDimension(
        'solverModelHash',
        left.evidence.execution.solverModelHash,
        right.evidence.execution.solverModelHash,
      ),
      result: identityDimension(
        'resultHash', left.evidence.execution.resultHash, right.evidence.execution.resultHash,
      ),
      build: identityDimension('buildSha', left.buildSha, right.buildSha),
    },
    mesh: compareMesh(left.evidence.mesh, right.evidence.mesh),
    verification: {
      left: verificationState(left),
      right: verificationState(right),
      sameBindingStatus: left.evidence.verification.bindingStatus
        === right.evidence.verification.bindingStatus,
    },
    release: {
      left: releaseState(left),
      right: releaseState(right),
      sameBindingStatus: left.evidence.release.bindingStatus === right.evidence.release.bindingStatus,
      sameQualification: left.evidence.release.releaseQualified === right.evidence.release.releaseQualified,
    },
    quantities,
  };
  return deepFreeze({ ...base, semanticHash: canonicalLafeaSha256(base) });
}

function compareMesh(left, right) {
  const l = left.summary ?? {};
  const r = right.summary ?? {};
  return {
    nodeCount: numericDimension('nodeCount', l.nodeCount, r.nodeCount),
    elementCount: numericDimension('elementCount', l.elementCount, r.elementCount),
    declaredTargetElementLength: numericDimension(
      'declaredTargetElementLength', l.declaredTargetElementLength, r.declaredTargetElementLength,
      l.lengthUnit, r.lengthUnit,
    ),
    elementFamily: identityDimension('elementFamily', l.elementFamily, r.elementFamily),
    qualityStatus: identityDimension('qualityStatus', l.qualityStatus, r.qualityStatus),
    warningElementCount: numericDimension('warningElementCount', l.warningElementCount, r.warningElementCount),
    blockingElementCount: numericDimension('blockingElementCount', l.blockingElementCount, r.blockingElementCount),
    t6GeometryQualification: identityDimension(
      't6GeometryQualificationState',
      left.t6GeometryQualification?.state ?? null,
      right.t6GeometryQualification?.state ?? null,
    ),
  };
}

function compareQuantities(leftRows, rightRows) {
  const left = Array.isArray(leftRows) ? leftRows : [];
  const right = Array.isArray(rightRows) ? rightRows : [];
  const leftExact = new Map(left.map((row) => [exactKey(row), row]));
  const rightExact = new Map(right.map((row) => [exactKey(row), row]));
  const rows = [];
  const exactKeys = [...new Set([...leftExact.keys(), ...rightExact.keys()])].sort();
  for (const key of exactKeys) {
    const a = leftExact.get(key);
    const b = rightExact.get(key);
    if (a && b) rows.push(comparableQuantity(a, b));
  }
  const looseKeys = [...new Set([...left, ...right].map(looseKey))].sort();
  for (const key of looseKeys) {
    const a = left.filter((row) => looseKey(row) === key);
    const b = right.filter((row) => looseKey(row) === key);
    if (!a.length || !b.length) continue;
    if (a.some((x) => b.some((y) => exactKey(x) === exactKey(y)))) continue;
    rows.push({
      status: 'NON_COMPARABLE',
      loadCaseId: a[0]?.loadCaseId ?? b[0]?.loadCaseId ?? null,
      quantityId: a[0]?.quantityId ?? b[0]?.quantityId ?? null,
      leftDescriptors: a.map(descriptor),
      rightDescriptors: b.map(descriptor),
      reason: nonComparableReason(a, b),
    });
  }
  return rows;
}

function skippedQuantities(left, right, reasons) {
  const loose = [...new Set([
    ...(left.evidence.execution.quantities ?? []).map(looseKey),
    ...(right.evidence.execution.quantities ?? []).map(looseKey),
  ])].sort();
  return loose.map((key) => {
    const [loadCaseId, quantityId] = key.split('|');
    return {
      status: 'NON_COMPARABLE', loadCaseId, quantityId,
      leftDescriptors: [], rightDescriptors: [], reason: reasons[0] ?? 'RUN_QUANTITY_CONTEXT_NOT_COMPARABLE',
    };
  });
}

function comparableQuantity(left, right) {
  const delta = right.value - left.value;
  const scale = Math.max(Math.abs(left.value), Math.abs(right.value));
  const nearZero = scale <= 1e-12;
  return {
    status: 'COMPARABLE',
    ...descriptor(left),
    leftValue: left.value,
    rightValue: right.value,
    delta,
    relativeChange: nearZero ? null : delta / Math.max(Math.abs(left.value), 1e-12),
    relativeChangeStatus: nearZero ? 'NOT_APPLICABLE_NEAR_ZERO' : 'AVAILABLE',
  };
}

function nonComparableReason(left, right) {
  if (new Set([...left, ...right].map((row) => row.interpretation)).size > 1) {
    return 'QUANTITY_INTERPRETATION_MISMATCH';
  }
  if (new Set([...left, ...right].map((row) => `${row.locationKind}:${row.locationId}`)).size > 1) {
    return 'QUANTITY_PHYSICAL_LOCATION_MISMATCH';
  }
  if (new Set([...left, ...right].map((row) => row.unit ?? '')).size > 1) return 'QUANTITY_UNIT_MISMATCH';
  return 'QUANTITY_DESCRIPTOR_MISMATCH';
}

function descriptor(row) {
  return {
    loadCaseId: row.loadCaseId,
    quantityId: row.quantityId,
    locationKind: row.locationKind,
    locationId: row.locationId,
    interpretation: row.interpretation,
    unit: row.unit ?? null,
  };
}
function exactKey(row) { return JSON.stringify(descriptor(row)); }
function looseKey(row) { return `${row.loadCaseId}|${row.quantityId}`; }
function identityDimension(name, left, right) { return { name, left, right, same: left === right }; }
function numericDimension(name, left, right, leftUnit = null, rightUnit = leftUnit) {
  const compatible = Number.isFinite(left) && Number.isFinite(right) && leftUnit === rightUnit;
  return {
    name, left: left ?? null, right: right ?? null, leftUnit, rightUnit,
    status: compatible ? 'COMPARABLE' : 'NON_COMPARABLE',
    delta: compatible ? right - left : null,
    reason: compatible ? null : leftUnit !== rightUnit ? 'UNIT_MISMATCH' : 'VALUE_NOT_NUMERIC',
  };
}
function verificationState(entry) { return {
  bindingStatus: entry.evidence.verification.bindingStatus,
  method: entry.evidence.verification.method,
  retainedIdentity: entry.evidence.verification.retainedIdentity,
}; }
function releaseState(entry) { return {
  bindingStatus: entry.evidence.release.bindingStatus,
  releaseQualified: entry.evidence.release.releaseQualified,
  recordId: entry.evidence.release.recordId,
}; }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function deepFreeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(deepFreeze); return Object.freeze(value); }
