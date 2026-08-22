import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../../core/shared-piping-model/immutable.js';
import { clonePlain, freezeDeep } from '../dataset-utils.js';
import { createEvidenceValue } from '../project-data/project-data-contract.js';
import {
  resolveNonFeaFluidFillPolicy,
} from '../project-data/non-fea-fluid-fill-policy.js';
import {
  findAuthorizedEmpiricalEffectiveValue,
  requireAuthorizedEmpiricalEffectiveValueLedger,
} from './authorized-empirical-effective-value-ledger.js';

export const AUTHORIZED_EMPIRICAL_EFFECTIVE_EXECUTION_PROJECTION_SCHEMA =
  'authorized-empirical-effective-execution-projection/v1';

const LINE_FIELDS = Object.freeze([
  ['PIPE_OUTER_DIAMETER', 'mm'],
  ['PIPE_WALL_THICKNESS', 'mm'],
  ['MATERIAL_DENSITY', 'kg/m3'],
  ['OPERATING_FLUID_DENSITY', 'kg/m3'],
  ['HYDRO_FLUID_DENSITY', 'kg/m3'],
  ['INSULATION_THICKNESS', 'mm'],
]);
const FLUID_COMPOSITION_RULE = 'BULK_DENSITY=AUTHORIZED_RAW_DENSITY*GOVERNED_FILL_FRACTION';

/**
 * Projects target-level effective values into the legacy gravity engine's exact
 * selector maps. No DEFAULT key is emitted. Per-line material/insulation and
 * per-component mass selectors are synthetic and execution-local, preventing
 * selector collisions from erasing target-level authority.
 *
 * Raw OPE/HYD fluid density remains authoritative in the effective-value
 * ledger. The projected density consumed by the scalar gravity kernel is an
 * explicitly derived bulk density, rho_bulk = rho_raw * fillFraction, with a
 * separate receipt binding the raw-density row and the governed fill policy.
 * This makes partial-fill mass auditable without masquerading the derived value
 * as source/master density.
 *
 * The supplied dataset/profile are cloned; source objects are never mutated.
 */
