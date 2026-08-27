import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { freezeDeep, stringValue } from '../dataset-utils.js';
import {
  requireEmpiricalComponentLoadAuthorityAudit,
} from './empirical-component-load-authority.js';
import {
  EMPIRICAL_COMPONENT_MOMENT_DISPOSITION,
} from './empirical-component-moment-demand.js';

export const CURRENT_COMMON_INPUT_EXPLICIT_MOMENT_RETENTION_SCHEMA =
  'current-common-input-explicit-moment-retention/v1';

const EXPLICIT_MOMENT_UNSUPPORTED = 'EMPIRICAL_COMPONENT_EXPLICIT_MOMENT_UNSUPPORTED';

/**
 * Converts source-explicit point-moment evidence already present in the
 * component-load authority audit into a separate, hash-bound support/civil
 * demand receipt. It deliberately does not inspect or distribute CoG gravity
 * couples and it never changes vertical reactions.
 */
export function createCurrentCommonInputExplicitMomentRetention({
  componentAuthorityAudit,
} = {}) {
  const audit = requireEmpiricalComponentLoadAuthorityAudit(componentAuthorityAudit);
  const records = [];
  const blockers = [];

  for (const authorityRecord of audit.records || []) {
    const explicit = authorityRecord.explicitMoment;
    if (!explicit || explicit.magnitudeNm === 0) continue;

    const magnitudeNm = Number(explicit.magnitudeNm);
    const axis = stringValue(explicit.axis);
    const applicationChainageMm = finite(authorityRecord.candidateChainageMm)
      ?? finite(authorityRecord.currentMethodPointChainageMm);
    const routeId = stringValue(authorityRecord.routeId);

    if (!(magnitudeNm > 0) || !axis) {
      blockers.push(blocker('CURRENT_COMMON_INPUT_EXPLICIT_MOMENT_INVALID', authorityRecord));
      continue;
    }
    if (!routeId || applicationChainageMm === null) {
      blockers.push(blocker('CURRENT_COMMON_INPUT_EXPLICIT_MOMENT_LOCATION_UNRESOLVED', authorityRecord));
      continue;
    }

    records.push(freezeDeep({
      retentionId: `SOURCE_EXPLICIT:${authorityRecord.entityId}:${axis}`,
      demandKind: 'SOURCE_EXPLICIT_POINT_MOMENT',
      entityId: authorityRecord.entityId,
      sourceEntityId: authorityRecord.sourceEntityId || null,
      routeId,
      loadCaseId: 'SOURCE_DECLARED_UNSCOPED',
      applicationChainageMm,
      axis,
      axisBasis: 'SOURCE_DECLARED_AXIS',
      magnitudeNm,
      sourceEvidenceSemanticHash: semanticHash({
        magnitudeEvidence: explicit.magnitudeEvidence || null,
        axisEvidence: explicit.axisEvidence || null,
      }),
      disposition: EMPIRICAL_COMPONENT_MOMENT_DISPOSITION,
      verticalReactionDistribution: 'NOT_PERFORMED',
    }));
  }

  records.sort((left, right) => ascii(left.retentionId, right.retentionId));
  blockers.sort((left, right) => ascii(
    `${left.entityId}|${left.code}`,
    `${right.entityId}|${right.code}`,
  ));

  const unsupportedAuthorityIds = (audit.records || [])
    .filter((row) => (row.blockers || []).some((item) => item.code === EXPLICIT_MOMENT_UNSUPPORTED))
    .map((row) => row.entityId)
    .sort(ascii);
  const retainedEntityIds = records.map((row) => row.entityId).sort(ascii);
  const base = {
    schema: CURRENT_COMMON_INPUT_EXPLICIT_MOMENT_RETENTION_SCHEMA,
    datasetId: audit.datasetId,
    datasetVersion: audit.datasetVersion,
    sourceDatasetHash: audit.sourceDatasetHash,
    sharedModelSemanticHash: audit.sharedModelSemanticHash,
    routePartitionModelSemanticHash: audit.routePartitionModelSemanticHash,
    projectDataProfileSemanticHash: audit.projectDataProfileSemanticHash,
    componentLoadAuthorityAuditSemanticHash: audit.semanticHash,
    status: blockers.length > 0
      ? 'BLOCKED'
      : records.length > 0 ? 'RETAINED' : 'NOT_APPLICABLE',
    records,
    blockers,
    summary: {
      retainedDemandCount: records.length,
      retainedEntityIds,
      unsupportedAuthorityEntityIds: unsupportedAuthorityIds,
      allUnsupportedExplicitMomentsRetained: unsupportedAuthorityIds.length > 0
        && unsupportedAuthorityIds.every((entityId) => retainedEntityIds.includes(entityId)),
    },
    numericalVerticalReactionMethodChanged: false,
    verticalReactionDistributionPerformed: false,
  };
  return requireCurrentCommonInputExplicitMomentRetention({
    ...base,
    semanticHash: semanticHash(base),
  });
}

