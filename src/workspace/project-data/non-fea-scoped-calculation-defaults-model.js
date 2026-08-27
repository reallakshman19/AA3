import { listNonFeaEnrichmentFields } from '../../core/non-fea-enrichment/index.js';
import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { clonePlain, freezeDeep, isRecord, stringValue } from '../dataset-utils.js';
import {
  NON_FEA_CONFIGURED_DEFAULT_POLICY_SCHEMA,
  listNonFeaFieldDefinitions,
  validateConfiguredDefaultsPolicy,
} from './non-fea-field-registry.js';
import {
  NON_FEA_CONFIGURED_DEFAULT_SCOPE_PRECEDENCE,
  configuredDefaultScopePriority,
} from './non-fea-configured-default-provider.js';

export const NON_FEA_SCOPED_CALCULATION_DEFAULTS_MODEL_SCHEMA =
  'non-fea-scoped-calculation-defaults-model/v1';
export const NON_FEA_SCOPED_CALCULATION_DEFAULTS_SOURCE =
  'Load Calc Calculation Defaults scoped editor';

const ANCILLARY_PROVIDER_FIELDS = Object.freeze(['CLADDING_WEIGHT', 'TRACING_WEIGHT']);
const ENRICHMENT_PROVIDER_FIELDS = new Set(listNonFeaEnrichmentFields().map((row) => row.fieldId));

// These units match the values the existing configured-default provider writes
// into the current enrichment properties. The provider does not convert units.
const PROVIDER_NATIVE_UNITS = freezeDeep({
  PIPE_OUTER_DIAMETER: 'mm',
  PIPE_WALL_THICKNESS: 'mm',
  MATERIAL_DENSITY: 'kg/m³',
  UNIT_PIPE_WEIGHT: 'kg/m',
  OPERATING_FLUID_DENSITY: 'kg/m³',
  HYDRO_FLUID_DENSITY: 'kg/m³',
  OPERATING_FLUID_WEIGHT: 'kg/m',
  HYDRO_FLUID_WEIGHT: 'kg/m',
  INSULATION_THICKNESS: 'mm',
  INSULATION_DENSITY: 'kg/m³',
  INSULATION_WEIGHT: 'kg/m',
  COMPONENT_WEIGHT: 'kg',
  COMPONENT_OPERATING_FLUID_WEIGHT: 'kg',
  COMPONENT_HYDRO_FLUID_WEIGHT: 'kg',
  ELASTIC_MODULUS: 'MPa',
  CLADDING_WEIGHT: 'kg/m',
  TRACING_WEIGHT: 'kg/m',
});

const POSITIVE_FIELDS = new Set([
  'PIPE_OUTER_DIAMETER',
  'PIPE_WALL_THICKNESS',
  'MATERIAL_DENSITY',
  'UNIT_PIPE_WEIGHT',
  'OPERATING_FLUID_DENSITY',
  'HYDRO_FLUID_DENSITY',
  'INSULATION_DENSITY',
  'ELASTIC_MODULUS',
]);

const SCOPE_DEFINITIONS = freezeDeep([
  scopeDefinition('GLOBAL', 'Project global', []),
  scopeDefinition('ENTITY', 'Exact entity', ['entityIds']),
  scopeDefinition('POS', 'Exact POS', ['posIds']),
  scopeDefinition('LINE', 'Line', ['lineIds']),
  scopeDefinition('BRANCH', 'Branch', ['branchIds']),
  scopeDefinition('PIPING_CLASS_NB', 'Piping class + nominal bore', ['pipingClasses', 'nominalBoreMm']),
  scopeDefinition('COMPONENT_TYPE_NB', 'Component type + nominal bore', ['componentTypes', 'nominalBoreMm']),
  scopeDefinition('PIPING_CLASS', 'Piping class', ['pipingClasses']),
  scopeDefinition('COMPONENT_TYPE', 'Component type', ['componentTypes']),
  scopeDefinition('SUPPORT_KIND', 'Support kind', ['supportKinds']),
  scopeDefinition('NOMINAL_BORE', 'Nominal bore', ['nominalBoreMm']),
  scopeDefinition('SYSTEM', 'System', ['systemIds']),
  scopeDefinition('ZONE', 'Zone', ['zoneIds']),
]);
const SCOPE_BY_ID = new Map(SCOPE_DEFINITIONS.map((row) => [row.scopeKind, row]));

