import {
  COMMON_ENRICHED_TARGET_INVENTORY_SCHEMA,
  createCommonEnrichedTargetInventory,
} from '../../core/common-enriched-properties/target-inventory.js';
import { PRIMITIVE_TYPES } from '../../core/model-loads/constants.js';
import { validateModelLoadPrimitiveSet } from '../../core/model-loads/primitive-builder.js';
import { evidenceNumber } from '../../core/model-loads/units.js';
import { deepFreeze, semanticHash } from '../../core/shared-piping-model/index.js';
import {
  createNonFeaCommonEnrichedConfiguredDefaultOverlay,
} from '../project-data/non-fea-common-enriched-configured-default-overlay.js';
import {
  LOAD_CALC_ENGINEERING_PRODUCT_DEFAULTS_EMPTY_V1,
} from '../project-data/non-fea-product-engineering-default-profile.js';
import {
  requireCurrentNonFeaEmpiricalRunAuthorization,
} from './non-fea-empirical-run-authorization.js';

export const CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PROJECTION_SCHEMA =
  'current-common-input-empirical-mass-projection/v1';

const SUPPORTED_LOAD_CASES = Object.freeze(['EMPTY', 'HYD', 'OPE']);
const ANCILLARY_FIELDS = Object.freeze({
  'permanent.claddingWeightKgPerM': 'claddingMassPerLengthKgPerM',
  'permanent.tracingWeightKgPerM': 'tracingMassPerLengthKgPerM',
});
const FIXED_POLICY = Object.freeze({
  projectionOnly: true,
  executionAuthorizationGranted: false,
  legacyPublicationOrHandoffAuthorityAsserted: false,
  sealedLoadPrimitiveSetRequired: true,
  directMassBasisPreserved: true,
  fittingDerivationPreserved: true,
  negligibleMassZeroPreserved: true,
  ancillaryMassIncluded: true,
  componentContainedFluidIncluded: true,
  supportStaticsExecuted: false,
});

/**
 * Seals exact per-entity/per-load-case masses from a fully READY current Common
 * Input and the exact model-load primitive set already bound by that seal.
 *
 * The primitive set remains authoritative for dry/base mass: direct-vs-derived
 * PIPE/fluid/insulation mass, fitting derivation and negligible zero-mass
 * behavior are never recomputed here. This projection adds only the two Issue
 * #1321 layers that the current primitive set does not own: permanent line
 * cladding/tracing and optional OPE/HYD component-contained fluid.
 *
 * This receipt is projection-only. It does not create a legacy baseline or
 * consumer handoff, a governed runtime package, a reaction, or an execution
 * authorization.
 */
export function createCurrentCommonInputEmpiricalMassProjection({
  snapshot,
  runAuthorization,
  loadPrimitiveSet,
} = {}) {
  const current = requireCurrentNonFeaEmpiricalRunAuthorization(runAuthorization, snapshot);
  const commonInput = current.commonInput;
  const loadCaseIds = normalizeLoadCases(commonInput.requestedLoadCases);
  const basis = buildProjectionBasis(commonInput, loadPrimitiveSet, loadCaseIds);
  const entityRows = commonInput.enrichedModel.components.map((component) => projectComponent({
    component,
    target: basis.targetBySourceRecordId.get(component.componentKey),
    loadCaseIds,
    primitiveByEntityCase: basis.primitiveByEntityCase,
    ancillaryByLine: basis.ancillaryByLine,
  })).sort((left, right) => ascii(left.entityId, right.entityId));

  const base = {
    schema: CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PROJECTION_SCHEMA,
    runAuthorizationSemanticHash: runAuthorization.semanticHash,
    commonInputSemanticHash: commonInput.semanticHash,
    commonInputSealSemanticHash: commonInput.seal.semanticHash,
    authorityRevisionVectorSemanticHash: runAuthorization.authorityRevisionVectorSemanticHash,
    resolutionLedgerSemanticHash: commonInput.resolutionLedgerSemanticHash,
    projectDataProfileSemanticHash: commonInput.projectDataProfileSemanticHash,
    configuredDefaultUsageLedgerSemanticHash:
      commonInput.configuredDefaultUsageLedgerSemanticHash || null,
    loadPrimitiveSetSemanticHash: loadPrimitiveSet.semanticHash,
    targetInventorySemanticHash: basis.inventory.semanticHash,
    ancillaryOverlaySemanticHash: basis.ancillaryOverlay.semanticHash,
    productEngineeringDefaultProfileSemanticHash:
      LOAD_CALC_ENGINEERING_PRODUCT_DEFAULTS_EMPTY_V1.semanticHash,
    compositionProfileSemanticHash: loadPrimitiveSet.compositionProfile.semanticHash,
    gravityProfileSemanticHash: loadPrimitiveSet.gravityProfile.semanticHash,
    loadCaseIds,
    entityRows,
    summary: projectionSummary(entityRows, loadCaseIds),
    policy: FIXED_POLICY,
  };
  return requireCurrentCommonInputEmpiricalMassProjection({
    ...base,
    semanticHash: semanticHash(base),
  });
}

