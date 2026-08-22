import {
  requireCommonEnrichedConsumerHandoff,
} from '../../core/common-enriched-properties/index.js';
import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { freezeDeep } from '../dataset-utils.js';
import {
  createNonFeaEffectiveValueCandidate,
  resolveNonFeaEffectiveValues,
} from '../project-data/non-fea-effective-value-resolver.js';

export const AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER_SCHEMA =
  'authorized-empirical-effective-value-ledger/v1';

const FIELD_MAP = freezeDeep({
  'pipe.outsideDiameterMm': ['PIPE_OUTER_DIAMETER', 'mm'],
  'pipe.wallThicknessMm': ['PIPE_WALL_THICKNESS', 'mm'],
  'material.densityKgM3': ['MATERIAL_DENSITY', 'kg/m3'],
  'fluid.operatingDensityKgM3': ['OPERATING_FLUID_DENSITY', 'kg/m3'],
  'fluid.hydroDensityKgM3': ['HYDRO_FLUID_DENSITY', 'kg/m3'],
  'insulation.thicknessMm': ['INSULATION_THICKNESS', 'mm'],
  'insulation.densityKgM3': ['INSULATION_DENSITY', 'kg/m3'],
  'component.weightKg': ['COMPONENT_WEIGHT', 'kg'],
});

const MASTER_SOURCE_KINDS = new Set([
  'LINE_LIST',
  'PIPING_CLASS',
  'MATERIAL_REGISTER',
  'FLUID_REGISTER',
  'INSULATION_REGISTER',
  'COMPONENT_WEIGHT_MASTER',
]);

/**
 * Converts the full published baseline carried by an authorized EMPIRICAL_LOADS
 * handoff into the target-level effective-value contract. Unlike the flattened
 * projection payload, the baseline retains source kind/hash/locator and review
 * provenance, so no authority label is guessed from a numerical overlay key.
 *
 * MODEL is explicit source authority. The common-enriched baseline does not
 * encode source-inheritance semantics, so this adapter never fabricates
 * SOURCE_INHERITED; inherited candidates remain the responsibility of the
 * existing CORE field-resolution adapter.
 */
export function createAuthorizedEmpiricalEffectiveValueLedger(handoffValue) {
  const handoff = requireCommonEnrichedConsumerHandoff(handoffValue);
  if (handoff.status !== 'AUTHORIZED' || handoff.consumer !== 'EMPIRICAL_LOADS') {
    throw codedError(
      'Authorized EMPIRICAL_LOADS handoff with published baseline is required.',
      'EMPIRICAL_EFFECTIVE_HANDOFF_INVALID',
    );
  }
  const baseline = handoff.baseline;
  const candidates = [];
  for (const target of baseline.targetRecords) {
    for (const field of target.fields) {
      const mapping = FIELD_MAP[field.field];
      if (!mapping || field.status === 'NOT_APPLICABLE') continue;
      if (!field.approved || field.value === null) {
        throw codedError(
          `Published empirical field ${target.targetId}:${field.field} is not approved and resolved.`,
          'EMPIRICAL_EFFECTIVE_FIELD_NOT_RESOLVED',
          { targetId: target.targetId, field: field.field, status: field.status },
        );
      }
      const [fieldId, expectedUnit] = mapping;
      const unit = String(field.unit || '');
      if (unit !== expectedUnit) {
        throw codedError(
          `Published empirical field ${target.targetId}:${field.field} has unsupported unit ${unit || '<null>'}.`,
          'EMPIRICAL_EFFECTIVE_FIELD_UNIT_UNSUPPORTED',
          { targetId: target.targetId, field: field.field, expectedUnit, actualUnit: field.unit },
        );
      }
      const authority = authorityFromSourceKind(field.sourceKind);
      const sourceId = field.sourceKey || field.locator || `${field.sourceKind}:${target.sourceRecordId}`;
      candidates.push(createNonFeaEffectiveValueCandidate({
        candidateId: `baseline:${baseline.semanticHash}:${target.targetId}:${fieldId}`,
        targetKind: target.targetKind,
        targetId: target.targetId,
        fieldId,
        value: field.value,
        unit,
        authority,
        sourceId,
        evidence: {
          source: 'Authorized common-enriched properties baseline',
          baselineId: baseline.baselineId,
          baselineRevision: baseline.revision,
          baselineSemanticHash: baseline.semanticHash,
          publicationDecisionSemanticHash: semanticHash(baseline.publicationDecision),
          sourceRecordId: target.sourceRecordId,
          lineKey: target.lineKey,
          sourceKind: field.sourceKind,
          sourceKey: field.sourceKey,
          sourceHash: field.sourceHash,
          locator: field.locator,
          matchMethod: field.matchMethod,
          fieldStatus: field.status,
          policyId: field.policyId,
          policyHash: field.policyHash,
          reviewEventId: field.reviewEventId,
          scope: {
            targetKind: target.targetKind,
            targetId: target.targetId,
            lineKey: target.lineKey,
          },
          basis: field.policyId || field.matchMethod,
          version: baseline.revision,
        },
      }));
    }
  }

  const effective = resolveNonFeaEffectiveValues({ candidates });
  if (effective.status === 'BLOCKED') {
    throw codedError(
      'Authorized empirical effective-value ledger is blocked.',
      'EMPIRICAL_EFFECTIVE_VALUE_LEDGER_BLOCKED',
      effective.rows.filter((row) => row.status === 'BLOCKED').flatMap((row) => row.blockers),
    );
  }
  const material = {
    schema: AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER_SCHEMA,
    handoffSemanticHash: handoff.semanticHash,
    baselineSemanticHash: baseline.semanticHash,
    resolutionSemanticHash: effective.semanticHash,
    status: effective.status,
    rows: effective.rows,
    summary: effective.summary,
  };
  return freezeDeep({ ...material, semanticHash: semanticHash(material) });
}