const FIELD_DEFINITIONS = freezeDeep(listNonFeaFieldDefinitions()
  .filter((row) => row.defaultEligible === true)
  .filter((row) => row.authorityPath.includes('PROJECT_CONFIGURED_DEFAULT'))
  .filter((row) => ENRICHMENT_PROVIDER_FIELDS.has(row.fieldId) || ANCILLARY_PROVIDER_FIELDS.includes(row.fieldId))
  .filter((row) => Boolean(PROVIDER_NATIVE_UNITS[row.fieldId]))
  .map((row) => ({
    fieldId: row.fieldId,
    label: row.label,
    inputUnit: PROVIDER_NATIVE_UNITS[row.fieldId],
    allowedMethods: [...row.methods],
    valueRule: POSITIVE_FIELDS.has(row.fieldId) ? 'POSITIVE' : 'NONNEGATIVE',
  }))
  .sort((left, right) => left.label.localeCompare(right.label)));
const FIELD_BY_ID = new Map(FIELD_DEFINITIONS.map((row) => [row.fieldId, row]));

export function listScopedCalculationDefaultFields() {
  return FIELD_DEFINITIONS;
}

export function listScopedCalculationDefaultScopeKinds() {
  return SCOPE_DEFINITIONS;
}

export function createScopedCalculationDefaultsModel(profile) {
  const entry = configuredDefaultsEntry(profile);
  const policy = entry.value;
  const rows = Array.isArray(policy?.defaults)
    ? [...policy.defaults].sort((left, right) => stringValue(left.defaultId).localeCompare(stringValue(right.defaultId)))
      .map(existingRow)
    : [];
  const base = {
    schema: NON_FEA_SCOPED_CALCULATION_DEFAULTS_MODEL_SCHEMA,
    projectDataRevision: Number.isInteger(profile?.revision) ? profile.revision : null,
    policyState: policy === null ? 'NOT_CONFIGURED' : entry.approved === true ? 'APPROVED' : 'REVIEW',
    policySource: stringValue(entry.evidence?.source) || null,
    policySemanticHash: policy === null ? null : semanticHash(policy),
    scopePrecedence: NON_FEA_CONFIGURED_DEFAULT_SCOPE_PRECEDENCE,
    authorableFields: FIELD_DEFINITIONS,
    scopeKinds: SCOPE_DEFINITIONS,
    rows,
  };
  return freezeDeep(base);
}

export function createScopedCalculationDefaultUpsert(profile, draft) {
  if (!isRecord(draft)) throw new TypeError('Scoped Calculation Default draft must be an object.');
  const entry = configuredDefaultsEntry(profile);
  const policy = normalizedExistingPolicy(entry.value);
  const defaultId = requiredText(draft.defaultId, 'Default ID');
  const field = requireField(draft.fieldId);
  const existing = policy.defaults.find((row) => stringValue(row.defaultId) === defaultId) || null;
  if (existing && !existingRow(existing).editable) {
    throw new TypeError(`Configured default ${defaultId} uses an unsupported field, scope or unit; edit it in Advanced authority.`);
  }
  const value = scopedValue(field, draft.value);
  const basis = requiredText(draft.basis, 'Basis');
  const allowedMethods = scopedMethods(field, draft.allowedMethods);
  const scope = createCanonicalScopedCalculationDefaultScope(draft.scopeKind, {
    values: draft.scopeValues,
    nominalBoreMm: draft.nominalBoreMm,
  });
  const row = {
    defaultId,
    fieldId: field.fieldId,
    value,
    unit: field.inputUnit,
    basis,
    allowedMethods,
    ...(Object.keys(scope).length ? { scope } : {}),
  };
  const defaults = policy.defaults
    .filter((candidate) => stringValue(candidate.defaultId) !== defaultId)
    .concat(row)
    .sort((left, right) => stringValue(left.defaultId).localeCompare(stringValue(right.defaultId)));
  return policyPlan(entry, { schema: NON_FEA_CONFIGURED_DEFAULT_POLICY_SCHEMA, defaults }, `upsert:${defaultId}`);
}