export function createAuthorizedEmpiricalEffectiveExecutionProjection({
  authorizedInput,
  dataset,
  profile,
} = {}) {
  if (!authorizedInput?.effectiveValueLedger) {
    throw codedError(
      'Authorized effective-value ledger is required.',
      'EMPIRICAL_EFFECTIVE_EXECUTION_LEDGER_REQUIRED',
    );
  }
  if (!dataset || typeof dataset !== 'object' || !Array.isArray(dataset.entities)) {
    throw codedError('Execution dataset is invalid.', 'EMPIRICAL_EFFECTIVE_EXECUTION_DATASET_INVALID');
  }
  if (!profile || typeof profile !== 'object' || !profile.loadCalculation) {
    throw codedError('Execution profile is invalid.', 'EMPIRICAL_EFFECTIVE_EXECUTION_PROFILE_INVALID');
  }
  const ledger = requireAuthorizedEmpiricalEffectiveValueLedger(authorizedInput.effectiveValueLedger);
  if (ledger.handoffSemanticHash !== authorizedInput.handoffSemanticHash
      || ledger.baselineSemanticHash !== authorizedInput.baselineSemanticHash) {
    throw codedError(
      'Effective-value ledger does not match the authorized input.',
      'EMPIRICAL_EFFECTIVE_EXECUTION_LEDGER_BINDING_MISMATCH',
    );
  }

  const sections = {};
  const materials = {};
  const operating = {};
  const hydro = {};
  const insulation = {};
  const weights = {};
  const lineMappings = [];
  const componentMappings = [];
  const fluidCompositionRows = [];
  const projectedDataset = clonePlain(dataset);
  const projectedProfile = clonePlain(profile);

  for (const binding of authorizedInput.lineBindings || []) {
    const values = Object.fromEntries(LINE_FIELDS.map(([fieldId, unit]) => [
      fieldId,
      requiredEffective(ledger, 'LINE', binding.targetId, fieldId, unit),
    ]));
    const insulationThickness = values.INSULATION_THICKNESS.value;
    const insulationDensity = insulationThickness === 0
      ? null
      : requiredEffective(ledger, 'LINE', binding.targetId, 'INSULATION_DENSITY', 'kg/m3');
    validateSection(values.PIPE_OUTER_DIAMETER.value, values.PIPE_WALL_THICKNESS.value, binding.targetId);

    const operatingFill = resolveNonFeaFluidFillPolicy({
      profile,
      loadCaseId: 'OPE',
      lineKey: binding.lineKey,
    });
    const hydroFill = resolveNonFeaFluidFillPolicy({
      profile,
      loadCaseId: 'HYD',
      lineKey: binding.lineKey,
    });
    const operatingComposition = composeFluidDensity(
      binding,
      'OPE',
      values.OPERATING_FLUID_DENSITY,
      operatingFill,
    );
    const hydroComposition = composeFluidDensity(
      binding,
      'HYD',
      values.HYDRO_FLUID_DENSITY,
      hydroFill,
    );
    fluidCompositionRows.push(operatingComposition.receipt, hydroComposition.receipt);

    const materialSelector = `EFFECTIVE_MATERIAL:${binding.targetId}`;
    const insulationSelector = insulationThickness === 0
      ? null
      : `EFFECTIVE_INSULATION:${binding.targetId}`;
    sections[binding.lineKey] = {
      outsideDiameterMm: values.PIPE_OUTER_DIAMETER.value,
      wallThicknessMm: values.PIPE_WALL_THICKNESS.value,
      materialCode: materialSelector,
      insulationCode: insulationSelector,
      insulationThicknessMm: insulationThickness,
    };
    materials[materialSelector] = values.MATERIAL_DENSITY.value;
    operating[binding.lineKey] = operatingComposition.projectedDensity;
    hydro[binding.lineKey] = hydroComposition.projectedDensity;
    if (insulationSelector) insulation[insulationSelector] = insulationDensity.value;
    lineMappings.push(freezeDeep({
      targetId: binding.targetId,
      lineKey: binding.lineKey,
      materialSelector,
      insulationSelector,
      selectedSemanticHashes: [
        ...Object.values(values).map((row) => row.semanticHash),
        ...(insulationDensity ? [insulationDensity.semanticHash] : []),
        operatingFill.semanticHash,
        hydroFill.semanticHash,
      ].sort(),
    }));
  }

  for (const binding of authorizedInput.componentBindings || []) {
    const weight = requiredEffective(
      ledger,
      'COMPONENT',
      binding.targetId,
      'COMPONENT_WEIGHT',
      'kg',
    );
    if (!(weight.value > 0)) {
      throw codedError(
        `Component ${binding.targetId} effective weight must be positive.`,
        'EMPIRICAL_EFFECTIVE_COMPONENT_WEIGHT_INVALID',
      );
    }
    const entity = resolveComponentEntity(projectedDataset, binding);
    const selector = `EFFECTIVE_COMPONENT:${binding.targetId}`;
    const attributes = entity.properties?.attributes || {};
    entity.properties = {
      ...(entity.properties || {}),
      attributes: {
        ...attributes,
        CATALOG_KEY: selector,
      },
    };
    weights[selector] = weight.value;
    componentMappings.push(freezeDeep({
      targetId: binding.targetId,
      sourceRecordId: binding.sourceRecordId,
      entityId: entity.entityId,
      originalCatalogKey: attributes.CATALOG_KEY ?? null,
      effectiveSelector: selector,
      selectedSemanticHash: weight.semanticHash,
      massCompositionPolicy: 'COMPONENT_EXPLICIT_POINT_MASS',
    }));
  }

  const orderedFluidRows = fluidCompositionRows.sort(byFluidComposition);
  const mappingMaterial = {
    schema: AUTHORIZED_EMPIRICAL_EFFECTIVE_EXECUTION_PROJECTION_SCHEMA,
    authorizedInputSemanticHash: authorizedInput.semanticHash,
    effectiveValueLedgerSemanticHash: ledger.semanticHash,
    sourceDatasetSemanticHash: semanticHash(dataset),
    lineMappings: lineMappings.sort(byTarget),
    componentMappings: componentMappings.sort(byTarget),
    fluidCompositionRule: FLUID_COMPOSITION_RULE,
    fluidCompositionRows: orderedFluidRows,
  };
  const projectionSemanticHash = semanticHash(mappingMaterial);
  const evidence = freezeDeep({
    source: 'AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER',
    sourceSemanticHash: ledger.semanticHash,
    authorizedInputSemanticHash: authorizedInput.semanticHash,
    effectiveExecutionProjectionSemanticHash: projectionSemanticHash,
    baselineSemanticHash: ledger.baselineSemanticHash,
    handoffSemanticHash: ledger.handoffSemanticHash,
  });
  const operatingEvidence = freezeDeep({
    ...evidence,
    massCompositionRule: FLUID_COMPOSITION_RULE,
    fluidCompositionBySelector: fluidEvidenceBySelector(orderedFluidRows, 'OPE'),
  });
  const hydroEvidence = freezeDeep({
    ...evidence,
    massCompositionRule: FLUID_COMPOSITION_RULE,
    fluidCompositionBySelector: fluidEvidenceBySelector(orderedFluidRows, 'HYD'),
  });
  const loadCalculation = projectedProfile.loadCalculation;
  loadCalculation.pipeSectionProperties = createEvidenceValue(sortedObject(sections), evidence, true);
  loadCalculation.materialDensitiesKgPerM3 = createEvidenceValue(sortedObject(materials), evidence, true);
  loadCalculation.operatingFluidDensitiesKgPerM3 = createEvidenceValue(sortedObject(operating), operatingEvidence, true);
  loadCalculation.hydroFluidDensitiesKgPerM3 = createEvidenceValue(sortedObject(hydro), hydroEvidence, true);
  loadCalculation.insulationDensitiesKgPerM3 = createEvidenceValue(sortedObject(insulation), evidence, true);
  loadCalculation.componentWeightsKg = createEvidenceValue(sortedObject(weights), evidence, true);

  const frozenProfile = deepFreeze(projectedProfile);
  const frozenDataset = deepFreeze(projectedDataset);
  const material = {
    ...mappingMaterial,
    projectionSemanticHash,
    projectedProfileSemanticHash: semanticHash(frozenProfile),
    projectedDatasetSemanticHash: semanticHash(frozenDataset),
  };
  return deepFreeze({
    ...material,
    profile: frozenProfile,
    dataset: frozenDataset,
    semanticHash: semanticHash(material),
  });
}

