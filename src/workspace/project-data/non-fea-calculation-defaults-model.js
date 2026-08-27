import { freezeDeep, isRecord, stringValue } from '../dataset-utils.js';
import {
  LOAD_CALC_STANDARD_DEFAULTS_V1,
  isProductDefaultEvidence,
} from './non-fea-product-default-profile.js';
import {
  NON_FEA_GRAVITY_METHOD_REQUEST_IDS,
} from './non-fea-gravity-method-authority.js';

export const NON_FEA_CALCULATION_DEFAULTS_BASIC_SCHEMA =
  'non-fea-calculation-defaults-basic/v1';
export const NON_FEA_CALCULATION_DEFAULT_PROJECT_SOURCE =
  'Load Calc Calculation Defaults';
export const NON_FEA_CANONICAL_CALCULATION_CASES = Object.freeze([
  'EMPTY',
  'OPE',
  'HYD',
]);

const DEFINITIONS = Object.freeze([
  definition('LENGTH_UNIT', 'Length unit', 'sourcesAndUnits.lengthUnit', 'unit', 'choice',
    ['mm'], readIdentity, writeIdentity),
  definition('SOURCE_UP_AXIS', 'Vertical axis', 'sourcesAndUnits.sourceUpAxis', 'axis', 'choice',
    ['X', 'Y', 'Z'], readIdentity, writeIdentity),
  definition('GRAVITY_ACCELERATION', 'Gravity acceleration', 'loadCalculation.gravityMPerS2', 'm/s²', 'positive-number',
    null, readIdentity, writeIdentity),
  definition('LOAD_FACTOR', 'Load factor', 'loadCalculation.loadFactor', 'ratio', 'positive-number',
    null, readIdentity, writeIdentity),
  definition('GRAVITY_METHOD', 'Gravity method', 'loadCalculation.gravityMethod', 'method-request', 'choice',
    NON_FEA_GRAVITY_METHOD_REQUEST_IDS, readIdentity, writeIdentity),
  definition('ACTIVE_LOAD_CASES', 'Active load cases', 'loadCalculation.activeLoadCases', 'set', 'case-set',
    NON_FEA_CANONICAL_CALCULATION_CASES, readIdentity, writeIdentity),
  definition('CORROSION_ALLOWANCE', 'Default corrosion allowance', 'thermoMechanicalBasis.corrosionAllowancesMm', 'mm', 'nonnegative-number',
    null, (value) => value?.DEFAULT ?? null, writeDefaultMapValue, true),
  definition('ELASTIC_THERMAL', 'Default elastic / thermal properties', 'thermoMechanicalBasis.materialElasticProperties', 'material-policy', 'elastic-thermal',
    null,
    (value) => ({
      elasticModulusPa: value?.DEFAULT?.elasticModulusPa ?? null,
      thermalExpansionPerK: value?.DEFAULT?.thermalExpansionPerK ?? null,
    }),
    writeDefaultMapValue,
    true),
  definition('RESTRAINT_PRELOAD', 'Default restraint preload', 'restraintPolicy.restraintPreloadsN', 'N', 'finite-number',
    null, (value) => value?.DEFAULT ?? null, writeDefaultMapValue, true),
  definition('FRICTION_COEFFICIENT', 'Default friction coefficient', 'restraintPolicy.frictionCoefficients', 'ratio', 'nonnegative-number',
    null, (value) => value?.DEFAULT ?? null, writeDefaultMapValue, true),
]);

const DEFINITION_BY_ID = new Map(DEFINITIONS.map((row) => [row.fieldId, row]));
const PRODUCT_DEFAULT_BY_PATH = new Map(
  LOAD_CALC_STANDARD_DEFAULTS_V1.defaults.map((row) => [row.projectDataPath, row]),
);

export function listBasicCalculationDefaultDefinitions() {
  return DEFINITIONS;
}

export function getBasicCalculationDefaultDefinition(fieldId) {
  return DEFINITION_BY_ID.get(stringValue(fieldId)) || null;
}