export function createScopedCalculationDefaultDelete(profile, defaultIdValue) {
  const entry = configuredDefaultsEntry(profile);
  const policy = normalizedExistingPolicy(entry.value);
  const defaultId = requiredText(defaultIdValue, 'Default ID');
  const existing = policy.defaults.find((row) => stringValue(row.defaultId) === defaultId);
  if (!existing) throw new RangeError(`Unknown configured default: ${defaultId}.`);
  if (!existingRow(existing).editable) {
    throw new TypeError(`Configured default ${defaultId} is protected; delete it in Advanced authority.`);
  }
  const defaults = policy.defaults
    .filter((row) => stringValue(row.defaultId) !== defaultId)
    .sort((left, right) => stringValue(left.defaultId).localeCompare(stringValue(right.defaultId)));
  return policyPlan(entry, { schema: NON_FEA_CONFIGURED_DEFAULT_POLICY_SCHEMA, defaults }, `delete:${defaultId}`);
}

export function createCanonicalScopedCalculationDefaultScope(scopeKindValue, input = {}) {
  const scopeKind = stringValue(scopeKindValue || 'GLOBAL').toUpperCase();
  const definition = SCOPE_BY_ID.get(scopeKind);
  if (!definition) throw new RangeError(`Unknown configured-default scope kind: ${scopeKind || 'EMPTY'}.`);
  const scope = {};
  for (const key of definition.keys) {
    if (key === 'nominalBoreMm') {
      scope[key] = positiveNumbers(input.nominalBoreMm, 'Nominal bore');
    } else {
      scope[key] = exactIdentifiers(input.values, definition.label);
    }
  }
  return freezeDeep(scope);
}

function existingRow(row) {
  const field = FIELD_BY_ID.get(stringValue(row?.fieldId)) || null;
  const scope = describeCanonicalScope(row?.scope);
  const unitMatches = field ? stringValue(row?.unit) === field.inputUnit : false;
  const editable = Boolean(field && scope.canonical && unitMatches);
  return freezeDeep({
    defaultId: stringValue(row?.defaultId),
    fieldId: stringValue(row?.fieldId),
    fieldLabel: field?.label || stringValue(row?.fieldId) || 'UNKNOWN FIELD',
    value: clonePlain(row?.value),
    unit: stringValue(row?.unit),
    basis: stringValue(row?.basis),
    allowedMethods: Array.isArray(row?.allowedMethods) ? [...row.allowedMethods] : [],
    scope: clonePlain(row?.scope || {}),
    scopeKind: scope.scopeKind,
    scopeLabel: scope.label,
    scopePriority: scope.canonical ? configuredDefaultScopePriority(scope.scope) : null,
    editable,
    editBlockedReason: editable ? null : protectedReason(field, scope, unitMatches),
  });
}

function describeCanonicalScope(scopeValue) {
  const scope = isRecord(scopeValue) ? scopeValue : {};
  const keys = Object.keys(scope).sort();
  for (const definition of SCOPE_DEFINITIONS) {
    const expected = [...definition.keys].sort();
    if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) continue;
    try {
      const normalized = createCanonicalScopedCalculationDefaultScope(definition.scopeKind, {
        values: definition.keys.find((key) => key !== 'nominalBoreMm') ? scope[definition.keys.find((key) => key !== 'nominalBoreMm')] : [],
        nominalBoreMm: scope.nominalBoreMm,
      });
      if (semanticHash(normalized) !== semanticHash(scope)) continue;
      return { canonical: true, scopeKind: definition.scopeKind, label: scopeText(definition, scope), scope: normalized };
    } catch {
      return { canonical: false, scopeKind: 'CUSTOM_ADVANCED', label: 'Invalid/custom scope', scope };
    }
  }
  return { canonical: false, scopeKind: 'CUSTOM_ADVANCED', label: 'Custom multi-scope (Advanced)', scope };
}

function scopeText(definition, scope) {
  if (definition.scopeKind === 'GLOBAL') return 'PROJECT GLOBAL';
  return definition.keys.map((key) => `${scopeKeyLabel(key)}=${(scope[key] || []).join(', ')}`).join(' · ');
}

function policyPlan(entry, policy, action) {
  const audit = validateConfiguredDefaultsPolicy(policy);
  if (!audit.valid) throw new TypeError(audit.errors.map((row) => `${row.code}: ${row.message}`).join(' '));
  const previousPolicySemanticHash = entry.value === null ? null : semanticHash(entry.value);
  const value = freezeDeep(clonePlain(policy));
  return freezeDeep({
    projectDataPath: 'qualificationPolicy.configuredDefaults',
    value,
    evidence: {
      source: NON_FEA_SCOPED_CALCULATION_DEFAULTS_SOURCE,
      authority: 'PROJECT_POLICY',
      basis: 'Engineer-authored scoped Load Calc configured-default policy.',
      action,
      scopePrecedence: NON_FEA_CONFIGURED_DEFAULT_SCOPE_PRECEDENCE,
      previousPolicySemanticHash,
      previousEvidenceSource: stringValue(entry.evidence?.source) || null,
      configuredDefaultPolicySemanticHash: semanticHash(value),
    },
    approved: true,
  });
}