function composeFluidDensity(binding, loadCaseId, rawDensityRow, fillPolicy) {
  const rawDensityKgPerM3 = Number(rawDensityRow.value);
  if (!(rawDensityKgPerM3 > 0)) {
    throw codedError(
      `${loadCaseId} raw fluid density must be positive before fill composition.`,
      'EMPIRICAL_EFFECTIVE_FLUID_DENSITY_INVALID',
      { targetId: binding.targetId, lineKey: binding.lineKey, loadCaseId, rawDensityKgPerM3 },
    );
  }
  const bulkDensityKgPerM3 = rawDensityKgPerM3 * fillPolicy.fillFraction;
  if (!(bulkDensityKgPerM3 > 0)) {
    throw codedError(
      `${loadCaseId} derived bulk density must be positive on the current legacy statics path.`,
      'EMPIRICAL_EFFECTIVE_FLUID_BULK_DENSITY_INVALID',
      { targetId: binding.targetId, lineKey: binding.lineKey, loadCaseId, bulkDensityKgPerM3 },
    );
  }
  const receiptMaterial = {
    targetId: binding.targetId,
    lineKey: binding.lineKey,
    loadCaseId,
    rule: FLUID_COMPOSITION_RULE,
    rawDensityKgPerM3,
    rawDensitySemanticHash: rawDensityRow.semanticHash,
    fillFraction: fillPolicy.fillFraction,
    phase: fillPolicy.phase,
    fillState: fillPolicy.state,
    fillPolicySelector: fillPolicy.selector,
    fillPolicySemanticHash: fillPolicy.semanticHash,
    bulkDensityKgPerM3,
  };
  const receipt = freezeDeep({
    ...receiptMaterial,
    semanticHash: semanticHash(receiptMaterial),
  });
  return freezeDeep({
    projectedDensity: {
      selected: bulkDensityKgPerM3,
      rawDensityKgPerM3,
      fillFraction: fillPolicy.fillFraction,
      phase: fillPolicy.phase,
      fillState: fillPolicy.state,
      rawDensitySemanticHash: rawDensityRow.semanticHash,
      fillPolicySemanticHash: fillPolicy.semanticHash,
      compositionSemanticHash: receipt.semanticHash,
    },
    receipt,
  });
}

