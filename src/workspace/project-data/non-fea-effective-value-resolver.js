import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { freezeDeep, isRecord, stringValue } from '../dataset-utils.js';
import { getNonFeaFieldDefinition } from './non-fea-field-registry.js';

export const NON_FEA_EFFECTIVE_VALUE_RESOLUTION_LEDGER_SCHEMA =
  'non-fea-effective-value-resolution-ledger/v1';
export const NON_FEA_EFFECTIVE_VALUE_RESOLUTION_ROW_SCHEMA =
  'non-fea-effective-value-resolution-row/v1';

export const PRODUCT_DEFAULT_AUTHORITY = 'PRODUCT_DEFAULT';
export const NON_FEA_EFFECTIVE_AUTHORITY_PRECEDENCE = freezeDeep([
  'ACCEPTED_OVERRIDE',
  'SOURCE_EXPLICIT',
  'SOURCE_INHERITED',
  'EXACT_APPROVED_MASTER',
  'CONFIGURED_DERIVATION',
  'PROJECT_POLICY',
  'PROJECT_CONFIGURED_DEFAULT',
  PRODUCT_DEFAULT_AUTHORITY,
]);

const CORE_RESOLUTION_LEDGER_SCHEMA = 'non-fea-field-resolution-ledger/v1';
const SEMANTIC_HASH_PATTERN = /^fnv1a64:[0-9a-f]{16}$/u;

/**
 * Consumer-facing authority resolver for Non-FEA engineering values.
 *
 * The legacy CORE enrichment resolver remains responsible for producing
 * source/master/override/derivation candidates. This resolver is the single
 * composition seam that selects the value a workspace consumer is allowed to
 * use after Project Data and product-default candidates are added.
 *
 * The ordering is the governing #1321 effective-value policy, not the legacy
 * CORE resolver ordering. In particular, an ACCEPTED_OVERRIDE intentionally
 * supersedes SOURCE_EXPLICIT. Each field still constrains which authorities are
 * legal through the field registry; PRODUCT_DEFAULT is legal only for a
 * Project-Data-backed field and is always the final effective tier.
 *
 * PROJECT_POLICY is included only for project-owned fields such as gravity,
 * load factor and coordinate policy; it sits above configured/product defaults.
 *
 * Units are deliberately preserved, not converted here. Legacy CORE field
 * storage includes mm/MPa properties while the workspace registry describes
 * conceptual canonical units. A consumer adapter must perform an explicit,
 * audited conversion instead of allowing this resolver to hide unit changes.
 */
export function resolveNonFeaEffectiveValues({
  candidates,
  sourceModelSemanticHash = null,
  enrichmentResolutionSemanticHash = null,
  projectDataProfileSemanticHash = null,
  productDefaultProviderSemanticHash = null,
} = {}) {
  if (!Array.isArray(candidates)) {
    throw new TypeError('Effective-value resolution requires a candidate array.');
  }

  const normalized = candidates.map(normalizeCandidate).sort(candidateStableOrder);
  assertUniqueCandidateIds(normalized);

  const grouped = groupBy(normalized, (row) => row.resolutionKey);
  const rows = [...grouped.entries()]
    .sort(([left], [right]) => ascii(left, right))
    .map(([resolutionKey, group]) => resolveGroup(resolutionKey, group));

  const blockedRows = rows.filter((row) => row.status === 'BLOCKED');
  const unresolvedRows = rows.filter((row) => row.status === 'UNRESOLVED');
  const resolvedRows = rows.filter((row) => row.status === 'RESOLVED');
  const status = blockedRows.length > 0
    ? 'BLOCKED'
    : unresolvedRows.length > 0
      ? 'PARTIAL'
      : 'RESOLVED';

  const base = {
    schema: NON_FEA_EFFECTIVE_VALUE_RESOLUTION_LEDGER_SCHEMA,
    status,
    bindings: {
      sourceModelSemanticHash: nullableIdentity(sourceModelSemanticHash),
      enrichmentResolutionSemanticHash: nullableIdentity(enrichmentResolutionSemanticHash),
      projectDataProfileSemanticHash: nullableIdentity(projectDataProfileSemanticHash),
      productDefaultProviderSemanticHash: nullableIdentity(productDefaultProviderSemanticHash),
    },
    rows,
    summary: {
      candidateCount: normalized.length,
      rowCount: rows.length,
      resolvedCount: resolvedRows.length,
      unresolvedCount: unresolvedRows.length,
      blockedCount: blockedRows.length,
      productDefaultSelectedCount: resolvedRows.filter(
        (row) => row.selected?.authority === PRODUCT_DEFAULT_AUTHORITY,
      ).length,
    },
  };
  return freezeDeep({ ...base, semanticHash: semanticHash(base) });
}

