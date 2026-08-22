import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { clonePlain, freezeDeep, isRecord, stringValue } from '../dataset-utils.js';
import { createEvidenceValue } from '../project-data/project-data-contract.js';
import { requireAuthorizedEmpiricalLoadInput } from './authorized-empirical-load-input.js';
import {
  createAuthorizedEmpiricalEffectiveValueContext,
  findAuthorizedEmpiricalComponentEffectiveValue,
  findAuthorizedEmpiricalLineEffectiveValue,
} from './authorized-empirical-effective-value-context.js';

export const AUTHORIZED_EMPIRICAL_SUPPORT_LOAD_CALCULATION_VIEW_SCHEMA =
  'authorized-empirical-support-load-calculation-view/v1';

export const AUTHORIZED_EMPIRICAL_SUPPORT_LOAD_CALCULATION_VIEW_MODES = Object.freeze({
  EFFECTIVE_LEDGER: 'EFFECTIVE_LEDGER_V1',
  LEGACY_OVERLAY: 'LEGACY_AUTHORIZED_OVERLAY_COMPATIBILITY',
});

const MASS_OVERLAY_FIELDS = Object.freeze([
  'pipeSectionProperties',
  'materialDensitiesKgPerM3',
  'operatingFluidDensitiesKgPerM3',
  'hydroFluidDensitiesKgPerM3',
  'insulationDensitiesKgPerM3',
  'componentWeightsKg',
]);

/**
 * Creates the calculation-only dataset/profile view consumed by the legacy
 * support-load kernel.
 *
 * For ledger-bearing authorized inputs the six mass/section maps are scrubbed
 * and rebuilt only from exact target-level effective values. Synthetic
 * material/insulation/catalog keys preserve target specificity so two lines or
 * components may legitimately carry different reviewed values even when their
 * original material/catalog code is the same.
 *
 * Source dataset identity, entityId, sourceEntityId, topology and chainage are
 * never changed. The only dataset mutation is on the cloned calculation view:
 * a non-pipe entity receives a synthetic CATALOG_KEY solely so the historical
 * component-mass lookup cannot collapse distinct target-level masses.
 */