function fluidEvidenceBySelector(rows, loadCaseId) {
  return sortedObject(Object.fromEntries(rows
    .filter((row) => row.loadCaseId === loadCaseId)
    .map((row) => [row.lineKey, {
      rule: row.rule,
      rawDensityKgPerM3: row.rawDensityKgPerM3,
      rawDensitySemanticHash: row.rawDensitySemanticHash,
      fillFraction: row.fillFraction,
      phase: row.phase,
      fillState: row.fillState,
      fillPolicySelector: row.fillPolicySelector,
      fillPolicySemanticHash: row.fillPolicySemanticHash,
      bulkDensityKgPerM3: row.bulkDensityKgPerM3,
      compositionSemanticHash: row.semanticHash,
    }])));
}

function requiredEffective(ledger, targetKind, targetId, fieldId, unit) {
  const selected = findAuthorizedEmpiricalEffectiveValue(ledger, targetKind, targetId, fieldId);
  if (!selected) {
    throw codedError(
      `Effective value ${targetKind}:${targetId}:${fieldId} is required for gravity execution.`,
      'EMPIRICAL_EFFECTIVE_EXECUTION_VALUE_REQUIRED',
      { targetKind, targetId, fieldId },
    );
  }
  if (selected.unit !== unit) {
    throw codedError(
      `Effective value ${targetKind}:${targetId}:${fieldId} must use ${unit}; got ${selected.unit}.`,
      'EMPIRICAL_EFFECTIVE_EXECUTION_UNIT_UNSUPPORTED',
      { targetKind, targetId, fieldId, expectedUnit: unit, actualUnit: selected.unit },
    );
  }
  if (typeof selected.value !== 'number' || !Number.isFinite(selected.value) || selected.value < 0) {
    throw codedError(
      `Effective value ${targetKind}:${targetId}:${fieldId} must be a finite non-negative number.`,
      'EMPIRICAL_EFFECTIVE_EXECUTION_VALUE_INVALID',
      { targetKind, targetId, fieldId },
    );
  }
  return selected;
}

function validateSection(od, wall, targetId) {
  if (!(od > 0) || !(wall > 0) || 2 * wall >= od) {
    throw codedError(
      `Effective pipe section ${targetId} is invalid.`,
      'EMPIRICAL_EFFECTIVE_PIPE_SECTION_INVALID',
      { targetId, outsideDiameterMm: od, wallThicknessMm: wall },
    );
  }
}

function resolveComponentEntity(dataset, binding) {
  const shared = dataset.sharedModel?.components?.find(
    (component) => component.componentKey === binding.sourceRecordId,
  ) || null;
  const matches = (dataset.entities || []).filter((entity) => (
    entity.entityId === binding.sourceRecordId
    || entity.sourceEntityId === binding.sourceRecordId
    || (shared?.sourceEntityId && entity.sourceEntityId === shared.sourceEntityId)
  ));
  const unique = [...new Map(matches.map((entity) => [entity.entityId, entity])).values()];
  if (unique.length !== 1) {
    throw codedError(
      `Component target ${binding.targetId} does not map to exactly one execution entity.`,
      'EMPIRICAL_EFFECTIVE_COMPONENT_TARGET_AMBIGUOUS',
      {
        targetId: binding.targetId,
        sourceRecordId: binding.sourceRecordId,
        candidateEntityIds: unique.map((entity) => entity.entityId).sort(),
      },
    );
  }
  return unique[0];
}

function sortedObject(value) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => (
    left < right ? -1 : left > right ? 1 : 0
  )));
}

function byTarget(left, right) {
  return left.targetId < right.targetId ? -1 : left.targetId > right.targetId ? 1 : 0;
}

function byFluidComposition(left, right) {
  const a = `${left.targetId}|${left.loadCaseId}`;
  const b = `${right.targetId}|${right.loadCaseId}`;
  return a < b ? -1 : a > b ? 1 : 0;
}

function codedError(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}