export function requireCurrentCommonInputExplicitMomentRetention(value) {
  if (!isRecord(value)
      || value.schema !== CURRENT_COMMON_INPUT_EXPLICIT_MOMENT_RETENTION_SCHEMA) {
    fail(
      'Expected a current Common Input explicit-moment retention receipt.',
      'CURRENT_COMMON_INPUT_EXPLICIT_MOMENT_RETENTION_INVALID',
    );
  }
  if (!['BLOCKED', 'RETAINED', 'NOT_APPLICABLE'].includes(value.status)
      || !Array.isArray(value.records)
      || !Array.isArray(value.blockers)) {
    fail(
      'Explicit-moment retention status/records/blockers are invalid.',
      'CURRENT_COMMON_INPUT_EXPLICIT_MOMENT_RETENTION_INVALID',
    );
  }
  const ids = value.records.map((row) => row?.retentionId);
  if (ids.some((id) => !stringValue(id))
      || new Set(ids).size !== ids.length
      || !strictlySorted(ids)) {
    fail(
      'Explicit-moment retention IDs must be non-empty, unique and sorted.',
      'CURRENT_COMMON_INPUT_EXPLICIT_MOMENT_RETENTION_ORDER_INVALID',
    );
  }
  for (const row of value.records) validateRecord(row);
  if (value.status === 'RETAINED' && (value.records.length === 0 || value.blockers.length > 0)) {
    fail(
      'RETAINED explicit-moment custody requires records and zero blockers.',
      'CURRENT_COMMON_INPUT_EXPLICIT_MOMENT_RETENTION_STATE_INVALID',
    );
  }
  if (value.status === 'NOT_APPLICABLE' && (value.records.length > 0 || value.blockers.length > 0)) {
    fail(
      'NOT_APPLICABLE explicit-moment custody must be empty.',
      'CURRENT_COMMON_INPUT_EXPLICIT_MOMENT_RETENTION_STATE_INVALID',
    );
  }
  if (value.numericalVerticalReactionMethodChanged !== false
      || value.verticalReactionDistributionPerformed !== false) {
    fail(
      'Explicit-moment retention must never alter or distribute vertical reactions.',
      'CURRENT_COMMON_INPUT_EXPLICIT_MOMENT_REACTION_BOUNDARY_INVALID',
    );
  }
  const { semanticHash: supplied, ...base } = value;
  if (supplied !== semanticHash(base)) {
    fail(
      'Explicit-moment retention semantic hash is stale.',
      'CURRENT_COMMON_INPUT_EXPLICIT_MOMENT_RETENTION_HASH_MISMATCH',
    );
  }
  return freezeDeep(value);
}

function validateRecord(row) {
  if (!isRecord(row)
      || row.demandKind !== 'SOURCE_EXPLICIT_POINT_MOMENT'
      || !stringValue(row.entityId)
      || !stringValue(row.routeId)
      || !stringValue(row.axis)
      || !(Number(row.magnitudeNm) > 0)
      || finite(row.applicationChainageMm) === null
      || row.disposition !== EMPIRICAL_COMPONENT_MOMENT_DISPOSITION
      || row.verticalReactionDistribution !== 'NOT_PERFORMED') {
    fail(
      'Explicit-moment retention record is invalid.',
      'CURRENT_COMMON_INPUT_EXPLICIT_MOMENT_RETENTION_RECORD_INVALID',
    );
  }
}

function blocker(code, authorityRecord) {
  return freezeDeep({
    code,
    entityId: authorityRecord.entityId || null,
    routeId: authorityRecord.routeId || null,
  });
}

function finite(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function strictlySorted(values) {
  for (let index = 1; index < values.length; index += 1) {
    if (ascii(values[index - 1], values[index]) >= 0) return false;
  }
  return true;
}

function ascii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function fail(message, code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}
