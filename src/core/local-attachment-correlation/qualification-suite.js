import { semanticHash } from '../shared-primitives/canonical-json.js';
import { calculateLocalAttachmentCorrelation } from './calculate.js';
import { createCorrelationProfile } from './profile.js';

export const CORRELATION_QUALIFICATION_SUITE_SCHEMA =
  'local-attachment-correlation-qualification-suite/v1';
export const CORRELATION_QUALIFICATION_EVIDENCE_SCHEMA =
  'local-attachment-correlation-qualification-evidence/v1';

export const CORRELATION_QUALIFICATION_OBSERVATION_TYPES = Object.freeze([
  'QUALIFICATION_STATE',
  'DIAGNOSTIC_CODE',
  'GEOMETRY_PARAMETER',
  'CONTRIBUTION',
  'INTERPOLATION_AXIS',
  'TARGET_COMPONENT',
  'TARGET_PRINCIPAL',
  'TARGET_VON_MISES',
]);

const NUMERIC_FIELDS = Object.freeze({
  GEOMETRY_PARAMETER: new Set(['diameterRatio', 'diameterThicknessRatio']),
  CONTRIBUTION: new Set(['sourceLoad', 'basisStress', 'coefficient', 'stressContribution']),
  INTERPOLATION_AXIS: new Set(['lower', 'upper', 'weight']),
  TARGET_COMPONENT: new Set([
    'membrane', 'bending', 'shear', 'pressure', 'mechanicalSurface', 'totalSurface',
  ]),
});

export function createCorrelationQualificationSuite(options) {
  const profile = createCorrelationProfile(options?.profile);
  const cases = validateCases(options?.cases);
  const base = {
    schema: CORRELATION_QUALIFICATION_SUITE_SCHEMA,
    suiteIdentity: requiredString(options?.suiteIdentity, 'suiteIdentity'),
    methodIdentity: profile.methodIdentity,
    methodEdition: profile.methodEdition,
    coefficientDatasetId: profile.coefficientDatasetId,
    coefficientDatasetHash: profile.coefficientDatasetHash,
    profileSemanticHash: semanticHash(profile),
    cases,
  };
  return freeze({ ...base, semanticHash: semanticHash(base) });
}

export function validateCorrelationQualificationSuite(value) {
  exactKeys(value, [
    'schema', 'suiteIdentity', 'methodIdentity', 'methodEdition',
    'coefficientDatasetId', 'coefficientDatasetHash', 'profileSemanticHash',
    'cases', 'semanticHash',
  ], 'qualificationSuite');
  if (value.schema !== CORRELATION_QUALIFICATION_SUITE_SCHEMA) {
    fail('CORRELATION_QUALIFICATION_SUITE_SCHEMA_MISMATCH', 'qualificationSuite.schema');
  }
  requiredString(value.suiteIdentity, 'qualificationSuite.suiteIdentity');
  requiredString(value.methodIdentity, 'qualificationSuite.methodIdentity');
  requiredString(value.methodEdition, 'qualificationSuite.methodEdition');
  requiredString(value.coefficientDatasetId, 'qualificationSuite.coefficientDatasetId');
  requiredHash(value.coefficientDatasetHash, 'qualificationSuite.coefficientDatasetHash');
  requiredHash(value.profileSemanticHash, 'qualificationSuite.profileSemanticHash');
  const cases = validateCases(value.cases);
  const { semanticHash: retainedHash, ...base } = value;
  const normalized = { ...base, cases };
  if (retainedHash !== semanticHash(normalized)) {
    fail('CORRELATION_QUALIFICATION_SUITE_HASH_MISMATCH', 'qualificationSuite.semanticHash');
  }
  return freeze(structuredClone(value));
}

export function executeCorrelationQualificationSuite(suiteInput, profileInput) {
  const suite = validateCorrelationQualificationSuite(suiteInput);
  const profile = createCorrelationProfile(profileInput);
  validateSuiteProfileBinding(suite, profile);
  const caseResults = suite.cases.map((caseRow) => executeCase(caseRow, profile));
  const status = caseResults.every((row) => row.status === 'PASS') ? 'PASS' : 'FAIL';
  const base = {
    schema: CORRELATION_QUALIFICATION_EVIDENCE_SCHEMA,
    suiteIdentity: suite.suiteIdentity,
    suiteSemanticHash: suite.semanticHash,
    methodIdentity: profile.methodIdentity,
    methodEdition: profile.methodEdition,
    coefficientDatasetId: profile.coefficientDatasetId,
    coefficientDatasetHash: profile.coefficientDatasetHash,
    profileSemanticHash: semanticHash(profile),
    status,
    caseResults,
  };
  return freeze({ ...base, semanticHash: semanticHash(base) });
}

