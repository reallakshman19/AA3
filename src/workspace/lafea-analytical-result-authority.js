import {
  BASE_LIMITATIONS as FOUNDATION_LIMITATIONS,
  ENGINEERING_LEVEL as FOUNDATION_ENGINEERING_LEVEL,
  QUALIFICATION_STATES as FOUNDATION_QUALIFICATION_STATES,
  RESULT_SCHEMA as FOUNDATION_RESULT_SCHEMA,
} from '../core/local-stress/index.js';
import {
  BASE_LIMITATIONS as SCREENING_LIMITATIONS,
  ENGINEERING_LEVEL as SCREENING_ENGINEERING_LEVEL,
  QUALIFICATION_STATES as SCREENING_QUALIFICATION_STATES,
  RESULT_SCHEMA as SCREENING_RESULT_SCHEMA,
} from '../core/local-attachment-screening/index.js';

const ANALYTICAL_RESULT_AUTHORITIES = Object.freeze({
  'LAFEA.1': Object.freeze({
    resultSchema: FOUNDATION_RESULT_SCHEMA,
    engineeringLevel: FOUNDATION_ENGINEERING_LEVEL,
    acceptedState: FOUNDATION_QUALIFICATION_STATES.ACCEPTED,
    requiredLimitations: Object.freeze([...FOUNDATION_LIMITATIONS]),
  }),
  'LAFEA.2': Object.freeze({
    resultSchema: SCREENING_RESULT_SCHEMA,
    engineeringLevel: SCREENING_ENGINEERING_LEVEL,
    acceptedState: SCREENING_QUALIFICATION_STATES.ACCEPTED,
    requiredLimitations: Object.freeze([...SCREENING_LIMITATIONS]),
  }),
});

export function analyticalResultAuthorityForStage(stageId) {
  return ANALYTICAL_RESULT_AUTHORITIES[stageId] ?? null;
}

export function assertLafeaAnalyticalResultAuthority(stageId, result) {
  const expected = analyticalResultAuthorityForStage(stageId);
  if (!expected) return null;
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw authorityError(stageId, 'result', 'Retained analytical result evidence is required.');
  }
  if (result.schema !== expected.resultSchema) {
    throw authorityError(
      stageId,
      'result.schema',
      `Expected ${expected.resultSchema}; received ${String(result.schema ?? 'MISSING')}.`,
    );
  }
  if (result.qualification?.state !== expected.acceptedState) {
    throw authorityError(
      stageId,
      'result.qualification.state',
      `Expected ${expected.acceptedState}; received ${String(result.qualification?.state ?? 'MISSING')}.`,
    );
  }
  if (result.qualification?.engineeringLevel !== expected.engineeringLevel) {
    throw authorityError(
      stageId,
      'result.qualification.engineeringLevel',
      `Expected ${expected.engineeringLevel}; received ${String(result.qualification?.engineeringLevel ?? 'MISSING')}.`,
    );
  }
  if (!Array.isArray(result.limitations)) {
    throw authorityError(stageId, 'result.limitations', 'Analytical result limitations are required.');
  }
  for (const limitation of expected.requiredLimitations) {
    if (!result.limitations.includes(limitation)) {
      throw authorityError(
        stageId,
        'result.limitations',
        `Missing required analytical limitation ${limitation}.`,
      );
    }
  }
  return Object.freeze({
    stageId,
    resultSchema: expected.resultSchema,
    engineeringLevel: expected.engineeringLevel,
  });
}

function authorityError(stageId, path, message) {
  const error = new TypeError(`${stageId} analytical result authority mismatch at ${path}: ${message}`);
  error.code = 'LAFEA_ANALYTICAL_RESULT_AUTHORITY_MISMATCH';
  error.path = path;
  return error;
}
