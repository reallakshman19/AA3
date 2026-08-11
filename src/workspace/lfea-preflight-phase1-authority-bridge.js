import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { LFEA_PREFLIGHT_FIELD_STATUS } from './lfea-preflight-phase1-schema.js';
import { LFEA_PREFLIGHT_PHASE1_MASTER_AUTHORITY_SCHEMA } from './lfea-preflight-phase1-master-authority.js';

const MASTER_FIELD_RESOLUTION = Object.freeze({
  'material.materialCode': 'materialMap',
  'piping.corrosionAllowanceMm': 'pipingClass',
  'piping.nominalBoreIn': 'pipingClass',
  'piping.scheduleCode': 'pipingClass',
  'piping.wallThicknessMm': 'pipingClass',
});

const STATUS_BY_NAME = Object.freeze({
  RESOLVED_EXACT: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
  RESOLVED_DERIVED: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_DERIVED,
  PROPOSED_REVIEW: LFEA_PREFLIGHT_FIELD_STATUS.PROPOSED_REVIEW,
  BLOCKED_MISSING: LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING,
  BLOCKED_AMBIGUOUS: LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_AMBIGUOUS,
  BLOCKED_CONFLICT: LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT,
  BLOCKED_STALE_SOURCE: LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_STALE_SOURCE,
  NOT_APPLICABLE: LFEA_PREFLIGHT_FIELD_STATUS.NOT_APPLICABLE,
});

const BLOCKING_PRECEDENCE = Object.freeze([
  LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT,
  LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_AMBIGUOUS,
  LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_STALE_SOURCE,
  LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING,
]);

export const LFEA_PREFLIGHT_PHASE1_AUTHORITY_BRIDGE_SCHEMA =
  'lfea-preflight-phase1-authority-bridge/v1';

export function createLfeaPreflightPhase1AuthorityBridge(masterAuthority, sourceModelHash) {
  if (masterAuthority === null || masterAuthority === undefined) return null;
  if (masterAuthority?.schema !== LFEA_PREFLIGHT_PHASE1_MASTER_AUTHORITY_SCHEMA) {
    throw bridgeError('E_P06_MASTER_AUTHORITY_SCHEMA_INVALID', 'Phase-1 master authority schema is invalid.');
  }
  const expectedHash = String(sourceModelHash ?? '').trim();
  const authorityHash = String(masterAuthority?.inventory?.sourceModelHash ?? '').trim();
  if (!expectedHash || expectedHash !== authorityHash) {
    throw bridgeError(
      'E_P06_MASTER_AUTHORITY_SOURCE_MISMATCH',
      'Phase-1 master authority does not belong to the current sealed shared model.',
    );
  }

  const records = Object.freeze({
    pipingClass: indexResolution(masterAuthority.resolutions?.pipingClass, 'pipingClass'),
    materialMap: indexResolution(masterAuthority.resolutions?.materialMap, 'materialMap'),
  });
  return Object.freeze({
    schema: LFEA_PREFLIGHT_PHASE1_AUTHORITY_BRIDGE_SCHEMA,
    sourceModelHash: expectedHash,
    masterAuthoritySemanticHash: requireHash(masterAuthority.semanticHash),
    records,
    semanticHash: semanticHash({
      schema: LFEA_PREFLIGHT_PHASE1_AUTHORITY_BRIDGE_SCHEMA,
      sourceModelHash: expectedHash,
      masterAuthoritySemanticHash: masterAuthority.semanticHash,
    }),
  });
}

export function getLfeaPreflightPhase1MasterEvidence(bridge, lineKey, fieldId) {
  if (bridge === null || bridge === undefined) return null;
  const resolutionKey = MASTER_FIELD_RESOLUTION[fieldId];
  if (!resolutionKey) return null;
  const targetRecord = bridge.records[resolutionKey].get(canonicalLineKey(lineKey)) ?? null;
  if (targetRecord === null) return null;
  const field = targetRecord.fields.find((entry) => entry.field === fieldId) ?? null;
  return field === null ? null : sealMasterEvidence(field, targetRecord.semanticHash);
}