export function createBasicCalculationDefaultsModel(profile) {
  if (!isRecord(profile)) throw new TypeError('Calculation Defaults requires a Project Data profile.');
  const rows = DEFINITIONS.map((definitionRow) => {
    const entry = readPath(profile, definitionRow.projectDataPath);
    const productDefault = PRODUCT_DEFAULT_BY_PATH.get(definitionRow.projectDataPath) || null;
    const provenance = effectiveProvenance(entry);
    const editable = entry?.value === null
      || isProductDefaultEvidence(entry)
      || isOwnedCalculationDefaultEvidence(entry, definitionRow.fieldId);
    const mapCustodySafe = !definitionRow.defaultMap || hasOnlyDefaultKey(entry?.value);
    return freezeDeep({
      fieldId: definitionRow.fieldId,
      label: definitionRow.label,
      projectDataPath: definitionRow.projectDataPath,
      kind: definitionRow.kind,
      unit: definitionRow.unit,
      scope: 'PROJECT_GLOBAL',
      options: definitionRow.options ? [...definitionRow.options] : null,
      value: definitionRow.read(entry?.value),
      effectiveAuthority: provenance.authority,
      source: provenance.source,
      basis: provenance.basis,
      defaultId: provenance.defaultId,
      defaultSemanticHash: provenance.defaultSemanticHash,
      productProfileId: provenance.profileId,
      productProfileVersion: provenance.profileVersion,
      editable: editable && mapCustodySafe,
      editBlockedReason: !editable
        ? 'A higher or independently authored authority already owns this Project Data path. Basic defaults cannot overwrite it.'
        : !mapCustodySafe
          ? 'This path contains keyed values beyond DEFAULT. Use Advanced authority editing to preserve their custody.'
          : null,
      resetAvailable: isOwnedCalculationDefaultEvidence(entry, definitionRow.fieldId) && mapCustodySafe,
      builtInDefault: productDefault ? definitionRow.read(productDefault.value) : null,
      builtInDefaultId: productDefault?.defaultId || null,
      builtInBasis: productDefault?.basis || null,
    });
  });
  const base = {
    schema: NON_FEA_CALCULATION_DEFAULTS_BASIC_SCHEMA,
    projectDataRevision: Number.isInteger(profile.revision) ? profile.revision : null,
    productDefaultProfileId: LOAD_CALC_STANDARD_DEFAULTS_V1.profileId,
    productDefaultProfileVersion: LOAD_CALC_STANDARD_DEFAULTS_V1.version,
    rows,
  };
  return freezeDeep(base);
}

/**
 * Produces one complete path-level Project Data update. Nothing is written here;
 * callers must apply the returned plan through ProjectDataStore.update().
 *
 * Basic defaults are deliberately lower-authority authoring. They may replace a
 * governed Product default or a prior Basic Calculation-Defaults project policy,
 * but never overwrite independent source/master/project authority already
 * occupying the path.
 */
export function createBasicCalculationDefaultUpdate(profile, fieldId, rawValue) {
  if (!isRecord(profile)) throw new TypeError('Calculation Defaults update requires a Project Data profile.');
  const definitionRow = requireDefinition(fieldId);
  const entry = readPath(profile, definitionRow.projectDataPath);
  if (!isRecord(entry) || !Object.hasOwn(entry, 'value')) {
    throw new TypeError(`Calculation Default target is not a Project Data evidence field: ${definitionRow.projectDataPath}.`);
  }
  if (entry.value !== null
      && !isProductDefaultEvidence(entry)
      && !isOwnedCalculationDefaultEvidence(entry, definitionRow.fieldId)) {
    throw new Error(`${definitionRow.label} is owned by higher or independent authority and cannot be overwritten from Basic Calculation Defaults.`);
  }
  assertDefaultMapCustody(definitionRow, entry.value);
  const normalized = normalizeValue(definitionRow, rawValue);
  const value = definitionRow.write(entry.value, normalized);
  return freezeDeep({
    fieldId: definitionRow.fieldId,
    projectDataPath: definitionRow.projectDataPath,
    value,
    evidence: {
      source: NON_FEA_CALCULATION_DEFAULT_PROJECT_SOURCE,
      authority: 'PROJECT_POLICY',
      basis: `User-configured project screening default for ${definitionRow.label}.`,
      calculationDefaultId: definitionRow.fieldId,
      previousAuthority: effectiveProvenance(entry).authority,
    },
    approved: true,
  });
}

/**
 * Reset is path-level and is permitted only for a path this Basic surface owns.
 * It clears the project override so the Product-default provider can re-apply.
 * Map paths containing additional keyed values are rejected rather than erased.
 */
export function createBasicCalculationDefaultReset(profile, fieldId) {
  if (!isRecord(profile)) throw new TypeError('Calculation Defaults reset requires a Project Data profile.');
  const definitionRow = requireDefinition(fieldId);
  const entry = readPath(profile, definitionRow.projectDataPath);
  if (!isOwnedCalculationDefaultEvidence(entry, definitionRow.fieldId)) {
    throw new Error(`${definitionRow.label} is not owned by Basic Calculation Defaults and cannot be reset here.`);
  }
  assertDefaultMapCustody(definitionRow, entry.value);
  return freezeDeep({
    fieldId: definitionRow.fieldId,
    projectDataPath: definitionRow.projectDataPath,
    value: null,
    evidence: null,
    approved: false,
  });
}

export function listCalculationProductDefaults() {
  return freezeDeep(LOAD_CALC_STANDARD_DEFAULTS_V1.defaults.map((row) => ({
    defaultId: row.defaultId,
    projectDataPath: row.projectDataPath,
    value: structuredClone(row.value),
    unit: row.unit,
    basis: row.basis,
    semanticHash: row.semanticHash,
  })));
}