export function validateCorrelationQualificationEvidence(value) {
  exactKeys(value, [
    'schema', 'suiteIdentity', 'suiteSemanticHash', 'methodIdentity', 'methodEdition',
    'coefficientDatasetId', 'coefficientDatasetHash', 'profileSemanticHash',
    'status', 'caseResults', 'semanticHash',
  ], 'qualificationEvidence');
  if (value.schema !== CORRELATION_QUALIFICATION_EVIDENCE_SCHEMA) {
    fail('CORRELATION_QUALIFICATION_EVIDENCE_SCHEMA_MISMATCH', 'qualificationEvidence.schema');
  }
  requiredString(value.suiteIdentity, 'qualificationEvidence.suiteIdentity');
  requiredHash(value.suiteSemanticHash, 'qualificationEvidence.suiteSemanticHash');
  requiredString(value.methodIdentity, 'qualificationEvidence.methodIdentity');
  requiredString(value.methodEdition, 'qualificationEvidence.methodEdition');
  requiredString(value.coefficientDatasetId, 'qualificationEvidence.coefficientDatasetId');
  requiredHash(value.coefficientDatasetHash, 'qualificationEvidence.coefficientDatasetHash');
  requiredHash(value.profileSemanticHash, 'qualificationEvidence.profileSemanticHash');
  if (!['PASS', 'FAIL'].includes(value.status)) {
    fail('CORRELATION_QUALIFICATION_EVIDENCE_STATUS_INVALID', 'qualificationEvidence.status');
  }
  if (!Array.isArray(value.caseResults) || !value.caseResults.length) {
    fail('CORRELATION_QUALIFICATION_EVIDENCE_CASES_REQUIRED', 'qualificationEvidence.caseResults');
  }
  const expectedStatus = value.caseResults.every((row) => row?.status === 'PASS') ? 'PASS' : 'FAIL';
  if (value.status !== expectedStatus) {
    fail('CORRELATION_QUALIFICATION_EVIDENCE_STATUS_MISMATCH', 'qualificationEvidence.status');
  }
  const { semanticHash: retainedHash, ...base } = value;
  if (retainedHash !== semanticHash(base)) {
    fail('CORRELATION_QUALIFICATION_EVIDENCE_HASH_MISMATCH', 'qualificationEvidence.semanticHash');
  }
  return freeze(structuredClone(value));
}

function executeCase(caseRow, profile) {
  const result = calculateLocalAttachmentCorrelation(caseRow.request, profile);
  const observations = caseRow.observations.map((observation) =>
    evaluateObservation(observation, result));
  return freeze({
    caseId: caseRow.caseId,
    requestIdentity: caseRow.request.requestIdentity ?? null,
    status: observations.every((row) => row.pass) ? 'PASS' : 'FAIL',
    resultQualificationState: result.qualification?.state ?? null,
    observations,
  });
}

function evaluateObservation(observation, result) {
  let actual;
  let pass;
  try {
    actual = observationValue(observation, result);
    pass = compareObservation(observation, actual);
  } catch (error) {
    actual = null;
    pass = false;
  }
  return freeze({
    observationId: observation.observationId,
    type: observation.type,
    expected: observation.expected,
    tolerance: observation.tolerance,
    actual,
    pass,
  });
}

function observationValue(observation, result) {
  switch (observation.type) {
    case 'QUALIFICATION_STATE': return result.qualification?.state ?? null;
    case 'DIAGNOSTIC_CODE': return result.diagnostics?.map((row) => row.code) ?? [];
    case 'GEOMETRY_PARAMETER': return result.geometryParameters?.[observation.field] ?? null;
    case 'CONTRIBUTION': return uniqueBy(result.contributions, 'responseId', observation.responseId,
      'contributions')[observation.field];
    case 'INTERPOLATION_AXIS': {
      const row = uniqueBy(result.contributions, 'responseId', observation.responseId,
        'contributions');
      return row.interpolationEvidence?.[observation.axis]?.[observation.field] ?? null;
    }
    case 'TARGET_COMPONENT': {
      const target = uniqueBy(result.targetResults, 'targetId', observation.targetId,
        'targetResults');
      return target.components?.[observation.stressComponent]?.[observation.field] ?? null;
    }
    case 'TARGET_PRINCIPAL': {
      const target = uniqueBy(result.targetResults, 'targetId', observation.targetId,
        'targetResults');
      return target.principalStresses?.[observation.principalIndex] ?? null;
    }
    case 'TARGET_VON_MISES': return uniqueBy(
      result.targetResults, 'targetId', observation.targetId, 'targetResults',
    ).vonMises;
    default: fail('CORRELATION_QUALIFICATION_OBSERVATION_TYPE_UNSUPPORTED', 'observation.type');
  }
}