export function requireCurrentCommonInputEmpiricalMassProjection(value) {
  if (!isRecord(value) || value.schema !== CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PROJECTION_SCHEMA) {
    throw codedError(
      `Expected ${CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PROJECTION_SCHEMA}.`,
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PROJECTION_INVALID',
    );
  }
  const material = { ...value };
  delete material.semanticHash;
  if (semanticHash(material) !== value.semanticHash) {
    throw codedError(
      'Current Common Input empirical mass projection semantic hash is stale.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PROJECTION_HASH_MISMATCH',
    );
  }
  requireFixedPolicy(value.policy);
  const loadCaseIds = normalizeLoadCases(value.loadCaseIds);
  if (JSON.stringify(loadCaseIds) !== JSON.stringify(value.loadCaseIds)) {
    throw codedError(
      'Projection load cases are not in canonical order.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_LOAD_CASE_ORDER_INVALID',
    );
  }
  if (!Array.isArray(value.entityRows)) {
    throw codedError(
      'Projection entity rows must be an array.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PROJECTION_INVALID',
    );
  }
  const entityIds = value.entityRows.map((row) => requiredText(row?.entityId, 'entityId'));
  if (new Set(entityIds).size !== entityIds.length
      || [...entityIds].sort(ascii).join('\0') !== entityIds.join('\0')) {
    throw codedError(
      'Projection entity identities must be unique and canonically sorted.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_ENTITY_ORDER_INVALID',
    );
  }
  value.entityRows.forEach((row) => validateEntityRow(row, loadCaseIds));
  const expectedSummary = projectionSummary(value.entityRows, loadCaseIds);
  if (semanticHash(expectedSummary) !== semanticHash(value.summary)) {
    throw codedError(
      'Projection summary does not match its entity rows.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_SUMMARY_INVALID',
    );
  }
  for (const key of [
    'runAuthorizationSemanticHash',
    'commonInputSemanticHash',
    'commonInputSealSemanticHash',
    'authorityRevisionVectorSemanticHash',
    'resolutionLedgerSemanticHash',
    'projectDataProfileSemanticHash',
    'loadPrimitiveSetSemanticHash',
    'targetInventorySemanticHash',
    'ancillaryOverlaySemanticHash',
    'productEngineeringDefaultProfileSemanticHash',
    'compositionProfileSemanticHash',
    'gravityProfileSemanticHash',
    'semanticHash',
  ]) semanticHashText(value[key], key);
  if (value.configuredDefaultUsageLedgerSemanticHash !== null) {
    semanticHashText(
      value.configuredDefaultUsageLedgerSemanticHash,
      'configuredDefaultUsageLedgerSemanticHash',
    );
  }
  return deepFreeze(value);
}

/** Rebuilds the deterministic projection from live current authority. */
export function requireCurrentCurrentCommonInputEmpiricalMassProjection(
  value,
  { snapshot, runAuthorization, loadPrimitiveSet } = {},
) {
  const projection = requireCurrentCommonInputEmpiricalMassProjection(value);
  const rebuilt = createCurrentCommonInputEmpiricalMassProjection({
    snapshot,
    runAuthorization,
    loadPrimitiveSet,
  });
  if (projection.semanticHash !== rebuilt.semanticHash) {
    throw codedError(
      'Current Common Input empirical mass projection is stale.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PROJECTION_STALE',
      {
        expected: rebuilt.semanticHash,
        actual: projection.semanticHash,
      },
    );
  }
  return projection;
}