export function requireAuthorizedEmpiricalEffectiveValueLedger(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || value.schema !== AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER_SCHEMA
      || !Array.isArray(value.rows)
      || !value.summary
      || !['RESOLVED', 'PARTIAL'].includes(value.status)) {
    throw codedError(
      `Expected ${AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER_SCHEMA}.`,
      'EMPIRICAL_EFFECTIVE_VALUE_LEDGER_INVALID',
    );
  }
  const material = {
    schema: value.schema,
    handoffSemanticHash: requiredHash(value.handoffSemanticHash, 'handoffSemanticHash'),
    baselineSemanticHash: requiredHash(value.baselineSemanticHash, 'baselineSemanticHash'),
    resolutionSemanticHash: requiredHash(value.resolutionSemanticHash, 'resolutionSemanticHash'),
    status: value.status,
    rows: structuredClone(value.rows),
    summary: structuredClone(value.summary),
  };
  if (requiredHash(value.semanticHash, 'semanticHash') !== semanticHash(material)) {
    throw codedError('Authorized empirical effective-value ledger hash is stale.', 'EMPIRICAL_EFFECTIVE_VALUE_LEDGER_HASH_MISMATCH');
  }
  return freezeDeep({ ...material, semanticHash: value.semanticHash });
}

export function findAuthorizedEmpiricalEffectiveValue(ledger, targetKind, targetId, fieldId) {
  const value = requireAuthorizedEmpiricalEffectiveValueLedger(ledger);
  const key = `${targetKind}|${targetId}|${fieldId}`;
  const row = value.rows.find((item) => item.resolutionKey === key) || null;
  return row?.status === 'RESOLVED' ? row.selected : null;
}

export function authorityFromCommonEnrichedSourceKind(sourceKind) {
  return authorityFromSourceKind(sourceKind);
}

function authorityFromSourceKind(sourceKind) {
  if (sourceKind === 'MODEL') return 'SOURCE_EXPLICIT';
  if (MASTER_SOURCE_KINDS.has(sourceKind)) return 'EXACT_APPROVED_MASTER';
  if (sourceKind === 'DERIVATION_POLICY') return 'CONFIGURED_DERIVATION';
  if (sourceKind === 'MANUAL_REVIEW') return 'ACCEPTED_OVERRIDE';
  throw codedError(
    `Common-enriched source kind ${sourceKind || '<empty>'} has no effective-value authority mapping.`,
    'EMPIRICAL_EFFECTIVE_SOURCE_KIND_UNSUPPORTED',
    { sourceKind: sourceKind || null },
  );
}

function requiredHash(value, label) {
  if (typeof value !== 'string' || !/^fnv1a64:[0-9a-f]{16}$/u.test(value)) {
    throw codedError(`${label} must be an FNV-1a semantic hash.`, 'EMPIRICAL_EFFECTIVE_VALUE_LEDGER_INVALID');
  }
  return value;
}

function codedError(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}
