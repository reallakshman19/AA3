import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { clonePlain, freezeDeep, isRecord, stringValue } from '../dataset-utils.js';

export const NON_FEA_COMPONENT_MASS_POLICY_SCHEMA = 'non-fea-component-mass-policy/v1';
export const NON_FEA_COMPONENT_MASS_RESOLUTION_SCHEMA = 'non-fea-component-mass-resolution/v1';

export const NON_FEA_COMPONENT_DRY_MASS_MODES = Object.freeze([
  'PIPE_DISTRIBUTED_MASS',
  'COMPONENT_EXPLICIT_POINT_MASS',
  'COMPONENT_DERIVED_GEOMETRIC_MASS',
  'COMPONENT_EQUIVALENT_LENGTH_MASS',
]);

const PROJECT_DATA_PATH = 'loadCalculation.componentMassCompositionPolicy';

/**
 * Resolves exactly one dry-metal mass policy for one component target.
 * Precedence is deterministic:
 *
 *   exact target > component type > default
 *
 * This resolver recognizes the complete closed policy vocabulary requested by
 * Issue #1321. Recognition does not imply that every mode is implemented by a
 * particular calculation method; active method guards must reject unsupported
 * modes rather than silently switching mass primitives.
 */
export function resolveNonFeaComponentMassPolicy({ profile, targetId, componentType } = {}) {
  const target = stringValue(targetId);
  const type = stringValue(componentType).toUpperCase();
  if (!target) {
    throw codedError('Component mass policy requires a target ID.', 'EMPIRICAL_COMPONENT_MASS_TARGET_REQUIRED');
  }
  if (!type) {
    throw codedError('Component mass policy requires a component type.', 'EMPIRICAL_COMPONENT_MASS_TYPE_REQUIRED');
  }
  const entry = profile?.loadCalculation?.componentMassCompositionPolicy;
  requireEvidenceEntry(entry);
  const selected = selectPolicy(entry.value, target, type);
  if (!selected) {
    throw codedError(
      `No component mass policy resolves for ${target} (${type}).`,
      'EMPIRICAL_COMPONENT_MASS_POLICY_SELECTION_REQUIRED',
      { projectDataPath: PROJECT_DATA_PATH, targetId: target, componentType: type },
    );
  }
  const mode = normalizeMode(selected.value);
  const material = {
    schema: NON_FEA_COMPONENT_MASS_RESOLUTION_SCHEMA,
    projectDataPath: PROJECT_DATA_PATH,
    targetId: target,
    componentType: type,
    selector: selected.selector,
    selectionAuthority: selected.authority,
    mode,
    sourceAuthority: stringValue(entry.evidence?.authority) || 'PROJECT_POLICY',
    source: stringValue(entry.evidence?.source),
    policyEntrySemanticHash: semanticHash(entry),
    selectedPolicySemanticHash: semanticHash(selected.value),
  };
  return freezeDeep({ ...material, semanticHash: semanticHash(material) });
}

export function validateNonFeaComponentMassPolicy(value) {
  const errors = [];
  try {
    validatePolicy(value);
  } catch (error) {
    errors.push(freezeDeep({
      code: error?.code || 'INVALID_COMPONENT_MASS_POLICY',
      message: error instanceof Error ? error.message : String(error),
    }));
  }
  return freezeDeep({ valid: errors.length === 0, errors });
}

function validatePolicy(value) {
  if (value === null || value === undefined) return;
  if (typeof value === 'string') {
    normalizeMode(value);
    return;
  }
  if (!isRecord(value)) {
    throw codedError('Component mass policy must be a mode token or policy object.', 'INVALID_COMPONENT_MASS_POLICY');
  }
  if (value.schema && value.schema !== NON_FEA_COMPONENT_MASS_POLICY_SCHEMA) {
    throw codedError(`Expected ${NON_FEA_COMPONENT_MASS_POLICY_SCHEMA}.`, 'INVALID_COMPONENT_MASS_POLICY_SCHEMA');
  }
  const selections = [];
  if (Object.hasOwn(value, 'defaultMode')) selections.push(['defaultMode', value.defaultMode]);
  if (Object.hasOwn(value, 'DEFAULT')) selections.push(['DEFAULT', value.DEFAULT]);
  if (isRecord(value.components)) {
    Object.entries(value.components).forEach(([targetId, mode]) => selections.push([`components.${targetId}`, mode]));
  }
  if (isRecord(value.componentTypes)) {
    Object.entries(value.componentTypes).forEach(([componentType, mode]) => selections.push([`componentTypes.${componentType}`, mode]));
  }
  if (selections.length === 0) {
    throw codedError('Component mass policy contains no selectable mode.', 'EMPTY_COMPONENT_MASS_POLICY');
  }
  selections.forEach(([selector, mode]) => {
    try {
      normalizeMode(mode);
    } catch (error) {
      throw codedError(`${selector}: ${error.message}`, error.code || 'INVALID_COMPONENT_MASS_MODE');
    }
  });
}

function selectPolicy(value, targetId, componentType) {
  if (typeof value === 'string') {
    return { selector: 'DIRECT', value, authority: 'DIRECT_POLICY' };
  }
  if (!isRecord(value)) return null;
  if (isRecord(value.components) && Object.hasOwn(value.components, targetId)) {
    return {
      selector: `COMPONENT:${targetId}`,
      value: value.components[targetId],
      authority: 'EXACT_COMPONENT',
    };
  }
  if (isRecord(value.componentTypes) && Object.hasOwn(value.componentTypes, componentType)) {
    return {
      selector: `COMPONENT_TYPE:${componentType}`,
      value: value.componentTypes[componentType],
      authority: 'COMPONENT_TYPE',
    };
  }
  if (Object.hasOwn(value, 'defaultMode')) {
    return { selector: 'DEFAULT', value: value.defaultMode, authority: 'DEFAULT' };
  }
  if (Object.hasOwn(value, 'DEFAULT')) {
    return { selector: 'DEFAULT', value: value.DEFAULT, authority: 'DEFAULT' };
  }
  return null;
}

function normalizeMode(value) {
  const mode = stringValue(value).toUpperCase();
  if (!NON_FEA_COMPONENT_DRY_MASS_MODES.includes(mode)) {
    throw codedError(
      `Unsupported component dry-mass mode: ${mode || 'EMPTY'}.`,
      'INVALID_COMPONENT_MASS_MODE',
      { value: value ?? null, allowed: NON_FEA_COMPONENT_DRY_MASS_MODES },
    );
  }
  return mode;
}

function requireEvidenceEntry(entry) {
  if (!isRecord(entry)
      || !Object.hasOwn(entry, 'value')
      || entry.approved !== true
      || !isRecord(entry.evidence)
      || !stringValue(entry.evidence.source)) {
    throw codedError(
      'Component mass composition policy requires approved Project/Product evidence.',
      'EMPIRICAL_COMPONENT_MASS_POLICY_AUTHORITY_INVALID',
      { projectDataPath: PROJECT_DATA_PATH },
    );
  }
  if (entry.value === null || entry.value === undefined) {
    throw codedError(
      'Component mass composition policy is missing.',
      'EMPIRICAL_COMPONENT_MASS_POLICY_REQUIRED',
      { projectDataPath: PROJECT_DATA_PATH },
    );
  }
}

function codedError(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details === null ? null : clonePlain(details);
  return error;
}
