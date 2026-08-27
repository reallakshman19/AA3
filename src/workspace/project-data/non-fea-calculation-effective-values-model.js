import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { freezeDeep, isRecord, stringValue } from '../dataset-utils.js';
import { getNonFeaFieldDefinition } from './non-fea-field-registry.js';

export const NON_FEA_CALCULATION_EFFECTIVE_VALUES_INSPECTION_SCHEMA =
  'non-fea-calculation-effective-values-inspection/v1';
export const NON_FEA_CURRENT_FIELD_RESOLUTION_LEDGER_SCHEMA =
  'non-fea-field-resolution-ledger/v1';

/**
 * Read-only engineer-facing projection of the current Common Input resolver.
 *
 * This function never resolves authority, changes precedence, creates evidence,
 * or promotes a default. It only projects the winner and candidate custody that
 * already exist in `non-fea-field-resolution-ledger/v1`.
 */
export function createCalculationEffectiveValuesInspection(resolutionLedger) {
  requireResolutionLedger(resolutionLedger);
  const rows = resolutionLedger.rows
    .map(projectResolutionRow)
    .sort((left, right) => compareText(left.resolutionKey, right.resolutionKey));
  const resolvedRows = rows.filter((row) => row.status === 'RESOLVED');
  const blockedRows = rows.filter((row) => row.status === 'BLOCKED');
  const unresolvedRows = rows.filter((row) => row.status !== 'RESOLVED' && row.status !== 'BLOCKED');
  const base = {
    schema: NON_FEA_CALCULATION_EFFECTIVE_VALUES_INSPECTION_SCHEMA,
    sourceSchema: resolutionLedger.schema,
    sourceResolutionStatus: stringValue(resolutionLedger.status) || null,
    sourceResolutionSemanticHash: stringValue(resolutionLedger.semanticHash) || null,
    rows,
    summary: {
      rowCount: rows.length,
      resolvedCount: resolvedRows.length,
      blockedCount: blockedRows.length,
      unresolvedCount: unresolvedRows.length,
      sourceExplicitCount: selectedAuthorityCount(resolvedRows, 'SOURCE_EXPLICIT'),
      sourceInheritedCount: selectedAuthorityCount(resolvedRows, 'SOURCE_INHERITED'),
      exactMasterCount: selectedAuthorityCount(resolvedRows, 'EXACT_APPROVED_MASTER'),
      acceptedOverrideCount: selectedAuthorityCount(resolvedRows, 'ACCEPTED_OVERRIDE'),
      configuredDerivationCount: selectedAuthorityCount(resolvedRows, 'CONFIGURED_DERIVATION'),
      projectConfiguredDefaultCount: selectedAuthorityCount(resolvedRows, 'PROJECT_CONFIGURED_DEFAULT'),
    },
  };
  return freezeDeep({ ...base, semanticHash: semanticHash(base) });
}

function projectResolutionRow(row) {
  if (!isRecord(row)) throw new TypeError('Current effective-value inspection requires object resolution rows.');
  const resolutionKey = requiredText(row.resolutionKey, 'Resolution key');
  const targetKind = requiredText(row.targetKind, 'Target kind');
  const targetId = requiredText(row.targetId, 'Target ID');
  const fieldId = requiredText(row.fieldId, 'Field ID');
  const status = requiredText(row.status, 'Resolution status');
  const definition = getNonFeaFieldDefinition(fieldId);
  const candidates = Array.isArray(row.candidates) ? row.candidates : [];
  const selected = isRecord(row.selected) ? selectedProjection(row.selected) : null;
  if (status === 'RESOLVED' && !selected) {
    throw new TypeError(`Resolved effective-value row ${resolutionKey} has no selected candidate.`);
  }
  return freezeDeep({
    resolutionKey,
    targetKind,
    targetId,
    fieldId,
    fieldLabel: definition?.label || fieldId,
    status,
    value: selected ? clonePlain(selected.value) : null,
    unit: selected?.unit || null,
    effectiveAuthority: selected?.authority || null,
    sourceId: selected?.sourceId || null,
    recordId: selected?.recordId || null,
    revision: selected?.revision || null,
    basis: selected?.basis || null,
    defaultId: selected?.defaultId || null,
    scope: selected?.scope ? clonePlain(selected.scope) : null,
    fromSource: selected?.fromSource === true,
    candidateCount: candidates.length,
    candidateAuthorities: [...new Set(candidates
      .map((candidate) => stringValue(candidate?.authority))
      .filter(Boolean))].sort(compareText),
  });
}

function selectedProjection(selected) {
  const evidence = isRecord(selected.evidence) ? selected.evidence : {};
  return freezeDeep({
    value: clonePlain(selected.value),
    unit: requiredText(selected.unit, 'Selected unit'),
    authority: requiredText(selected.authority, 'Selected authority'),
    sourceId: requiredText(selected.sourceId, 'Selected source ID'),
    recordId: stringValue(selected.recordId) || null,
    revision: selected.revision === null || selected.revision === undefined
      ? null
      : String(selected.revision),
    basis: firstText(
      evidence.basis,
      evidence.acceptanceBasis,
      evidence.source,
      evidence.matchMethod,
    ),
    defaultId: stringValue(evidence.defaultId) || null,
    scope: isRecord(evidence.scope) ? clonePlain(evidence.scope) : null,
    fromSource: selected.fromSource === true,
  });
}

function requireResolutionLedger(value) {
  if (!isRecord(value)
      || value.schema !== NON_FEA_CURRENT_FIELD_RESOLUTION_LEDGER_SCHEMA
      || !Array.isArray(value.rows)) {
    throw new TypeError(`Expected ${NON_FEA_CURRENT_FIELD_RESOLUTION_LEDGER_SCHEMA}.`);
  }
}

function selectedAuthorityCount(rows, authority) {
  return rows.filter((row) => row.effectiveAuthority === authority).length;
}

function firstText(...values) {
  for (const value of values) {
    const text = stringValue(value);
    if (text) return text;
  }
  return null;
}

function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw new TypeError(`${label} is required.`);
  return text;
}

function clonePlain(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function compareText(left, right) {
  return String(left).localeCompare(String(right));
}