export function createAuthorizedEmpiricalSupportLoadCalculationView({
  authorizedInput,
  dataset,
  profile,
} = {}) {
  const input = requireAuthorizedEmpiricalLoadInput(authorizedInput);
  requireDataset(dataset);
  requireProfile(profile);

  if (!input.effectiveValueLedger) {
    return legacyCompatibilityView(input, dataset, profile);
  }

  const context = createAuthorizedEmpiricalEffectiveValueContext(input);
  const calculationDataset = clonePlain(dataset);
  const calculationProfile = clonePlain(profile);
  const selections = [];
  const pipeSectionProperties = {};
  const materialDensitiesKgPerM3 = {};
  const operatingFluidDensitiesKgPerM3 = {};
  const hydroFluidDensitiesKgPerM3 = {};
  const insulationDensitiesKgPerM3 = {};
  const componentWeightsKg = {};

  for (const binding of context.lineBindings) {
    const lineKey = binding.lineKey;
    const od = requireLineValue(context, lineKey, 'PIPE_OUTER_DIAMETER', 'mm');
    const wall = requireLineValue(context, lineKey, 'PIPE_WALL_THICKNESS', 'mm');
    const materialDensity = requireLineValue(context, lineKey, 'MATERIAL_DENSITY', 'kg/m3');
    const insulationThickness = requireLineValue(context, lineKey, 'INSULATION_THICKNESS', 'mm');
    const operatingDensity = requireLineValue(context, lineKey, 'OPERATING_FLUID_DENSITY', 'kg/m3');
    const hydroDensity = requireLineValue(context, lineKey, 'HYDRO_FLUID_DENSITY', 'kg/m3');

    const outsideDiameterMm = positiveNumber(od, 'PIPE_OUTER_DIAMETER', binding.targetId);
    const wallThicknessMm = positiveNumber(wall, 'PIPE_WALL_THICKNESS', binding.targetId);
    if (2 * wallThicknessMm >= outsideDiameterMm) {
      throw codedError(
        `Effective pipe section ${binding.targetId} leaves no positive inside diameter.`,
        'EMPIRICAL_EFFECTIVE_PIPE_SECTION_INVALID',
        { targetId: binding.targetId, outsideDiameterMm, wallThicknessMm },
      );
    }
    const materialDensityKgPerM3 = positiveNumber(
      materialDensity,
      'MATERIAL_DENSITY',
      binding.targetId,
    );
    const insulationThicknessMm = nonnegativeNumber(
      insulationThickness,
      'INSULATION_THICKNESS',
      binding.targetId,
    );
    const operatingFluidDensityKgPerM3 = positiveNumber(
      operatingDensity,
      'OPERATING_FLUID_DENSITY',
      binding.targetId,
    );
    const hydroFluidDensityKgPerM3 = positiveNumber(
      hydroDensity,
      'HYDRO_FLUID_DENSITY',
      binding.targetId,
    );

    const materialKey = syntheticKey('MATERIAL', binding.targetId);
    const insulationKey = insulationThicknessMm > 0
      ? syntheticKey('INSULATION', binding.targetId)
      : null;
    let insulationDensity = null;
    if (insulationThicknessMm > 0) {
      insulationDensity = requireLineValue(context, lineKey, 'INSULATION_DENSITY', 'kg/m3');
      insulationDensitiesKgPerM3[insulationKey] = positiveNumber(
        insulationDensity,
        'INSULATION_DENSITY',
        binding.targetId,
      );
    }

    pipeSectionProperties[lineKey] = {
      outsideDiameterMm,
      wallThicknessMm,
      materialCode: materialKey,
      insulationCode: insulationKey,
      insulationThicknessMm,
    };
    materialDensitiesKgPerM3[materialKey] = materialDensityKgPerM3;
    operatingFluidDensitiesKgPerM3[lineKey] = operatingFluidDensityKgPerM3;
    hydroFluidDensitiesKgPerM3[lineKey] = hydroFluidDensityKgPerM3;
    [od, wall, materialDensity, insulationThickness, operatingDensity, hydroDensity, insulationDensity]
      .filter(Boolean)
      .forEach((selected) => selections.push(selectionReceipt(selected)));
  }

  const componentBindingBySourceRecord = new Map(
    context.componentBindings.map((row) => [row.sourceRecordId, row]),
  );
  const matchedComponentSources = new Set();
  for (const entity of calculationDataset.entities) {
    if (stringValue(entity?.entityType).toUpperCase() === 'PIPE') continue;
    const sourceRecordId = stringValue(entity?.sourceEntityId);
    const binding = sourceRecordId ? componentBindingBySourceRecord.get(sourceRecordId) : null;
    const syntheticCatalogKey = binding
      ? syntheticKey('COMPONENT', binding.targetId)
      : syntheticKey('UNRESOLVED_COMPONENT', stringValue(entity?.entityId) || 'UNKNOWN');
    ensureCalculationCatalogKey(entity, syntheticCatalogKey);
    if (!binding) continue;
    if (matchedComponentSources.has(sourceRecordId)) {
      throw codedError(
        `Authorized component sourceRecordId ${sourceRecordId} matches more than one calculation entity.`,
        'EMPIRICAL_EFFECTIVE_COMPONENT_IDENTITY_AMBIGUOUS',
        { sourceRecordId },
      );
    }
    matchedComponentSources.add(sourceRecordId);
    const mass = findAuthorizedEmpiricalComponentEffectiveValue(
      context,
      sourceRecordId,
      'COMPONENT_WEIGHT',
      'kg',
    );
    if (!mass) {
      throw codedError(
        `Authorized component ${binding.targetId} has no resolved effective component mass.`,
        'EMPIRICAL_EFFECTIVE_COMPONENT_MASS_UNRESOLVED',
        { targetId: binding.targetId, sourceRecordId },
      );
    }
    componentWeightsKg[syntheticCatalogKey] = positiveNumber(
      mass,
      'COMPONENT_WEIGHT',
      binding.targetId,
    );
    selections.push(selectionReceipt(mass));
  }

  const unmatchedBindings = context.componentBindings.filter(
    (row) => !matchedComponentSources.has(row.sourceRecordId),
  );
  if (unmatchedBindings.length) {
    throw codedError(
      'Authorized component bindings do not map one-to-one to calculation entities.',
      'EMPIRICAL_EFFECTIVE_COMPONENT_IDENTITY_MISSING',
      { sourceRecordIds: unmatchedBindings.map((row) => row.sourceRecordId) },
    );
  }

  const sortedSelections = dedupeSelections(selections);
  const selectionSemanticHash = semanticHash(sortedSelections);
  const evidenceBase = freezeDeep({
    source: 'AUTHORIZED_EFFECTIVE_VALUE_LEDGER_CALCULATION_VIEW',
    authority: 'EFFECTIVE_VALUE_LEDGER',
    authorizedInputSemanticHash: input.semanticHash,
    effectiveValueLedgerSemanticHash: input.effectiveValueLedger.semanticHash,
    effectiveValueContextSemanticHash: context.semanticHash,
    selectionSemanticHash,
  });
  const rebuilt = {
    pipeSectionProperties,
    materialDensitiesKgPerM3,
    operatingFluidDensitiesKgPerM3,
    hydroFluidDensitiesKgPerM3,
    insulationDensitiesKgPerM3,
    componentWeightsKg,
  };
  for (const field of MASS_OVERLAY_FIELDS) {
    calculationProfile.loadCalculation[field] = createEvidenceValue(
      sortObject(rebuilt[field]),
      { ...evidenceBase, field },
      true,
    );
  }

  const frozenDataset = freezeDeep(calculationDataset);
  const frozenProfile = freezeDeep(calculationProfile);
  const material = {
    schema: AUTHORIZED_EMPIRICAL_SUPPORT_LOAD_CALCULATION_VIEW_SCHEMA,
    mode: AUTHORIZED_EMPIRICAL_SUPPORT_LOAD_CALCULATION_VIEW_MODES.EFFECTIVE_LEDGER,
    authorizedInputSemanticHash: input.semanticHash,
    effectiveValueLedgerSemanticHash: input.effectiveValueLedger.semanticHash,
    effectiveValueContextSemanticHash: context.semanticHash,
    sourceDatasetSemanticHash: semanticHash(dataset),
    sourceProfileSemanticHash: semanticHash(profile),
    calculationDatasetSemanticHash: semanticHash(frozenDataset),
    calculationProfileSemanticHash: semanticHash(frozenProfile),
    selectionSemanticHash,
    selections: sortedSelections,
    dataset: frozenDataset,
    profile: frozenProfile,
  };
  return freezeDeep({ ...material, semanticHash: semanticHash(material) });
}

