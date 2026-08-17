import { semanticHash } from '../shared-primitives/canonical-json.js';
import {
  CORRELATION_DATASET_HASH_SCHEMA,
  CORRELATION_PROFILE_SCHEMA,
  FORCE_COMPONENTS,
  INTERPOLATION_POLICIES,
  LOAD_BASES,
  LOAD_COMPONENTS,
  MOMENT_COMPONENTS,
  STRESS_CLASSES,
  STRESS_COMPONENTS,
  SURFACES,
} from './constants.js';

export function createCorrelationProfile(input) {
  const raw = clone(input);
  exactKeys(raw, [
    'schema', 'methodIdentity', 'methodEdition', 'coefficientDatasetId',
    'coefficientDatasetHash', 'interpolationPolicyId', 'applicabilityProfileId',
    'provenance', 'authority', 'axes', 'targets', 'responses', 'uncertainty',
  ], 'profile');
  if (raw.schema !== CORRELATION_PROFILE_SCHEMA) fail('CORRELATION_PROFILE_SCHEMA_MISMATCH', 'schema');
  requiredString(raw.methodIdentity, 'methodIdentity');
  requiredString(raw.methodEdition, 'methodEdition');
  requiredString(raw.coefficientDatasetId, 'coefficientDatasetId');
  requiredString(raw.applicabilityProfileId, 'applicabilityProfileId');
  if (raw.interpolationPolicyId !== INTERPOLATION_POLICIES.BILINEAR_NO_EXTRAPOLATION) {
    fail('CORRELATION_INTERPOLATION_POLICY_UNSUPPORTED', 'interpolationPolicyId');
  }
  validateProvenance(raw.provenance);
  validateAuthority(raw.authority);
  validateAxes(raw.axes);
  validateTargets(raw.targets);
  validateResponses(raw.responses, raw.axes, raw.targets);
  validateUncertainty(raw.uncertainty);
  const expectedHash = correlationDatasetHash(raw);
  if (raw.coefficientDatasetHash !== null && raw.coefficientDatasetHash !== expectedHash) {
    fail('CORRELATION_DATASET_HASH_MISMATCH', 'coefficientDatasetHash');
  }
  raw.coefficientDatasetHash = expectedHash;
  return deepFreeze(raw);
}

export function correlationDatasetHash(profile) {
  return semanticHash({
    schema: CORRELATION_DATASET_HASH_SCHEMA,
    coefficientDatasetId: profile.coefficientDatasetId,
    axes: profile.axes,
    targets: profile.targets,
    responses: profile.responses,
  });
}

function validateProvenance(value) {
  exactKeys(value, ['sourceReference', 'sourceEdition', 'dataExtraction', 'licenseAuthority'], 'provenance');
  Object.entries(value).forEach(([key, row]) => requiredString(row, `provenance.${key}`));
}

function validateAuthority(value) {
  exactKeys(value, ['engineeringUseAuthorized', 'authorizationBasis'], 'authority');
  if (typeof value.engineeringUseAuthorized !== 'boolean') fail('CORRELATION_AUTHORITY_BOOLEAN_REQUIRED', 'authority.engineeringUseAuthorized');
  requiredString(value.authorizationBasis, 'authority.authorizationBasis');
}

function validateAxes(value) {
  exactKeys(value, ['diameterRatio', 'diameterThicknessRatio'], 'axes');
  validateAxis(value.diameterRatio, 'axes.diameterRatio');
  validateAxis(value.diameterThicknessRatio, 'axes.diameterThicknessRatio');
}

function validateAxis(value, path) {
  exactKeys(value, ['knots', 'sourceResolution'], path);
  if (!Array.isArray(value.knots) || value.knots.length < 2) fail('CORRELATION_AXIS_KNOTS_REQUIRED', `${path}.knots`);
  value.knots.forEach((knot, index) => {
    finite(knot, `${path}.knots[${index}]`);
    if (index && knot <= value.knots[index - 1]) fail('CORRELATION_AXIS_NOT_STRICTLY_INCREASING', `${path}.knots`);
  });
  nonNegative(value.sourceResolution, `${path}.sourceResolution`);
}

function validateTargets(values) {
  if (!Array.isArray(values) || !values.length) fail('CORRELATION_TARGETS_REQUIRED', 'targets');
  unique(values, 'targetId', 'targets');
  values.forEach((row, index) => {
    exactKeys(row, ['targetId', 'surface', 'description'], `targets[${index}]`);
    requiredString(row.targetId, `targets[${index}].targetId`);
    if (!SURFACES.includes(row.surface)) fail('CORRELATION_SURFACE_UNSUPPORTED', `targets[${index}].surface`);
    requiredString(row.description, `targets[${index}].description`);
  });
}