export function combineLfeaPreflightPhase1CellEvidence(baseCell, masterEvidence) {
  if (masterEvidence === null || masterEvidence === undefined) return baseCell;
  const baseEvidence = Object.freeze([...(baseCell.evidence ?? [])]);
  const evidence = Object.freeze([...baseEvidence, masterEvidence]);
  const baseExact = baseCell.status === LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT;
  const masterExact = masterEvidence.status === LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT;

  if (baseExact && masterExact) {
    if (!sameEngineeringValue(baseCell.value, masterEvidence.value)) {
      return combinedCell(baseCell, evidence, {
        value: null,
        status: LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT,
        method: 'EXACT_EVIDENCE_CONFLICT',
      });
    }
    return combinedCell(baseCell, evidence, {
      value: baseCell.value,
      status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
      method: 'EXACT_EVIDENCE_AGREEMENT',
    });
  }

  if (baseExact) {
    if (masterEvidence.status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT
      || masterEvidence.status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_STALE_SOURCE) {
      return combinedCell(baseCell, evidence, {
        value: null,
        status: masterEvidence.status,
        method: 'EXACT_SOURCE_BLOCKED_BY_MASTER_EVIDENCE',
      });
    }
    return combinedCell(baseCell, evidence, {
      value: baseCell.value,
      status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
      method: 'EXACT_SOURCE_WITH_BLOCKED_MASTER_EVIDENCE',
    });
  }

  if (masterExact) {
    if (baseCell.status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT
      || baseCell.status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_STALE_SOURCE) {
      return combinedCell(baseCell, evidence, {
        value: null,
        status: baseCell.status,
        method: 'MASTER_EXACT_BLOCKED_BY_SOURCE_EVIDENCE',
      });
    }
    return combinedCell(baseCell, evidence, {
      value: masterEvidence.value,
      status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
      method: 'GOVERNED_MASTER_EXACT',
    });
  }

  return combinedCell(baseCell, evidence, {
    value: null,
    status: selectBlockingStatus(baseCell.status, masterEvidence.status),
    method: 'BLOCKED_EVIDENCE_COMBINATION',
  });
}

function combinedCell(baseCell, evidence, resolution) {
  const combinedSourceHash = semanticHash({
    evidence: evidence.map((entry) => ({
      sourceKind: entry.sourceKind,
      sourceHash: entry.sourceHash,
      locator: entry.locator,
      status: entry.status,
      value: entry.value,
      method: entry.method,
    })),
  });
  return Object.freeze({
    ...baseCell,
    value: resolution.value,
    status: resolution.status,
    statusText: statusText(resolution.status),
    sourceKind: evidence.map((entry) => entry.sourceKind).join('+'),
    sourceHash: combinedSourceHash,
    locator: evidence.map((entry) => entry.locator ?? 'UNBOUND').join(' | '),
    method: resolution.method,
    candidateCount: evidence.reduce((total, entry) => total + (entry.candidateCount ?? 0), 0),
    evidence,
  });
}

function sealMasterEvidence(field, targetRecordHash) {
  const status = STATUS_BY_NAME[field.status];
  if (status === undefined) {
    throw bridgeError('E_P06_MASTER_AUTHORITY_STATUS_INVALID', `Unsupported master status: ${field.status}`);
  }
  if (isBlocked(status) && field.value !== null) {
    throw bridgeError('E_P06_MASTER_AUTHORITY_BLOCKED_VALUE_NON_NULL', 'Blocked master evidence must remain null.');
  }
  return Object.freeze({
    value: normalizeValue(field.value),
    status,
    statusText: field.status,
    sourceKind: field.sourceKind,
    sourceKey: field.sourceKey,
    sourceHash: field.sourceHash,
    locator: field.locator,
    method: field.matchMethod,
    candidateCount: field.status === 'RESOLVED_EXACT' ? 1 : 0,
    diagnostics: Object.freeze([...(field.diagnostics ?? [])]),
    targetRecordHash,
  });
}

function indexResolution(resolution, label) {
  const index = new Map();
  if (resolution === null || resolution === undefined) return index;
  if (!Array.isArray(resolution.targetRecords)) {
    throw bridgeError('E_P06_MASTER_AUTHORITY_RESOLUTION_INVALID', `${label} resolution has no target records.`);
  }
  for (const record of resolution.targetRecords) {
    const key = canonicalLineKey(record.lineKey);
    if (!key) continue;
    if (index.has(key)) {
      throw bridgeError('E_P06_MASTER_AUTHORITY_LINE_DUPLICATE', `Duplicate sealed authority line key: ${key}`);
    }
    index.set(key, record);
  }
  return index;
}

function selectBlockingStatus(...statuses) {
  for (const candidate of BLOCKING_PRECEDENCE) {
    if (statuses.includes(candidate)) return candidate;
  }
  return LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING;
}

function sameEngineeringValue(left, right) {
  const a = normalizeValue(left);
  const b = normalizeValue(right);
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  if (typeof a === 'string' && typeof b === 'string') return a.trim().toUpperCase() === b.trim().toUpperCase();
  return a === b;
}

function normalizeValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? (Object.is(value, -0) ? 0 : value) : null;
  return value;
}

function canonicalLineKey(value) {
  return String(value ?? '').trim().toUpperCase();
}

function requireHash(value) {
  const hash = String(value ?? '').trim();
  if (!/^fnv1a64:[0-9a-f]{16}$/u.test(hash)) {
    throw bridgeError('E_P06_MASTER_AUTHORITY_HASH_INVALID', 'Phase-1 master authority semantic hash is invalid.');
  }
  return hash;
}

function isBlocked(status) {
  return status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING
    || status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_AMBIGUOUS
    || status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT
    || status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_STALE_SOURCE;
}

function statusText(status) {
  for (const [name, value] of Object.entries(LFEA_PREFLIGHT_FIELD_STATUS)) {
    if (value === status) return name;
  }
  throw bridgeError('E_P06_MASTER_AUTHORITY_STATUS_INVALID', `Unknown Phase-1 field status: ${status}`);
}

function bridgeError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_PREFLIGHT_PHASE1_AUTHORITY_BRIDGE';
  return error;
}