function normalizeValue(definitionRow, rawValue) {
  switch (definitionRow.kind) {
    case 'choice': {
      const value = stringValue(rawValue);
      if (!definitionRow.options.includes(value)) {
        throw new RangeError(`${definitionRow.label} must be one of: ${definitionRow.options.join(', ')}.`);
      }
      return value;
    }
    case 'positive-number': return positiveNumber(rawValue, definitionRow.label);
    case 'nonnegative-number': return nonnegativeNumber(rawValue, definitionRow.label);
    case 'finite-number': return finiteNumber(rawValue, definitionRow.label);
    case 'case-set': return canonicalCases(rawValue);
    case 'elastic-thermal': return elasticThermal(rawValue);
    default: throw new TypeError(`Unsupported Calculation Default kind: ${definitionRow.kind}.`);
  }
}

function canonicalCases(value) {
  if (!Array.isArray(value)) throw new TypeError('Active load cases must be an array.');
  const normalized = [...new Set(value.map((item) => stringValue(item).toUpperCase()).filter(Boolean))];
  const unknown = normalized.filter((item) => !NON_FEA_CANONICAL_CALCULATION_CASES.includes(item));
  if (unknown.length) throw new RangeError(`Unknown canonical load cases: ${unknown.join(', ')}.`);
  if (normalized.length === 0) throw new RangeError('At least one active load case is required.');
  return NON_FEA_CANONICAL_CALCULATION_CASES.filter((item) => normalized.includes(item));
}

function elasticThermal(value) {
  if (!isRecord(value)) throw new TypeError('Elastic / thermal default requires both engineering values.');
  return freezeDeep({
    elasticModulusPa: positiveNumber(value.elasticModulusPa, 'Elastic modulus'),
    thermalExpansionPerK: positiveNumber(value.thermalExpansionPerK, 'Thermal expansion coefficient'),
  });
}

function positiveNumber(value, label) {
  const number = finiteNumber(value, label);
  if (!(number > 0)) throw new RangeError(`${label} must be greater than zero.`);
  return number;
}
function nonnegativeNumber(value, label) {
  const number = finiteNumber(value, label);
  if (number < 0) throw new RangeError(`${label} must be non-negative.`);
  return number;
}
function finiteNumber(value, label) {
  if (typeof value === 'string' && value.trim() === '') {
    throw new TypeError(`${label} must not be blank.`);
  }
  if (value === null || value === undefined) throw new TypeError(`${label} is required.`);
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be finite.`);
  return number;
}

function effectiveProvenance(entry) {
  if (!isRecord(entry) || entry.value === null) {
    return freezeDeep({
      authority: 'MISSING', source: null, basis: null, defaultId: null,
      defaultSemanticHash: null, profileId: null, profileVersion: null,
    });
  }
  const evidence = isRecord(entry.evidence) ? entry.evidence : {};
  return freezeDeep({
    authority: stringValue(evidence.authority)
      || (entry.approved === true ? 'PROJECT_DATA_APPROVED' : 'REVIEW'),
    source: stringValue(evidence.source) || null,
    basis: stringValue(evidence.basis) || null,
    defaultId: stringValue(evidence.defaultId) || null,
    defaultSemanticHash: stringValue(evidence.defaultSemanticHash) || null,
    profileId: stringValue(evidence.profileId) || null,
    profileVersion: Number.isInteger(evidence.profileVersion) ? evidence.profileVersion : null,
  });
}

function isOwnedCalculationDefaultEvidence(entry, fieldId) {
  return isRecord(entry)
    && isRecord(entry.evidence)
    && entry.evidence.authority === 'PROJECT_POLICY'
    && entry.evidence.source === NON_FEA_CALCULATION_DEFAULT_PROJECT_SOURCE
    && entry.evidence.calculationDefaultId === fieldId
    && entry.approved === true;
}

function assertDefaultMapCustody(definitionRow, value) {
  if (!definitionRow.defaultMap || value === null || value === undefined) return;
  if (!hasOnlyDefaultKey(value)) {
    throw new Error(`${definitionRow.label} contains keyed values beyond DEFAULT; use Advanced authority editing to preserve their custody.`);
  }
}
function hasOnlyDefaultKey(value) {
  return !isRecord(value) || Object.keys(value).every((key) => key === 'DEFAULT');
}
function requireDefinition(fieldId) {
  const definitionRow = getBasicCalculationDefaultDefinition(fieldId);
  if (!definitionRow) throw new RangeError(`Unknown Basic Calculation Default: ${fieldId}.`);
  return definitionRow;
}
function definition(fieldId, label, projectDataPath, unit, kind, options, read, write, defaultMap = false) {
  return freezeDeep({
    fieldId, label, projectDataPath, unit, kind,
    options: options ? [...options] : null,
    read,
    write,
    defaultMap: defaultMap === true,
  });
}
function readIdentity(value) { return value ?? null; }
function writeIdentity(_current, value) { return value; }
function writeDefaultMapValue(_current, value) { return { DEFAULT: value }; }
function readPath(value, path) { return String(path).split('.').reduce((current, key) => current?.[key], value); }