export function resolveNonFeaEffectiveValue(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new TypeError('At least one effective-value candidate is required.');
  }
  const normalized = candidates.map(normalizeCandidate).sort(candidateStableOrder);
  assertUniqueCandidateIds(normalized);
  const keys = new Set(normalized.map((row) => row.resolutionKey));
  if (keys.size !== 1) {
    throw new TypeError('Single effective-value resolution may address only one target/field key.');
  }
  return resolveGroup(normalized[0].resolutionKey, normalized);
}

export function createNonFeaEffectiveValueCandidate(input) {
  return normalizeCandidate(input);
}

/**
 * Adapts every legacy CORE candidate, not merely the legacy selected winner.
 * This is required because #1321 effective precedence intentionally differs
 * from legacy CORE when ACCEPTED_OVERRIDE and source evidence coexist.
 */
export function createNonFeaEffectiveValueCandidatesFromCoreResolution(
  resolutionLedger,
) {
  if (!isRecord(resolutionLedger)
      || resolutionLedger.schema !== CORE_RESOLUTION_LEDGER_SCHEMA
      || !Array.isArray(resolutionLedger.rows)) {
    throw new TypeError(`Expected ${CORE_RESOLUTION_LEDGER_SCHEMA}.`);
  }
  const sourceModelSemanticHash = stringValue(resolutionLedger.sourceSemanticHash);
  const rows = [];
  resolutionLedger.rows.forEach((resolutionRowValue) => {
    if (!isRecord(resolutionRowValue) || !Array.isArray(resolutionRowValue.candidates)) {
      throw new TypeError('CORE resolution rows require a candidate array.');
    }
    resolutionRowValue.candidates.forEach((candidate, index) => {
      if (!isRecord(candidate)) throw new TypeError('CORE resolution candidate must be an object.');
      const coreFingerprint = semanticHash(candidate);
      rows.push(createNonFeaEffectiveValueCandidate({
        candidateId: `core:${coreFingerprint}:${index}`,
        targetKind: candidate.targetKind,
        targetId: candidate.targetId,
        fieldId: candidate.fieldId,
        value: candidate.value,
        unit: candidate.unit,
        authority: candidate.authority,
        sourceId: stringValue(candidate.sourceId)
          || stringValue(candidate.recordId)
          || (sourceModelSemanticHash ? `source-model:${sourceModelSemanticHash}` : 'CORE_RESOLUTION'),
        evidence: {
          source: 'CORE Non-FEA field-resolution ledger',
          coreResolutionKey: resolutionRowValue.resolutionKey,
          coreResolutionStatus: resolutionRowValue.status,
          coreCandidateSemanticHash: coreFingerprint,
          coreRecordId: candidate.recordId ?? null,
          coreRevision: candidate.revision ?? null,
          coreFromSource: candidate.fromSource === true,
          coreEvidence: candidate.evidence ?? null,
          coreMigration: candidate.migration ?? null,
        },
      }));
    });
  });
  return freezeDeep(rows.sort(candidateStableOrder));
}

export function resolveCoreNonFeaEffectiveValues(resolutionLedger) {
  const candidates = createNonFeaEffectiveValueCandidatesFromCoreResolution(
    resolutionLedger,
  );
  return resolveNonFeaEffectiveValues({
    candidates,
    sourceModelSemanticHash: resolutionLedger.sourceSemanticHash ?? null,
    enrichmentResolutionSemanticHash: resolutionLedger.semanticHash ?? null,
  });
}

