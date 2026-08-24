import { semanticHash } from '../shared-piping-model/canonical-json.js';

export const PRODUCTION_PRESSURE_EFFECT_AUTHORITY_SCHEMA =
  'lfea-production-pressure-effect-authority/v2';

export const CAESAR_BOURDON_MODES = Object.freeze([
  'NONE',
  'TRANSLATION_ONLY',
  'TRANSLATION_AND_ROTATION',
]);

export const CAESAR_BEND_PRESSURE_STIFFENING_CONFIGURATIONS = Object.freeze([
  'DEFAULT_CODE',
  'INCLUDE',
  'EXCLUDE',
]);

export const CAESAR_ELBOW_STIFFENING_PRESSURE_SELECTORS = Object.freeze([
  'UNRESOLVED',
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
  'activePipingCode',
  'bourdonMode',
  'bendPressureStiffeningConfiguration',
  'elbowStiffeningPressureSelector',
  'settingEvidence',
]);
const EVIDENCE_KEYS = Object.freeze([
  'activePipingCode',
  'bourdonMode',
  'bendPressureStiffeningConfiguration',
  'elbowStiffeningPressureSelector',
]);
const RESOLUTION_STATUSES = Object.freeze(['RESOLVED', 'UNRESOLVED']);
const AUTHORITY_LEVELS = Object.freeze([
  'OVERALL_GLOBAL_DEFAULT',
  'INDIVIDUAL_FILE_SETTING',
  'LOAD_CASE_SETTING',
  'MODEL_INPUT',
  'UNRESOLVED',
]);

/**
 * Seal source-state custody for CAESAR pressure effects.
 *
 * The global pressure-stiffening configuration and per-load-case elbow
 * stiffening-pressure selector are separate CAESAR settings. `DEFAULT_CODE`
 * delegates the global choice to the active piping code; it is not an alias
 * for INCLUDE or EXCLUDE. An unresolved per-case selector remains unresolved.
 *
 * This record establishes source settings only. It never proves that the LFEA
 * production formulation implements the corresponding mechanics.
 */
export function sealProductionPressureEffectAuthority(input) {
  requireRecord(input, 'pressureEffectAuthority');
  requireExactKeys(input, INPUT_KEYS, 'pressureEffectAuthority');
  if (input.schema !== PRODUCTION_PRESSURE_EFFECT_AUTHORITY_SCHEMA) {
    fail('PRESSURE_EFFECT_AUTHORITY_SCHEMA_INVALID',
      `pressureEffectAuthority.schema must be ${PRODUCTION_PRESSURE_EFFECT_AUTHORITY_SCHEMA}.`);
  }
  const authorityId = requireText(input.authorityId, 'pressureEffectAuthority.authorityId');
  const activePipingCode = requireText(input.activePipingCode, 'pressureEffectAuthority.activePipingCode');
  const bourdonMode = requireMember(input.bourdonMode, CAESAR_BOURDON_MODES,
    'pressureEffectAuthority.bourdonMode');
  const bendPressureStiffeningConfiguration = requireMember(
    input.bendPressureStiffeningConfiguration,
    CAESAR_BEND_PRESSURE_STIFFENING_CONFIGURATIONS,
    'pressureEffectAuthority.bendPressureStiffeningConfiguration',
  );
  const elbowStiffeningPressureSelector = requireMember(
    input.elbowStiffeningPressureSelector,
    CAESAR_ELBOW_STIFFENING_PRESSURE_SELECTORS,
    'pressureEffectAuthority.elbowStiffeningPressureSelector',
  );
  const settingEvidence = requireSettingEvidence(input.settingEvidence);
  requireResolvedValue(settingEvidence.activePipingCode, activePipingCode, 'activePipingCode');
  requireResolvedValue(settingEvidence.bourdonMode, bourdonMode, 'bourdonMode');
  requireResolvedValue(
    settingEvidence.bendPressureStiffeningConfiguration,
    bendPressureStiffeningConfiguration,
    'bendPressureStiffeningConfiguration',
  );
  requireSelectorEvidence(settingEvidence.elbowStiffeningPressureSelector, elbowStiffeningPressureSelector);

  const draft = {
    schema: PRODUCTION_PRESSURE_EFFECT_AUTHORITY_SCHEMA,
    authorityId,
    activePipingCode,
    bourdonMode,
    bendPressureStiffeningConfiguration,
    elbowStiffeningPressureSelector,
    settingEvidence,
    semanticHash: '',
  };
  draft.semanticHash = semanticHash({ ...draft, semanticHash: '' });
  return Object.freeze({ ...draft, settingEvidence: freezeEvidence(settingEvidence) });
}

/**
 * Report source disposition without converting code-controlled or unresolved
 * settings into an implementation-authorization boolean.
 */