function normalizedExistingPolicy(value) {
  if (value === null || value === undefined) {
    return { schema: NON_FEA_CONFIGURED_DEFAULT_POLICY_SCHEMA, defaults: [] };
  }
  const audit = validateConfiguredDefaultsPolicy(value);
  if (!audit.valid) {
    throw new TypeError(`Existing configured-default policy is invalid; repair it in Advanced authority before scoped editing. ${audit.errors.map((row) => `${row.code}: ${row.message}`).join(' ')}`);
  }
  return clonePlain(value);
}

function configuredDefaultsEntry(profile) {
  if (!isRecord(profile)) throw new TypeError('Scoped Calculation Defaults requires a Project Data profile.');
  const entry = profile?.qualificationPolicy?.configuredDefaults;
  if (!isRecord(entry) || !Object.hasOwn(entry, 'value') || typeof entry.approved !== 'boolean') {
    throw new TypeError('Project Data configured-default policy entry is missing or invalid.');
  }
  return entry;
}

function scopedMethods(field, value) {
  if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
    return [...field.allowedMethods].sort();
  }
  if (!Array.isArray(value)) throw new TypeError('Allowed methods must be an array.');
  const methods = [...new Set(value.map(stringValue).filter(Boolean))].sort();
  if (methods.length === 0) return [...field.allowedMethods].sort();
  const invalid = methods.filter((methodId) => !field.allowedMethods.includes(methodId));
  if (invalid.length) throw new RangeError(`${field.fieldId} is not consumed by: ${invalid.join(', ')}.`);
  return methods;
}

function scopedValue(field, value) {
  if (value === '' || value === null || value === undefined) throw new TypeError(`${field.label} value is required.`);
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field.label} must be finite.`);
  if (field.valueRule === 'POSITIVE' && !(number > 0)) throw new RangeError(`${field.label} must be greater than zero.`);
  if (field.valueRule === 'NONNEGATIVE' && number < 0) throw new RangeError(`${field.label} must be non-negative.`);
  return number;
}

function exactIdentifiers(value, label) {
  const source = Array.isArray(value) ? value : String(value ?? '').split(',');
  const identifiers = [...new Set(source.map(stringValue).filter(Boolean))].sort();
  if (!identifiers.length) throw new RangeError(`${label} scope requires at least one exact identifier.`);
  return identifiers;
}

function positiveNumbers(value, label) {
  const source = Array.isArray(value) ? value : String(value ?? '').split(',');
  const numbers = [...new Set(source.map((item) => Number(item)))].sort((left, right) => left - right);
  if (!numbers.length || numbers.some((item) => !Number.isFinite(item) || !(item > 0))) {
    throw new RangeError(`${label} scope requires positive finite numeric values.`);
  }
  return numbers;
}

function requireField(fieldIdValue) {
  const fieldId = stringValue(fieldIdValue);
  const field = FIELD_BY_ID.get(fieldId);
  if (!field) throw new RangeError(`Field ${fieldId || 'EMPTY'} is not authorable by scoped Calculation Defaults.`);
  return field;
}

function protectedReason(field, scope, unitMatches) {
  if (!field) return 'Field is not materialized by the current configured-default provider; use Advanced authority.';
  if (!scope.canonical) return 'Scope is custom/noncanonical; preserve it in Advanced authority.';
  if (!unitMatches) return `Unit does not match the current provider-native ${field.inputUnit} contract; use Advanced authority.`;
  return 'Protected configured-default row.';
}

function scopeDefinition(scopeKind, label, keys) { return { scopeKind, label, keys: [...keys] }; }
function scopeKeyLabel(key) {
  return ({
    entityIds: 'Entity', posIds: 'POS', lineIds: 'Line', branchIds: 'Branch',
    systemIds: 'System', zoneIds: 'Zone', pipingClasses: 'Piping class',
    componentTypes: 'Component type', nominalBoreMm: 'NB mm', supportKinds: 'Support kind',
  })[key] || key;
}
function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw new TypeError(`${label} is required.`);
  return text;
}