export function findResolvedNonFeaEffectiveValue(
  ledger,
  targetKind,
  targetId,
  fieldId,
) {
  if (!isRecord(ledger)
      || ledger.schema !== NON_FEA_EFFECTIVE_VALUE_RESOLUTION_LEDGER_SCHEMA
      || !Array.isArray(ledger.rows)) {
    throw new TypeError(`Expected ${NON_FEA_EFFECTIVE_VALUE_RESOLUTION_LEDGER_SCHEMA}.`);
  }
  const resolutionKey = `${requiredText(targetKind, 'Target kind')}|${requiredText(targetId, 'Target ID')}|${requiredText(fieldId, 'Field ID')}`;
  const row = ledger.rows.find((item) => item.resolutionKey === resolutionKey) || null;
  return row?.status === 'RESOLVED' ? row.selected : null;
}

function resolveGroup(resolutionKey, candidates) {
  const representative = candidates[0];
  const definition = getNonFeaFieldDefinition(representative.fieldId);
  if (!definition) {
    return resolutionRow(
      resolutionKey,
      representative,
      candidates,
      null,
      'BLOCKED',
      [{ code: 'UNKNOWN_EFFECTIVE_VALUE_FIELD', fieldId: representative.fieldId }],
    );
  }

  const precedence = effectiveAuthorityPath(definition);
  const invalidAuthority = candidates.filter((candidate) => (
    !precedence.includes(candidate.authority)
  ));
  if (invalidAuthority.length > 0) {
    return resolutionRow(
      resolutionKey,
      representative,
      candidates,
      null,
      'BLOCKED',
      invalidAuthority.map((candidate) => ({
        code: 'EFFECTIVE_VALUE_AUTHORITY_NOT_PERMITTED',
        candidateId: candidate.candidateId,
        fieldId: candidate.fieldId,
        authority: candidate.authority,
        allowedAuthorities: precedence,
      })),
    );
  }

  const sameAuthorityConflicts = conflictingSameAuthorityCandidates(candidates);
  if (sameAuthorityConflicts.length > 0) {
    return resolutionRow(
      resolutionKey,
      representative,
      candidates,
      null,
      'BLOCKED',
      sameAuthorityConflicts,
    );
  }

  const selected = [...candidates].sort((left, right) => {
    const rank = precedence.indexOf(left.authority) - precedence.indexOf(right.authority);
    return rank || candidateStableOrder(left, right);
  })[0] || null;

  if (!selected) {
    return resolutionRow(resolutionKey, representative, candidates, null, 'UNRESOLVED', []);
  }

  return resolutionRow(resolutionKey, representative, candidates, selected, 'RESOLVED', []);
}

function resolutionRow(resolutionKey, representative, candidates, selected, status, blockers) {
  const base = {
    schema: NON_FEA_EFFECTIVE_VALUE_RESOLUTION_ROW_SCHEMA,
    resolutionKey,
    targetKind: representative.targetKind,
    targetId: representative.targetId,
    fieldId: representative.fieldId,
    status,
    selected,
    candidates,
    shadowedCandidateIds: selected
      ? candidates.filter((candidate) => candidate.candidateId !== selected.candidateId)
        .map((candidate) => candidate.candidateId)
        .sort(ascii)
      : [],
    blockers,
  };
  return freezeDeep({ ...base, semanticHash: semanticHash(base) });
}