export function sourcePressureEffectDisposition(authority) {
  const accepted = sealProductionPressureEffectAuthority({
    schema: authority?.schema,
    authorityId: authority?.authorityId,
    activePipingCode: authority?.activePipingCode,
    bourdonMode: authority?.bourdonMode,
    bendPressureStiffeningConfiguration: authority?.bendPressureStiffeningConfiguration,
    elbowStiffeningPressureSelector: authority?.elbowStiffeningPressureSelector,
    settingEvidence: authority?.settingEvidence,
  });
  const selectorResolved = accepted.elbowStiffeningPressureSelector !== 'UNRESOLVED';
  return Object.freeze({
    codeStress: 'SOURCE_PRESSURE_AVAILABLE_FOR_CODE_APPLICATION',
    bourdon: accepted.bourdonMode === 'NONE'
      ? 'DISABLED_BY_SOURCE_SETTING'
      : 'ENABLED_BY_SOURCE_SETTING_NUMERICAL_QUALIFICATION_REQUIRED',
    pressureStiffening: Object.freeze({
      configuration: accepted.bendPressureStiffeningConfiguration,
      activePipingCode: accepted.activePipingCode,
      elbowStiffeningPressureSelector: accepted.elbowStiffeningPressureSelector,
      selectorResolved,
      disposition: !selectorResolved
        ? 'BLOCKED_ELBOW_STIFFENING_PRESSURE_SELECTOR_UNRESOLVED'
        : accepted.bendPressureStiffeningConfiguration === 'DEFAULT_CODE'
          ? 'CODE_CONTROLLED_NUMERICAL_QUALIFICATION_REQUIRED'
          : 'EXPLICIT_CONFIGURATION_NUMERICAL_QUALIFICATION_REQUIRED',
    }),
    axialThrust: 'NOT_AUTHORIZED_BY_BOURDON_OR_BEND_STIFFENING_SOURCE_STATE',
  });
}

function requireSettingEvidence(value) {
  requireRecord(value, 'pressureEffectAuthority.settingEvidence');
  requireExactKeys(value, EVIDENCE_KEYS, 'pressureEffectAuthority.settingEvidence');
  return {
    activePipingCode: requireEvidenceEntry(value.activePipingCode, 'activePipingCode'),
    bourdonMode: requireEvidenceEntry(value.bourdonMode, 'bourdonMode'),
    bendPressureStiffeningConfiguration: requireEvidenceEntry(
      value.bendPressureStiffeningConfiguration,
      'bendPressureStiffeningConfiguration',
    ),
    elbowStiffeningPressureSelector: requireEvidenceEntry(
      value.elbowStiffeningPressureSelector,
      'elbowStiffeningPressureSelector',
    ),
  };
}

function requireEvidenceEntry(value, field) {
  requireRecord(value, `settingEvidence.${field}`);
  requireExactKeys(value, ['authorityLevel', 'caseId', 'rawValue', 'reason', 'resolutionStatus', 'source'],
    `settingEvidence.${field}`);
  const resolutionStatus = requireMember(value.resolutionStatus, RESOLUTION_STATUSES,
    `settingEvidence.${field}.resolutionStatus`);
  const authorityLevel = requireMember(value.authorityLevel, AUTHORITY_LEVELS,
    `settingEvidence.${field}.authorityLevel`);
  const source = requireText(value.source, `settingEvidence.${field}.source`);
  const caseId = value.caseId === null ? null : requireText(value.caseId, `settingEvidence.${field}.caseId`);
  const rawValue = value.rawValue === null ? null : requireText(value.rawValue, `settingEvidence.${field}.rawValue`);
  const reason = value.reason === null ? null : requireText(value.reason, `settingEvidence.${field}.reason`);
  if (resolutionStatus === 'RESOLVED' && (authorityLevel === 'UNRESOLVED' || rawValue === null || reason !== null)) {
    fail('PRESSURE_EFFECT_SETTING_EVIDENCE_INVALID', `Resolved ${field} evidence is internally inconsistent.`);
  }
  if (resolutionStatus === 'UNRESOLVED'
    && (authorityLevel !== 'UNRESOLVED' || rawValue !== null || reason === null)) {
    fail('PRESSURE_EFFECT_SETTING_EVIDENCE_INVALID', `Unresolved ${field} evidence is internally inconsistent.`);
  }
  return { resolutionStatus, authorityLevel, source, caseId, rawValue, reason };
}

function requireResolvedValue(evidence, expected, field) {
  if (evidence.resolutionStatus !== 'RESOLVED' || evidence.rawValue !== expected) {
    fail('PRESSURE_EFFECT_SETTING_EVIDENCE_MISMATCH',
      `${field} must equal its resolved CAESAR setting evidence.`);
  }
}

function requireSelectorEvidence(evidence, selector) {
  if (selector === 'UNRESOLVED') {
    if (evidence.resolutionStatus !== 'UNRESOLVED') {
      fail('PRESSURE_EFFECT_SETTING_EVIDENCE_MISMATCH',
        'UNRESOLVED elbow selector requires unresolved CAESAR setting evidence.');
    }
    return;
  }
  requireResolvedValue(evidence, selector, 'elbowStiffeningPressureSelector');
}

function freezeEvidence(value) {
  return Object.freeze(Object.fromEntries(Object.entries(value)
    .map(([key, entry]) => [key, Object.freeze({ ...entry })])));
}

function requireRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('PRESSURE_EFFECT_AUTHORITY_RECORD_REQUIRED', `${field} must be a record.`);
  }
}
function requireExactKeys(value, expected, field) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail('PRESSURE_EFFECT_AUTHORITY_FIELDS_INVALID', `${field} fields must be exactly ${wanted.join(', ')}.`);
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
    fail('PRESSURE_EFFECT_AUTHORITY_VALUE_INVALID', `${field} must be one of ${allowed.join(', ')}.`);
  }
  return value;
}
function fail(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'INPUTXML_PRODUCTION_PRESSURE_EFFECT_AUTHORITY';
  throw error;
}
