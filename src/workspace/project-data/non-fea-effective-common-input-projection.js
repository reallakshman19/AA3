import {
  createSharedPipingModel,
  deepFreeze,
  semanticHash,
  validateSharedPipingModel,
} from '../../core/shared-piping-model/index.js';
import {
  resolveCoreNonFeaEffectiveValues,
} from './non-fea-effective-value-resolver.js';

const CORE_RESOLUTION_LEDGER_SCHEMA = 'non-fea-field-resolution-ledger/v1';
const ENRICHED_PROJECTION_SCHEMA = 'non-fea-enriched-shared-model-projection/v1';

/**
 * Re-selects the legacy CORE candidate ledger through the single #1321
 * effective-value resolver, then builds the Common Input enriched model from
 * those effective winners.
 *
 * CORE remains responsible for target matching, candidate custody, same-
 * authority conflicts and legacy migration blockers. This module defines no
 * precedence. It only proves that each effective winner maps back to one exact
 * CORE candidate, binds the effective resolver receipt into that resolution
 * row, and projects the externally selected winner.
 */
export function createNonFeaEffectiveCommonInputProjection({
  sourceModel,
  candidateResolutionLedger,
} = {}) {
  const source = requireSourceModel(sourceModel);
  const candidateLedger = requireReadyCandidateLedger(candidateResolutionLedger, source.semanticHash);
  const effectiveValueResolutionLedger = resolveCoreNonFeaEffectiveValues(candidateLedger);
  if (effectiveValueResolutionLedger.status !== 'RESOLVED') {
    throw codedError(
      'Effective engineering-value resolution is not fully resolved.',
      'COMMON_INPUT_EFFECTIVE_VALUE_RESOLUTION_BLOCKED',
      { status: effectiveValueResolutionLedger.status },
    );
  }

  const effectiveByKey = new Map(
    effectiveValueResolutionLedger.rows.map((row) => [row.resolutionKey, row]),
  );
  const rows = candidateLedger.rows.map((row) => reselectRow(row, effectiveByKey, effectiveValueResolutionLedger));
  const resolutionBase = {
    schema: candidateLedger.schema,
    sourceSemanticHash: candidateLedger.sourceSemanticHash,
    sidecarSemanticHash: candidateLedger.sidecarSemanticHash,
    status: candidateLedger.status,
    rows,
    blockers: candidateLedger.blockers,
  };
  const resolutionLedger = deepFreeze({
    ...resolutionBase,
    semanticHash: semanticHash(resolutionBase),
  });

  const enrichedModel = projectEffectiveWinners(source, resolutionLedger.rows);
  const sourceTopologyHash = topologySemanticHash(source);
  const enrichedTopologyHash = topologySemanticHash(enrichedModel);
  if (sourceTopologyHash !== enrichedTopologyHash) {
    throw codedError(
      'Effective-value projection attempted to change governed topology, geometry, attachment, or support membership.',
      'COMMON_INPUT_EFFECTIVE_PROJECTION_TOPOLOGY_CHANGED',
    );
  }
  const projectionBase = {
    schema: ENRICHED_PROJECTION_SCHEMA,
    sourceSemanticHash: source.semanticHash,
    resolutionLedgerSemanticHash: resolutionLedger.semanticHash,
    topologySemanticHash: sourceTopologyHash,
    enrichedModel,
  };
  const enrichedProjection = deepFreeze({
    ...projectionBase,
    semanticHash: semanticHash({
      schema: projectionBase.schema,
      sourceSemanticHash: projectionBase.sourceSemanticHash,
      resolutionLedgerSemanticHash: projectionBase.resolutionLedgerSemanticHash,
      topologySemanticHash: projectionBase.topologySemanticHash,
      enrichedModelSemanticHash: enrichedModel.semanticHash,
    }),
  });

  return deepFreeze({
    candidateResolutionLedgerSemanticHash: candidateLedger.semanticHash,
    effectiveValueResolutionLedger,
    resolutionLedger,
    enrichedProjection,
  });
}

function reselectRow(row, effectiveByKey, effectiveLedger) {
  if (!row || typeof row !== 'object' || !Array.isArray(row.candidates)) {
    throw codedError('CORE resolution row is invalid.', 'COMMON_INPUT_EFFECTIVE_CORE_ROW_INVALID');
  }
  const effectiveRow = effectiveByKey.get(row.resolutionKey);
  if (!effectiveRow || effectiveRow.status !== 'RESOLVED' || !effectiveRow.selected) {
    throw codedError(
      `Effective resolution is missing for ${row.resolutionKey}.`,
      'COMMON_INPUT_EFFECTIVE_ROW_REQUIRED',
    );
  }
  const coreCandidateHash = effectiveRow.selected.evidence?.coreCandidateSemanticHash;
  if (typeof coreCandidateHash !== 'string' || !coreCandidateHash) {
    throw codedError(
      `Effective winner for ${row.resolutionKey} is not traceable to a CORE candidate.`,
      'COMMON_INPUT_EFFECTIVE_CORE_CANDIDATE_HASH_REQUIRED',
    );
  }
  const selected = row.candidates.find((candidate) => semanticHash(candidate) === coreCandidateHash) || null;
  if (!selected) {
    throw codedError(
      `Effective winner for ${row.resolutionKey} does not exist in the CORE candidate set.`,
      'COMMON_INPUT_EFFECTIVE_CORE_CANDIDATE_MISMATCH',
      { coreCandidateHash },
    );
  }
  return deepFreeze({
    ...row,
    selected,
    effectiveSelection: deepFreeze({
      resolverSchema: effectiveLedger.schema,
      resolverSemanticHash: effectiveLedger.semanticHash,
      effectiveRowSemanticHash: effectiveRow.semanticHash,
      effectiveCandidateSemanticHash: effectiveRow.selected.semanticHash,
      coreCandidateSemanticHash: coreCandidateHash,
    }),
  });
}