function buildProjectionBasis(commonInput, loadPrimitiveSet, loadCaseIds) {
  const model = commonInput.enrichedModel;
  if (!model || model.schema !== 'shared-piping-model/v1' || !Array.isArray(model.components)) {
    throw codedError(
      'Current Common Input does not contain a valid enriched shared piping model.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_MODEL_INVALID',
    );
  }
  const primitiveAudit = validateModelLoadPrimitiveSet(loadPrimitiveSet);
  if (!primitiveAudit.ok) {
    throw codedError(
      'Current model-load primitive set is invalid.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_LOAD_PRIMITIVE_SET_INVALID',
      primitiveAudit.errors,
    );
  }
  const primitiveContract = commonInput.authorityContracts?.loadPrimitiveSet || null;
  if (!primitiveContract
      || primitiveContract.semanticHash !== loadPrimitiveSet.semanticHash
      || ['BLOCKED', 'STALE', 'NOT_AVAILABLE', 'NOT_BUILT'].includes(primitiveContract.status)) {
    throw codedError(
      'The supplied model-load primitive set is not the exact current Common Input authority.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_LOAD_PRIMITIVE_BINDING_MISMATCH',
      {
        commonInputSemanticHash: primitiveContract?.semanticHash || null,
        suppliedSemanticHash: loadPrimitiveSet?.semanticHash || null,
        status: primitiveContract?.status || null,
      },
    );
  }
  if (loadPrimitiveSet.datasetId !== model.project?.datasetId) {
    throw codedError(
      'The supplied model-load primitive set belongs to a different dataset.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_LOAD_PRIMITIVE_DATASET_MISMATCH',
      {
        expected: model.project?.datasetId || null,
        actual: loadPrimitiveSet.datasetId || null,
      },
    );
  }

  const inventory = createCommonEnrichedTargetInventory({
    schema: COMMON_ENRICHED_TARGET_INVENTORY_SCHEMA,
    inventoryId: 'CURRENT-COMMON-INPUT-EMPIRICAL-MASS-TARGETS',
    sharedModel: model,
  });
  const ancillaryOverlay = createNonFeaCommonEnrichedConfiguredDefaultOverlay({
    profile: commonInput.projectDataProfile,
    sourceModel: model,
    inventory,
    requestedMethods: ['WEIGHT_AND_GRAVITY'],
  });
  if (ancillaryOverlay.blockers.length) {
    throw codedError(
      'Current Common Input ancillary configured-default overlay is blocked.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_ANCILLARY_OVERLAY_BLOCKED',
      ancillaryOverlay.blockers,
    );
  }

  // The shipped Product engineering table is deliberately empty. If this ever
  // changes, it must first be included in Common Input currentness custody.
  if (LOAD_CALC_ENGINEERING_PRODUCT_DEFAULTS_EMPTY_V1.defaults.length !== 0) {
    throw codedError(
      'Product engineering defaults changed without Common Input currentness custody.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_PRODUCT_DEFAULT_CUSTODY_REQUIRED',
    );
  }

  const primitiveByEntityCase = massPrimitiveIndex(loadPrimitiveSet, model, loadCaseIds);
  return {
    inventory,
    ancillaryOverlay,
    ancillaryByLine: ancillaryByLineTarget(inventory, ancillaryOverlay),
    targetBySourceRecordId: new Map(
      inventory.componentTargets.map((target) => [target.sourceRecordId, target]),
    ),
    primitiveByEntityCase,
  };
}

function massPrimitiveIndex(loadPrimitiveSet, model, loadCaseIds) {
  const index = new Map();
  for (const primitive of loadPrimitiveSet.primitives) {
    if (![PRIMITIVE_TYPES.DISTRIBUTED, PRIMITIVE_TYPES.POINT].includes(primitive.primitiveType)) {
      continue;
    }
    const key = `${primitive.componentKey}\0${primitive.loadCaseId}`;
    if (index.has(key)) {
      throw codedError(
        `Multiple mass primitives claim ${primitive.componentKey}:${primitive.loadCaseId}.`,
        'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PRIMITIVE_MULTIPLE_CLAIMS',
      );
    }
    index.set(key, primitive);
  }
  for (const component of model.components) {
    for (const loadCaseId of loadCaseIds) {
      if (!index.has(`${component.componentKey}\0${loadCaseId}`)) {
        throw codedError(
          `No sealed mass primitive exists for ${component.componentKey}:${loadCaseId}.`,
          'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PRIMITIVE_REQUIRED',
        );
      }
    }
  }
  return index;
}

