import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { freezeDeep, stringValue } from '../dataset-utils.js';
import { requireAuthorizedEmpiricalLoadInput } from './authorized-empirical-load-input.js';
import {
  findAuthorizedEmpiricalEffectiveValue,
  requireAuthorizedEmpiricalEffectiveValueLedger,
} from './authorized-empirical-effective-value-ledger.js';

export const AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_CONTEXT_SCHEMA =
  'authorized-empirical-effective-value-context/v1';

/**
 * Builds the exact identity map used by empirical gravity consumers.
 *
 * The effective-value ledger is target-addressed (LINE / COMPONENT), while the
 * support-load kernel iterates dataset entities keyed by lineKey/sourceRecordId.
 * This context is the only bridge between those identities. It performs no
 * geometric/proximity matching and invents no fallback identity.
 */
export function createAuthorizedEmpiricalEffectiveValueContext(value) {
  const input = requireAuthorizedEmpiricalLoadInput(value);
  if (!input.effectiveValueLedger) {
    throw codedError(
      'Authorized empirical input does not carry an effective-value ledger.',
      'EMPIRICAL_EFFECTIVE_VALUE_LEDGER_REQUIRED',
    );
  }
  const ledger = requireAuthorizedEmpiricalEffectiveValueLedger(input.effectiveValueLedger);

  const lineBindings = input.lineBindings.map((row) => freezeDeep({
    lineKey: requiredText(row.lineKey, 'lineBinding.lineKey'),
    targetId: requiredText(row.targetId, 'lineBinding.targetId'),
    sourceRecordId: requiredText(row.sourceRecordId, 'lineBinding.sourceRecordId'),
  })).sort((left, right) => ascii(left.lineKey, right.lineKey));
  const componentBindings = input.componentBindings.map((row) => freezeDeep({
    sourceRecordId: requiredText(row.sourceRecordId, 'componentBinding.sourceRecordId'),
    targetId: requiredText(row.targetId, 'componentBinding.targetId'),
    lineKey: row.lineKey === null ? null : requiredText(row.lineKey, 'componentBinding.lineKey'),
    catalogKey: requiredText(row.catalogKey, 'componentBinding.catalogKey'),
  })).sort((left, right) => ascii(left.sourceRecordId, right.sourceRecordId));

  assertUnique(lineBindings.map((row) => row.lineKey), 'lineKey');
  assertUnique(componentBindings.map((row) => row.sourceRecordId), 'component sourceRecordId');

  const material = {
    schema: AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_CONTEXT_SCHEMA,
    authorizedInputSemanticHash: input.semanticHash,
    effectiveValueLedgerSemanticHash: ledger.semanticHash,
    lineBindings,
    componentBindings,
    ledger,
  };
  return freezeDeep({ ...material, semanticHash: semanticHash(material) });
}

export function requireAuthorizedEmpiricalEffectiveValueContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || value.schema !== AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_CONTEXT_SCHEMA
      || !Array.isArray(value.lineBindings)
      || !Array.isArray(value.componentBindings)) {
    throw codedError(
      `Expected ${AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_CONTEXT_SCHEMA}.`,
      'EMPIRICAL_EFFECTIVE_VALUE_CONTEXT_INVALID',
    );
  }
  const ledger = requireAuthorizedEmpiricalEffectiveValueLedger(value.ledger);
  const material = {
    schema: value.schema,
    authorizedInputSemanticHash: requiredHash(value.authorizedInputSemanticHash, 'authorizedInputSemanticHash'),
    effectiveValueLedgerSemanticHash: requiredHash(value.effectiveValueLedgerSemanticHash, 'effectiveValueLedgerSemanticHash'),
    lineBindings: structuredClone(value.lineBindings),
    componentBindings: structuredClone(value.componentBindings),
    ledger,
  };
  if (material.effectiveValueLedgerSemanticHash !== ledger.semanticHash) {
    throw codedError(
      'Effective-value context ledger binding is stale.',
      'EMPIRICAL_EFFECTIVE_VALUE_CONTEXT_BINDING_MISMATCH',
    );
  }
  if (requiredHash(value.semanticHash, 'semanticHash') !== semanticHash(material)) {
    throw codedError(
      'Effective-value context semantic hash is stale.',
      'EMPIRICAL_EFFECTIVE_VALUE_CONTEXT_HASH_MISMATCH',
    );
  }
  assertUnique(material.lineBindings.map((row) => requiredText(row.lineKey, 'lineBinding.lineKey')), 'lineKey');
  assertUnique(
    material.componentBindings.map((row) => requiredText(row.sourceRecordId, 'componentBinding.sourceRecordId')),
    'component sourceRecordId',
  );
  return freezeDeep({ ...material, semanticHash: value.semanticHash });
}

export function findAuthorizedEmpiricalLineEffectiveValue(
  contextValue,
  lineKey,
  fieldId,
  expectedUnit = null,
) {
  const context = requireAuthorizedEmpiricalEffectiveValueContext(contextValue);
  const key = requiredText(lineKey, 'lineKey');
  const binding = context.lineBindings.find((row) => row.lineKey === key) || null;
  if (!binding) return null;
  const selected = findAuthorizedEmpiricalEffectiveValue(
    context.ledger,
    'LINE',
    binding.targetId,
    requiredText(fieldId, 'fieldId'),
  );
  return validateSelectedUnit(selected, expectedUnit, binding.targetId, fieldId);
}

export function findAuthorizedEmpiricalComponentEffectiveValue(
  contextValue,
  sourceRecordId,
  fieldId,
  expectedUnit = null,
) {
  const context = requireAuthorizedEmpiricalEffectiveValueContext(contextValue);
  const sourceId = requiredText(sourceRecordId, 'sourceRecordId');
  const binding = context.componentBindings.find((row) => row.sourceRecordId === sourceId) || null;
  if (!binding) return null;
  const selected = findAuthorizedEmpiricalEffectiveValue(
    context.ledger,
    'COMPONENT',
    binding.targetId,
    requiredText(fieldId, 'fieldId'),
  );
  return validateSelectedUnit(selected, expectedUnit, binding.targetId, fieldId);
}

function validateSelectedUnit(selected, expectedUnit, targetId, fieldId) {
  if (!selected || expectedUnit === null) return selected;
  const unit = stringValue(selected.unit);
  if (unit !== expectedUnit) {
    throw codedError(
      `Effective value ${targetId}:${fieldId} has unsupported unit ${unit || '<empty>'}; expected ${expectedUnit}.`,
      'EMPIRICAL_EFFECTIVE_VALUE_UNIT_UNSUPPORTED',
      { targetId, fieldId, expectedUnit, actualUnit: unit || null },
    );
  }
  return selected;
}

function assertUnique(values, label) {
  if (new Set(values).size !== values.length) {
    throw codedError(`Duplicate ${label} in effective-value context.`, 'EMPIRICAL_EFFECTIVE_VALUE_CONTEXT_AMBIGUOUS');
  }
}

function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw codedError(`${label} is required.`, 'EMPIRICAL_EFFECTIVE_VALUE_CONTEXT_INVALID');
  return text;
}

function requiredHash(value, label) {
  if (typeof value !== 'string' || !/^fnv1a64:[0-9a-f]{16}$/u.test(value)) {
    throw codedError(`${label} must be an FNV-1a semantic hash.`, 'EMPIRICAL_EFFECTIVE_VALUE_CONTEXT_INVALID');
  }
  return value;
}

function ascii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function codedError(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}