function compareObservation(observation, actual) {
  if (observation.type === 'DIAGNOSTIC_CODE') {
    return Array.isArray(actual) && actual.includes(observation.expected);
  }
  if (typeof observation.expected === 'number') {
    return Number.isFinite(actual)
      && Math.abs(actual - observation.expected) <= observation.tolerance;
  }
  return actual === observation.expected;
}

function validateCases(values) {
  if (!Array.isArray(values) || !values.length) {
    fail('CORRELATION_QUALIFICATION_CASES_REQUIRED', 'cases');
  }
  const identities = new Set();
  return values.map((caseRow, caseIndex) => {
    exactKeys(caseRow, ['caseId', 'request', 'observations'], `cases[${caseIndex}]`);
    const caseId = requiredString(caseRow.caseId, `cases[${caseIndex}].caseId`);
    if (identities.has(caseId)) fail('CORRELATION_QUALIFICATION_CASE_DUPLICATE', `cases[${caseIndex}].caseId`);
    identities.add(caseId);
    if (!caseRow.request || typeof caseRow.request !== 'object' || Array.isArray(caseRow.request)) {
      fail('CORRELATION_QUALIFICATION_REQUEST_REQUIRED', `cases[${caseIndex}].request`);
    }
    if (!Array.isArray(caseRow.observations) || !caseRow.observations.length) {
      fail('CORRELATION_QUALIFICATION_OBSERVATIONS_REQUIRED', `cases[${caseIndex}].observations`);
    }
    const observationIds = new Set();
    const observations = caseRow.observations.map((row, observationIndex) => {
      const validated = validateObservation(row,
        `cases[${caseIndex}].observations[${observationIndex}]`);
      if (observationIds.has(validated.observationId)) {
        fail('CORRELATION_QUALIFICATION_OBSERVATION_DUPLICATE',
          `cases[${caseIndex}].observations[${observationIndex}].observationId`);
      }
      observationIds.add(validated.observationId);
      return validated;
    });
    return freeze({ caseId, request: structuredClone(caseRow.request), observations });
  });
}

function validateObservation(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('CORRELATION_QUALIFICATION_OBSERVATION_REQUIRED', path);
  }
  const type = value.type;
  if (!CORRELATION_QUALIFICATION_OBSERVATION_TYPES.includes(type)) {
    fail('CORRELATION_QUALIFICATION_OBSERVATION_TYPE_UNSUPPORTED', `${path}.type`);
  }
  const common = ['observationId', 'type', 'expected', 'tolerance'];
  const extras = observationExtraKeys(type);
  exactKeys(value, [...common, ...extras], path);
  requiredString(value.observationId, `${path}.observationId`);
  validateExpectedAndTolerance(value, path);
  validateObservationSelector(value, path);
  return freeze(structuredClone(value));
}

function observationExtraKeys(type) {
  if (type === 'GEOMETRY_PARAMETER') return ['field'];
  if (type === 'CONTRIBUTION') return ['responseId', 'field'];
  if (type === 'INTERPOLATION_AXIS') return ['responseId', 'axis', 'field'];
  if (type === 'TARGET_COMPONENT') return ['targetId', 'stressComponent', 'field'];
  if (type === 'TARGET_PRINCIPAL') return ['targetId', 'principalIndex'];
  if (type === 'TARGET_VON_MISES') return ['targetId'];
  return [];
}