function projectComponent({
  component,
  target,
  loadCaseIds,
  primitiveByEntityCase,
  ancillaryByLine,
}) {
  if (!target || target.sourceRecordId !== component.componentKey) {
    throw codedError(
      `Component ${component.componentKey || '<missing>'} is not bound to one exact target inventory row.`,
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_TARGET_MISMATCH',
    );
  }
  const ancillary = target.lineTargetId
    ? ancillaryByLine.get(target.lineTargetId) || zeroAncillary()
    : zeroAncillary();
  const cases = loadCaseIds.map((loadCaseId) => projectPrimitiveCase({
    component,
    target,
    loadCaseId,
    primitive: primitiveByEntityCase.get(`${component.componentKey}\0${loadCaseId}`),
    ancillary,
  }));
  return deepFreeze({
    targetId: target.targetId,
    entityId: component.componentKey,
    sourceEntityId: component.sourceEntityId || null,
    componentType: String(component.type || 'OBJECT').toUpperCase(),
    lineTargetId: target.lineTargetId,
    lineKey: target.lineKey,
    cases,
  });
}

function projectPrimitiveCase({ component, target, loadCaseId, primitive, ancillary }) {
  if (!primitive) {
    throw codedError(
      `Missing mass primitive for ${component.componentKey}:${loadCaseId}.`,
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PRIMITIVE_REQUIRED',
    );
  }
  const basePrimitiveSemanticHash = semanticHash(primitive);
  if (primitive.primitiveType === PRIMITIVE_TYPES.DISTRIBUTED) {
    const sourceLengthM = Number(primitive.sourceLengthM);
    if (!(sourceLengthM > 0)
        || !Number.isFinite(primitive.massPerLengthKgM)
        || primitive.massPerLengthKgM < 0) {
      throw codedError(
        `Distributed primitive ${primitive.primitiveId} has invalid mass or source length.`,
        'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PRIMITIVE_INVALID',
      );
    }
    const includeAncillary = String(component.type || '').toUpperCase() === 'PIPE';
    const claddingMassPerLengthKgPerM = includeAncillary
      ? ancillary.claddingMassPerLengthKgPerM
      : 0;
    const tracingMassPerLengthKgPerM = includeAncillary
      ? ancillary.tracingMassPerLengthKgPerM
      : 0;
    const totalMassPerLengthKgPerM = primitive.massPerLengthKgM
      + claddingMassPerLengthKgPerM
      + tracingMassPerLengthKgPerM;
    return deepFreeze({
      loadCaseId,
      mode: 'DISTRIBUTED',
      basePrimitiveId: primitive.primitiveId,
      basePrimitiveSemanticHash,
      sourceMassPerLengthKgPerM: primitive.massPerLengthKgM,
      claddingMassPerLengthKgPerM,
      tracingMassPerLengthKgPerM,
      totalMassPerLengthKgPerM,
      sourceLengthM,
      massKg: totalMassPerLengthKgPerM * sourceLengthM,
      sourceMassBreakdown: structuredClone(primitive.massSourceBreakdown || []),
      formulaTrace: structuredClone(primitive.formulaTrace || []),
      basePrimitiveSourceEvidence: primitive.sourceEvidence || null,
      ancillaryEvidence: includeAncillary ? ancillary.evidence : [],
      diagnostics: structuredClone(primitive.diagnostics || []),
    });
  }
  if (primitive.primitiveType !== PRIMITIVE_TYPES.POINT
      || !Number.isFinite(primitive.pointMassKg)
      || primitive.pointMassKg < 0) {
    throw codedError(
      `Point primitive ${primitive.primitiveId || '<missing>'} has invalid mass.`,
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PRIMITIVE_INVALID',
    );
  }
  const containedFluid = componentContainedFluid(component, loadCaseId);
  const dryPointMassKg = primitive.pointMassKg;
  return deepFreeze({
    loadCaseId,
    mode: 'POINT',
    basePrimitiveId: primitive.primitiveId,
    basePrimitiveSemanticHash,
    dryPointMassKg,
    containedFluidMassKg: containedFluid.massKg,
    massKg: dryPointMassKg + containedFluid.massKg,
    applicationPoint: primitive.applicationPoint || null,
    basePrimitiveSourceEvidence: primitive.sourceEvidence || null,
    containedFluidEvidence: containedFluid.evidence,
    formulaTrace: structuredClone(primitive.formulaTrace || []),
    diagnostics: structuredClone(primitive.diagnostics || []),
  });
}