export function requireAuthorizedEmpiricalSupportLoadCalculationView(value) {
  if (!isRecord(value)
      || value.schema !== AUTHORIZED_EMPIRICAL_SUPPORT_LOAD_CALCULATION_VIEW_SCHEMA
      || !Object.values(AUTHORIZED_EMPIRICAL_SUPPORT_LOAD_CALCULATION_VIEW_MODES).includes(value.mode)
      || !isRecord(value.dataset)
      || !isRecord(value.profile)
      || !Array.isArray(value.selections)) {
    throw codedError(
      `Expected ${AUTHORIZED_EMPIRICAL_SUPPORT_LOAD_CALCULATION_VIEW_SCHEMA}.`,
      'EMPIRICAL_SUPPORT_LOAD_CALCULATION_VIEW_INVALID',
    );
  }
  const { semanticHash: suppliedHash, ...material } = value;
  if (suppliedHash !== semanticHash(material)) {
    throw codedError(
      'Authorized support-load calculation-view semantic hash is stale.',
      'EMPIRICAL_SUPPORT_LOAD_CALCULATION_VIEW_HASH_MISMATCH',
    );
  }
  if (value.calculationDatasetSemanticHash !== semanticHash(value.dataset)
      || value.calculationProfileSemanticHash !== semanticHash(value.profile)
      || value.selectionSemanticHash !== semanticHash(value.selections)) {
    throw codedError(
      'Authorized support-load calculation-view child hash is stale.',
      'EMPIRICAL_SUPPORT_LOAD_CALCULATION_VIEW_HASH_MISMATCH',
    );
  }
  return freezeDeep(value);
}

