import { semanticHash } from '../core/shared-piping-model/canonical-json.js';

export const LFEA_TOPOLOGY_REVIEW_SCHEMA = 'lfea-topology-review/v1';
export const LFEA_TOPOLOGY_REVIEW_FINDING_SCHEMA = 'lfea-topology-review-finding/v1';

export const LFEA_TOPOLOGY_REVIEW_KIND = Object.freeze({
  OVERLAP_CANDIDATE: 'OVERLAP_CANDIDATE',
  COINCIDENT_SUPPORT: 'COINCIDENT_SUPPORT',
  POSSIBLE_DUPLICATE_NODE: 'POSSIBLE_DUPLICATE_NODE',
  UNRESOLVED_CONNECTIVITY: 'UNRESOLVED_CONNECTIVITY',
});

export const LFEA_TOPOLOGY_REVIEW_DISPOSITION = Object.freeze({
  UNRESOLVED: 'UNRESOLVED',
  INFORMATIONAL: 'INFORMATIONAL',
});

const REVIEW_KINDS = new Set(Object.values(LFEA_TOPOLOGY_REVIEW_KIND));
const DISPOSITIONS = new Set(Object.values(LFEA_TOPOLOGY_REVIEW_DISPOSITION));
const REVIEW_STATE = new WeakMap();

/**
 * Build one immutable, read-only topology review model from already-retained
 * diagnostics. This layer deliberately has no geometry/topology mutation API.
 */
export function createLfeaTopologyReviewModel(input) {
  requireRecord(input, 'topologyReviewInput');
  const sourceAuthority = Object.freeze({
    sourceSemanticHash: requireHash(input.sourceAuthority?.sourceSemanticHash, 'sourceSemanticHash'),
    sourceEvidenceHash: requireHash(input.sourceAuthority?.sourceEvidenceHash, 'sourceEvidenceHash'),
    diagnosticsSemanticHash: requireHash(input.sourceAuthority?.diagnosticsSemanticHash, 'diagnosticsSemanticHash'),
    diagnosticsEvidenceHash: requireHash(input.sourceAuthority?.diagnosticsEvidenceHash, 'diagnosticsEvidenceHash'),
  });
  const findings = Object.freeze((input.findings ?? []).map(normalizeFinding).sort(compareFindings));
  const findingIds = new Set();
  for (const finding of findings) {
    if (findingIds.has(finding.findingId)) {
      throw topologyReviewError('E_P02_DUPLICATE_FINDING_ID', `Duplicate topology review finding ID: ${finding.findingId}`);
    }
    findingIds.add(finding.findingId);
  }
  const queues = buildQueues(findings);
  const summary = Object.freeze({
    findingCount: findings.length,
    unresolvedCount: findings.filter((finding) => finding.disposition === 'UNRESOLVED').length,
    overlapCandidateCount: queues.OVERLAP_CANDIDATE.length,
    coincidentSupportCount: queues.COINCIDENT_SUPPORT.length,
    possibleDuplicateNodeCount: queues.POSSIBLE_DUPLICATE_NODE.length,
    unresolvedConnectivityCount: queues.UNRESOLVED_CONNECTIVITY.length,
    mutationApplied: false,
  });
  const semanticHashValue = semanticHash({
    schema: LFEA_TOPOLOGY_REVIEW_SCHEMA,
    sourceAuthority,
    findings: findings.map((finding) => finding.semanticHash),
    summary,
  });
  const model = Object.freeze({
    schema: LFEA_TOPOLOGY_REVIEW_SCHEMA,
    sourceAuthority,
    findings,
    summary,
    semanticHash: semanticHashValue,
  });
  REVIEW_STATE.set(model, {
    byId: new Map(findings.map((finding) => [finding.findingId, finding])),
    queues,
  });
  return model;
}

export function getLfeaTopologyReviewFinding(model, findingId) {
  const state = requireModel(model);
  return state.byId.get(String(findingId)) ?? null;
}

export function getLfeaTopologyReviewQueue(model, kind) {
  const state = requireModel(model);
  const reviewKind = requireKind(kind);
  const findingIds = state.queues[reviewKind];
  return Object.freeze({
    kind: reviewKind,
    count: findingIds.length,
    findingIds,
    digest: semanticHash({ kind: reviewKind, findingIds }),
  });
}

export function listLfeaTopologyReviewQueueSummaries(model) {
  const state = requireModel(model);
  return Object.freeze(Object.values(LFEA_TOPOLOGY_REVIEW_KIND).map((kind) => Object.freeze({
    kind,
    count: state.queues[kind].length,
    findingIds: state.queues[kind],
  })));
}

