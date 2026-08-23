import { semanticHash } from '../shared-piping-model/canonical-json.js';

export const PRODUCTION_PRESSURE_EFFECT_AUTHORITY_SCHEMA =
  'lfea-production-pressure-effect-authority/v1';

export const CAESAR_BOURDON_MODES = Object.freeze([
  'NONE',
  'TRANSLATION_ONLY',
  'TRANSLATION_AND_ROTATION',
]);

export const CAESAR_BEND_PRESSURE_STIFFENING_MODES = Object.freeze([
  'INCLUDE',
  'EXCLUDE',
]);

export const CAESAR_ELBOW_STIFFENING_PRESSURE_SELECTORS = Object.freeze([
  'NONE',
  'PMAX',
  'P1',
  'P2',
  'P3',
  'P4',
  'P5',
  'P6',
  'P7',
  'P8',
  'P9',
  'PHYDRO',
]);

const INPUT_KEYS = Object.freeze([
  'schema',
  'authorityId',
  'bourdonMode',
  'bendPressureStiffeningMode',
  'elbowStiffeningPressureSelector',
  'sourceEvidence',
]);

/**
 * Seal the CAESAR pressure-effect settings that are not contained in ordinary
 * pressure input itself.
 *
 * This record is intentionally separate from the production capability
 * profile. A solver may implement a pressure mechanism without a particular
 * imported job authorising that mechanism. Conversely, a source setting never
 * proves the numerical formulation is implemented.
 */
export function sealProductionPressureEffectAuthority(input) {
  requireRecord(input, 'pressureEffectAuthority');
  requireExactKeys(input, INPUT_KEYS, 'pressureEffectAuthority');
  if (input.schema !== PRODUCTION_PRESSURE_EFFECT_AUTHORITY_SCHEMA) {
    fail(
      'PRESSURE_EFFECT_AUTHORITY_SCHEMA_INVALID',
      `pressureEffectAuthority.schema must be ${PRODUCTION_PRESSURE_EFFECT_AUTHORITY_SCHEMA}.`,
    );
  }
  const authorityId = requireText(input.authorityId, 'pressureEffectAuthority.authorityId');
  const bourdonMode = requireMember(
    input.bourdonMode,
    CAESAR_BOURDON_MODES,
    'pressureEffectAuthority.bourdonMode',
  );
  const bendPressureStiffeningMode = requireMember(
    input.bendPressureStiffeningMode,
    CAESAR_BEND_PRESSURE_STIFFENING_MODES,
    'pressureEffectAuthority.bendPressureStiffeningMode',
  );
  const elbowStiffeningPressureSelector = requireMember(
    input.elbowStiffeningPressureSelector,
    CAESAR_ELBOW_STIFFENING_PRESSURE_SELECTORS,
    'pressureEffectAuthority.elbowStiffeningPressureSelector',
  );
  if (bendPressureStiffeningMode === 'INCLUDE'
    && elbowStiffeningPressureSelector === 'NONE') {
    fail(
      'PRESSURE_STIFFENING_PRESSURE_SELECTOR_REQUIRED',
      'Pressure stiffening INCLUDE requires an explicit elbow stiffening pressure selector.',
    );
  }
  if (bendPressureStiffeningMode === 'EXCLUDE'
    && elbowStiffeningPressureSelector !== 'NONE') {
    fail(
      'PRESSURE_STIFFENING_PRESSURE_SELECTOR_CONFLICT',
      'Pressure stiffening EXCLUDE requires elbowStiffeningPressureSelector=NONE.',
    );
  }
  const sourceEvidence = requireSourceEvidence(input.sourceEvidence);
  const draft = {
    schema: PRODUCTION_PRESSURE_EFFECT_AUTHORITY_SCHEMA,
    authorityId,
    bourdonMode,
    bendPressureStiffeningMode,
    elbowStiffeningPressureSelector,
    sourceEvidence,
    semanticHash: '',
  };
  draft.semanticHash = semanticHash({ ...draft, semanticHash: '' });
  return Object.freeze({
    ...draft,
    sourceEvidence: Object.freeze({ ...sourceEvidence }),
  });
}

/**
 * Translate a sealed source setting into source authorization only. This does
 * not inspect or widen implementation capability.
 *
 * `axialThrust` stays false because CAESAR pressure thrust is a distinct
 * expansion-joint/bellows mechanism governed by an Effective ID/effective area;
 * ordinary Bourdon pipe elongation is not represented by that flag.
 */
export function sourceAuthorizedPressureEffects(authority) {
  const accepted = sealProductionPressureEffectAuthority({
    schema: authority?.schema,
    authorityId: authority?.authorityId,
    bourdonMode: authority?.bourdonMode,
    bendPressureStiffeningMode: authority?.bendPressureStiffeningMode,
    elbowStiffeningPressureSelector: authority?.elbowStiffeningPressureSelector,
    sourceEvidence: authority?.sourceEvidence,
  });
  return Object.freeze({
    codeStress: true,
    pressureStiffening: accepted.bendPressureStiffeningMode === 'INCLUDE',
    axialThrust: false,
    bourdon: accepted.bourdonMode !== 'NONE',
  });
}

function requireRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('PRESSURE_EFFECT_AUTHORITY_RECORD_REQUIRED', `${field} must be a record.`);
  }
}

function requireExactKeys(value, expected, field) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length
    || actual.some((key, index) => key !== wanted[index])) {
    fail(
      'PRESSURE_EFFECT_AUTHORITY_FIELDS_INVALID',
      `${field} fields must be exactly ${wanted.join(', ')}.`,
    );
  }
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('PRESSURE_EFFECT_AUTHORITY_VALUE_INVALID', `${field} must be a non-empty string.`);
  }
  return value;
}

function requireMember(value, allowed, field) {
  if (!allowed.includes(value)) {
    fail(
      'PRESSURE_EFFECT_AUTHORITY_VALUE_INVALID',
      `${field} must be one of ${allowed.join(', ')}.`,
    );
  }
  return value;
}

function requireSourceEvidence(value) {
  requireRecord(value, 'pressureEffectAuthority.sourceEvidence');
  requireExactKeys(
    value,
    ['sourceId', 'sourceRevision', 'sourceSemanticHash'],
    'pressureEffectAuthority.sourceEvidence',
  );
  return {
    sourceId: requireText(value.sourceId, 'pressureEffectAuthority.sourceEvidence.sourceId'),
    sourceRevision: requireText(value.sourceRevision, 'pressureEffectAuthority.sourceEvidence.sourceRevision'),
    sourceSemanticHash: requireText(
      value.sourceSemanticHash,
      'pressureEffectAuthority.sourceEvidence.sourceSemanticHash',
    ),
  };
}

function fail(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'INPUTXML_PRODUCTION_PRESSURE_EFFECT_AUTHORITY';
  throw error;
}