function projectEffectiveWinners(sourceModel, rows) {
  const selectedRows = rows.filter((row) => row.selected && row.selected.fromSource !== true);
  const components = sourceModel.components.map((component) => {
    const selected = selectedRows.filter((row) => (
      row.selected.targetKind === 'COMPONENT'
      && row.selected.targetId === componentId(component)
      && typeof row.selected.propertyKey === 'string'
      && row.selected.propertyKey
    ));
    if (!selected.length) return component;
    const engineeringProperties = { ...(component.engineeringProperties || {}) };
    selected.forEach((row) => {
      engineeringProperties[row.selected.propertyKey] = enrichmentEvidence(row.selected);
    });
    return { ...component, engineeringProperties };
  });

  const supports = sourceModel.supports.map((support) => {
    const selected = selectedRows.filter((row) => (
      row.selected.targetKind === 'SUPPORT'
      && row.selected.targetId === supportId(support)
    ));
    if (!selected.length) return support;
    const supportEvidence = { ...(support.supportEvidence || {}) };
    selected.forEach((row) => {
      if (row.selected.propertyKey === 'verticalState') {
        supportEvidence.verticalCapabilities = [enrichmentEvidence(row.selected)];
      }
      if (row.selected.propertyKey === 'supportType') {
        supportEvidence.supportTypes = [enrichmentEvidence(row.selected)];
      }
    });
    return { ...support, supportEvidence };
  });

  return createSharedPipingModel({
    project: sourceModel.project,
    units: sourceModel.units,
    sourceSnapshotRef: sourceModel.sourceSnapshotRef,
    components,
    supports,
    sourceReferences: sourceModel.sourceReferences,
    diagnostics: sourceModel.diagnostics,
  });
}

function enrichmentEvidence(selected) {
  return {
    value: selected.value,
    unit: selected.unit,
    sourcePath: `nonFeaEffectiveResolution.${selected.recordId}`,
    sourceRoot: selected.sourceId,
    sourceKind: selected.authority,
  };
}

function requireSourceModel(value) {
  const audit = validateSharedPipingModel(value);
  if (!audit.ok) {
    throw codedError(
      `Effective projection requires a valid source model: ${audit.errors.join(' ')}`,
      'COMMON_INPUT_EFFECTIVE_SOURCE_MODEL_INVALID',
    );
  }
  return value;
}

function requireReadyCandidateLedger(value, sourceSemanticHash) {
  if (!value || typeof value !== 'object' || value.schema !== CORE_RESOLUTION_LEDGER_SCHEMA) {
    throw codedError(
      `Expected ${CORE_RESOLUTION_LEDGER_SCHEMA}.`,
      'COMMON_INPUT_EFFECTIVE_CORE_LEDGER_INVALID',
    );
  }
  const base = {
    schema: value.schema,
    sourceSemanticHash: value.sourceSemanticHash,
    sidecarSemanticHash: value.sidecarSemanticHash,
    status: value.status,
    rows: value.rows,
    blockers: value.blockers,
  };
  if (semanticHash(base) !== value.semanticHash) {
    throw codedError(
      'CORE candidate-resolution ledger semantic hash is invalid.',
      'COMMON_INPUT_EFFECTIVE_CORE_LEDGER_HASH_MISMATCH',
    );
  }
  if (value.sourceSemanticHash !== sourceSemanticHash) {
    throw codedError(
      'CORE candidate-resolution ledger is stale against the source model.',
      'COMMON_INPUT_EFFECTIVE_CORE_LEDGER_STALE',
    );
  }
  if (value.status !== 'READY' || (value.blockers || []).length) {
    throw codedError(
      'A blocked CORE candidate-resolution ledger cannot enter effective selection.',
      'COMMON_INPUT_EFFECTIVE_CORE_LEDGER_BLOCKED',
      { blockers: value.blockers || [] },
    );
  }
  return value;
}

function topologySemanticHash(model) {
  return semanticHash({
    project: model.project,
    units: model.units,
    sourceSnapshotRef: model.sourceSnapshotRef,
    components: model.components.map((component) => ({
      componentKey: component.componentKey,
      sourceEntityId: component.sourceEntityId,
      type: component.type,
      identity: component.identity,
      geometry: component.geometry,
      ports: component.ports,
    })),
    supports: model.supports.map((support) => ({
      supportKey: support.supportKey,
      sourceEntityId: support.sourceEntityId,
      type: support.type,
      position: support.position,
      attachment: support.attachment,
      hostComponentKey: support.hostComponentKey,
      hostPortKey: support.hostPortKey,
    })),
  });
}

function componentId(component) {
  return component.componentKey || component.sourceEntityId;
}

function supportId(support) {
  return support.supportKey || support.sourceEntityId;
}

function codedError(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  if (details !== null) error.details = details;
  return error;
}