function validateResponses(values, axes, targets) {
  if (!Array.isArray(values) || !values.length) fail('CORRELATION_RESPONSES_REQUIRED', 'responses');
  unique(values, 'responseId', 'responses');
  const targetIds = new Set(targets.map((row) => row.targetId));
  values.forEach((row, index) => {
    const path = `responses[${index}]`;
    exactKeys(row, [
      'responseId', 'targetId', 'stressComponent', 'stressClass',
      'loadComponent', 'loadBasis', 'coefficients',
    ], path);
    requiredString(row.responseId, `${path}.responseId`);
    if (!targetIds.has(row.targetId)) fail('CORRELATION_TARGET_REFERENCE_MISSING', `${path}.targetId`);
    if (!STRESS_COMPONENTS.includes(row.stressComponent)) fail('CORRELATION_STRESS_COMPONENT_UNSUPPORTED', `${path}.stressComponent`);
    if (!STRESS_CLASSES.includes(row.stressClass)) fail('CORRELATION_STRESS_CLASS_UNSUPPORTED', `${path}.stressClass`);
    if (!LOAD_COMPONENTS.includes(row.loadComponent)) fail('CORRELATION_LOAD_COMPONENT_UNSUPPORTED', `${path}.loadComponent`);
    validateLoadBasis(row, path);
    validateGrid(row.coefficients, axes.diameterRatio.knots.length,
      axes.diameterThicknessRatio.knots.length, `${path}.coefficients`);
  });
}

function validateLoadBasis(row, path) {
  if (!Object.values(LOAD_BASES).includes(row.loadBasis)) fail('CORRELATION_LOAD_BASIS_UNSUPPORTED', `${path}.loadBasis`);
  if (FORCE_COMPONENTS.includes(row.loadComponent) && row.loadBasis !== LOAD_BASES.FORCE_OVER_D_T) {
    fail('CORRELATION_FORCE_BASIS_MISMATCH', `${path}.loadBasis`);
  }
  if (MOMENT_COMPONENTS.includes(row.loadComponent) && row.loadBasis !== LOAD_BASES.MOMENT_OVER_D2_T) {
    fail('CORRELATION_MOMENT_BASIS_MISMATCH', `${path}.loadBasis`);
  }
}

function validateGrid(grid, nx, ny, path) {
  if (!Array.isArray(grid) || grid.length !== nx) fail('CORRELATION_GRID_X_SIZE_MISMATCH', path);
  grid.forEach((row, x) => {
    if (!Array.isArray(row) || row.length !== ny) fail('CORRELATION_GRID_Y_SIZE_MISMATCH', `${path}[${x}]`);
    row.forEach((value, y) => finite(value, `${path}[${x}][${y}]`));
  });
}

function validateUncertainty(value) {
  exactKeys(value, [
    'numericEvaluationTolerance', 'sourceDataResolution',
    'interpolationUncertainty', 'methodValidationError',
  ], 'uncertainty');
  nonNegative(value.numericEvaluationTolerance, 'uncertainty.numericEvaluationTolerance');
  nonNegative(value.sourceDataResolution, 'uncertainty.sourceDataResolution');
  nonNegative(value.interpolationUncertainty, 'uncertainty.interpolationUncertainty');
  if (value.methodValidationError !== null) nonNegative(value.methodValidationError, 'uncertainty.methodValidationError');
}

function unique(values, key, path) {
  const seen = new Set();
  values.forEach((row, index) => {
    const value = row?.[key];
    requiredString(value, `${path}[${index}].${key}`);
    if (seen.has(value)) fail('CORRELATION_IDENTITY_DUPLICATE', `${path}[${index}].${key}`);
    seen.add(value);
  });
}
function finite(value, path) { if (!Number.isFinite(value)) fail('CORRELATION_NUMBER_NON_FINITE', path); }
function nonNegative(value, path) { finite(value, path); if (value < 0) fail('CORRELATION_NUMBER_NEGATIVE', path); }
function requiredString(value, path) { if (typeof value !== 'string' || !value) fail('CORRELATION_STRING_REQUIRED', path); }
function exactKeys(value, expected, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('CORRELATION_OBJECT_REQUIRED', path);
  const actual = Object.keys(value).sort(); const required = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(required)) fail('CORRELATION_EXACT_KEYS_MISMATCH', path);
}
function clone(value) { return structuredClone(value); }
function fail(code, path) { const error = new Error(code); error.code = code; error.path = path; throw error; }
function deepFreeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(deepFreeze); return Object.freeze(value); }