function normalizeFinding(value) {
  requireRecord(value, 'topologyFinding');
  const findingId = requireText(value.findingId, 'findingId');
  const kind = requireKind(value.kind);
  const disposition = requireDisposition(value.disposition ?? 'UNRESOLVED');
  const sourceEntityIds = uniqueAscii(value.sourceEntityIds ?? []);
  if (sourceEntityIds.length === 0) {
    throw topologyReviewError('E_P02_SOURCE_ENTITY_REQUIRED', `Topology finding ${findingId} requires source entity identity.`);
  }
  const sourcePaths = uniqueAscii(value.sourcePaths ?? []);
  const distanceM = nullableNonnegative(value.distanceM, 'distanceM');
  const toleranceM = nullableNonnegative(value.toleranceM, 'toleranceM');
  if ((distanceM === null) !== (toleranceM === null)) {
    throw topologyReviewError(
      'E_P02_DISTANCE_TOLERANCE_PAIR_REQUIRED',
      `Topology finding ${findingId} must retain distance and tolerance together.`,
    );
  }
  const evidence = deepFreezeClone(value.evidence ?? {});
  const identity = {
    findingId,
    kind,
    severity: requireText(value.severity ?? 'WARN', 'severity').toUpperCase(),
    disposition,
    sourceEntityIds,
    sourcePaths,
    distanceM,
    toleranceM,
    message: requireText(value.message, 'message'),
    technicalBasis: requireText(value.technicalBasis, 'technicalBasis'),
    evidence,
    mutationApplied: false,
  };
  return Object.freeze({
    schema: LFEA_TOPOLOGY_REVIEW_FINDING_SCHEMA,
    ...identity,
    semanticHash: semanticHash({ schema: LFEA_TOPOLOGY_REVIEW_FINDING_SCHEMA, ...identity }),
  });
}

function buildQueues(findings) {
  const queues = Object.fromEntries(Object.values(LFEA_TOPOLOGY_REVIEW_KIND).map((kind) => [kind, []]));
  for (const finding of findings) queues[finding.kind].push(finding.findingId);
  for (const kind of Object.keys(queues)) queues[kind] = Object.freeze(queues[kind]);
  return Object.freeze(queues);
}

function compareFindings(left, right) {
  return compareAscii(left.kind, right.kind) || compareAscii(left.findingId, right.findingId);
}

function requireModel(model) {
  const state = REVIEW_STATE.get(model);
  if (!state || model.summary?.mutationApplied !== false) {
    throw topologyReviewError('E_P02_REVIEW_MODEL_REQUIRED', 'An immutable LFEA topology review model is required.');
  }
  return state;
}

function requireKind(value) {
  const kind = String(value ?? '').trim().toUpperCase();
  if (!REVIEW_KINDS.has(kind)) {
    throw topologyReviewError('E_P02_REVIEW_KIND_INVALID', `Unknown topology review kind: ${value}`);
  }
  return kind;
}

function requireDisposition(value) {
  const disposition = String(value ?? '').trim().toUpperCase();
  if (!DISPOSITIONS.has(disposition)) {
    throw topologyReviewError('E_P02_DISPOSITION_INVALID', `Unknown topology review disposition: ${value}`);
  }
  return disposition;
}

function requireHash(value, field) {
  const text = requireText(value, field);
  if (!/^(?:fnv1a64|sha256):[0-9a-f]+$/u.test(text)) {
    throw topologyReviewError('E_P02_HASH_INVALID', `${field} must be an explicit semantic/evidence hash.`);
  }
  return text;
}

function nullableNonnegative(value, field) {
  if (value === undefined || value === null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw topologyReviewError('E_P02_DISTANCE_INVALID', `${field} must be finite and non-negative.`);
  }
  return Object.is(number, -0) ? 0 : number;
}

function uniqueAscii(values) {
  return Object.freeze([...new Set(values.map((value) => requireText(value, 'sourceIdentity')))].sort(compareAscii));
}

function deepFreezeClone(value) {
  requireRecord(value, 'evidence');
  const clone = structuredClone(value);
  freezeRecursive(clone);
  return clone;
}

function freezeRecursive(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  if (Array.isArray(value)) value.forEach(freezeRecursive);
  else Object.values(value).forEach(freezeRecursive);
  return Object.freeze(value);
}

function requireRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw topologyReviewError('E_P02_RECORD_REQUIRED', `${field} must be a record.`);
  }
}

function requireText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw topologyReviewError('E_P02_FIELD_REQUIRED', `${field} must be a non-empty string.`);
  return text;
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function topologyReviewError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_TOPOLOGY_REVIEW';
  return error;
}