function validateExpectedAndTolerance(value, path) {
  if (typeof value.expected === 'number') {
    if (!Number.isFinite(value.expected)) fail('CORRELATION_QUALIFICATION_EXPECTED_NON_FINITE', `${path}.expected`);
    if (!Number.isFinite(value.tolerance) || value.tolerance < 0) {
      fail('CORRELATION_QUALIFICATION_TOLERANCE_INVALID', `${path}.tolerance`);
    }
    return;
  }
  if (typeof value.expected !== 'string' && typeof value.expected !== 'boolean') {
    fail('CORRELATION_QUALIFICATION_EXPECTED_INVALID', `${path}.expected`);
  }
  if (value.tolerance !== null) fail('CORRELATION_QUALIFICATION_NON_NUMERIC_TOLERANCE', `${path}.tolerance`);
}

function validateObservationSelector(value, path) {
  if (value.type === 'GEOMETRY_PARAMETER' && !NUMERIC_FIELDS.GEOMETRY_PARAMETER.has(value.field)) {
    fail('CORRELATION_QUALIFICATION_GEOMETRY_FIELD_UNSUPPORTED', `${path}.field`);
  }
  if (value.type === 'CONTRIBUTION') {
    requiredString(value.responseId, `${path}.responseId`);
    if (!NUMERIC_FIELDS.CONTRIBUTION.has(value.field)) fail('CORRELATION_QUALIFICATION_CONTRIBUTION_FIELD_UNSUPPORTED', `${path}.field`);
  }
  if (value.type === 'INTERPOLATION_AXIS') {
    requiredString(value.responseId, `${path}.responseId`);
    if (!['x', 'y'].includes(value.axis)) fail('CORRELATION_QUALIFICATION_INTERPOLATION_AXIS_UNSUPPORTED', `${path}.axis`);
    if (![...NUMERIC_FIELDS.INTERPOLATION_AXIS, 'exactKnot'].includes(value.field)) {
      fail('CORRELATION_QUALIFICATION_INTERPOLATION_FIELD_UNSUPPORTED', `${path}.field`);
    }
  }
  if (value.type === 'TARGET_COMPONENT') {
    requiredString(value.targetId, `${path}.targetId`);
    requiredString(value.stressComponent, `${path}.stressComponent`);
    if (!NUMERIC_FIELDS.TARGET_COMPONENT.has(value.field)) fail('CORRELATION_QUALIFICATION_TARGET_COMPONENT_FIELD_UNSUPPORTED', `${path}.field`);
  }
  if (value.type === 'TARGET_PRINCIPAL') {
    requiredString(value.targetId, `${path}.targetId`);
    if (!Number.isInteger(value.principalIndex) || value.principalIndex < 0 || value.principalIndex > 2) {
      fail('CORRELATION_QUALIFICATION_PRINCIPAL_INDEX_INVALID', `${path}.principalIndex`);
    }
  }
  if (value.type === 'TARGET_VON_MISES') requiredString(value.targetId, `${path}.targetId`);
}

function validateSuiteProfileBinding(suite, profile) {
  const checks = {
    methodIdentity: profile.methodIdentity,
    methodEdition: profile.methodEdition,
    coefficientDatasetId: profile.coefficientDatasetId,
    coefficientDatasetHash: profile.coefficientDatasetHash,
    profileSemanticHash: semanticHash(profile),
  };
  for (const [key, expected] of Object.entries(checks)) {
    if (suite[key] !== expected) fail('CORRELATION_QUALIFICATION_SUITE_PROFILE_MISMATCH', `qualificationSuite.${key}`);
  }
}

function uniqueBy(rows, key, identity, path) {
  if (!Array.isArray(rows)) fail('CORRELATION_QUALIFICATION_RESULT_COLLECTION_REQUIRED', path);
  const matches = rows.filter((row) => row?.[key] === identity);
  if (matches.length !== 1) fail(
    matches.length ? 'CORRELATION_QUALIFICATION_RESULT_IDENTITY_COLLISION'
      : 'CORRELATION_QUALIFICATION_RESULT_ENTITY_NOT_FOUND', path,
  );
  return matches[0];
}
function requiredHash(value, path) {
  requiredString(value, path);
  if (!/^fnv1a64:[0-9a-f]{16}$/u.test(value)) fail('CORRELATION_HASH_FORMAT_INVALID', path);
  return value;
}
function requiredString(value, path) {
  if (typeof value !== 'string' || !value) fail('CORRELATION_STRING_REQUIRED', path);
  return value;
}
function exactKeys(value, expected, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('CORRELATION_OBJECT_REQUIRED', path);
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(required)) fail('CORRELATION_EXACT_KEYS_MISMATCH', path);
}
function fail(code, path) {
  const error = new TypeError(code);
  error.code = code;
  error.path = path;
  throw error;
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