function ancillaryByLineTarget(inventory, overlay) {
  const lineById = new Map(inventory.lineTargets.map((target) => [target.targetId, target]));
  const result = new Map();
  overlay.targetRecords.filter((record) => record.targetKind === 'LINE').forEach((record) => {
    const target = lineById.get(record.targetId);
    if (!target || target.lineKey !== record.lineKey) {
      throw codedError(
        `Ancillary overlay target ${record.targetId} is not the exact target inventory line.`,
        'CURRENT_COMMON_INPUT_EMPIRICAL_ANCILLARY_TARGET_MISMATCH',
      );
    }
    const row = zeroAncillary();
    for (const field of record.fields) {
      const property = ANCILLARY_FIELDS[field.field];
      if (!property) continue;
      if (field.unit !== 'kg/m' || field.approved !== true
          || !['RESOLVED_EXACT', 'RESOLVED_DERIVED'].includes(field.status)
          || !Number.isFinite(field.value) || field.value < 0) {
        throw codedError(
          `Ancillary field ${record.targetId}:${field.field} is not an approved non-negative kg/m value.`,
          'CURRENT_COMMON_INPUT_EMPIRICAL_ANCILLARY_VALUE_INVALID',
        );
      }
      row[property] = Number(field.value);
      row.evidence.push(deepFreeze({
        field: field.field,
        value: field.value,
        unit: field.unit,
        sourceKind: field.sourceKind,
        sourceKey: field.sourceKey,
        policyId: field.policyId,
        semanticHash: semanticHash(field),
      }));
    }
    result.set(record.targetId, deepFreeze({
      claddingMassPerLengthKgPerM: row.claddingMassPerLengthKgPerM,
      tracingMassPerLengthKgPerM: row.tracingMassPerLengthKgPerM,
      evidence: [...row.evidence].sort((left, right) => ascii(left.field, right.field)),
    }));
  });
  return result;
}

function componentContainedFluid(component, loadCaseId) {
  if (loadCaseId === 'EMPTY' || String(component.type || '').toUpperCase() === 'PIPE') {
    return deepFreeze({ massKg: 0, evidence: null });
  }
  const property = loadCaseId === 'OPE'
    ? 'componentFluidWeightOpeKg'
    : 'componentFluidWeightHydKg';
  const evidence = component.engineeringProperties?.[property] || null;
  const value = evidenceNumber(evidence);
  if (value === null) return deepFreeze({ massKg: 0, evidence: null });
  if (!Number.isFinite(value) || value < 0) {
    throw codedError(
      `Component ${component.componentKey} ${loadCaseId} contained-fluid mass is invalid.`,
      'CURRENT_COMMON_INPUT_EMPIRICAL_COMPONENT_CONTENT_INVALID',
    );
  }
  return deepFreeze({
    massKg: value,
    evidence: deepFreeze({
      property,
      valueKg: value,
      sourceKind: evidence.sourceKind || null,
      sourcePath: evidence.sourcePath || null,
      sourceRoot: evidence.sourceRoot || null,
      semanticHash: semanticHash(evidence),
    }),
  });
}