function normalizeCandidate(input) {
  if (!isRecord(input)) throw new TypeError('Effective-value candidate must be an object.');
  const candidateId = requiredText(input.candidateId, 'Candidate ID');
  const targetKind = requiredText(input.targetKind, 'Target kind');
  const targetId = requiredText(input.targetId, 'Target ID');
  const fieldId = requiredText(input.fieldId, 'Field ID');
  const authority = requiredText(input.authority, 'Authority');
  const sourceId = requiredText(input.sourceId, 'Source ID');
  const unit = requiredText(input.unit, 'Unit');
  if (!Object.hasOwn(input, 'value') || input.value === null || input.value === undefined) {
    throw new TypeError(`Effective-value candidate ${candidateId} is missing value.`);
  }
  validateFiniteEngineeringValue(input.value, `candidate ${candidateId}`);

  const definition = getNonFeaFieldDefinition(fieldId);
  if (authority === PRODUCT_DEFAULT_AUTHORITY) {
    if (!definition?.projectDataPath) {
      throw new TypeError(`PRODUCT_DEFAULT is not permitted for non-Project-Data field ${fieldId}.`);
    }
    const evidence = input.evidence;
    if (!isRecord(evidence)
        || !stringValue(evidence.defaultId)
        || !semanticHashIdentity(evidence.defaultSemanticHash)
        || !semanticHashIdentity(evidence.productDefaultProfileSemanticHash)) {
      throw new TypeError(
        `PRODUCT_DEFAULT candidate ${candidateId} requires default ID and semantic-hash evidence.`,
      );
    }
  }

  const base = {
    candidateId,
    targetKind,
    targetId,
    fieldId,
    value: plainClone(input.value),
    unit,
    authority,
    sourceId,
    evidence: input.evidence === undefined || input.evidence === null
      ? null
      : plainClone(input.evidence),
    resolutionKey: `${targetKind}|${targetId}|${fieldId}`,
  };
  return freezeDeep({ ...base, semanticHash: semanticHash(base) });
}

function effectiveAuthorityPath(definition) {
  const allowed = new Set(definition.authorityPath);
  if (definition.projectDataPath) allowed.add(PRODUCT_DEFAULT_AUTHORITY);
  const precedence = NON_FEA_EFFECTIVE_AUTHORITY_PRECEDENCE.filter((authority) => allowed.has(authority));
  const unknown = [...allowed].filter((authority) => !precedence.includes(authority));
  if (unknown.length > 0) {
    throw new TypeError(
      `Effective authority precedence is undefined for ${definition.fieldId}: ${unknown.sort(ascii).join(', ')}.`,
    );
  }
  return freezeDeep(precedence);
}

function conflictingSameAuthorityCandidates(candidates) {
  const groups = groupBy(candidates, (row) => row.authority);
  const blockers = [];
  groups.forEach((rows, authority) => {
    const valueHashes = new Set(rows.map((row) => semanticHash({ value: row.value, unit: row.unit })));
    if (valueHashes.size <= 1) return;
    blockers.push(freezeDeep({
      code: 'EFFECTIVE_VALUE_SAME_AUTHORITY_CONFLICT',
      authority,
      candidateIds: rows.map((row) => row.candidateId).sort(ascii),
    }));
  });
  return blockers.sort((left, right) => ascii(left.authority, right.authority));
}

function assertUniqueCandidateIds(candidates) {
  const ids = new Set();
  candidates.forEach((row) => {
    if (ids.has(row.candidateId)) {
      throw new TypeError(`Duplicate effective-value candidate ID: ${row.candidateId}.`);
    }
    ids.add(row.candidateId);
  });
}

function candidateStableOrder(left, right) {
  return ascii(left.resolutionKey, right.resolutionKey)
    || ascii(left.authority, right.authority)
    || ascii(left.candidateId, right.candidateId);
}

function groupBy(rows, keyFn) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  });
  return groups;
}

function requiredText(value, label) {
  const result = stringValue(value);
  if (!result) throw new TypeError(`${label} is required.`);
  return result;
}

function nullableIdentity(value) {
  if (value === null || value === undefined || value === '') return null;
  return requiredText(value, 'Semantic binding');
}

function semanticHashIdentity(value) {
  return SEMANTIC_HASH_PATTERN.test(stringValue(value));
}

function validateFiniteEngineeringValue(value, label) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
    return;
  }
  if (typeof value === 'string') {
    if (!value.trim()) throw new TypeError(`${label} must not be an empty string.`);
    return;
  }
  if (typeof value === 'boolean') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateFiniteEngineeringValue(item, `${label}[${index}]`));
    return;
  }
  if (isRecord(value)) {
    Object.entries(value).forEach(([key, item]) => (
      validateFiniteEngineeringValue(item, `${label}.${key}`)
    ));
    return;
  }
  throw new TypeError(`${label} contains an unsupported engineering value type.`);
}

function plainClone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function ascii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