function legacyCompatibilityView(input, dataset, profile) {
  const frozenDataset = freezeDeep(clonePlain(dataset));
  const frozenProfile = freezeDeep(clonePlain(profile));
  const material = {
    schema: AUTHORIZED_EMPIRICAL_SUPPORT_LOAD_CALCULATION_VIEW_SCHEMA,
    mode: AUTHORIZED_EMPIRICAL_SUPPORT_LOAD_CALCULATION_VIEW_MODES.LEGACY_OVERLAY,
    authorizedInputSemanticHash: input.semanticHash,
    effectiveValueLedgerSemanticHash: null,
    effectiveValueContextSemanticHash: null,
    sourceDatasetSemanticHash: semanticHash(dataset),
    sourceProfileSemanticHash: semanticHash(profile),
    calculationDatasetSemanticHash: semanticHash(frozenDataset),
    calculationProfileSemanticHash: semanticHash(frozenProfile),
    selectionSemanticHash: semanticHash([]),
    selections: [],
    dataset: frozenDataset,
    profile: frozenProfile,
  };
  return freezeDeep({ ...material, semanticHash: semanticHash(material) });
}

function requireLineValue(context, lineKey, fieldId, unit) {
  const selected = findAuthorizedEmpiricalLineEffectiveValue(
    context,
    lineKey,
    fieldId,
    unit,
  );
  if (!selected) {
    throw codedError(
      `Line ${lineKey} has no resolved effective ${fieldId}.`,
      'EMPIRICAL_EFFECTIVE_LINE_VALUE_UNRESOLVED',
      { lineKey, fieldId },
    );
  }
  return selected;
}

function positiveNumber(selected, fieldId, targetId) {
  const value = Number(selected.value);
  if (!Number.isFinite(value) || value <= 0) {
    throw codedError(
      `Effective ${fieldId} for ${targetId} must be positive and finite.`,
      'EMPIRICAL_EFFECTIVE_VALUE_INVALID',
      { targetId, fieldId, value: selected.value },
    );
  }
  return value;
}

function nonnegativeNumber(selected, fieldId, targetId) {
  const value = Number(selected.value);
  if (!Number.isFinite(value) || value < 0) {
    throw codedError(
      `Effective ${fieldId} for ${targetId} must be nonnegative and finite.`,
      'EMPIRICAL_EFFECTIVE_VALUE_INVALID',
      { targetId, fieldId, value: selected.value },
    );
  }
  return value;
}

function selectionReceipt(selected) {
  return freezeDeep({
    resolutionKey: selected.resolutionKey,
    candidateId: selected.candidateId,
    fieldId: selected.fieldId,
    authority: selected.authority,
    sourceId: selected.sourceId,
    unit: selected.unit,
    valueSemanticHash: semanticHash(selected.value),
    candidateSemanticHash: selected.semanticHash,
  });
}

function dedupeSelections(rows) {
  const byKey = new Map();
  rows.forEach((row) => {
    const key = row.resolutionKey;
    const previous = byKey.get(key);
    if (previous && previous.candidateSemanticHash !== row.candidateSemanticHash) {
      throw codedError(
        `Calculation view received conflicting selections for ${key}.`,
        'EMPIRICAL_EFFECTIVE_SELECTION_CONFLICT',
      );
    }
    byKey.set(key, row);
  });
  return freezeDeep([...byKey.values()].sort((left, right) => ascii(left.resolutionKey, right.resolutionKey)));
}

function ensureCalculationCatalogKey(entity, catalogKey) {
  if (!isRecord(entity.properties)) entity.properties = {};
  if (!isRecord(entity.properties.attributes)) entity.properties.attributes = {};
  entity.properties.attributes.CATALOG_KEY = catalogKey;
}

function syntheticKey(kind, identity) {
  return `EVL:${kind}:${encodeURIComponent(requiredText(identity, 'synthetic identity'))}`;
}

function sortObject(value) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => ascii(left, right)));
}

function requireDataset(dataset) {
  if (!isRecord(dataset) || !Array.isArray(dataset.entities)) {
    throw codedError('Support-load calculation view requires a dataset with entities.', 'EMPIRICAL_SUPPORT_LOAD_CALCULATION_VIEW_INVALID');
  }
}

function requireProfile(profile) {
  if (!isRecord(profile) || profile.schema !== 'project-data-profile/v1' || !isRecord(profile.loadCalculation)) {
    throw codedError('Support-load calculation view requires project-data-profile/v1.', 'EMPIRICAL_SUPPORT_LOAD_CALCULATION_VIEW_INVALID');
  }
}

function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw codedError(`${label} is required.`, 'EMPIRICAL_SUPPORT_LOAD_CALCULATION_VIEW_INVALID');
  return text;
}

function codedError(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function ascii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