function validateEntityRow(row, loadCaseIds) {
  if (!isRecord(row) || !Array.isArray(row.cases)) {
    throw codedError(
      'Projection entity row is invalid.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PROJECTION_INVALID',
    );
  }
  requiredText(row.targetId, 'targetId');
  const ids = row.cases.map((item) => item.loadCaseId);
  if (JSON.stringify(ids) !== JSON.stringify(loadCaseIds)) {
    throw codedError(
      `Projection entity ${row.entityId} load cases differ from the projection case set.`,
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_CASE_COVERAGE_INVALID',
    );
  }
  row.cases.forEach((item) => {
    requiredText(item.basePrimitiveId, 'basePrimitiveId');
    semanticHashText(item.basePrimitiveSemanticHash, 'basePrimitiveSemanticHash');
    if (!Number.isFinite(item.massKg) || item.massKg < 0) {
      throw codedError(
        `Projection entity ${row.entityId} has invalid ${item.loadCaseId} mass.`,
        'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_VALUE_INVALID',
      );
    }
    if (item.mode === 'DISTRIBUTED') {
      for (const key of [
        'sourceMassPerLengthKgPerM',
        'claddingMassPerLengthKgPerM',
        'tracingMassPerLengthKgPerM',
        'totalMassPerLengthKgPerM',
        'sourceLengthM',
      ]) {
        if (!Number.isFinite(item[key]) || item[key] < 0) {
          throw codedError(
            `Projection entity ${row.entityId} has invalid distributed ${key}.`,
            'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_VALUE_INVALID',
          );
        }
      }
      if (!(item.sourceLengthM > 0)
          || item.totalMassPerLengthKgPerM !== (
            item.sourceMassPerLengthKgPerM
            + item.claddingMassPerLengthKgPerM
            + item.tracingMassPerLengthKgPerM
          )
          || item.massKg !== item.totalMassPerLengthKgPerM * item.sourceLengthM) {
        throw codedError(
          `Projection entity ${row.entityId} distributed mass composition is inconsistent.`,
          'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_COMPOSITION_INVALID',
        );
      }
      return;
    }
    if (item.mode !== 'POINT'
        || !Number.isFinite(item.dryPointMassKg)
        || item.dryPointMassKg < 0
        || !Number.isFinite(item.containedFluidMassKg)
        || item.containedFluidMassKg < 0
        || item.massKg !== item.dryPointMassKg + item.containedFluidMassKg) {
      throw codedError(
        `Projection entity ${row.entityId} point mass composition is inconsistent.`,
        'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_COMPOSITION_INVALID',
      );
    }
  });
}

function projectionSummary(entityRows, loadCaseIds) {
  const cases = entityRows.flatMap((row) => row.cases);
  return deepFreeze({
    entityCount: entityRows.length,
    loadCaseCount: loadCaseIds.length,
    entityCaseCount: cases.length,
    distributedEntityCaseCount: cases.filter((row) => row.mode === 'DISTRIBUTED').length,
    pointEntityCaseCount: cases.filter((row) => row.mode === 'POINT').length,
    zeroMassEntityCaseCount: cases.filter((row) => row.massKg === 0).length,
    ancillaryEntityCaseCount: cases.filter((row) => (
      row.mode === 'DISTRIBUTED'
      && (row.claddingMassPerLengthKgPerM > 0 || row.tracingMassPerLengthKgPerM > 0)
    )).length,
    containedFluidEntityCaseCount: cases.filter((row) => (
      row.mode === 'POINT' && row.containedFluidMassKg > 0
    )).length,
  });
}

function zeroAncillary() {
  return {
    claddingMassPerLengthKgPerM: 0,
    tracingMassPerLengthKgPerM: 0,
    evidence: [],
  };
}

function normalizeLoadCases(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw codedError(
      'Current Common Input empirical mass projection requires at least one load case.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_LOAD_CASE_INVALID',
    );
  }
  const rows = [...new Set(value.map((item) => requiredText(item, 'loadCaseId')))].sort(ascii);
  rows.forEach((loadCaseId) => {
    if (!SUPPORTED_LOAD_CASES.includes(loadCaseId)) {
      throw codedError(
        `Unsupported empirical mass load case ${loadCaseId}.`,
        'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_LOAD_CASE_INVALID',
      );
    }
  });
  return deepFreeze(rows);
}

function requireFixedPolicy(value) {
  if (!isRecord(value)) {
    throw codedError(
      'Projection policy is invalid.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_POLICY_INVALID',
    );
  }
  const expectedKeys = Object.keys(FIXED_POLICY).sort(ascii);
  const actualKeys = Object.keys(value).sort(ascii);
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)
      || expectedKeys.some((key) => value[key] !== FIXED_POLICY[key])) {
    throw codedError(
      'Projection policy was altered.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_POLICY_INVALID',
    );
  }
}

function semanticHashText(value, label) {
  if (typeof value !== 'string' || !/^fnv1a64:[0-9a-f]{16}$/u.test(value)) {
    throw codedError(
      `${label} must be an FNV-1a semantic hash.`,
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PROJECTION_INVALID',
    );
  }
  return value;
}

function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.trim() !== value) {
    throw codedError(
      `${label} must be a non-empty trimmed string.`,
      'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PROJECTION_INVALID',
    );
  }
  return value;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function ascii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function codedError(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details === null ? null : deepFreeze(structuredClone(details));
  return error;
}
